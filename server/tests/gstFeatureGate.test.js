// F11 "Enable GST" is a COMPUTATION gate, not just a UI toggle (#2 audit fix).
// enable_gst now defaults ON (hybrid decision) so existing behaviour is unchanged;
// turning it OFF genuinely stops the GST engine from recomputing tax lines on save.

const { setupTestDB, createTestCompany, db } = require('./helpers');
const { gstHsnRates } = require('../db/schema');
const ledgerService = require('../ledger/ledgerService');
const gstRegistrationController = require('../gstRegistration/gstRegistrationController');
const voucherController = require('../voucher/voucherController');

const ledgerId = (res) => res.ledger?.ledger_id ?? res.ledger_id ?? res.id;
const makeTaxLedger = (companyId, name, gstTaxType, rate) =>
  ledgerService.create({
    company_id: companyId,
    name,
    statutory_details: { type_of_duty_tax: 'GST', gst_tax_type: gstTaxType, gst_rate: rate },
  });

const taxLineCount = async (voucherId) =>
  (
    await db.execute(`SELECT COUNT(*) AS n FROM gst_voucher_tax_lines WHERE voucher_id = ?`, [
      voucherId,
    ])
  ).rows[0].n;

const setGst = (companyId, on) =>
  db.execute(`UPDATE tally_features SET enable_gst = ? WHERE company_id = ?`, [
    on ? 1 : 0,
    companyId,
  ]);

describe('enable_gst computation gate (#2)', () => {
  let companyId, fyId, partyId, salesId, cgstId, sgstId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('GST Gate Co');
    companyId = company.company_id;
    fyId = (
      await db.execute(`SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`, [
        companyId,
      ])
    ).rows[0].fy_id;

    const reg = await gstRegistrationController.create(null, {
      company_id: companyId,
      registration_type: 'Regular',
      state_id: 'Maharashtra',
      gstin: '27ABCDE1234F1Z5',
      registration_status: 'Active',
    });
    await db.execute(
      `UPDATE companies SET current_default_gst_registration_id = ? WHERE company_id = ?`,
      [reg.gstRegistration.gst_id, companyId],
    );

    partyId = ledgerId(
      await ledgerService.create({
        company_id: companyId,
        name: 'Gate Customer',
        gstin: '27ZZZZZ1234F1Z5',
        state: 'Maharashtra',
        country: 'India',
        registration_type: 'Regular',
      }),
    );
    salesId = ledgerId(
      await ledgerService.create({ company_id: companyId, name: 'Gate Sales A/c' }),
    );
    cgstId = ledgerId(await makeTaxLedger(companyId, 'Output CGST @9%', 'CGST', 9));
    sgstId = ledgerId(await makeTaxLedger(companyId, 'Output SGST @9%', 'SGST/UTGST', 9));

    // HSN 8471 @ 18% so the stock item is taxable (not exempt/nil-rated).
    await db.insert(gstHsnRates).values({
      companyId,
      hsnCode: '8471',
      effectiveFrom: '2026-01-01',
      gstRate: 18,
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 18,
    });
  });

  // A balanced Sales voucher carrying CGST+SGST tax ledgers (900 each). The GST
  // engine records tax lines only when it runs — so the accounting balances in
  // both cases, but the gst_voucher_tax_lines table reveals whether the engine fired.
  const postGstVoucher = () =>
    voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-04-10',
      status: 'Regular',
      reference_number: `INV-${Math.random()}`,
      party_ledger_id: partyId,
      party_name: 'Gate Customer',
      is_accounting_voucher: 1,
      is_invoice: 1,
      is_inventory_voucher: 1,
      place_of_supply: 'Maharashtra',
      entries: [
        {
          ledger_id: partyId,
          ledger_name: 'Gate Customer',
          type: 'Dr',
          amount: 11800,
          currency: 'INR',
        },
        {
          ledger_id: salesId,
          ledger_name: 'Gate Sales A/c',
          type: 'Cr',
          amount: 10000,
          currency: 'INR',
        },
        {
          ledger_id: cgstId,
          ledger_name: 'Output CGST @9%',
          type: 'Cr',
          amount: 900,
          currency: 'INR',
        },
        {
          ledger_id: sgstId,
          ledger_name: 'Output SGST @9%',
          type: 'Cr',
          amount: 900,
          currency: 'INR',
        },
      ],
      stock_entries: [{ item_name: 'Widget', quantity: 10, rate: 1000, hsn_code: '8471' }],
    });

  it('GST on (default): engine fires and records tax lines', async () => {
    await setGst(companyId, true);
    const res = await postGstVoucher();
    expect(res.success).toBe(true);
    expect(await taxLineCount(res.voucher.voucher_id)).toBe(2);
  });

  it('GST off: engine is skipped, no tax lines recorded (voucher still balances)', async () => {
    await setGst(companyId, false);
    const res = await postGstVoucher();
    expect(res.success).toBe(true);
    expect(await taxLineCount(res.voucher.voucher_id)).toBe(0);
  });
});
