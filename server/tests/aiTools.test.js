const { setupTestDB, createTestCompany, db } = require('./helpers');
const { TOOL_DEFS, callTool } = require('../ai/tools');
const { getConfig, GROQ_BASE_URL, GROQ_DEFAULT_MODEL } = require('../ai/keyStore');
const groupService = require('../group/groupService');
const ledgerService = require('../ledger/ledgerService');
const stockItemService = require('../stockItem/stockItemService');
const automationController = require('../automation/automationController');
const { tagGstLedgers } = require('../integrations/tally/gstBackfill');

const activeFyId = async (companyId) => {
  const fy = await db.execute(
    `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
    [companyId],
  );
  return fy.rows[0].fy_id;
};

const ledgerIdOf = async (companyId, name) => {
  const r = await db.execute('SELECT ledger_id FROM ledgers WHERE company_id = ? AND name = ?', [
    companyId,
    name,
  ]);
  return Number(r.rows[0].ledger_id);
};

const countVouchers = async (companyId) => {
  const r = await db.execute('SELECT COUNT(*) AS n FROM vouchers WHERE company_id = ?', [
    companyId,
  ]);
  return Number(r.rows[0].n);
};

describe('AI copilot tool layer (consolidated, anti-loop)', () => {
  let ctx;
  let ids; // ledger ids in the active company, by role
  let otherCompanyId;
  let otherCashId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('AI Tools Co');
    ctx = { company_id: company.company_id, fy_id: await activeFyId(company.company_id) };

    const groups = (await groupService.getAll(ctx.company_id)).groups;
    const groupId = (name) => groups.find((g) => g.name === name).group_id;
    const addLedger = async (name, group) => {
      const res = await ledgerService.create({
        company_id: ctx.company_id,
        name,
        group_id: groupId(group),
      });
      return Number(res.ledger.ledger_id);
    };
    ids = {
      cash: await ledgerIdOf(ctx.company_id, 'Cash'),
      party: await addLedger('Alpha Traders', 'Sundry Debtors'),
      sales: await addLedger('Sales Account', 'Sales Accounts'),
      cgst: await addLedger('Output CGST', 'Duties & Taxes'),
      sgst: await addLedger('Output SGST', 'Duties & Taxes'),
    };
    // Tag the tax ledgers as GST heads, as a Tally import does, so the GST engine would
    // recognise them if a draft were ever routed through it.
    await tagGstLedgers(ctx.company_id);

    const other = await createTestCompany('AI Tools Other Co');
    otherCompanyId = other.company_id;
    otherCashId = await ledgerIdOf(otherCompanyId, 'Cash');
  });

  const receiptDraft = (overrides = {}) => ({
    voucher_type: 'Receipt',
    date: '2026-04-10',
    entries: [
      { ledger_id: ids.cash, type: 'Dr', amount: 1000 },
      { ledger_id: ids.party, type: 'Cr', amount: 1000 },
    ],
    ...overrides,
  });

  const propose = (payload, summary = 'Receipt from Alpha') =>
    callTool('propose', { action: 'create_voucher', summary, payload }, ctx);

  it('exposes exactly 3 tools (not one per channel)', () => {
    expect(TOOL_DEFS.map((t) => t.name).sort()).toEqual(['lookup', 'propose', 'query']);
  });

  it('resolves an env-only OpenAI-compatible config, defaulting to Groq', () => {
    const saved = {
      AI_API_KEY: process.env.AI_API_KEY,
      AI_BASE_URL: process.env.AI_BASE_URL,
      AI_MODEL: process.env.AI_MODEL,
    };
    try {
      delete process.env.AI_API_KEY;
      expect(getConfig()).toBeNull(); // no key configured → not available

      process.env.AI_API_KEY = 'gsk_testkey_0123456789';
      delete process.env.AI_BASE_URL;
      delete process.env.AI_MODEL;
      const cfg = getConfig();
      expect(cfg.apiKey).toBe('gsk_testkey_0123456789');
      expect(cfg.baseUrl).toBe(GROQ_BASE_URL); // defaults to Groq's endpoint
      expect(cfg.model).toBe(GROQ_DEFAULT_MODEL);

      process.env.AI_BASE_URL = 'https://api.deepseek.com/v1';
      process.env.AI_MODEL = 'deepseek-chat';
      const custom = getConfig();
      expect(custom.baseUrl).toBe('https://api.deepseek.com/v1'); // any OpenAI-compatible host
      expect(custom.model).toBe('deepseek-chat');
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });

  it('query routes to reports by resource enum', async () => {
    const tb = await callTool('query', { resource: 'trial_balance' }, ctx);
    expect(tb.success).toBe(true);
    expect(Array.isArray(tb.rows)).toBe(true);

    const ledgers = await callTool('query', { resource: 'ledgers' }, ctx);
    expect(ledgers.success).toBe(true);
    expect(Array.isArray(ledgers.ledgers)).toBe(true);
    expect(ledgers.ledgers.length).toBeGreaterThan(0); // seeded masters
  });

  it('query refuses unknown resources and missing company', async () => {
    await expect(callTool('query', { resource: 'nope' }, ctx)).rejects.toThrow(/Unknown resource/);
    await expect(callTool('query', { resource: 'trial_balance' }, {})).rejects.toThrow(
      /No active company/,
    );
  });

  it('lookup resolves a seeded ledger name to an id', async () => {
    const res = await callTool('lookup', { kind: 'ledger', query: 'Cash' }, ctx);
    expect(Array.isArray(res.matches)).toBe(true);
    const cash = res.matches.find((m) => m.name === 'Cash');
    expect(cash && typeof cash.id).toBe('number');
  });

  it('lookup returns numeric ids for stock items (F6)', async () => {
    await stockItemService.create({ company_id: ctx.company_id, name: 'Copilot Widget' });
    const res = await callTool('lookup', { kind: 'stock_item', query: 'copilot' }, ctx);
    expect(res.matches).toHaveLength(1);
    expect(typeof res.matches[0].id).toBe('number');
  });

  it('propose drafts a reviewable action and never executes', async () => {
    const before = await countVouchers(ctx.company_id);
    const res = await propose(receiptDraft());

    expect(res.ok).toBe(true);
    const p = res.proposal;
    expect(p.requiresApproval).toBe(true);
    expect(p.channel).toBe('automation:createVoucher');
    expect(p.args).toMatchObject({
      company_id: ctx.company_id, // context injected
      fy_id: ctx.fy_id,
      is_accounting_voucher: 1, // Dr = Cr enforced again on save
      as_voucher_mode: 1, // lines saved exactly as previewed
    });
    // Ledger names come from the books, not from the model.
    expect(p.args.entries.map((e) => e.ledger_name)).toEqual(['Cash', 'Alpha Traders']);
    expect(p.summary).toBe('Receipt of ₹1,000.00 on 2026-04-10');
    expect(p.note).toBe('Receipt from Alpha');
    expect(p.preview).toEqual(
      expect.arrayContaining([
        { label: 'Dr Cash', value: '₹1,000.00' },
        { label: 'Cr Alpha Traders', value: '₹1,000.00' },
      ]),
    );
    expect(await countVouchers(ctx.company_id)).toBe(before);
  });

  // Each change runs inside its test, after beforeAll has created the ids it uses.
  it.each([
    ['an unbalanced voucher', (d) => (d.entries[1].amount = 900), /Debit total must equal/],
    [
      'an unbalanced GST-type voucher (validatePayload alone only warns)',
      (d) => {
        d.voucher_type = 'Sales';
        d.entries[1].amount = 900;
      },
      /Debit total must equal credit total/,
    ],
    [
      "another company's ledger",
      (d) => (d.entries[0].ledger_id = otherCashId),
      /not a ledger of the active company/,
    ],
    ['a date outside the financial year', (d) => (d.date = '2026-03-31'), /inside the financial/],
    [
      'a company_id other than the active company',
      (d) => (d.company_id = otherCompanyId),
      /only be drafted for the active company/,
    ],
    ['a Payroll voucher', (d) => (d.voucher_type = 'Payroll'), /Payroll vouchers cannot/],
  ])('propose rejects %s', async (_label, change, error) => {
    const draft = receiptDraft();
    change(draft);
    const res = await propose(draft);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(error);
  });

  it('approving through automation:createVoucher saves exactly the previewed lines', async () => {
    // A Sales voucher with GST lines: the case where the GST engine would otherwise
    // recompute the tax ledgers from (absent) stock lines and rewrite the party line.
    const res = await propose({
      voucher_type: 'Sales',
      date: '2026-05-01',
      party_ledger_id: ids.party,
      entries: [
        { ledger_id: ids.party, type: 'Dr', amount: 1180 },
        { ledger_id: ids.sales, type: 'Cr', amount: 1000 },
        { ledger_id: ids.cgst, type: 'Cr', amount: 90 },
        { ledger_id: ids.sgst, type: 'Cr', amount: 90 },
      ],
    });
    expect(res.ok).toBe(true);

    const saved = await automationController.createVoucher(null, res.proposal.args);
    expect(saved.success).toBe(true);
    expect(typeof saved.voucher_id).toBe('number');
    expect(saved.voucher_number).toBeTruthy();

    const lines = await db.execute(
      'SELECT ledger_id, type, amount FROM voucher_entries WHERE voucher_id = ? ORDER BY entry_id',
      [saved.voucher_id],
    );
    expect(lines.rows.map((r) => [Number(r.ledger_id), r.type, Number(r.amount)])).toEqual([
      [ids.party, 'Dr', 1180],
      [ids.sales, 'Cr', 1000],
      [ids.cgst, 'Cr', 90],
      [ids.sgst, 'Cr', 90],
    ]);
  });

  it('propose reports missing required fields instead of guessing', async () => {
    const res = await callTool('propose', { action: 'reconcile', payload: { entry_id: 5 } }, ctx);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/voucher_id|ledger_id/);
  });
});
