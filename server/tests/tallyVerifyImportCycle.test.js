// Regression guard for F1: verifyImport.js and binImportRunner.js required each other
// at load time. Whichever loaded second saw the other's exports before they were
// assigned (an empty object): in the app (binImportRunner first) reconcile() had no
// adapt(), and in any process that loaded verifyImport first, importParsed's field
// self-check silently degraded to { ok: null, error }.
//
// Each load order needs its own module registry, so the app order runs inside
// jest.isolateModules. The decoder is mocked because there is no committable .1800
// fixture (the only real ones are customer data).

const mockExtract = jest.fn();
jest.mock('../integrations/tally/binExtract', () => ({
  ...jest.requireActual('../integrations/tally/binExtract'),
  extractCompany: (...a) => mockExtract(...a),
}));

// Load order under test: verifyImport FIRST, as the reconcile CLI does.
require('../integrations/tally/verifyImport');
const { setupTestDB, db } = require('./helpers');
const { adapt, importParsed } = require('../integrations/tally/binImportRunner');

const MASTERS = {
  groups: [],
  ledgers: [
    {
      name: 'Cycle Customer',
      parent: 'Sundry Debtors',
      opening_balance: 100,
      opening_balance_type: 'Dr',
    },
    { name: 'Cycle Sales', parent: 'Sales Accounts' },
  ],
  stockItems: [],
  units: [],
  godowns: [],
  voucherTypes: [],
};

const VOUCHERS = [
  {
    date: '2025-04-10',
    voucher_type: 'Sales',
    number: 'C-1',
    entries: [
      { ledger_name: 'Cycle Customer', dr_cr: 'Dr', amount: 500 },
      { ledger_name: 'Cycle Sales', dr_cr: 'Cr', amount: 500 },
    ],
    inventory: [],
  },
];

describe('verifyImport / binImportRunner load order (F1)', () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    mockExtract.mockReturnValue({ masters: MASTERS, vouchers: VOUCHERS, stats: {} });
  });

  it('runs the import self-check when verifyImport was loaded first', async () => {
    const { parsed } = adapt(MASTERS, { vouchers: VOUCHERS }, {});
    const summary = await importParsed(parsed, {
      company: 'Cycle Order Co',
      fyStart: '2025-04-01',
    });
    companyId = summary.company.company_id;

    expect(summary.reconciliation.error).toBeUndefined();
    expect(typeof summary.reconciliation.ok).toBe('boolean');
  });

  it('lets reconcile() adapt the source when binImportRunner was loaded first (the app order)', async () => {
    let appOrderReconcile;
    jest.isolateModules(() => {
      require('../integrations/tally/binImportRunner');
      ({ reconcile: appOrderReconcile } = require('../integrations/tally/verifyImport'));
    });

    const r = await appOrderReconcile(db, 'synthetic-folder', companyId);

    expect(mockExtract).toHaveBeenCalledWith('synthetic-folder');
    expect(r.checks.find((c) => c.label === 'Vouchers (importable)')).toMatchObject({
      ok: true,
      detail: 'source 1, db 1',
    });
  });
});
