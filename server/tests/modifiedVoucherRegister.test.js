// F11 "Mark modified vouchers": editing a voucher sets is_modified=1, and the
// modified_voucher_register report lists only altered vouchers. Non-destructive —
// the flag is stored unconditionally; the F11 flag gates the report's visibility
// on the client.

const { setupTestDB, createTestCompany, db } = require('./helpers');
const ledgerService = require('../ledger/ledgerService');
const voucherController = require('../voucher/voucherController');
const reportRuntime = require('../report/reportRuntime');

const lid = (r) => r.ledger?.ledger_id ?? r.ledger_id;

describe('modified voucher register', () => {
  let companyId, fyId, partyId, salesId;

  beforeAll(async () => {
    await setupTestDB();
    const c = await createTestCompany('Modified Vch Co');
    companyId = c.company_id;
    fyId = (
      await db.execute(`SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`, [
        companyId,
      ])
    ).rows[0].fy_id;
    partyId = lid(await ledgerService.create({ company_id: companyId, name: 'Cust M' }));
    salesId = lid(await ledgerService.create({ company_id: companyId, name: 'Sales M' }));
  });

  const mkVoucher = (date, amount) => ({
    company_id: companyId,
    fy_id: fyId,
    voucher_type: 'Sales',
    date,
    status: 'Regular',
    party_ledger_id: partyId,
    party_name: 'Cust M',
    is_accounting_voucher: 1,
    entries: [
      { ledger_id: partyId, ledger_name: 'Cust M', type: 'Dr', amount, currency: 'INR' },
      { ledger_id: salesId, ledger_name: 'Sales M', type: 'Cr', amount, currency: 'INR' },
    ],
  });

  const isModified = async (vid) =>
    Number(
      (await db.execute(`SELECT is_modified FROM vouchers WHERE voucher_id = ?`, [vid])).rows[0]
        .is_modified,
    );

  it('new vouchers are not modified; editing flags them', async () => {
    const a = (await voucherController.create(null, mkVoucher('2026-04-10', 1000))).voucher
      .voucher_id;
    const b = (await voucherController.create(null, mkVoucher('2026-04-11', 2000))).voucher
      .voucher_id;

    // Fresh vouchers carry no modified flag.
    expect(await isModified(a)).toBe(0);
    expect(await isModified(b)).toBe(0);

    // Edit only voucher A.
    const upd = await voucherController.update(null, { voucher_id: a, narration: 'changed' });
    expect(upd.success).toBe(true);
    expect(await isModified(a)).toBe(1);
    expect(await isModified(b)).toBe(0);

    // Report lists only the modified voucher.
    const res = await reportRuntime.runReport('modified_voucher_register', {
      company_id: companyId,
      fy_id: fyId,
    });
    expect(res.success).toBe(true);
    const ids = res.rows.map((r) => r.voucher_id);
    expect(ids).toContain(a);
    expect(ids).not.toContain(b);
  });
});
