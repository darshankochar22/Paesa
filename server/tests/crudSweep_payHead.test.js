// CRUD sweep for the payHead module — exercises the controller exactly the way
// the real UI does (PayHeadCreate.tsx / PayHeadAlter.tsx).
//
// Frontend payload shapes (verified against the pages):
//   create:  {
//     company_id, name, alias? (undefined when empty), pay_head_type, income_type,
//     under_group, affects_net_salary (1|0), payslip_display_name? (undefined when empty),
//     use_for_gratuity (1|0), set_alter_income_tax (1|0), calculation_type,
//     calculation_period, percentage_or_amount (number), rounding_method, rounding_limit (number)
//   }
//   update:  same fields keyed by pay_head_id (no company_id sent on update form).
//   delete:  raw pay_head_id (number) -> soft delete (is_active = 0).
//
// The form Yes/No selects are converted to 1/0 by trueVal() before sending, so the
// service must persist the literal 0/1 numbers it receives (catch "ignored field"
// where 0 is dropped to a default of 1).
//
// Slabs/formulas are created via separate calls (createSlab/createFormula) after
// the parent pay head exists — exercised here too.

const { setupTestDB, createTestCompany } = require('./helpers');
const payHeadController = require('../payHead/payHeadController');

describe('payHead CRUD sweep (UI-faithful)', () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('PayHead CRUD Co.');
    companyId = company.company_id ?? company.id;
    expect(companyId).toBeTruthy();
  });

  test('create persists EVERY submitted field (incl. 0-valued flags)', async () => {
    // Exact payload PayHeadCreate.tsx builds. Note: affects_net_salary="No"=>0,
    // use_for_gratuity="Yes"=>1, set_alter_income_tax="Yes"=>1 to catch flags
    // being dropped/overridden by their defaults.
    const payload = {
      company_id: companyId,
      name: 'Special Allowance',
      alias: 'SPL',
      pay_head_type: 'Deductions for Employees',
      income_type: 'Variable',
      under_group: 'Current Liabilities',
      affects_net_salary: 0,        // "No"
      payslip_display_name: 'Spl. Allow.',
      use_for_gratuity: 1,          // "Yes"
      set_alter_income_tax: 1,      // "Yes"
      calculation_type: 'As Computed Value',
      calculation_period: 'Days',
      percentage_or_amount: 37.5,
      rounding_method: 'Normal Rounding',
      rounding_limit: 1,
    };

    const res = await payHeadController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.payHead).toBeTruthy();
    const id = res.payHead.pay_head_id;
    expect(id).toBeTruthy();

    // Read back via getById — every submitted field must persist exactly.
    const got = await payHeadController.getById(null, id);
    expect(got.success).toBe(true);
    const ph = got.payHead;
    expect(ph.name).toBe('Special Allowance');
    expect(ph.alias).toBe('SPL');
    expect(ph.pay_head_type).toBe('Deductions for Employees');
    expect(ph.income_type).toBe('Variable');
    expect(ph.under_group).toBe('Current Liabilities');
    expect(ph.affects_net_salary).toBe(0);   // "No" must not become default 1
    expect(ph.payslip_display_name).toBe('Spl. Allow.');
    expect(ph.use_for_gratuity).toBe(1);
    expect(ph.set_alter_income_tax).toBe(1);
    expect(ph.calculation_type).toBe('As Computed Value');
    expect(ph.calculation_period).toBe('Days');
    expect(ph.percentage_or_amount).toBe(37.5);
    expect(ph.rounding_method).toBe('Normal Rounding');
    expect(ph.rounding_limit).toBe(1);
    expect(ph.is_active).toBe(1);
    expect(ph.is_predefined).toBe(0);
    expect(ph.company_id).toBe(companyId);

    // And via getAll (the list the UI shows).
    const all = await payHeadController.getAll(null, companyId);
    expect(all.success).toBe(true);
    const found = all.payHeads.find((p) => p.pay_head_id === id);
    expect(found).toBeTruthy();
    expect(found.name).toBe('Special Allowance');
    expect(found.affects_net_salary).toBe(0);
  });

  test('create with empty optional fields sent as undefined (form default) => NULL', async () => {
    // PayHeadCreate.tsx sends alias/payslip_display_name as undefined when blank.
    const res = await payHeadController.create(null, {
      company_id: companyId,
      name: 'Basic Pay Custom',
      alias: undefined,
      pay_head_type: 'Earnings for Employees',
      income_type: 'Fixed',
      under_group: 'Direct Expenses',
      affects_net_salary: 1,
      payslip_display_name: undefined,
      use_for_gratuity: 0,
      set_alter_income_tax: 0,
      calculation_type: 'As User Defined Value',
      calculation_period: 'Months',
      percentage_or_amount: 0,
      rounding_method: 'Not Applicable',
      rounding_limit: 0,
    });
    expect(res.success).toBe(true);
    const got = await payHeadController.getById(null, res.payHead.pay_head_id);
    expect(got.payHead.alias).toBeNull();
    expect(got.payHead.payslip_display_name).toBeNull();
    expect(got.payHead.affects_net_salary).toBe(1);
    expect(got.payHead.use_for_gratuity).toBe(0);
  });

  test('duplicate name (case-insensitive) is rejected', async () => {
    const dup = await payHeadController.create(null, {
      company_id: companyId,
      name: 'special allowance', // already exists as 'Special Allowance'
      pay_head_type: 'Earnings for Employees',
      income_type: 'Fixed',
      under_group: 'Direct Expenses',
      affects_net_salary: 1,
      use_for_gratuity: 0,
      set_alter_income_tax: 0,
      calculation_type: 'As User Defined Value',
      calculation_period: 'Months',
      percentage_or_amount: 0,
      rounding_method: 'Not Applicable',
      rounding_limit: 0,
    });
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/already exists/i);
  });

  test('update changes fields and persists (not a delete in disguise)', async () => {
    const created = await payHeadController.create(null, {
      company_id: companyId,
      name: 'Bonus',
      alias: 'BNS',
      pay_head_type: 'Earnings for Employees',
      income_type: 'Fixed',
      under_group: 'Direct Expenses',
      affects_net_salary: 1,
      payslip_display_name: 'Bonus',
      use_for_gratuity: 0,
      set_alter_income_tax: 0,
      calculation_type: 'As User Defined Value',
      calculation_period: 'Months',
      percentage_or_amount: 10,
      rounding_method: 'Not Applicable',
      rounding_limit: 0,
    });
    expect(created.success).toBe(true);
    const id = created.payHead.pay_head_id;

    // PayHeadAlter.tsx update payload (keyed by pay_head_id, no company_id).
    const upd = await payHeadController.update(null, {
      pay_head_id: id,
      name: 'Annual Bonus',
      alias: 'ABNS',
      pay_head_type: 'Reimbursements',
      income_type: 'Variable',
      under_group: 'Indirect Expenses',
      affects_net_salary: 0,      // flipped to "No"
      payslip_display_name: 'Ann. Bonus',
      use_for_gratuity: 1,        // flipped to "Yes"
      set_alter_income_tax: 1,
      calculation_type: 'Flat Rate',
      calculation_period: 'Weeks',
      percentage_or_amount: 25,
      rounding_method: 'Upward Rounding',
      rounding_limit: 5,
    });
    expect(upd.success).toBe(true);

    const got = await payHeadController.getById(null, id);
    expect(got.success).toBe(true);
    const ph = got.payHead;
    expect(ph.pay_head_id).toBe(id);          // same row — not recreated
    expect(ph.is_active).toBe(1);             // not deleted
    expect(ph.name).toBe('Annual Bonus');
    expect(ph.alias).toBe('ABNS');
    expect(ph.pay_head_type).toBe('Reimbursements');
    expect(ph.income_type).toBe('Variable');
    expect(ph.under_group).toBe('Indirect Expenses');
    expect(ph.affects_net_salary).toBe(0);    // flag flip persisted
    expect(ph.payslip_display_name).toBe('Ann. Bonus');
    expect(ph.use_for_gratuity).toBe(1);
    expect(ph.set_alter_income_tax).toBe(1);
    expect(ph.calculation_type).toBe('Flat Rate');
    expect(ph.calculation_period).toBe('Weeks');
    expect(ph.percentage_or_amount).toBe(25);
    expect(ph.rounding_method).toBe('Upward Rounding');
    expect(ph.rounding_limit).toBe(5);
  });

  test('update is blocked for predefined pay heads (seeded)', async () => {
    const seedSvc = require('../payHead/payHeadService');
    await seedSvc.seedDefaultPayHeads(companyId);
    const all = await payHeadController.getAll(null, companyId);
    const predefined = all.payHeads.find((p) => p.is_predefined === 1);
    expect(predefined).toBeTruthy();
    const res = await payHeadController.update(null, {
      pay_head_id: predefined.pay_head_id,
      name: 'Hacked',
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/predefined/i);
  });

  test('slab lines persist for a pay head (createSlab/getSlabs)', async () => {
    const created = await payHeadController.create(null, {
      company_id: companyId,
      name: 'Income Tax Slabbed',
      pay_head_type: 'Deductions for Employees',
      income_type: 'Fixed',
      under_group: 'Current Liabilities',
      affects_net_salary: 1,
      use_for_gratuity: 0,
      set_alter_income_tax: 0,
      calculation_type: 'As Computed Value',
      calculation_period: 'Months',
      percentage_or_amount: 0,
      rounding_method: 'Not Applicable',
      rounding_limit: 0,
    });
    const phId = created.payHead.pay_head_id;

    const slabRes = await payHeadController.createSlab(null, {
      pay_head_id: phId,
      effective_from: '2026-04-01',
      amount_gt: 0,
      amount_up_to: 250000,
      slab_type: 'Percentage',
      value: 5,
    });
    expect(slabRes.success).toBe(true);

    const slabs = await payHeadController.getSlabs(null, phId);
    expect(slabs.success).toBe(true);
    expect(slabs.slabs.length).toBe(1);
    expect(slabs.slabs[0].amount_up_to).toBe(250000);
    expect(slabs.slabs[0].slab_type).toBe('Percentage');
    expect(slabs.slabs[0].value).toBe(5);
  });

  test('formula lines persist for a pay head (createFormula/getFormulas)', async () => {
    const created = await payHeadController.create(null, {
      company_id: companyId,
      name: 'Computed Head',
      pay_head_type: 'Earnings for Employees',
      income_type: 'Fixed',
      under_group: 'Direct Expenses',
      affects_net_salary: 1,
      use_for_gratuity: 0,
      set_alter_income_tax: 0,
      calculation_type: 'As Computed Value',
      calculation_period: 'Months',
      percentage_or_amount: 0,
      rounding_method: 'Not Applicable',
      rounding_limit: 0,
    });
    const phId = created.payHead.pay_head_id;

    // reference an existing pay head (the one we made) for pay_head_id_ref
    const fRes = await payHeadController.createFormula(null, {
      pay_head_id: phId,
      sequence: 0,
      function: 'Add Pay Head',
      pay_head_id_ref: phId,
      operator: '+',
    });
    expect(fRes.success).toBe(true);

    const formulas = await payHeadController.getFormulas(null, phId);
    expect(formulas.success).toBe(true);
    expect(formulas.formulas.length).toBe(1);
    expect(formulas.formulas[0].function).toBe('Add Pay Head');
    expect(formulas.formulas[0].operator).toBe('+');
    expect(formulas.formulas[0].pay_head_id_ref).toBe(phId);
  });

  test('delete soft-deletes (is_active=0) and hides from getAll', async () => {
    const created = await payHeadController.create(null, {
      company_id: companyId,
      name: 'Temp Head',
      pay_head_type: 'Earnings for Employees',
      income_type: 'Fixed',
      under_group: 'Direct Expenses',
      affects_net_salary: 1,
      use_for_gratuity: 0,
      set_alter_income_tax: 0,
      calculation_type: 'As User Defined Value',
      calculation_period: 'Months',
      percentage_or_amount: 0,
      rounding_method: 'Not Applicable',
      rounding_limit: 0,
    });
    const id = created.payHead.pay_head_id;

    // PayHeadAlter.tsx passes the raw pay_head_id number.
    const del = await payHeadController.delete(null, id);
    expect(del.success).toBe(true);

    const all = await payHeadController.getAll(null, companyId);
    expect(all.payHeads.some((p) => p.pay_head_id === id)).toBe(false);

    const got = await payHeadController.getById(null, id);
    expect(got.success).toBe(true);
    expect(got.payHead.is_active).toBe(0);
  });

  test('delete is blocked for predefined pay heads', async () => {
    const all = await payHeadController.getAll(null, companyId);
    const predefined = all.payHeads.find((p) => p.is_predefined === 1);
    expect(predefined).toBeTruthy();
    const del = await payHeadController.delete(null, predefined.pay_head_id);
    expect(del.success).toBe(false);
    expect(del.error).toMatch(/predefined/i);
  });
});
