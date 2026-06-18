const { setupTestDB, createTestCompany } = require('./helpers');
const tdsNatureOfPaymentController = require('../tdsNatureOfPayment/tdsNatureOfPaymentController');

describe('CRUD sweep: tdsNatureOfPayment (as the UI uses it)', () => {
  let company;

  beforeAll(async () => {
    await setupTestDB();
    company = await createTestCompany('TDS Nature Of Payment CRUD Co');
  });

  test('create persists every field the form submits (full payload)', async () => {
    // Payload mirrors TDSNatureOfPaymentCreation.tsx (incl. calculate_tax_on_exceeding_threshold)
    const payload = {
      company_id: company.company_id,
      name: 'Payment to Contractors',
      section: '194C',
      payment_code: 'PC01',
      remittance_code: 'RC01',
      rate_individual_with_pan: 1,
      rate_other_with_pan: 2,
      is_zero_rated: 0,
      threshold_limit: 30000,
      calculate_tax_on_exceeding_threshold: 1,
    };

    const res = await tdsNatureOfPaymentController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.tdsNatureOfPayment).toBeTruthy();
    const id = res.tdsNatureOfPayment.tds_id;
    expect(id).toBeTruthy();

    // Read back via getById and assert each submitted field actually persisted.
    const got = await tdsNatureOfPaymentController.getById(null, id);
    expect(got.success).toBe(true);
    const r = got.tdsNatureOfPayment;
    expect(r.name).toBe('Payment to Contractors');
    expect(r.section).toBe('194C');
    expect(r.payment_code).toBe('PC01');
    expect(r.remittance_code).toBe('RC01');
    expect(r.rate_individual_with_pan).toBe(1);
    expect(r.rate_other_with_pan).toBe(2);
    expect(r.is_zero_rated).toBe(0);
    expect(r.threshold_limit).toBe(30000);
    // Gotcha: this field is sent by one of the create forms; it must not be dropped.
    expect(r.calculate_tax_on_exceeding_threshold).toBe(1);
    expect(r.is_active).toBe(1);
    expect(r.is_predefined).toBe(0);
  });

  test('create with empty optional fields sent as undefined (hooks form) persists as null', async () => {
    // Mirrors useTDSNatureOfPaymentForm.ts handleSubmit: empty -> undefined.
    const payload = {
      company_id: company.company_id,
      name: 'Zero Rated Payment',
      section: undefined,
      payment_code: undefined,
      remittance_code: undefined,
      rate_individual_with_pan: 0,
      rate_other_with_pan: 0,
      is_zero_rated: 1,
      threshold_limit: 0,
      is_predefined: 0,
      is_active: 1,
    };

    const res = await tdsNatureOfPaymentController.create(null, payload);
    expect(res.success).toBe(true);
    const id = res.tdsNatureOfPayment.tds_id;

    const got = await tdsNatureOfPaymentController.getById(null, id);
    expect(got.success).toBe(true);
    const r = got.tdsNatureOfPayment;
    expect(r.name).toBe('Zero Rated Payment');
    expect(r.section == null).toBe(true);
    expect(r.payment_code == null).toBe(true);
    expect(r.remittance_code == null).toBe(true);
    expect(r.is_zero_rated).toBe(1);
  });

  test('getAll returns active rows for the company', async () => {
    const res = await tdsNatureOfPaymentController.getAll(null, company.company_id);
    expect(res.success).toBe(true);
    expect(Array.isArray(res.tdsNatureOfPaymentList)).toBe(true);
    expect(res.tdsNatureOfPaymentList.length).toBeGreaterThanOrEqual(2);
    const names = res.tdsNatureOfPaymentList.map((x) => x.name);
    expect(names).toContain('Payment to Contractors');
  });

  test('duplicate name (case-insensitive) is rejected', async () => {
    const res = await tdsNatureOfPaymentController.create(null, {
      company_id: company.company_id,
      name: 'payment to contractors',
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already exists/i);
  });

  test('update persists changed fields (and does not delete the row)', async () => {
    const created = await tdsNatureOfPaymentController.create(null, {
      company_id: company.company_id,
      name: 'Rent Payment',
      section: '194I',
      rate_individual_with_pan: 10,
      rate_other_with_pan: 10,
      threshold_limit: 240000,
    });
    expect(created.success).toBe(true);
    const id = created.tdsNatureOfPayment.tds_id;

    // Mirrors the alter form payload shape (snake_case + tds_id).
    const upd = await tdsNatureOfPaymentController.update(null, {
      tds_id: id,
      name: 'Rent Payment (Plant & Machinery)',
      section: '194I',
      payment_code: 'RENT-PM',
      remittance_code: 'RM-PM',
      rate_individual_with_pan: 2,
      rate_other_with_pan: 2,
      is_zero_rated: 0,
      threshold_limit: 50000,
      calculate_tax_on_exceeding_threshold: 1,
    });
    expect(upd.success).toBe(true);

    const got = await tdsNatureOfPaymentController.getById(null, id);
    expect(got.success).toBe(true);
    const r = got.tdsNatureOfPayment;
    expect(r.name).toBe('Rent Payment (Plant & Machinery)');
    expect(r.payment_code).toBe('RENT-PM');
    expect(r.remittance_code).toBe('RM-PM');
    expect(r.rate_individual_with_pan).toBe(2);
    expect(r.rate_other_with_pan).toBe(2);
    expect(r.threshold_limit).toBe(50000);
    expect(r.calculate_tax_on_exceeding_threshold).toBe(1);
    // row must still be active after update (catch update-handler-that-deletes bug)
    expect(r.is_active).toBe(1);
  });

  test('delete soft-removes the row (is_active=0) and drops it from getAll', async () => {
    const created = await tdsNatureOfPaymentController.create(null, {
      company_id: company.company_id,
      name: 'Temp Payment To Delete',
    });
    expect(created.success).toBe(true);
    const id = created.tdsNatureOfPayment.tds_id;

    const del = await tdsNatureOfPaymentController.delete(null, id);
    expect(del.success).toBe(true);

    // getById still finds it but is_active should be 0
    const got = await tdsNatureOfPaymentController.getById(null, id);
    expect(got.success).toBe(true);
    expect(got.tdsNatureOfPayment.is_active).toBe(0);

    // getAll (active only) must no longer include it
    const all = await tdsNatureOfPaymentController.getAll(null, company.company_id);
    const names = all.tdsNatureOfPaymentList.map((x) => x.name);
    expect(names).not.toContain('Temp Payment To Delete');
  });
});
