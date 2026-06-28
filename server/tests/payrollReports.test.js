const { setupTestDB, createTestCompany } = require("./helpers");
const payHeadService = require("../payHead/payHeadService");
const employeeService = require("../employee/employeeService");
const salaryStructureService = require("../salaryStructure/salaryStructureService");
const payrollReportService = require("../report/payrollReportService");

describe("Payroll Report Service — Pay Slip (#125)", () => {
  let companyId;
  let fyId;
  let employeeId;
  let earnHeadId;
  let deductHeadId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany();
    companyId = company.company_id;
    fyId = company.fy_id;

    const earn = await payHeadService.create({
      company_id: companyId,
      name: "Test Basic Pay",
      pay_head_type: "Earnings for Employees",
      calculation_type: "Flat Rate",
    });
    expect(earn.success).toBe(true);
    earnHeadId = earn.payHead.pay_head_id;

    const deduct = await payHeadService.create({
      company_id: companyId,
      name: "Test Loan Recovery",
      pay_head_type: "Deductions from Employees",
      calculation_type: "Flat Rate",
    });
    expect(deduct.success).toBe(true);
    deductHeadId = deduct.payHead.pay_head_id;

    const emp = await employeeService.create({
      company_id: companyId,
      name: "Jane Smith",
      designation: "Accountant",
      department: "Finance",
      date_of_joining: "2026-04-01",
      email: "jane@test.com",
      bank_account_number: "1234567890",
      bank_name: "HDFC Bank",
      bank_branch: "MG Road",
    });
    employeeId = emp.employee.employee_id;

    await salaryStructureService.create({
      company_id: companyId,
      employee_id: employeeId,
      effective_from: "2026-04-01",
      pay_head_id: earnHeadId,
      amount: 50000,
      calculation_mode: "Flat Rate",
    });
    await salaryStructureService.create({
      company_id: companyId,
      employee_id: employeeId,
      effective_from: "2026-04-01",
      pay_head_id: deductHeadId,
      amount: 6000,
      calculation_mode: "Flat Rate",
    });
  });

  it("Multi Pay Slip returns one row per employee with employee_id and net amount", async () => {
    const res = await payrollReportService.paySlip(companyId, fyId);
    expect(res.success).toBe(true);
    const row = res.rows.find((r) => r.employee_id === employeeId);
    expect(row).toBeDefined();
    expect(row.particulars).toBe("Jane Smith");
    expect(row.account_no).toBe("1234567890");
    expect(row.amount).toBe(44000); // 50000 earnings - 6000 deduction
  });

  it("Individual Pay Slip splits pay heads into earnings and deductions with correct net", async () => {
    const res = await payrollReportService.paySlipDetail(companyId, fyId, employeeId);
    expect(res.success).toBe(true);
    expect(res.employee.name).toBe("Jane Smith");
    expect(res.employee.designation).toBe("Accountant");

    expect(res.earnings).toEqual(
      expect.arrayContaining([{ pay_head: "Test Basic Pay", amount: 50000 }])
    );
    expect(res.deductions).toEqual(
      expect.arrayContaining([{ pay_head: "Test Loan Recovery", amount: 6000 }])
    );
    expect(res.total_earnings).toBe(50000);
    expect(res.total_deductions).toBe(6000);
    expect(res.net_amount).toBe(44000);
    expect(res.attendance).toBeDefined();
  });

  it("Individual Pay Slip returns an error for an unknown employee", async () => {
    const res = await payrollReportService.paySlipDetail(companyId, fyId, 999999);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not found/i);
  });
});

describe("Payroll Report Service — Pay Sheet (#126)", () => {
  let companyId;
  let fyId;
  let employeeId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany();
    companyId = company.company_id;
    fyId = company.fy_id;

    // Use "Test " prefixed names: createTestCompany seeds default pay heads
    // (Basic Salary, House Rent Allowance, Provident Fund, …) and create()
    // rejects duplicate names, so unprefixed names would collide.
    const earn = await payHeadService.create({
      company_id: companyId,
      name: "Test Basic Pay 126",
      pay_head_type: "Earnings for Employees",
      calculation_type: "Flat Rate",
    });
    expect(earn.success).toBe(true);
    const hra = await payHeadService.create({
      company_id: companyId,
      name: "Test HRA 126",
      pay_head_type: "Earnings for Employees",
      calculation_type: "Flat Rate",
    });
    expect(hra.success).toBe(true);
    const pf = await payHeadService.create({
      company_id: companyId,
      name: "Test PF 126",
      pay_head_type: "Deductions from Employees",
      calculation_type: "Flat Rate",
    });
    expect(pf.success).toBe(true);

    const emp = await employeeService.create({
      company_id: companyId,
      name: "Ravi Kumar",
      designation: "Engineer",
      department: "Tech",
      date_of_joining: "2026-04-01",
    });
    employeeId = emp.employee.employee_id;

    await salaryStructureService.create({
      company_id: companyId, employee_id: employeeId, effective_from: "2026-04-01",
      pay_head_id: earn.payHead.pay_head_id, amount: 40000, calculation_mode: "Flat Rate",
    });
    await salaryStructureService.create({
      company_id: companyId, employee_id: employeeId, effective_from: "2026-04-01",
      pay_head_id: hra.payHead.pay_head_id, amount: 10000, calculation_mode: "Flat Rate",
    });
    await salaryStructureService.create({
      company_id: companyId, employee_id: employeeId, effective_from: "2026-04-01",
      pay_head_id: pf.payHead.pay_head_id, amount: 5000, calculation_mode: "Flat Rate",
    });
  });

  it("Pay Sheet returns one row per employee with summed earnings, deductions and net", async () => {
    const res = await payrollReportService.paySheet(companyId, fyId);
    expect(res.success).toBe(true);
    const row = res.rows.find((r) => r.particulars === "Ravi Kumar");
    expect(row).toBeDefined();
    expect(row.total_earnings).toBe(50000);   // 40000 Basic + 10000 HRA
    expect(row.total_deductions).toBe(5000);  // PF
    expect(row.net_amount).toBe(45000);       // 50000 - 5000
  });

  it("Pay Sheet net amount always equals earnings minus deductions for every row", async () => {
    const res = await payrollReportService.paySheet(companyId, fyId);
    expect(res.success).toBe(true);
    for (const r of res.rows) {
      expect(r.net_amount).toBe(r.total_earnings - r.total_deductions);
    }
  });
});
