// The read-only Tally import insights behind the Copilot's tally_* resources. The decoder
// is mocked with a synthetic company (tallyFixtures.js); the import itself is real.
const mockExtract = jest.fn();
jest.mock('../integrations/tally/binExtract', () => ({
  ...jest.requireActual('../integrations/tally/binExtract'),
  extractCompany: (...a) => mockExtract(...a),
}));

const fs = require('fs');
const path = require('path');
// The app's load order: binImportRunner before verifyImport.
const { adapt, importParsed } = require('../integrations/tally/binImportRunner');
const importer = require('../integrations/tally/importer');
const insights = require('../integrations/tally/importInsightsService');
const { setupTestDB, createTestCompany, db } = require('./helpers');
const { makeTallyFolder, tallyCompany } = require('./tallyFixtures');
const { callTool } = require('../ai/tools');
const agent = require('../ai/agent');
const { normalizeContext } = require('../ai/aiController');
const automationController = require('../automation/automationController');
const { fakeOpenAI, reply, toolCall } = require('./fakeOpenAI');

let imports = 0;
// Import the fixture into a new company, the way ImportTally does (numbers kept).
async function importFixture() {
  const data = tallyCompany();
  const { parsed } = adapt(data.masters, { vouchers: data.vouchers }, {});
  const summary = await importParsed(parsed, {
    company: `Fixture Traders ${++imports}`,
    fyStart: '2025-04-01',
    preserveNumbers: true,
    gstRegistrations: data.masters.gstRegistrations,
  });
  return { companyId: summary.company.company_id, name: summary.company.name, parsed, summary };
}

const ledgerId = async (companyId, name) => {
  const sql = 'SELECT ledger_id FROM ledgers WHERE company_id = ? AND name = ?';
  return Number((await db.execute(sql, [companyId, name])).rows[0].ledger_id);
};

let one; // a Data folder holding one company
let two; // a Data folder holding two

beforeAll(async () => {
  await setupTestDB();
  one = makeTallyFolder({ companies: ['10000'] });
  two = makeTallyFolder({ companies: ['10000', '10001'] });
});
afterAll(() => {
  one.remove();
  two.remove();
});
beforeEach(() => {
  insights.clearSourceCache();
  mockExtract.mockReset();
  mockExtract.mockImplementation(() => tallyCompany());
});

