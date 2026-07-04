// Test for the bulk tax-ledger setup utility (spec STEP 3): it must ensure the
// standard CGST/SGST/IGST/Cess Duties & Taxes ledgers exist, correctly tagged, and
// be idempotent — re-running never duplicates them.

const { setupTestDB, createTestCompany, db } = require('./helpers');
const { setupStandardTaxLedgers } = require('../gst/gstTaxEngine');

describe('GST bulk tax-ledger setup (STEP 3)', () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('GST Tax Ledger Setup Co');
    companyId = company.company_id;
  });

  const taggedGstLedgerCount = async () => {
    const res = await db.execute(
      `SELECT COUNT(*) AS n FROM ledgers l
       JOIN ledger_statutory_details sd ON sd.ledger_id = l.ledger_id
       WHERE l.company_id = ? AND l.is_active = 1 AND sd.type_of_duty_tax = 'GST'`,
      [companyId]
    );
    return Number(res.rows[0].n);
  };

  it('creates the standard set of tagged tax ledgers', async () => {
    const result = await setupStandardTaxLedgers(db, companyId);
    for (const t of ['CGST', 'SGST', 'IGST', 'CESS']) {
      expect(result[t]).toBeTruthy();
      expect(result[t].id).toBeTruthy();
    }
    expect(await taggedGstLedgerCount()).toBe(4);
  });

  it('is idempotent — a second run reuses the ledgers, never duplicating them', async () => {
    await setupStandardTaxLedgers(db, companyId);
    expect(await taggedGstLedgerCount()).toBe(4);
  });
});
