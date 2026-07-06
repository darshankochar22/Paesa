// Payroll Statutory Summary (#206) — verifies the summary/taxonomy and the pay-head
// drill compute from pay heads + ACTIVE salary structures, bucketed by statutory
// component and pay-head-type row.
const { setupTestDB, createTestCompany } = require('./helpers');
const payHeadService = require('../payHead/payHeadService');
const employeeService = require('../employee/employeeService');
const salaryStructureService = require('../salaryStructure/salaryStructureService');
const statSvc = require('../payroll/payrollStatutoryReportService');

describe('Payroll Statutory reports (#206)', () => {
  let companyId, pfHeadId, employeeId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('PayStat Co');
    companyId = company.company_id;

    const pf = await payHeadService.create({
      company_id: companyId,
      name: 'EPF Deduction',
      pay_head_type: "Employees' Statutory Deductions",
      statutory_pay_type: 'PF Account (A/c No. 1)',
      under_group: 'Current Liabilities',
    });
    pfHeadId = pf.payHead.pay_head_id;

    const emp = await employeeService.create({
      company_id: companyId,
      name: 'Stat Emp',
      date_of_joining: '2026-05-01',
    });
    employeeId = emp.employee.employee_id;

    await salaryStructureService.create({
      company_id: companyId,
      employee_id: employeeId,
      pay_head_id: pfHeadId,
      effective_from: '2026-05-01',
      amount: 1800,
      calculation_mode: 'Flat Rate',
    });
  });

  it('summary buckets the PF deduction under Provident Fund → Employees Statutory Deductions', async () => {
    const res = await statSvc.getStatutorySummary(companyId);
    expect(res.success).toBe(true);
    const pf = res.payload.sections.find((s) => s.component === 'Provident Fund');
    const esd = pf.rows.find((r) => r.label === "Employees' Statutory Deductions");
    expect(esd.payable).toBe(1800);
    // The same amount must NOT leak into ESI/NPS/PT/IT sections.
    for (const sec of res.payload.sections.filter((s) => s.component !== 'Provident Fund')) {
      for (const r of sec.rows) expect(r.payable).toBe(0);
    }
    expect(res.payload.grand_total).toBe(1800);
  });

  it('pay head details lists the offending head for the drilled row', async () => {
    const res = await statSvc.getStatutoryPayHeadDetails(companyId, {
      component: 'pf',
      row_label: "Employees' Statutory Deductions",
    });
    expect(res.success).toBe(true);
    const row = res.payload.rows.find((r) => r.pay_head_id === pfHeadId);
    expect(row).toBeTruthy();
    expect(row.payable).toBe(1800);
  });
});