describe('Tally import insights', () => {
  it('needs an attached folder', async () => {
    const res = await insights.inspectFolder({}, {});
    expect(res).toEqual({ success: false, error: expect.stringMatching(/No Tally data folder/) });
  });

  it('inspect describes the folder from the decode alone', async () => {
    const res = await insights.inspectFolder({ tally_folder: one.root }, {});

    expect(res.success).toBe(true);
    expect(res.folder).toBe('10000');
    expect(res.counts).toMatchObject({
      ledgers: 6,
      stock_items: 1,
      vouchers: 8,
      balanced_vouchers: 7, // includes J-1 and J-3, which cannot import as decoded (F19)
    });
    expect(res.period).toEqual({
      first_voucher: '2025-04-10',
      last_voucher: '2026-04-02',
      financial_years: ['2025-26', '2026-27'],
      suggested_books_beginning: '2025-04-01',
      undated: 0,
    });
    expect(res.identity.gst_registrations).toEqual([
      { name: 'Maharashtra Registration', state: 'Maharashtra', gstin_masked: '27**********1Z5' },
    ]);
    expect(res.voucher_types).toEqual(
      expect.arrayContaining([
        { tally_type: 'Sales', imports_as: 'Sales', count: 1, guessed: false },
        { tally_type: 'Journal', imports_as: 'Journal', count: 3, guessed: false },
        { tally_type: 'Tax Invoice', imports_as: 'Sales', count: 1, guessed: true },
        { tally_type: 'Memorandum', imports_as: 'Journal', count: 1, guessed: true },
      ]),
    );
    const warnings = res.warnings.join('\n');
    expect(warnings).toMatch(/link id 999, 998\)\. The importer keeps only the lines before/);
    expect(warnings).toMatch(/"Memorandum" voucher\(s\) would import as Journal/);
    expect(warnings).toMatch(/"Tax Invoice" voucher\(s\) will import as Sales/);
    expect(res.not_importable.map((g) => [g.reason, g.sample.map((v) => v.number)])).toEqual(
      expect.arrayContaining([
        ['a ledger could not be named', ['J-1']],
        ['debits and credits differ', ['P-1']],
        ['imports with no ledger lines: a ledger could not be named', ['J-3']],
      ]),
    );
    // Tool results go to the model: no absolute paths.
    expect(JSON.stringify(res)).not.toContain(one.root);
  });

  it('lists the companies of a multi-company folder and accepts only their names', async () => {
    const ctx = { tally_folder: two.root };
    const list = await insights.inspectFolder(ctx, {});
    expect(list.companies.map((c) => c.company_dir).sort()).toEqual(['10000', '10001']);
    expect(list.companies[0]).toEqual({
      company_dir: expect.any(String),
      manager_bytes: 0,
      tranmgr_bytes: 0,
      modified: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });

    const picked = await insights.inspectFolder(ctx, { company_dir: '10001' });
    expect(picked).toMatchObject({ success: true, folder: '10001' });
    expect(mockExtract).toHaveBeenCalledWith(two.dirs['10001']);

    for (const company_dir of ['../10000', two.dirs['10000']]) {
      const res = await insights.inspectFolder(ctx, { company_dir });
      expect(res).toEqual({ success: false, error: expect.stringMatching(/not a path\.$/) });
    }
    const unknown = await insights.inspectFolder(ctx, { company_dir: '10002' });
    expect(unknown.error).toMatch(/"10002" is not a company folder/);
    const unpicked = await insights.previewImport(ctx, {});
    expect(unpicked.error).toMatch(/holds 2 companies \(.*\)\. Pass company_dir/);
  });

  it('preview predicts the outcome and the duplicate risk of an import', async () => {
    const fresh = await insights.previewImport(
      { tally_folder: one.root },
      { company_name: 'Brand New Co' },
    );
    expect(fresh.target).toEqual({ new_company: 'Brand New Co' });
    const byReason = Object.fromEntries(fresh.outcomes.map((g) => [g.reason, g]));
    expect(byReason['expected to import'].count).toBe(5);
    expect(byReason['a ledger could not be named'].sample.map((v) => v.number)).toEqual(['J-1']);
    expect(byReason['debits and credits differ'].sample.map((v) => v.number)).toEqual(['P-1']);
    const savedEmpty = byReason['imports with no ledger lines: a ledger could not be named'];
    expect(savedEmpty.sample.map((v) => v.number)).toEqual(['J-3']);
    expect(fresh.financial_years_to_create).toEqual(['2025-26', '2026-27']);
    expect(fresh.duplicate_risk).toEqual({ count: 0 });

    // The prediction matches what the importer then does: 5 + J-3 saved, J-1 and P-1 failed.
    const imported = await importFixture();
    expect(imported.summary.vouchers).toMatchObject({ created: 6, failed: 2 });

    // Importing into the same company again (matched by name, any case) books it twice.
    const again = await insights.previewImport(
      { tally_folder: one.root },
      { company_name: imported.name.toUpperCase() },
    );
    expect(again.target).toEqual({
      existing_company: imported.name,
      company_id: imported.companyId,
    });
    expect(again.duplicate_risk.count).toBe(5);
    expect(again.masters.ledgers).toEqual({ new: 0, existing: 6 });
    expect(again.financial_years_to_create).toEqual([]);
  });

  it('verify matches the books to the source and explains each ledger difference', async () => {
    const { companyId } = await importFixture();
    const res = await insights.checkImport({ tally_folder: one.root, company_id: companyId }, {});

    expect(res.success).toBe(true);
    expect(res.vouchers).toMatchObject({
      source_importable: 7,
      in_paesa: 6,
      matched: 5,
      extra: { count: 0, duplicates: 0 },
    });
    expect(res.vouchers.missing).toEqual({
      count: 1,
      sample: [
        {
          ref: 'src-5',
          type: 'Journal',
          number: 'J-1',
          date: '2025-08-01',
          amount: 50,
          reason: 'a ledger could not be named',
        },
      ],
    });
    // J-3 was saved with no lines (F22): it pairs with its source voucher as changed, and
    // shows up as an empty voucher in the books.
    expect(res.vouchers.changed).toEqual({
      count: 1,
      sample: [expect.objectContaining({ number: 'J-3', source_amount: 30, paesa_amount: 0 })],
    });
    expect(res.vouchers.empty_in_paesa).toEqual({
      count: 1,
      sample: [expect.objectContaining({ number: 'J-3', date: '2025-10-01' })],
    });
    // J-1 credits Cash 50 in the source but never reached the books, so the books are 50
    // higher, and that is all of the difference.
    const cash = res.ledger_differences.top.find((r) => r.name === 'Cash');
    expect(cash).toMatchObject({
      source_closing: 2920,
      paesa_closing: 2970,
      difference: 50,
      explained: { opening: 0, missing: 50, extra: 0, changed: 0 },
      residual: 0,
    });
    expect(cash.href).toBe(`/reports/accounts/ledger?ledger_id=${cash.ledger_id}`);
    const expenses = res.ledger_differences.top.find((r) => r.name === 'Office Expenses');
    expect(expenses).toMatchObject({ difference: 30, explained: { changed: 30 }, residual: 0 });
    expect(res.ledger_differences.count).toBe(3); // and the unnamed ledgers of J-1 and J-3
    expect(res.not_importable).toEqual([
      {
        reason: 'debits and credits differ',
        count: 1,
        sample: [{ ref: 'src-4', type: 'Payment', number: 'P-1', date: '2025-07-01' }],
      },
    ]);
    expect(res.checks.find((c) => c.label === 'Books balance (Dr==Cr)').ok).toBe(true);
    expect(res.opening_difference).toEqual({ source: 7000, paesa: 7000 });
  });

  it('ledger diff lists a re-imported voucher as a duplicate, with its link', async () => {
    const { companyId, parsed } = await importFixture();
    const fy = await db.execute(
      "SELECT fy_id FROM financial_years WHERE company_id = ? AND start_date = '2026-04-01'",
      [companyId],
    );
    await importer.importVouchers(
      { ...parsed, vouchers: parsed.vouchers.filter((v) => v.number === 'J-2') },
      {
        company_id: companyId,
        fy_id: fy.rows[0].fy_id,
        importMode: true,
        preserveVoucherNumbers: true,
      },
    );

    const res = await insights.explainLedger(
      { tally_folder: one.root, company_id: companyId },
      { ledger_id: await ledgerId(companyId, 'Cash') },
    );

    expect(res.success).toBe(true);
    expect(res.extra_in_paesa).toHaveLength(1);
    const dup = res.extra_in_paesa[0];
    expect(dup).toMatchObject({ number: 'J-2', dr: 0, cr: 200, duplicate: true });
    expect(dup.href).toBe(`/transactions/voucher/${dup.voucher_id}`);
    // Books 2,770 against source 2,920: -150 = the missing J-1 (+50) and the extra J-2 (-200).
    expect(res).toMatchObject({
      source: { opening: 2000, movement: 920, closing: 2920 },
      paesa: { opening: 2000, movement: 770, closing: 2770 },
      difference: -150,
      explained: { opening: 0, missing: 50, extra: -200, changed: 0 },
      residual: 0,
    });
    expect(res.missing_in_paesa.map((v) => [v.number, v.dr, v.cr])).toEqual([['J-1', 0, 50]]);
    expect(res.unimportable_in_source.map((v) => v.number)).toEqual(['P-1']);
  });

  it('treats a voucher edited after import as changed, not as missing plus extra', async () => {
    const { companyId } = await importFixture();
    const s1 = await db.execute(
      "SELECT voucher_id FROM vouchers WHERE company_id = ? AND voucher_number = 'S-1'",
      [companyId],
    );
    const voucherId = Number(s1.rows[0].voucher_id);
    // The sale was corrected in Paesa after the import: 80 less, tax unchanged.
    await db.execute(
      "UPDATE voucher_entries SET amount = amount - 80 WHERE voucher_id = ? AND ledger_name IN ('Alpha Traders', 'Sales Account')",
      [voucherId],
    );

    const res = await insights.checkImport({ tally_folder: one.root, company_id: companyId }, {});

    expect(res.vouchers.changed.count).toBe(2); // S-1, and J-3 (saved empty)
    expect(res.vouchers.changed.sample).toContainEqual(
      expect.objectContaining({
        voucher_id: voucherId,
        number: 'S-1',
        source_amount: 1180,
        paesa_amount: 1100,
      }),
    );
    expect(res.vouchers.missing.sample.map((v) => v.number)).toEqual(['J-1']);
    expect(res.vouchers.extra.count).toBe(0);
    const sales = res.ledger_differences.top.find((r) => r.name === 'Sales Account');
    expect(sales).toMatchObject({ difference: 80, explained: { changed: 80 }, residual: 0 });
  });

  it('refuses to compare the folder with a company it was not imported into', async () => {
    const other = await createTestCompany('Unrelated Co');
    const res = await insights.checkImport(
      { tally_folder: one.root, company_id: other.company_id },
      {},
    );
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Only 1 of the 6 ledgers .* Switch to the company/);
  });

  it('decodes a folder once until its files change', async () => {
    const { companyId, name } = await importFixture();
    const ctx = { tally_folder: one.root, company_id: companyId };
    await insights.inspectFolder(ctx, {});
    await insights.previewImport(ctx, { company_name: name });
    await insights.checkImport(ctx, {});
    expect(mockExtract).toHaveBeenCalledTimes(1);

    const later = new Date(Date.now() + 60000);
    fs.utimesSync(path.join(one.dirs['10000'], 'TranMgr.1800'), later, later);
    await insights.inspectFolder(ctx, {});
    expect(mockExtract).toHaveBeenCalledTimes(2);
  });

  it('refuses a folder too large to decode in the app, without decoding it', async () => {
    const big = makeTallyFolder({ companies: ['20000'] });
    try {
      // A sparse file: the size is reported without the disk space being used.
      fs.truncateSync(path.join(big.dirs['20000'], 'TranMgr.1800'), 300 * 1024 * 1024);
      const res = await insights.inspectFolder({ tally_folder: big.root }, {});
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/300 MB, more than the Copilot reads \(256 MB\)/);
      expect(mockExtract).not.toHaveBeenCalled();
    } finally {
      big.remove();
    }
  });

  it('reports a decode failure without the absolute path', async () => {
    const tranMgr = path.join(one.dirs['10000'], 'TranMgr.1800');
    mockExtract.mockImplementation(() => {
      throw new Error(`EBUSY: resource busy or locked, open '${tranMgr}'`);
    });
    const res = await insights.inspectFolder({ tally_folder: one.root }, {});
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/If TallyPrime has this company open, close it/);
    expect(res.error).not.toContain(one.root);
  });
});

