const { setupTestDB, createTestCompany, db } = require('./helpers');
const employeeCategoryService = require('../employeeCategory/employeeCategoryService');
const employeeGroupService = require('../employeeGroup/employeeGroupService');
const payrollUnitService = require('../payrollUnit/payrollUnitService');
const attendanceTypeService = require('../attendanceType/attendanceTypeService');
const payHeadService = require('../payHead/payHeadService');
const employeeService = require('../employee/employeeService');
const salaryStructureService = require('../salaryStructure/salaryStructureService');
const attendanceService = require('../attendance/attendanceService');

describe('Payroll and Employee Management Service Tests', () => {
  let companyId;
  let categoryId;
  let groupId;
  let unitId;
  let attendanceTypeId;
  let payHeadId;
  let employeeId;
  let structureId;
  let voucherId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('Payroll Test Co');
    companyId = company.company_id;
    // Attendance types are no longer auto-seeded on company creation — seed them here.
    await attendanceTypeService.seedDefaultAttendanceTypes(companyId);
  });

  describe('Employee Categories', () => {
    it('should verify default employee category was seeded', async () => {
      const res = await employeeCategoryService.getAll(companyId);
      expect(res.success).toBe(true);
      expect(res.employeeCategories.length).toBeGreaterThanOrEqual(1);
      const primary = res.employeeCategories.find((c) => c.name === 'Primary Employee Category');
      expect(primary).toBeDefined();
    });

    it('should create a custom employee category', async () => {
      const res = await employeeCategoryService.create({
        company_id: companyId,
        name: 'Engineering Category',
        alias: 'Engg',
        allocate_revenue: true,
        allocate_non_revenue: false,
      });
      expect(res.success).toBe(true);
      expect(res.category.employee_category_id).toBeDefined();
      expect(res.category.name).toBe('Engineering Category');
      categoryId = res.category.employee_category_id;
    });

    it('should update employee category', async () => {
      const res = await employeeCategoryService.update({
        employee_category_id: categoryId,
        name: 'R&D Engineering Category',
      });
      expect(res.success).toBe(true);
      expect(res.category.name).toBe('R&D Engineering Category');
    });

    it('should list employee categories', async () => {
      const res = await employeeCategoryService.getAll(companyId);
      expect(res.success).toBe(true);
      expect(res.employeeCategories.length).toBeGreaterThanOrEqual(2);
    });

    it('should get employee category by id', async () => {
      const res = await employeeCategoryService.getById(categoryId);
      expect(res.success).toBe(true);
      expect(res.category.name).toBe('R&D Engineering Category');
    });
  });

  describe('Employee Groups', () => {
    it('should verify default employee groups were seeded', async () => {
      const res = await employeeGroupService.getAll(companyId);
      expect(res.success).toBe(true);
      expect(res.employeeGroups.length).toBeGreaterThanOrEqual(4);
    });

    it('should create a custom employee group', async () => {
      const res = await employeeGroupService.create({
        company_id: companyId,
        name: 'QA Team',
        alias: 'QA',
        parent_group_id: null,
      });
      expect(res.success).toBe(true);
      expect(res.group.employee_group_id).toBeDefined();
      expect(res.group.name).toBe('QA Team');
      groupId = res.group.employee_group_id;
    });

    it('should update employee group', async () => {
      const res = await employeeGroupService.update({
        employee_group_id: groupId,
        name: 'Quality Assurance Team',
      });
      expect(res.success).toBe(true);
      expect(res.group.name).toBe('Quality Assurance Team');
    });

    it('should fetch employee group tree', async () => {
      const res = await employeeGroupService.getTree(companyId);
      expect(res.success).toBe(true);
      expect(res.tree).toBeDefined();
    });
  });

  describe('Payroll Units', () => {
    it('should verify default payroll units were seeded', async () => {
      const res = await payrollUnitService.getAll(companyId);
      expect(res.success).toBe(true);
      expect(res.payrollUnits.length).toBeGreaterThanOrEqual(5);
    });

    it('should create a custom payroll unit', async () => {
      const res = await payrollUnitService.create({
        company_id: companyId,
        name: 'Shifts',
        symbol: 'Sft',
        unit_type: 'Simple',
        decimal_places: 0,
      });
      expect(res.success).toBe(true);
      expect(res.unit.payroll_unit_id).toBeDefined();
      expect(res.unit.name).toBe('Shifts');
      unitId = res.unit.payroll_unit_id;
    });

    it('should update payroll unit', async () => {
      const res = await payrollUnitService.update({
        payroll_unit_id: unitId,
        formal_name: 'Standard Shifts',
      });
      expect(res.success).toBe(true);
      expect(res.unit.formal_name).toBe('Standard Shifts');
    });
  });

  describe('Attendance Types', () => {
    it('should verify default attendance types were seeded', async () => {
      const res = await attendanceTypeService.getAll(companyId);
      expect(res.success).toBe(true);
      expect(res.attendanceTypes.length).toBeGreaterThanOrEqual(6);
    });

    it('should create a custom attendance type', async () => {
      const res = await attendanceTypeService.create({
        company_id: companyId,
        name: 'Casual Leave',
        type: 'Leave',
        unit_id: unitId,
      });
      expect(res.success).toBe(true);
      expect(res.attendanceType.attendance_type_id).toBeDefined();
      expect(res.attendanceType.name).toBe('Casual Leave');
      attendanceTypeId = res.attendanceType.attendance_type_id;
    });

    it('should update attendance type', async () => {
      const res = await attendanceTypeService.update({
        attendance_type_id: attendanceTypeId,
        alias: 'CL',
      });
      expect(res.success).toBe(true);
      expect(res.attendanceType.alias).toBe('CL');
    });
  });

  describe('Pay Heads', () => {
    it('should verify default pay heads were seeded', async () => {
      const res = await payHeadService.getAll(companyId);
      expect(res.success).toBe(true);
      expect(res.payHeads.length).toBeGreaterThanOrEqual(8);
    });

    it('should create a custom pay head', async () => {
      const res = await payHeadService.create({
        company_id: companyId,
        name: 'Medical Allowance',
        pay_head_type: 'Earnings for Employees',
        calculation_type: 'Flat Rate',
        percentage_or_amount: 1500,
      });
      expect(res.success).toBe(true);
      expect(res.payHead.pay_head_id).toBeDefined();
      expect(res.payHead.name).toBe('Medical Allowance');
      payHeadId = res.payHead.pay_head_id;
    });

    it('should update pay head', async () => {
      const res = await payHeadService.update({
        pay_head_id: payHeadId,
        payslip_display_name: 'Medical',
      });
      expect(res.success).toBe(true);
      expect(res.payHead.payslip_display_name).toBe('Medical');
    });

    it('should create, read and delete slabs on pay head', async () => {
      const slabRes = await payHeadService.createSlab({
        pay_head_id: payHeadId,
        effective_from: '2026-04-01',
        amount_gt: 0,
        amount_up_to: 10000,
        slab_type: 'Percentage',
        value: 5,
      });
      expect(slabRes.success).toBe(true);
      expect(slabRes.slab.slab_line_id).toBeDefined();

      const slabsRes = await payHeadService.getSlabs(payHeadId);
      expect(slabsRes.success).toBe(true);
      expect(slabsRes.slabs.length).toBe(1);

      const delRes = await payHeadService.deleteSlab(slabRes.slab.slab_line_id);
      expect(delRes.success).toBe(true);

      const slabsRes2 = await payHeadService.getSlabs(payHeadId);
      expect(slabsRes2.slabs.length).toBe(0);
    });

    it('should create, read and delete formula lines on pay head', async () => {
      const formRes = await payHeadService.createFormula({
        pay_head_id: payHeadId,
        sequence: 1,
        function: 'Add',
        pay_head_id_ref: payHeadId,
        operator: '+',
      });
      expect(formRes.success).toBe(true);
      expect(formRes.formula.formula_line_id).toBeDefined();

      const formulasRes = await payHeadService.getFormulas(payHeadId);
      expect(formulasRes.success).toBe(true);
      expect(formulasRes.formulas.length).toBe(1);

      const delRes = await payHeadService.deleteFormula(formRes.formula.formula_line_id);
      expect(delRes.success).toBe(true);

      const formulasRes2 = await payHeadService.getFormulas(payHeadId);
      expect(formulasRes2.formulas.length).toBe(0);
    });
  });

  describe('Employees', () => {
    it('should create a new employee', async () => {
      const res = await employeeService.create({
        company_id: companyId,
        employee_group_id: groupId,
        name: 'John Doe',
        alias: 'JD',
        designation: 'QA Engineer',
        department: 'Engineering',
        date_of_joining: '2026-06-01',
        mobile: '9876543211',
        email: 'john.doe@test.com',
      });
      expect(res.success).toBe(true);
      expect(res.employee.employee_id).toBeDefined();
      employeeId = res.employee.employee_id;
      // No employee code was supplied → the app leaves it blank (no auto-generation).
      expect(res.employee.employee_code == null || res.employee.employee_code === '').toBe(true);
    });

    it('should update employee details', async () => {
      const res = await employeeService.update({
        employee_id: employeeId,
        designation: 'Senior QA Engineer',
      });
      expect(res.success).toBe(true);
      expect(res.employee.designation).toBe('Senior QA Engineer');
    });

    it('should list employees and get by id', async () => {
      const listRes = await employeeService.getAll(companyId);
      expect(listRes.success).toBe(true);
      expect(listRes.employees.length).toBeGreaterThanOrEqual(1);

      const getRes = await employeeService.getById(employeeId);
      expect(getRes.success).toBe(true);
      expect(getRes.employee.name).toBe('John Doe');
    });

    it('should fetch employees by group', async () => {
      const res = await employeeService.getByGroup(companyId, groupId);
      expect(res.success).toBe(true);
      expect(res.employees.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Salary Structures', () => {
    it('should create an individual salary structure entry', async () => {
      const res = await salaryStructureService.create({
        company_id: companyId,
        employee_id: employeeId,
        effective_from: '2026-06-01',
        pay_head_id: payHeadId,
        amount: 25000,
        calculation_mode: 'Flat Rate',
      });
      expect(res.success).toBe(true);
      expect(res.structure.structure_id).toBeDefined();
      structureId = res.structure.structure_id;
    });

    it('should update salary structure entry', async () => {
      const res = await salaryStructureService.update({
        structure_id: structureId,
        amount: 28000,
      });
      expect(res.success).toBe(true);
      expect(res.structure.amount).toBe(28000);
    });

    it('should create bulk salary structures', async () => {
      const res = await salaryStructureService.createBulk(companyId, employeeId, '2026-07-01', [
        { pay_head_id: payHeadId, amount: 30000, calculation_mode: 'Flat Rate' },
      ]);
      expect(res.success).toBe(true);
      expect(res.structures.length).toBe(1);
    });

    it('should retrieve salary structures by employee', async () => {
      const res = await salaryStructureService.getByEmployee(companyId, employeeId);
      expect(res.success).toBe(true);
      expect(res.salaryStructures.length).toBe(2); // one for June, one for July
    });
  });

  describe('Attendance Vouchers', () => {
    it('should get next voucher number', async () => {
      const res = await attendanceService.getNextVoucherNumber(companyId);
      expect(res.success).toBe(true);
      // Plain sequential numbering (no ATT- prefix) — same scheme as regular vouchers.
      expect(res.nextNumber).toBe('1');
    });

    it('should create an attendance voucher', async () => {
      const res = await attendanceService.create({
        company_id: companyId,
        date: '2026-06-30',
        narration: 'June Attendance',
        entries: [
          {
            employee_id: employeeId,
            attendance_type_id: attendanceTypeId,
            value: 26,
          },
        ],
      });
      expect(res.success).toBe(true);
      expect(res.attendance_voucher_id).toBeDefined();
      voucherId = res.attendance_voucher_id;
    });

    it('should list all attendance vouchers', async () => {
      const res = await attendanceService.getAll(companyId);
      expect(res.success).toBe(true);
      expect(res.vouchers.length).toBe(1);
    });

    it('should fetch attendance voucher by id', async () => {
      const res = await attendanceService.getById(voucherId);
      expect(res.success).toBe(true);
      expect(res.voucher.entries.length).toBe(1);
      expect(Number(res.voucher.entries[0].value)).toBe(26);
    });

    it('should delete attendance voucher', async () => {
      const res = await attendanceService.delete(voucherId);
      expect(res.success).toBe(true);

      const check = await attendanceService.getById(voucherId);
      expect(check.success).toBe(false);
    });
  });

  describe('Cleanups and deletions of categories, groups, units, types, and payheads', () => {
    it('should delete custom salary structure entry', async () => {
      const res = await salaryStructureService.delete(structureId);
      expect(res.success).toBe(true);
    });

    it('should delete custom employee', async () => {
      const res = await employeeService.delete(employeeId);
      expect(res.success).toBe(true);
    });

    it('should delete custom employee category', async () => {
      const res = await employeeCategoryService.delete(categoryId);
      expect(res.success).toBe(true);
    });

    it('should delete custom employee group', async () => {
      const res = await employeeGroupService.delete(groupId);
      expect(res.success).toBe(true);
    });

    it('should delete custom payroll unit', async () => {
      const res = await payrollUnitService.delete(unitId);
      expect(res.success).toBe(true);
    });

    it('should delete custom attendance type', async () => {
      const res = await attendanceTypeService.delete(attendanceTypeId);
      expect(res.success).toBe(true);
    });

    it('should delete custom pay head', async () => {
      const res = await payHeadService.delete(payHeadId);
      expect(res.success).toBe(true);
    });
  });
});
