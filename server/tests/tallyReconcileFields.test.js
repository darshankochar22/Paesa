// Regression test for the permanent field-level import reconciliation. This is
// the guardrail that keeps master extraction at 100% — if a future change stops
// carrying a field, reconcileFields drops below full coverage and the import
// summary flags it automatically.
const { setupTestDB, createTestCompany, db } = require('./helpers');
const importer = require('../integrations/tally/importer');
const { reconcileFields } = require('../integrations/tally/verifyImport');

describe('Tally import field-level reconciliation', () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('Recon Fields Test Co');
    companyId = company.company_id;
  });

  const parsed = {
    groups: [{ name: 'Sundry Debtors', parent: 'Current Assets', nature: 'Assets' }],
    ledgers: [
      {
        name: 'Test Party GST',
        parent: 'Sundry Debtors',
        openingBalance: 5000,
        openingBalanceType: 'Dr',
        gstin: '29ABCDE1234F1Z5',
        registrationType: 'Regular',
        pan: 'ABCDE1234F',
        state: 'Karnataka',
        country: 'India',
        isBillWise: true,
      },
    ],
    stockItems: [
      {
        name: 'Recon Widget',
        baseUnit: 'Nos',
        hsnSac: '8471',
        gstRate: 18,
        taxability: 'Taxable',
        typeOfSupply: 'Goods',
      },
    ],
    vouchers: [],
  };

  it('reports 100% coverage after a faithful import', async () => {
    await importer.importMasters(parsed, { company_id: companyId, importMode: true });
    const r = await reconcileFields(db, parsed, companyId);
    expect(r.ok).toBe(true);
    expect(r.failed).toHaveLength(0);
    const gstin = r.checks.find((c) => c.master === 'ledger' && c.field === 'gstin');
    expect(gstin.matched).toBe(gstin.srcHas);
    expect(gstin.srcHas).toBeGreaterThan(0);
    const itemGroup = r.checks.find((c) => c.master === 'stock_item' && c.field === 'group_id');
    expect(itemGroup.ok).toBe(true); // stock item is linked to a stock group (Primary)
  });

  it('flags a field that stops matching (guardrail actually fires)', async () => {
    // Simulate a regression: blank out the imported GSTIN in the DB.
    await db.execute(
      `UPDATE ledgers SET gstin = NULL WHERE company_id = ? AND name = 'Test Party GST'`,
      [companyId],
    );
    const r = await reconcileFields(db, parsed, companyId);
    expect(r.ok).toBe(false);
    const gstin = r.failed.find((c) => c.master === 'ledger' && c.field === 'gstin');
    expect(gstin).toBeDefined();
    expect(gstin.missing).toBeGreaterThan(0);
  });
});
