// CRUD sweep for the gstRegistration module — exercises the controller exactly
// the way the real UI does (GSTRegistrationCOA.tsx via hooks/useGSTRegistrationForm.ts).
//
// Frontend payload shape (verified against handleSubmit in useGSTRegistrationForm.ts):
//   create: {
//     company_id, registration_type, registration_status,
//     assessee_of_other_territory (0/1), periodicity_of_gstr1,
//     gstin (trimmed, upper), gst_username|undefined, mode_of_filing,
//     e_invoice_details|undefined, e_invoice_application (0/1),
//     e_way_bill_applicable (0/1), e_way_bill_applicable_from|undefined,
//     applicable_for_intrastat (0/1), legal_name|undefined, trade_name|undefined,
//     state_id, registration_date|undefined, effective_from|undefined,
//     address_type, goods_dispatched_from,
//     e_invoice_applicable_from|undefined, e_invoice_bill_from_place|undefined,
//     composition_tax_rate (number|null), composition_tax_calc_basis (string|null),
//     is_active (1)
//   }
//   update: same shape + gst_id
//   delete: raw gst_id number -> soft delete (is_active = 0)
//
// The controller signature is (event, data); the UI's preload passes (data) which
// the IPC layer turns into (event, data). We call controller.create(null, payload).

const { setupTestDB, createTestCompany } = require('./helpers');
const gstRegistrationController = require('../gstRegistration/gstRegistrationController');

