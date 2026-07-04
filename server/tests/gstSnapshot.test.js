// Integration tests for the GST voucher snapshot + freeze (manual tax model):
//   - a voucher captures its registration/company-state/interstate flag at save;
//   - changing the company's current default registration NEVER alters an existing
//     voucher — its GST identity is frozen and edits validate against its own data
//     (a manually CGST+SGST voucher stays valid intra-state after the default flips
//     to another state, instead of being rejected/substituted to IGST);
//   - a Composition registration blocks a manually-added GST ledger at save.

const { setupTestDB, createTestCompany, db } = require('./helpers');
const { gstHsnRates } = require('../db/schema');
const ledgerService = require('../ledger/ledgerService');
const gstRegistrationController = require('../gstRegistration/gstRegistrationController');
const voucherController = require('../voucher/voucherController');

const ledgerId = (res) => res.ledger?.ledger_id ?? res.ledger_id ?? res.id;

const createRegistration = async (companyId, payload) => {
  const res = await gstRegistrationController.create(null, { company_id: companyId, registration_status: 'Active', ...payload });
  if (!res.success) throw new Error(`gstRegistration create failed: ${res.error}`);
  return res.gstRegistration.gst_id;
};

const makeTaxLedger = (companyId, name, gstTaxType, rate) =>
  ledgerService.create({
    company_id: companyId, name,
    statutory_details: { type_of_duty_tax: 'GST', gst_tax_type: gstTaxType, gst_rate: rate },
  });

const setDefaultRegistration = (companyId, regId) =>
  db.execute(`UPDATE companies SET current_default_gst_registration_id = ? WHERE company_id = ?`, [regId, companyId]);

const voucherRow = async (voucherId) => {
  const res = await db.execute(
    `SELECT gst_registration_id, company_state, is_interstate FROM vouchers WHERE voucher_id = ?`,
    [voucherId]
  );
  return res.rows[0];
};

const taxTypes = async (voucherId) => {
  const res = await db.execute(
    `SELECT DISTINCT tax_type FROM gst_voucher_tax_lines WHERE voucher_id = ?`,
    [voucherId]
  );
  return res.rows.map((r) => r.tax_type).sort();
};

describe('GST snapshot — old voucher unaffected by default-registration change (manual model)', () => {
  let companyId, fyId, regMaha, regKarnataka, partyId, salesId, cgstId, sgstId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('GST Snapshot Test Co');
    companyId = company.company_id;
    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;

    regMaha = await createRegistration(companyId, { registration_type: 'Regular', state_id: 'Maharashtra', gstin: '27ABCDE1234F1Z5' });
    regKarnataka = await createRegistration(companyId, { registration_type: 'Regular', state_id: 'Karnataka', gstin: '29ABCDE1234F1Z5' });

    const party = await ledgerService.create({
      company_id: companyId, name: 'Snapshot Customer', state: 'Maharashtra', country: 'India', registration_type: 'Regular',
    });
    partyId = ledgerId(party);
    salesId = ledgerId(await ledgerService.create({ company_id: companyId, name: 'Snapshot Sales A/c' }));
    cgstId = ledgerId(await makeTaxLedger(companyId, 'Output CGST @9%', 'CGST', 9));
    sgstId = ledgerId(await makeTaxLedger(companyId, 'Output SGST @9%', 'SGST/UTGST', 9));

    await db.insert(gstHsnRates).values({
      companyId, hsnCode: '8471', effectiveFrom: '2026-01-01', gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18,
    });
  });

  const salesEntries = () => [
    { ledger_id: partyId, ledger_name: 'Snapshot Customer', type: 'Dr', amount: 11800, currency: 'INR' },
    { ledger_id: salesId, ledger_name: 'Snapshot Sales A/c', type: 'Cr', amount: 10000, currency: 'INR' },
    { ledger_id: cgstId, ledger_name: 'Output CGST @9%', type: 'Cr', amount: 900, currency: 'INR' },
    { ledger_id: sgstId, ledger_name: 'Output SGST @9%', type: 'Cr', amount: 900, currency: 'INR' },
  ];
  const stockEntries = () => [{ item_name: 'Widget', quantity: 10, rate: 1000, hsn_code: '8471' }];

  const createSalesVoucher = () => voucherController.create(null, {
    company_id: companyId, fy_id: fyId, voucher_type: 'Sales', date: '2026-04-10',
    status: 'Regular', reference_number: `SNAP-${Date.now()}-${Math.random()}`, place_of_supply: 'Maharashtra',
    party_ledger_id: partyId, party_name: 'Snapshot Customer',
    is_accounting_voucher: 1, is_invoice: 1, is_inventory_voucher: 1,
    entries: salesEntries(), stock_entries: stockEntries(),
  });

  it('keeps the manually-selected CGST+SGST valid even after the company default flips state', async () => {
    // Default = Maharashtra registration; party is Maharashtra ⇒ intra-state; CGST+SGST valid.
    await setDefaultRegistration(companyId, regMaha);

    const created = await createSalesVoucher();
    expect(created.success).toBe(true);
    const voucherId = created.voucher.voucher_id;

    const snapAtCreate = await voucherRow(voucherId);
    expect(Number(snapAtCreate.gst_registration_id)).toBe(Number(regMaha));
    expect(snapAtCreate.company_state).toBe('Maharashtra');
    expect(Number(snapAtCreate.is_interstate)).toBe(0);
    expect(await taxTypes(voucherId)).toEqual(['CGST', 'SGST']);

    // Flip the company default to a DIFFERENT state. Without the snapshot freeze the edit
    // would recompute interstate=true and REJECT the CGST+SGST ledgers; the freeze keeps it
    // intra-state so the same manual ledgers stay valid and unchanged.
    await setDefaultRegistration(companyId, regKarnataka);

    const updated = await voucherController.update(null, {
      voucher_id: voucherId, company_id: companyId, voucher_type: 'Sales',
      is_accounting_voucher: 1, party_ledger_id: partyId, place_of_supply: 'Maharashtra', date: '2026-04-10',
      entries: salesEntries(), stock_entries: stockEntries(),
    });
    expect(updated.success).toBe(true);

    const snapAfterEdit = await voucherRow(voucherId);
    expect(Number(snapAfterEdit.gst_registration_id)).toBe(Number(regMaha)); // unchanged
    expect(snapAfterEdit.company_state).toBe('Maharashtra');                 // unchanged
    expect(Number(snapAfterEdit.is_interstate)).toBe(0);                     // still intra
    expect(await taxTypes(voucherId)).toEqual(['CGST', 'SGST']);             // still CGST+SGST
  });

  it('bug 5: saving a voucher with an explicit registration persists it as the company default', async () => {
    // Set default to Maharashtra, then save a voucher that explicitly chooses Karnataka.
    await setDefaultRegistration(companyId, regMaha);
    const res = await voucherController.create(null, {
      company_id: companyId, fy_id: fyId, voucher_type: 'Sales', date: '2026-04-11',
      status: 'Regular', reference_number: `SNAP-REG-${Date.now()}`, place_of_supply: 'Karnataka',
      party_ledger_id: partyId, party_name: 'Snapshot Customer',
      gst_registration_id: regKarnataka,
      is_accounting_voucher: 1, is_invoice: 1, is_inventory_voucher: 1,
      entries: [
        { ledger_id: partyId, ledger_name: 'Snapshot Customer', type: 'Dr', amount: 10000, currency: 'INR' },
        { ledger_id: salesId, ledger_name: 'Snapshot Sales A/c', type: 'Cr', amount: 10000, currency: 'INR' },
      ],
      stock_entries: [{ item_name: 'Widget', quantity: 10, rate: 1000, hsn_code: '8471' }],
    });
    expect(res.success).toBe(true);

    const company = await db.execute(
      `SELECT current_default_gst_registration_id AS def FROM companies WHERE company_id = ?`, [companyId]
    );
    expect(Number(company.rows[0].def)).toBe(Number(regKarnataka)); // the chosen reg is now the default
  });
});

