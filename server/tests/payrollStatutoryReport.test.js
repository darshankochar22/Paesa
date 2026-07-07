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

  it('PF Form 5 lists fund joiners in the period; Form 10 lists leavers (#207/#208)', async () => {
    // A leaver — date_of_leaving inside the period.
    await employeeService.create({
      company_id: companyId,
      name: 'Left Emp',
      date_of_joining: '2025-01-01',
      date_of_leaving: '2026-06-15',
      father_name: 'Papa Left',
      pf_account_number: 'PF/123',
    });

    const f5 = await statSvc.getPFForm5(companyId, { from: '2026-04-01', to: '2027-03-31' });
    expect(f5.success).toBe(true);
    // The joiner from beforeAll (Stat Emp, DOJ 2026-05-01) qualifies.
    expect(f5.payload.employees.find((e) => e.name === 'Stat Emp')).toBeTruthy();
    // Establishment header carries the company name.
    expect(f5.payload.establishment.name).toBeTruthy();
    // Out-of-period request excludes them.
    const f5out = await statSvc.getPFForm5(companyId, { from: '2020-01-01', to: '2020-12-31' });
    expect(f5out.payload.employees.length).toBe(0);

    const f10 = await statSvc.getPFForm10(companyId, { from: '2026-04-01', to: '2027-03-31' });
    expect(f10.success).toBe(true);
    const leaver = f10.payload.employees.find((e) => e.name === 'Left Emp');
    expect(leaver).toBeTruthy();
    expect(leaver.account_no).toBe('PF/123');
    expect(leaver.father_or_husband).toBe('Papa Left');
    // Active joiner must NOT appear among leavers.
    expect(f10.payload.employees.find((e) => e.name === 'Stat Emp')).toBeFalsy();
  });

  it('PF Form 12A ties PF contribution figures to the summary buckets (#209)', async () => {
    const res = await statSvc.getPFForm12A(companyId, { from: '2026-04-01', to: '2027-03-31' });
    expect(res.success).toBe(true);
    // Employees' Share = the same 1800 the summary bucketed under Provident Fund.
    const eeShare = res.payload.accounts.find((a) => /Employees' Share/.test(a.label));
    expect(eeShare.amount).toBe(1800);
    expect(res.payload.total).toBe(1800);
    // Stat Emp contributes to PF via the active salary structure → one member.
    expect(res.payload.members.closing).toBe(1);
    expect(res.payload.establishment.name).toBeTruthy();
  });

  it('PF Monthly Statement lists the PF member with the ₹1800 EE share (#210)', async () => {
    const res = await statSvc.getPFMonthlyStatement(companyId);
    expect(res.success).toBe(true);
    const row = res.payload.rows.find((r) => r.name === 'Stat Emp');
    expect(row).toBeTruthy();
    expect(row.ee_share).toBe(1800);
    expect(res.payload.totals.ee_share).toBe(1800);
  });

  it('PF ECR carries UAN-wise wages + the EE contribution (#211)', async () => {
    const res = await statSvc.getPFECR(companyId);
    expect(res.success).toBe(true);
    const row = res.payload.rows.find((r) => r.name === 'Stat Emp');
    expect(row).toBeTruthy();
    expect(row.ee).toBe(1800);
    // EPS wages are capped at the ₹15,000 statutory ceiling.
    expect(row.eps_wages).toBeLessThanOrEqual(15000);
  });

  it('PF Form 6A consolidates member contributions with a grand total (#213)', async () => {
    const res = await statSvc.getPFForm6A(companyId);
    expect(res.success).toBe(true);
    const row = res.payload.rows.find((r) => r.name === 'Stat Emp');
    expect(row.ee).toBe(1800);
    expect(res.payload.totals.ee).toBe(1800);
    // Employer share splits into EPF-difference + Pension Fund columns (Form 6A cols 6 & 7).
    expect(row).toHaveProperty('epf_er');
    expect(row).toHaveProperty('eps');
    expect(res.payload.statutory_rate).toBeTruthy();
  });

  it('PF Form 3A issues one annual card per member (#212)', async () => {
    const res = await statSvc.getPFForm3A(companyId);
    expect(res.success).toBe(true);
    const card = res.payload.members.find((m) => m.name === 'Stat Emp');
    expect(card).toBeTruthy();
    expect(card.ee).toBe(1800);
    expect(card.account_no).toBeDefined();
  });
});