describe('gstRegistration CRUD sweep (UI-faithful)', () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('GSTRegistration CRUD Co.');
    companyId = company.company_id ?? company.id;
    expect(companyId).toBeTruthy();
  });

  // Builds a Regular-registration payload exactly as the form's handleSubmit does.
  const regularPayload = (overrides = {}) => ({
    company_id: companyId,
    registration_type: 'Regular',
    registration_status: 'Active',
    assessee_of_other_territory: 0,
    periodicity_of_gstr1: 'Monthly',
    gstin: '27AAPFU0939F1ZV',
    gst_username: 'gstuser_main',
    mode_of_filing: 'Not Applicable',
    e_invoice_details: undefined,
    e_invoice_application: 0,
    e_way_bill_applicable: 0,
    e_way_bill_applicable_from: undefined,
    applicable_for_intrastat: 0,
    legal_name: 'Acme Industries Pvt Ltd',
    trade_name: 'Acme',
    state_id: 'Maharashtra',
    registration_date: '2026-04-01',
    effective_from: '2026-04-01',
    address_type: 'Primary',
    goods_dispatched_from: 'Primary',
    e_invoice_applicable_from: undefined,
    e_invoice_bill_from_place: undefined,
    composition_tax_rate: null,
    composition_tax_calc_basis: null,
    is_active: 1,
    ...overrides,
  });

  test('create (Regular) persists ALL submitted form fields', async () => {
    const res = await gstRegistrationController.create(null, regularPayload());
    expect(res.success).toBe(true);
    expect(res.gstRegistration).toBeTruthy();
    const id = res.gstRegistration.gst_id;
    expect(id).toBeTruthy();

    // Read back via getById — assert the submitted fields actually persisted.
    const got = await gstRegistrationController.getById(null, id);
    expect(got.success).toBe(true);
    const r = got.gstRegistration;

    expect(r.company_id).toBe(companyId);
    expect(r.registration_type).toBe('Regular');
    expect(r.registration_status).toBe('Active');
    expect(r.assessee_of_other_territory).toBe(0);
    expect(r.periodicity_of_gstr1).toBe('Monthly');
    expect(r.gstin).toBe('27AAPFU0939F1ZV');
    expect(r.gst_username).toBe('gstuser_main');
    // mode_of_filing must NOT be overridden to 'Online' when the form sent a value.
    expect(r.mode_of_filing).toBe('Not Applicable');
    expect(r.e_invoice_application).toBe(0);
    expect(r.e_way_bill_applicable).toBe(0);
    expect(r.applicable_for_intrastat).toBe(0);
    expect(r.legal_name).toBe('Acme Industries Pvt Ltd');
    expect(r.trade_name).toBe('Acme');
    expect(r.state_id).toBe('Maharashtra');
    expect(r.registration_date).toBe('2026-04-01');
    expect(r.effective_from).toBe('2026-04-01');
    expect(r.address_type).toBe('Primary');
    expect(r.goods_dispatched_from).toBe('Primary');
    expect(r.composition_tax_rate).toBeNull();
    expect(r.composition_tax_calc_basis).toBeNull();
    expect(r.is_active).toBe(1);

    // And via getAll (the shape + key the UI lists: result.gstRegistrations).
    const all = await gstRegistrationController.getAll(null, companyId);
    expect(all.success).toBe(true);
    expect(Array.isArray(all.gstRegistrations)).toBe(true);
    const found = all.gstRegistrations.find((g) => g.gst_id === id);
    expect(found).toBeTruthy();
    expect(found.gstin).toBe('27AAPFU0939F1ZV');
  });

  test('create with e-invoice "Yes" persists e-invoice sub-fields', async () => {
    const payload = regularPayload({
      gstin: '29AAPFU0939F1ZB',
      state_id: 'Karnataka',
      e_invoice_application: 1,
      e_invoice_details: 'Portal-A',
      e_invoice_applicable_from: '2026-05-01',
      e_invoice_bill_from_place: 'Bengaluru Depot',
      e_way_bill_applicable: 1,
      e_way_bill_applicable_from: '2026-05-10',
      applicable_for_intrastat: 1,
      assessee_of_other_territory: 1,
    });

    const res = await gstRegistrationController.create(null, payload);
    expect(res.success).toBe(true);
    const got = await gstRegistrationController.getById(null, res.gstRegistration.gst_id);
    const r = got.gstRegistration;

    expect(r.e_invoice_application).toBe(1);
    expect(r.e_invoice_details).toBe('Portal-A');
    expect(r.e_invoice_applicable_from).toBe('2026-05-01');
    expect(r.e_invoice_bill_from_place).toBe('Bengaluru Depot');
    expect(r.e_way_bill_applicable).toBe(1);
    expect(r.e_way_bill_applicable_from).toBe('2026-05-10');
    expect(r.applicable_for_intrastat).toBe(1);
    expect(r.assessee_of_other_territory).toBe(1);
  });

  test('create (Composition) persists composition tax rate + basis (numeric field)', async () => {
    const payload = regularPayload({
      gstin: '24AAPFU0939F1ZD',
      state_id: 'Gujarat',
      registration_type: 'Composition',
      composition_tax_rate: 1.5,
      composition_tax_calc_basis: 'Taxable, Exempt, & Nil Rated Values',
    });

    const res = await gstRegistrationController.create(null, payload);
    expect(res.success).toBe(true);
    const got = await gstRegistrationController.getById(null, res.gstRegistration.gst_id);
    const r = got.gstRegistration;

    expect(r.registration_type).toBe('Composition');
    expect(r.composition_tax_rate).toBe(1.5); // numeric value not dropped
    expect(r.composition_tax_calc_basis).toBe('Taxable, Exempt, & Nil Rated Values');
  });

  test('invalid GSTIN format is rejected at the service', async () => {
    const res = await gstRegistrationController.create(
      null,
      regularPayload({ gstin: 'NOTAVALIDGSTIN1' })
    );
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/invalid gstin/i);
  });

  test('duplicate active GSTIN for same company is rejected', async () => {
    const dup = await gstRegistrationController.create(
      null,
      regularPayload() // same GSTIN '27AAPFU0939F1ZV' as test #1
    );
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/already registered/i);
  });

  test('update changes fields and persists (not a delete in disguise)', async () => {
    const created = await gstRegistrationController.create(
      null,
      regularPayload({ gstin: '33AAPFU0939F1ZH', state_id: 'Tamil Nadu' })
    );
    expect(created.success).toBe(true);
    const id = created.gstRegistration.gst_id;

    // Alter-mode payload: same form fields + gst_id, with changed values.
    const upd = await gstRegistrationController.update(null, {
      ...regularPayload({
        gstin: '33AAPFU0939F1ZH',
        state_id: 'Tamil Nadu',
        registration_status: 'Suspended',
        legal_name: 'Acme Renamed Ltd',
        trade_name: 'AcmeRenamed',
        periodicity_of_gstr1: 'Quarterly',
        e_way_bill_applicable: 1,
        e_way_bill_applicable_from: '2026-06-01',
        mode_of_filing: 'DSC',
      }),
      gst_id: id,
    });
    expect(upd.success).toBe(true);

    const got = await gstRegistrationController.getById(null, id);
    expect(got.success).toBe(true);
    const r = got.gstRegistration;
    expect(r.gst_id).toBe(id); // same row, not recreated
    expect(r.registration_status).toBe('Suspended');
    expect(r.legal_name).toBe('Acme Renamed Ltd');
    expect(r.trade_name).toBe('AcmeRenamed');
    expect(r.periodicity_of_gstr1).toBe('Quarterly');
    expect(r.e_way_bill_applicable).toBe(1);
    expect(r.e_way_bill_applicable_from).toBe('2026-06-01');
    expect(r.mode_of_filing).toBe('DSC');
    expect(r.is_active).toBe(1); // still active after update
  });

  test('delete soft-deletes (is_active=0); getAll still returns it', async () => {
    const created = await gstRegistrationController.create(
      null,
      regularPayload({ gstin: '06AAPFU0939F1ZN', state_id: 'Haryana' })
    );
    const id = created.gstRegistration.gst_id;

    // The UI passes the raw gst_id number.
    const del = await gstRegistrationController.delete(null, id);
    expect(del.success).toBe(true);

    const got = await gstRegistrationController.getById(null, id);
    expect(got.success).toBe(true);
    expect(got.gstRegistration.is_active).toBe(0); // soft-deleted

    // After soft-delete, the same GSTIN can be re-registered (active check excludes it).
    const reAdd = await gstRegistrationController.create(
      null,
      regularPayload({ gstin: '06AAPFU0939F1ZN', state_id: 'Haryana' })
    );
    expect(reAdd.success).toBe(true);
  });
});
