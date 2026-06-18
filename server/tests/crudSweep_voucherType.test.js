// CRUD sweep for the voucherType module, exercising it exactly the way the
// real UI does (VoucherTypeCreate.tsx / VoucherTypeAlter.tsx).
//
// Frontend payload shapes are mirrored precisely:
//   * Create  -> VoucherTypeCreate.handleSubmit (company_id, name, short_name?,
//     category, numbering_method, is_active, parent_vt_id, and the six config
//     flags use_effective_dates / allow_zero_value_transactions /
//     make_voucher_optional / allow_narration / allow_narration_per_ledger /
//     print_after_save).
//   * Update  -> VoucherTypeAlter.handleSubmit (vt_id, name, short_name?,
//     category, numbering_method, is_active, parent_vt_id) + updateConfig.
//   * Delete  -> soft delete (is_active=0).

const { setupTestDB, createTestCompany } = require('./helpers');
const voucherTypeController = require('../voucherType/voucherTypeController');

describe('voucherType CRUD sweep (UI-faithful)', () => {
  let company;

  beforeAll(async () => {
    await setupTestDB();
    company = await createTestCompany('VoucherType CRUD Co');
  });

  // The seeded predefined voucher types act as FK parents for parent_vt_id.
  const getSeeded = async () => {
    const res = await voucherTypeController.getAll(null, company.company_id);
    expect(res.success).toBe(true);
    expect(Array.isArray(res.voucherTypes)).toBe(true);
    return res.voucherTypes;
  };

  test('createTestCompany seeds the predefined voucher types', async () => {
    const seeded = await getSeeded();
    expect(seeded.length).toBeGreaterThanOrEqual(20);
    const sales = seeded.find((v) => v.name === 'Sales');
    expect(sales).toBeTruthy();
    expect(sales.is_predefined).toBe(1);
  });

  test('create persists EXACTLY the fields the Create form submits (incl. config flags + parent)', async () => {
    const seeded = await getSeeded();
    const parent = seeded.find((v) => v.name === 'Receipt');
    expect(parent).toBeTruthy();

    // Mirror VoucherTypeCreate.handleSubmit payload (non-default values so we
    // can catch dropped/overridden fields).
    const payload = {
      company_id: company.company_id,
      name: 'Cash Receipt Voucher',
      short_name: 'CRV',
      category: 'Receipt',
      numbering_method: 'Manual',
      is_active: 1,
      parent_vt_id: parent.vt_id,
      use_effective_dates: 1,
      allow_zero_value_transactions: 1,
      make_voucher_optional: 1,
      allow_narration: 0,
      allow_narration_per_ledger: 1,
      print_after_save: 1,
    };

    const res = await voucherTypeController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.voucherType).toBeTruthy();
    const vtId = res.voucherType.vt_id;

    // Read back the persisted row + joined config.
    const byId = await voucherTypeController.getById(null, vtId);
    expect(byId.success).toBe(true);
    const vt = byId.voucherType;

    // Identity / numbering fields must persist what the form sent.
    expect(vt.name).toBe('Cash Receipt Voucher');
    expect(vt.short_name).toBe('CRV');
    expect(vt.category).toBe('Receipt');
    expect(vt.numbering_method).toBe('Manual');
    expect(vt.parent_vt_id).toBe(parent.vt_id);
    expect(vt.is_predefined).toBe(0);
    expect(vt.is_active).toBe(1);

    // Config flags the form sent must persist (catches "ignored field" drops).
    expect(vt.use_effective_dates).toBe(1);
    expect(vt.allow_zero_value_transactions).toBe(1);
    expect(vt.make_voucher_optional).toBe(1);
    expect(vt.allow_narration).toBe(0);
    expect(vt.allow_narration_per_ledger).toBe(1);
    expect(vt.print_after_save).toBe(1);

    // Config row should exist independently too.
    const cfg = await voucherTypeController.getConfig(null, vtId);
    expect(cfg.success).toBe(true);
    expect(cfg.config.use_effective_dates).toBe(1);
    expect(cfg.config.allow_narration).toBe(0);
  });

  test('duplicate name (case-insensitive) is rejected', async () => {
    const dup = await voucherTypeController.create(null, {
      company_id: company.company_id,
      name: 'cash receipt voucher',
      category: 'Receipt',
    });
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/already exists/i);
  });

  test('update persists the changed identity fields the Alter form submits', async () => {
    const created = await voucherTypeController.create(null, {
      company_id: company.company_id,
      name: 'Editable VT',
      short_name: 'EVT',
      category: 'Payment',
      numbering_method: 'Automatic',
      is_active: 1,
      parent_vt_id: null,
    });
    expect(created.success).toBe(true);
    const vtId = created.voucherType.vt_id;

    const seeded = await getSeeded();
    const newParent = seeded.find((v) => v.name === 'Journal');

    // Mirror VoucherTypeAlter.handleSubmit update payload.
    const upd = await voucherTypeController.update(null, {
      vt_id: vtId,
      name: 'Edited VT',
      short_name: 'XVT',
      category: 'Journal',
      numbering_method: 'Manual',
      is_active: 1,
      parent_vt_id: newParent.vt_id,
    });
    expect(upd.success).toBe(true);

    const after = await voucherTypeController.getById(null, vtId);
    expect(after.success).toBe(true);
    expect(after.voucherType.name).toBe('Edited VT');
    expect(after.voucherType.short_name).toBe('XVT');
    expect(after.voucherType.category).toBe('Journal');
    expect(after.voucherType.numbering_method).toBe('Manual');
    expect(after.voucherType.parent_vt_id).toBe(newParent.vt_id);
    // Update must not silently delete the row.
    expect(after.voucherType.is_active).toBe(1);
  });

  test('update honours the Alter form is_active toggle (deactivate)', async () => {
    const created = await voucherTypeController.create(null, {
      company_id: company.company_id,
      name: 'Deactivatable VT',
      category: 'Payment',
      is_active: 1,
      parent_vt_id: null,
    });
    expect(created.success).toBe(true);
    const vtId = created.voucherType.vt_id;

    // The Alter form lets a non-predefined VT be deactivated and sends is_active:0.
    const upd = await voucherTypeController.update(null, {
      vt_id: vtId,
      name: 'Deactivatable VT',
      category: 'Payment',
      numbering_method: 'Automatic',
      is_active: 0,
      parent_vt_id: null,
    });
    expect(upd.success).toBe(true);

    const after = await voucherTypeController.getById(null, vtId);
    expect(after.success).toBe(true);
    expect(after.voucherType.is_active).toBe(0);
  });

  test('updateConfig persists the six config flags from the Alter form', async () => {
    const created = await voucherTypeController.create(null, {
      company_id: company.company_id,
      name: 'Config VT',
      category: 'Sales',
      is_active: 1,
      parent_vt_id: null,
      use_effective_dates: 0,
      allow_zero_value_transactions: 0,
      make_voucher_optional: 0,
      allow_narration: 1,
      allow_narration_per_ledger: 0,
      print_after_save: 0,
    });
    expect(created.success).toBe(true);
    const vtId = created.voucherType.vt_id;

    const cfgUpd = await voucherTypeController.updateConfig(null, {
      voucher_type_id: vtId,
      use_effective_dates: 1,
      allow_zero_value_transactions: 1,
      make_voucher_optional: 1,
      allow_narration: 0,
      allow_narration_per_ledger: 1,
      print_after_save: 1,
    });
    expect(cfgUpd.success).toBe(true);

    const cfg = await voucherTypeController.getConfig(null, vtId);
    expect(cfg.success).toBe(true);
    expect(cfg.config.use_effective_dates).toBe(1);
    expect(cfg.config.allow_zero_value_transactions).toBe(1);
    expect(cfg.config.make_voucher_optional).toBe(1);
    expect(cfg.config.allow_narration).toBe(0);
    expect(cfg.config.allow_narration_per_ledger).toBe(1);
    expect(cfg.config.print_after_save).toBe(1);
  });

  test('predefined voucher types cannot be updated or deleted', async () => {
    const seeded = await getSeeded();
    const predefined = seeded.find((v) => v.is_predefined === 1);
    expect(predefined).toBeTruthy();

    const upd = await voucherTypeController.update(null, {
      vt_id: predefined.vt_id,
      name: 'Hacked',
    });
    expect(upd.success).toBe(false);

    const del = await voucherTypeController.delete(null, predefined.vt_id);
    expect(del.success).toBe(false);
  });

  test('delete soft-removes a custom voucher type (is_active=0, gone from getAll)', async () => {
    const created = await voucherTypeController.create(null, {
      company_id: company.company_id,
      name: 'Disposable VT',
      category: 'Payment',
      is_active: 1,
      parent_vt_id: null,
    });
    expect(created.success).toBe(true);
    const vtId = created.voucherType.vt_id;

    const del = await voucherTypeController.delete(null, vtId);
    expect(del.success).toBe(true);

    // Soft-deleted: row still exists but is_active=0.
    const byId = await voucherTypeController.getById(null, vtId);
    expect(byId.success).toBe(true);
    expect(byId.voucherType.is_active).toBe(0);

    // And it disappears from the active list the UI renders.
    const list = await getSeeded();
    expect(list.find((v) => v.vt_id === vtId)).toBeUndefined();
  });
});
