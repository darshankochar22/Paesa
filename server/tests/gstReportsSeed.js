// Shared seed for the gstReports* suites — one configured GST company with a valid
// registration, registered/GSTIN-less parties on both sides and one intra-state
// sales + purchase invoice (April) whose stock lines carry deterministic 18% GST.
// Each suite calls this in its own beforeAll (fresh test DB per file); tests keep
// themselves independent by scoping to their own return period/month.

const { setupTestDB, createTestCompany, db } = require('./helpers');
const ledgerService = require('../ledger/ledgerService');
const voucherController = require('../voucher/voucherController');

const ledgerId = (res) => res.ledger?.ledger_id ?? res.ledger_id ?? res.id;

const seedGstReportsCompany = async () => {
  let companyId, fyId, partyId, salesId, creditorId, purchaseId, noGstCustomerId, noGstSupplierId;
  await setupTestDB();
  const company = await createTestCompany('GST Reports Test Co');
  companyId = company.company_id;
  const fyResult = await db.execute(
    `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
    [companyId],
  );
  fyId = fyResult.rows[0].fy_id;

  // A configured company owns a valid GST registration; its NULL-registration legacy
  // vouchers (the sales/purchase below) attach to it as primary. Without this the shared
  // classifier correctly marks every outward voucher Uncertain (invalid company GSTIN).
  await db.execute(
    `INSERT INTO gst_registrations (company_id, state_id, gstin, registration_type, registration_status, is_active) VALUES (?, ?, ?, 'Regular', 'Active', 1)`,
    [companyId, 'Maharashtra', '27ABCDE1234F1Z5'],
  );

  const party = await ledgerService.create({
    company_id: companyId,
    name: 'GST Customer',
    gstin: '27ABCDE1234F1Z5',
    state: 'Maharashtra',
    country: 'India',
    registration_type: 'Regular',
  });
  partyId = ledgerId(party);
  salesId = ledgerId(await ledgerService.create({ company_id: companyId, name: 'GST Sales A/c' }));
  const creditor = await ledgerService.create({
    company_id: companyId,
    name: 'GST Supplier',
    gstin: '29ABCDE1234F1Z5',
    state: 'Karnataka',
    country: 'India',
    registration_type: 'Regular',
  });
  creditorId = ledgerId(creditor);
  purchaseId = ledgerId(
    await ledgerService.create({ company_id: companyId, name: 'GST Purchase A/c' }),
  );

  // A genuine walk-in consumer: no GSTIN AND Unregistered → a valid B2C sale, never flagged.
  // (A party marked *Registered* but missing its GSTIN is the "corrections needed" case —
  // exercised by the registered No-GSTIN Supplier below and the outward reg-party test.)
  noGstCustomerId = ledgerId(
    await ledgerService.create({
      company_id: companyId,
      name: 'No-GSTIN Customer',
      state: 'Maharashtra',
      country: 'India',
      registration_type: 'Unregistered',
    }),
  );
  // A registered supplier whose GSTIN is left blank — the real "corrections needed" case
  // (its GSTIN is mandatory for ITC / 2A / 2B matching), driving the uncertain-voucher tests.
  noGstSupplierId = ledgerId(
    await ledgerService.create({
      company_id: companyId,
      name: 'No-GSTIN Supplier',
      state: 'Karnataka',
      country: 'India',
      registration_type: 'Regular',
    }),
  );

  // Sales invoice — taxable 10000, intra-state 18% → CGST 900 + SGST 900.
  const salesRes = await voucherController.create(null, {
    company_id: companyId,
    fy_id: fyId,
    voucher_type: 'Sales',
    date: '2026-04-10',
    status: 'Regular',
    reference_number: 'INV-1',
    place_of_supply: 'Maharashtra',
    party_ledger_id: partyId,
    party_name: 'GST Customer',
    is_accounting_voucher: 1,
    is_invoice: 1,
    is_inventory_voucher: 1,
    is_order_voucher: 0,
    is_post_dated: 0,
    entries: [
      {
        ledger_id: partyId,
        ledger_name: 'GST Customer',
        type: 'Dr',
        amount: 11800,
        currency: 'INR',
      },
      {
        ledger_id: salesId,
        ledger_name: 'GST Sales A/c',
        type: 'Cr',
        amount: 11800,
        currency: 'INR',
      },
    ],
    stock_entries: [{ item_name: 'Widget', quantity: 10, rate: 1000, hsn_code: '8471' }],
  });

  // Purchase invoice — taxable 5000, intra-state 18% → CGST 450 + SGST 450.
  const purchaseRes = await voucherController.create(null, {
    company_id: companyId,
    fy_id: fyId,
    voucher_type: 'Purchase',
    date: '2026-04-12',
    status: 'Regular',
    reference_number: 'PINV-1',
    place_of_supply: 'Karnataka',
    party_ledger_id: creditorId,
    party_name: 'GST Supplier',
    is_accounting_voucher: 1,
    is_invoice: 1,
    is_inventory_voucher: 1,
    is_order_voucher: 0,
    is_post_dated: 0,
    entries: [
      {
        ledger_id: purchaseId,
        ledger_name: 'GST Purchase A/c',
        type: 'Dr',
        amount: 5900,
        currency: 'INR',
      },
      {
        ledger_id: creditorId,
        ledger_name: 'GST Supplier',
        type: 'Cr',
        amount: 5900,
        currency: 'INR',
      },
    ],
    stock_entries: [{ item_name: 'Component', quantity: 5, rate: 1000, hsn_code: '8473' }],
  });

  // voucher.create recomputes stock-entry GST from HSN-rate masters (zero in a bare
  // test company), so set the tax fields deterministically here — this test verifies
  // the REPORT layer, not the tax engine.
  const salesVid = salesRes.voucher.voucher_id;
  const purchaseVid = purchaseRes.voucher.voucher_id;
  await db.execute(
    `UPDATE voucher_stock_entries SET gst_rate = 18, cgst_amount = 900, sgst_amount = 900, igst_amount = 0 WHERE voucher_id = ?`,
    [salesVid],
  );
  await db.execute(
    `UPDATE voucher_stock_entries SET gst_rate = 18, cgst_amount = 450, sgst_amount = 450, igst_amount = 0 WHERE voucher_id = ?`,
    [purchaseVid],
  );
  return {
    companyId,
    fyId,
    partyId,
    salesId,
    creditorId,
    purchaseId,
    noGstCustomerId,
    noGstSupplierId,
  };
};

module.exports = { seedGstReportsCompany, ledgerId };