describe('GST snapshot — Composition registration blocks a manually-added GST ledger', () => {
  let companyId, fyId, partyId, salesId, cgstId, sgstId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('GST Composition Test Co');
    companyId = company.company_id;
    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;

    const reg = await createRegistration(companyId, { registration_type: 'Composition', state_id: 'Maharashtra', gstin: '27ABCDE1234F1Z5' });
    await setDefaultRegistration(companyId, reg);

    const party = await ledgerService.create({ company_id: companyId, name: 'Composition Customer', state: 'Maharashtra', country: 'India' });
    partyId = ledgerId(party);
    salesId = ledgerId(await ledgerService.create({ company_id: companyId, name: 'Composition Sales A/c' }));
    cgstId = ledgerId(await makeTaxLedger(companyId, 'Comp CGST @9%', 'CGST', 9));
    sgstId = ledgerId(await makeTaxLedger(companyId, 'Comp SGST @9%', 'SGST/UTGST', 9));

    await db.insert(gstHsnRates).values({
      companyId, hsnCode: '8471', effectiveFrom: '2026-01-01', gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18,
    });
  });

  it('rejects a Sales voucher that manually adds GST ledgers under Composition', async () => {
    const res = await voucherController.create(null, {
      company_id: companyId, fy_id: fyId, voucher_type: 'Sales', date: '2026-04-10',
      status: 'Regular', reference_number: `COMP-${Date.now()}`, place_of_supply: 'Maharashtra',
      party_ledger_id: partyId, party_name: 'Composition Customer',
      is_accounting_voucher: 1, is_invoice: 1, is_inventory_voucher: 1,
      entries: [
        { ledger_id: partyId, ledger_name: 'Composition Customer', type: 'Dr', amount: 11800, currency: 'INR' },
        { ledger_id: salesId, ledger_name: 'Composition Sales A/c', type: 'Cr', amount: 10000, currency: 'INR' },
        { ledger_id: cgstId, ledger_name: 'Comp CGST @9%', type: 'Cr', amount: 900, currency: 'INR' },
        { ledger_id: sgstId, ledger_name: 'Comp SGST @9%', type: 'Cr', amount: 900, currency: 'INR' },
      ],
      stock_entries: [{ item_name: 'Widget', quantity: 10, rate: 1000, hsn_code: '8471' }],
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Composition/);
  });
});