// Row counts of every table an import or an approval writes to, plus SQLite's own count of
// changed rows on this connection, which also catches an insert undone by a delete.
const WRITE_TARGETS = [
  'companies',
  'financial_years',
  'groups',
  'ledgers',
  'ledger_statutory_details',
  'units',
  'stock_items',
  'vouchers',
  'voucher_entries',
  'voucher_stock_entries',
  'gst_registrations',
  'audit_trail',
  'tally_features',
];
async function writeSnapshot() {
  const snapshot = {};
  for (const table of WRITE_TARGETS) {
    snapshot[table] = Number((await db.execute(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n);
  }
  snapshot.total_changes = Number((await db.execute('SELECT total_changes() AS n')).rows[0].n);
  return snapshot;
}

describe('Copilot tally_* resources', () => {
  it('ask for a folder when none is attached', async () => {
    for (const resource of [
      'tally_inspect',
      'tally_preview',
      'tally_verify',
      'tally_ledger_diff',
    ]) {
      const res = await callTool('query', { resource }, { company_id: 1 });
      expect(res).toEqual({
        success: false,
        error: expect.stringMatching(/No Tally data folder is attached/),
      });
    }
  });

  it('give the model the folder name but never its path', () => {
    const prompt = agent.systemPrompt({ company_id: 1, fy_id: 2, tally_folder: one.dirs['10000'] });
    expect(prompt).toContain('tally_folder=attached (10000)');
    expect(prompt).not.toContain(one.root);
  });

  it('keep the request context to known keys and types', () => {
    expect(normalizeContext({ company_id: '3', fy_id: 4, tally_folder: one.root, x: 1 })).toEqual({
      company_id: 3,
      fy_id: 4,
      tally_folder: one.root,
    });
    expect(normalizeContext({ tally_folder: { path: '/etc' } }).tally_folder).toBeUndefined();
  });

  it('run a whole review session without writing anything', async () => {
    const { companyId, name } = await importFixture();
    const fy = await db.execute(
      "SELECT fy_id FROM financial_years WHERE company_id = ? AND start_date = '2025-04-01'",
      [companyId],
    );
    const ctx = { company_id: companyId, fy_id: fy.rows[0].fy_id, tally_folder: one.root };
    const cash = await ledgerId(companyId, 'Cash');
    const expenses = await ledgerId(companyId, 'Office Expenses');
    const before = await writeSnapshot();

    const fake = fakeOpenAI([
      toolCall('c1', 'query', { resource: 'tally_inspect' }),
      toolCall('c2', 'query', { resource: 'tally_preview', company_name: name }),
      toolCall('c3', 'query', { resource: 'tally_verify' }),
      toolCall('c4', 'query', { resource: 'tally_ledger_diff', ledger_id: cash }),
      toolCall('c5', 'propose', {
        action: 'create_voucher',
        payload: {
          voucher_type: 'Journal',
          date: '2025-08-01',
          entries: [
            { ledger_id: expenses, type: 'Dr', amount: 50 },
            { ledger_id: cash, type: 'Cr', amount: 50 },
          ],
        },
      }),
      reply('Reviewed the import.'),
    ]);
    const res = await agent.ask({
      config: { apiKey: 'test-key' },
      prompt: 'Review the Tally import',
      context: ctx,
      fetchImpl: fake.fetchImpl,
    });

    expect(res.success).toBe(true);
    expect(res.toolTrace.map((t) => [t.input.resource || t.input.action, t.ok])).toEqual([
      ['tally_inspect', true],
      ['tally_preview', true],
      ['tally_verify', true],
      ['tally_ledger_diff', true],
      ['create_voucher', true],
    ]);
    expect(res.proposals).toHaveLength(1);
    expect(await writeSnapshot()).toEqual(before);
    for (const call of fake.calls) expect(JSON.stringify(call.body)).not.toContain(one.root);

    // The snapshot does notice writes: approving the proposal changes it.
    const saved = await automationController.createVoucher(null, res.proposals[0].args);
    expect(saved.success).toBe(true);
    expect(await writeSnapshot()).not.toEqual(before);
  });
});
