// Payroll statutory reports #223-#233 — Professional Tax, NPS (Subscriber Contribution
// Details / Summary / PRAN Not Available), Gratuity, and Income Tax (Computation /
// Salary Projection / Challan Reconciliation / E-24Q / Form 27A / Form 24Q). All figures
// derive from pay heads on ACTIVE salary structures (annualised where the report is
// yearly); no payroll-run engine.
const { setupTestDB, createTestCompany } = require('./helpers');
const payHeadService = require('../payHead/payHeadService');
const employeeService = require('../employee/employeeService');
const salaryStructureService = require('../salaryStructure/salaryStructureService');

const ptSvc = require('../payroll/professionalTaxReportService');
const npsSvc = require('../payroll/npsReportService');
const gratuitySvc = require('../payroll/gratuityReportService');
const itSvc = require('../payroll/incomeTaxReportService');

const FY = { from: '2026-04-01', to: '2027-03-31' };

describe('Payroll statutory reports (#223-#233)', () => {
  let companyId;
  const heads = {};

  const addStructure = (employee_id, pay_head_id, amount) =>
    salaryStructureService.create({
      company_id: companyId,
      employee_id,
      pay_head_id,
      effective_from: '2026-04-01',
      amount,
      calculation_mode: 'Flat Rate',
    });

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('PayTax Co');
    companyId = company.company_id;

    // createTestCompany seeds the default pay heads (Basic Salary / Professional Tax /
    // TDS / …) — reuse those and only create the NPS heads the defaults lack.
    const all = (await payHeadService.getAll(companyId)).payHeads;
    const byName = (n) => all.find((p) => p.name.toLowerCase() === n.toLowerCase()).pay_head_id;
    const mk = async (data) =>
      (await payHeadService.create({ company_id: companyId, ...data })).payHead.pay_head_id;
    heads.basic = byName('Basic Salary'); // Earnings — used as gratuity wages basis
    heads.pt = byName('Professional Tax'); // Deductions, statutory_component 'PT'
    heads.it = byName('TDS'); // Deductions, statutory_component 'TDS' (income tax on salary)
    heads.npsEE = await mk({
      name: 'NPS Contribution',
      pay_head_type: 'Deductions',
      statutory_component: 'NPS',
    });
    heads.npsER = await mk({
      name: 'Employer NPS Contribution',
      pay_head_type: 'Employer Statutory Contributions',
      statutory_component: 'NPS',
    });

    // Full-time employee: PRAN on record, long service, all components.
    const taxEmp = (
      await employeeService.create({
        company_id: companyId,
        name: 'Tax Emp',
        pan: 'ABCDE1234F',
        pran: 'PRAN00001',
        state: 'Maharashtra',
        designation: 'Manager',
        department: 'Finance',
        date_of_joining: '2015-01-01',
      })
    ).employee.employee_id;
    await addStructure(taxEmp, heads.basic, 30000);
    await addStructure(taxEmp, heads.pt, 200);
    await addStructure(taxEmp, heads.it, 5000);
    await addStructure(taxEmp, heads.npsEE, 3000);
    await addStructure(taxEmp, heads.npsER, 3000);

    // Contributes to NPS but has no PRAN (exception for #226); no earnings/PAN.
    const noPran = (
      await employeeService.create({
        company_id: companyId,
        name: 'No PRAN Emp',
        designation: 'Analyst',
        department: 'Ops',
        date_of_joining: '2016-01-01',
      })
    ).employee.employee_id;
    await addStructure(noPran, heads.npsEE, 1500);
    await addStructure(noPran, heads.npsER, 1500);

    // Recently joined — not gratuity-eligible (<5 years), earns salary.
    const recent = (
      await employeeService.create({
        company_id: companyId,
        name: 'Recent Emp',
        pan: 'XYZAB9876C',
        date_of_joining: '2026-01-01',
      })
    ).employee.employee_id;
    await addStructure(recent, heads.basic, 20000);
  });

  it('#223 Professional Tax lists PT deducted per employee with a total', async () => {
    const res = await ptSvc.getProfessionalTax(companyId);
    expect(res.success).toBe(true);
    const row = res.payload.rows.find((r) => r.employee === 'Tax Emp');
    expect(row).toBeTruthy();
    expect(row.pt).toBe(200);
    expect(row.state).toBe('Maharashtra');
    expect(res.payload.totals.pt).toBe(200);
  });

  it('#224 NPS Subscriber Contribution Details splits employee/employer contribution', async () => {
    const res = await npsSvc.getContributionDetails(companyId);
    expect(res.success).toBe(true);
    const row = res.payload.rows.find((r) => r.name === 'Tax Emp');
    expect(row.pran).toBe('PRAN00001');
    expect(row.ee).toBe(3000);
    expect(row.er).toBe(3000);
    expect(row.total).toBe(6000);
    // The no-PRAN contributor is still a subscriber.
    expect(res.payload.rows.find((r) => r.name === 'No PRAN Emp')).toBeTruthy();
    expect(res.payload.totals.total).toBe(9000);
  });

  it('#225 NPS Summary counts subscribers and totals contribution', async () => {
    const res = await npsSvc.getSummary(companyId);
    expect(res.success).toBe(true);
    const s = res.payload.summary;
    expect(s.subscribers).toBe(2);
    expect(s.with_pran).toBe(1);
    expect(s.without_pran).toBe(1);
    expect(s.total_contribution).toBe(9000);
  });

  it('#226 PRAN Not Available lists NPS contributors with no PRAN only', async () => {
    const res = await npsSvc.getPranNotAvailable(companyId);
    expect(res.success).toBe(true);
    expect(res.payload.rows.find((r) => r.name === 'No PRAN Emp')).toBeTruthy();
    expect(res.payload.rows.find((r) => r.name === 'Tax Emp')).toBeFalsy();
  });

  it('#227 Gratuity marks 5+ year employees eligible and computes payable', async () => {
    const res = await gratuitySvc.getGratuity(companyId);
    expect(res.success).toBe(true);
    const taxEmp = res.payload.rows.find((r) => r.employee === 'Tax Emp');
    expect(taxEmp.eligible).toBe(true);
    expect(taxEmp.wages).toBe(30000);
    expect(taxEmp.payable).toBeGreaterThan(0);
    const recent = res.payload.rows.find((r) => r.employee === 'Recent Emp');
    expect(recent.eligible).toBe(false);
    expect(recent.payable).toBe(0);
  });

  it('#228 Income Tax Computation annualises gross, PT and TDS', async () => {
    const res = await itSvc.getComputation(companyId, FY);
    expect(res.success).toBe(true);
    const row = res.payload.rows.find((r) => r.name === 'Tax Emp');
    expect(row.pan).toBe('ABCDE1234F');
    expect(row.gross).toBe(360000);
    expect(row.professional_tax).toBe(2400);
    expect(row.taxable).toBe(357600);
    expect(row.tds).toBe(60000);
  });

  it('#229 Salary Projection projects the monthly structure across the year', async () => {
    const res = await itSvc.getSalaryProjection(companyId, FY);
    expect(res.success).toBe(true);
    const row = res.payload.rows.find((r) => r.name === 'Tax Emp');
    expect(row.monthly_earnings).toBe(30000);
    expect(row.annual_earnings).toBe(360000);
    // Net = earnings - deductions (200 PT + 5000 IT + 3000 NPS = 8200).
    expect(row.monthly_net).toBe(21800);
  });

  it('#230 Challan Reconciliation lays out month-wise TDS liability', async () => {
    const res = await itSvc.getChallanReconciliation(companyId, FY);
    expect(res.success).toBe(true);
    expect(res.payload.rows.length).toBe(12);
    expect(res.payload.rows[0].liability).toBe(5000);
    expect(res.payload.totals.liability).toBe(60000);
    expect(res.payload.totals.deposited).toBe(0);
  });

  it('#231 E-24Q lists deductees with amount paid and tax deducted', async () => {
    const res = await itSvc.getE24Q(companyId, FY);
    expect(res.success).toBe(true);
    const row = res.payload.rows.find((r) => r.name === 'Tax Emp');
    expect(row.amount_paid).toBe(360000);
    expect(row.tax_deducted).toBe(60000);
    expect(res.payload.totals.tax_deducted).toBe(60000);
  });

  it('#232 Form 27A gives control totals of the return', async () => {
    const res = await itSvc.getForm27A(companyId, FY);
    expect(res.success).toBe(true);
    expect(res.payload.control.deductee_records).toBeGreaterThanOrEqual(1);
    expect(res.payload.control.total_tax_deducted).toBe(60000);
  });

  it('#233 Form 24Q gives the deductee-wise annexure with a quarter label', async () => {
    const res = await itSvc.getForm24Q(companyId, FY);
    expect(res.success).toBe(true);
    const row = res.payload.rows.find((r) => r.name === 'Tax Emp');
    expect(row.tax_deducted).toBe(60000);
    expect(res.payload.quarter).toMatch(/Q[1-4]/);
  });
});
