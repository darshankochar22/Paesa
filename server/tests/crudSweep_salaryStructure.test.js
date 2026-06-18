// CRUD sweep for the salaryStructure module — exercises the controller exactly
// the way the real UI does (SalaryStructureCreate.tsx / SalaryStructureAlter.tsx).
//
// Frontend payload shapes (verified against the pages):
//   create (Create page -> createBulk):
//     createBulk(company_id, employee_id, effective_from, entries[])
//       where each entry = { company_id, employee_id, effective_from,
//                            pay_head_id, amount, calculation_mode }
//   update (Alter page -> update):
//     { structure_id, employee_id, effective_from, pay_head_id, amount,
//       calculation_mode }   -- the Alter form lets the user change ALL of these.
//   delete (Alter page -> delete):
//     structure_id (plain number)  -> soft delete (is_active = 0)
//
// Rows persist in legacy snake_case shape.

const { setupTestDB, createTestCompany } = require('./helpers');
const salaryStructureController = require('../salaryStructure/salaryStructureController');
const employeeService = require('../employee/employeeService');
const employeeGroupService = require('../employeeGroup/employeeGroupService');
const payHeadService = require('../payHead/payHeadService');

describe('salaryStructure CRUD sweep (UI-faithful)', () => {
  let companyId;
  let employeeId;
  let employeeId2;
  let payHeadId;
  let payHeadId2;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('SalaryStructure CRUD Co.');
    companyId = company.company_id ?? company.id;
    expect(companyId).toBeTruthy();

    // Resolve a seeded employee group as FK parent for the employee.
    const groups = await employeeGroupService.getAll(companyId);
    expect(groups.success).toBe(true);
    expect(groups.employeeGroups.length).toBeGreaterThanOrEqual(1);
    const groupId = groups.employeeGroups[0].employee_group_id;

    // Create two employees (FK parents for salary structures).
    const emp = await employeeService.create({
      company_id: companyId,
      employee_group_id: groupId,
      name: 'Alice Salary',
      date_of_joining: '2026-04-01',
    });
    expect(emp.success).toBe(true);
    employeeId = emp.employee.employee_id;

    const emp2 = await employeeService.create({
      company_id: companyId,
      employee_group_id: groupId,
      name: 'Bob Salary',
      date_of_joining: '2026-04-01',
    });
    expect(emp2.success).toBe(true);
    employeeId2 = emp2.employee.employee_id;

    // Create two pay heads (FK parents).
    const ph = await payHeadService.create({
      company_id: companyId,
      name: 'Basic Pay (SS Test)',
      pay_head_type: 'Earnings for Employees',
      calculation_type: 'Flat Rate',
    });
    expect(ph.success).toBe(true);
    payHeadId = ph.payHead.pay_head_id;

    const ph2 = await payHeadService.create({
      company_id: companyId,
      name: 'HRA (SS Test)',
      pay_head_type: 'Earnings for Employees',
      calculation_type: 'Flat Rate',
    });
    expect(ph2.success).toBe(true);
    payHeadId2 = ph2.payHead.pay_head_id;
  });

  test('create (single) persists submitted fields, read back via getById + getAll', async () => {
    // Payload exactly as the salaryStructureService.create contract expects (the
    // controller.create receives a single entry object; createBulk wraps this).
    const payload = {
      company_id: companyId,
      employee_id: employeeId,
      effective_from: '2026-06-01',
      pay_head_id: payHeadId,
      amount: 25000,
      calculation_mode: 'As Computed Value',
    };

    const res = await salaryStructureController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.structure).toBeTruthy();
    const id = res.structure.structure_id;
    expect(id).toBeTruthy();

    // Read back via getById — assert ALL submitted fields actually persisted.
    const got = await salaryStructureController.getById(null, id);
    expect(got.success).toBe(true);
    expect(got.structure.company_id).toBe(companyId);
    expect(got.structure.employee_id).toBe(employeeId);
    expect(got.structure.pay_head_id).toBe(payHeadId);
    expect(got.structure.effective_from).toBe('2026-06-01');
    expect(got.structure.amount).toBe(25000);
    // calculation_mode must NOT be silently overridden to the default.
    expect(got.structure.calculation_mode).toBe('As Computed Value');
    expect(got.structure.is_active).toBe(1);

    // And via getAll (the shape the Alter list uses).
    const all = await salaryStructureController.getAll(null, companyId);
    expect(all.success).toBe(true);
    const found = all.salaryStructures.find((s) => s.structure_id === id);
    expect(found).toBeTruthy();
    expect(found.amount).toBe(25000);
    expect(found.calculation_mode).toBe('As Computed Value');
  });

  test('duplicate (same employee + date + pay head) is rejected', async () => {
    const dup = await salaryStructureController.create(null, {
      company_id: companyId,
      employee_id: employeeId,
      effective_from: '2026-06-01',
      pay_head_id: payHeadId,
      amount: 9999,
      calculation_mode: 'Flat Rate',
    });
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/already exists/i);
  });

  test('createBulk (Create page) persists every entry with its own fields', async () => {
    const effective = '2026-07-01';
    const entries = [
      {
        company_id: companyId,
        employee_id: employeeId,
        effective_from: effective,
        pay_head_id: payHeadId,
        amount: 30000,
        calculation_mode: 'Flat Rate',
      },
      {
        company_id: companyId,
        employee_id: employeeId,
        effective_from: effective,
        pay_head_id: payHeadId2,
        amount: 12000,
        calculation_mode: 'As Computed Value',
      },
    ];

    const res = await salaryStructureController.createBulk(null, {
      company_id: companyId,
      employee_id: employeeId,
      effective_from: effective,
      entries,
    });
    expect(res.success).toBe(true);
    expect(res.structures.length).toBe(2);

    // getByEmployee groups by effective_from (used by payslip / employee view).
    const byEmp = await salaryStructureController.getByEmployee(null, {
      company_id: companyId,
      employee_id: employeeId,
    });
    expect(byEmp.success).toBe(true);
    const julyGroup = byEmp.salaryStructures.find((g) => g.effective_from === effective);
    expect(julyGroup).toBeTruthy();
    expect(julyGroup.pay_heads.length).toBe(2);
    const hra = julyGroup.pay_heads.find((p) => p.pay_head_id === payHeadId2);
    expect(hra).toBeTruthy();
    expect(hra.amount).toBe(12000);
    expect(hra.calculation_mode).toBe('As Computed Value');
  });

  test('update changes ALL Alter-form fields and persists (not a delete in disguise)', async () => {
    // Seed a row to alter.
    const created = await salaryStructureController.create(null, {
      company_id: companyId,
      employee_id: employeeId,
      effective_from: '2026-08-01',
      pay_head_id: payHeadId,
      amount: 40000,
      calculation_mode: 'Flat Rate',
    });
    expect(created.success).toBe(true);
    const id = created.structure.structure_id;

    // SalaryStructureAlter.tsx payload — the form lets the user change employee,
    // pay head, effective date, amount AND calculation mode.
    const upd = await salaryStructureController.update(null, {
      structure_id: id,
      employee_id: employeeId2,
      effective_from: '2026-08-15',
      pay_head_id: payHeadId2,
      amount: 45000,
      calculation_mode: 'As User Defined Value',
    });
    expect(upd.success).toBe(true);

    const got = await salaryStructureController.getById(null, id);
    expect(got.success).toBe(true);
    expect(got.structure.structure_id).toBe(id); // not deleted/recreated
    expect(got.structure.is_active).toBe(1);
    // Every submitted field must persist (catches "ignored field" update bugs).
    expect(got.structure.amount).toBe(45000);
    expect(got.structure.calculation_mode).toBe('As User Defined Value');
    expect(got.structure.employee_id).toBe(employeeId2);
    expect(got.structure.pay_head_id).toBe(payHeadId2);
    expect(got.structure.effective_from).toBe('2026-08-15');
  });

  test('delete soft-deletes (is_active=0) and hides from getAll', async () => {
    const created = await salaryStructureController.create(null, {
      company_id: companyId,
      employee_id: employeeId2,
      effective_from: '2026-09-01',
      pay_head_id: payHeadId,
      amount: 5000,
      calculation_mode: 'Flat Rate',
    });
    expect(created.success).toBe(true);
    const id = created.structure.structure_id;

    // Alter page passes the raw structure_id number.
    const del = await salaryStructureController.delete(null, id);
    expect(del.success).toBe(true);

    const all = await salaryStructureController.getAll(null, companyId);
    expect(all.salaryStructures.some((s) => s.structure_id === id)).toBe(false);

    const got = await salaryStructureController.getById(null, id);
    expect(got.success).toBe(true);
    expect(got.structure.is_active).toBe(0);
  });
});
