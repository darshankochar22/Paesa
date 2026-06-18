const { setupTestDB, createTestCompany } = require("./helpers");
const employeeController = require("../employee/employeeController");
const employeeGroupService = require("../employeeGroup/employeeGroupService");

// CRUD sweep for the "employee" module, exercised exactly the way the real UI
// (client/src/pages/master/payroll/employee/EmployeeCreate.tsx + EmployeeAlter.tsx)
// drives it through window.api.employee.*  ->  employeeController.

describe("Employee CRUD sweep (UI parity)", () => {
  let companyId;
  let primaryGroupId;
  let createdId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Employee CRUD Sweep Co");
    companyId = company.company_id;

    // Resolve FK parent (employee group) from the seeded data, exactly like the
    // UI does: it picks the "Primary" group from employeeGroup.getAll.
    const gRes = await employeeGroupService.getAll(companyId);
    expect(gRes.success).toBe(true);
    const primary = gRes.employeeGroups.find((g) => g.name === "Primary");
    expect(primary).toBeDefined();
    primaryGroupId = primary.employee_group_id;
  });

  it("create persists every field the EmployeeCreate form sends (general/bank/statutory)", async () => {
    // Payload mirrors EmployeeCreate.tsx handleSubmit (provideBank === "Yes" path,
    // statutory + general blocks included). Fields the form leaves blank become
    // undefined — that is preserved here to catch "ignored field" bugs.
    const payload = {
      company_id: companyId,
      name: "Asha Verma",
      alias: "ASHA",
      employee_group_id: primaryGroupId,
      date_of_joining: "2026-04-10",
      define_salary_details: 1,
      employee_code: "EMP-CUSTOM-1",
      designation: "Senior Engineer",
      function: "Engineering",
      location: "Mumbai HO",
      gender: "Female",
      date_of_birth: "1992-08-15",
      blood_group: "B+",
      father_name: "Ram Verma",
      mother_name: "Sita Verma",
      spouse_name: "Mohan Verma",
      address: "12 MG Road",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      mobile: "9876500011",
      phone: "022-2200110",
      email: "asha@example.com",
      // bank block (provideBank === "Yes")
      bank_account_number: "1234567890",
      bank_name: "HDFC Bank",
      bank_branch: "Fort",
      ifsc_code: "HDFC0000123",
      // statutory block
      applicable_tax_regime: "New Tax Regime",
      pan: "ABCDE1234F",
      aadhaar: "111122223333",
      uan: "100200300400",
      pf_account_number: "PF-001",
      eps_account_number: "EPS-001",
      date_of_joining_pf: "2026-04-10",
      pran: "PRAN-001",
      esi_number: "ESI-001",
      esi_dispensary_name: "City Dispensary",
    };

    const res = await employeeController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.employee).toBeDefined();
    createdId = res.employee.employee_id;
    expect(createdId).toBeDefined();

    // Read back via getById (snake_case shape the UI reads).
    const got = await employeeController.getById(null, createdId);
    expect(got.success).toBe(true);
    const e = got.employee;

    // Assert every submitted field actually persisted.
    expect(e.company_id).toBe(companyId);
    expect(e.name).toBe("Asha Verma");
    expect(e.alias).toBe("ASHA");
    expect(e.employee_group_id).toBe(primaryGroupId);
    expect(e.date_of_joining).toBe("2026-04-10");
    expect(e.define_salary_details).toBe(1);
    expect(e.employee_code).toBe("EMP-CUSTOM-1");
    expect(e.designation).toBe("Senior Engineer");
    expect(e.function).toBe("Engineering");
    expect(e.location).toBe("Mumbai HO");
    expect(e.gender).toBe("Female");
    expect(e.date_of_birth).toBe("1992-08-15");
    expect(e.blood_group).toBe("B+");
    expect(e.father_name).toBe("Ram Verma");
    expect(e.mother_name).toBe("Sita Verma");
    expect(e.spouse_name).toBe("Mohan Verma");
    expect(e.address).toBe("12 MG Road");
    expect(e.city).toBe("Mumbai");
    expect(e.state).toBe("Maharashtra");
    expect(e.pincode).toBe("400001");
    expect(e.mobile).toBe("9876500011");
    expect(e.phone).toBe("022-2200110");
    expect(e.email).toBe("asha@example.com");
    expect(e.bank_account_number).toBe("1234567890");
    expect(e.bank_name).toBe("HDFC Bank");
    expect(e.bank_branch).toBe("Fort");
    expect(e.ifsc_code).toBe("HDFC0000123");
    expect(e.applicable_tax_regime).toBe("New Tax Regime");
    expect(e.pan).toBe("ABCDE1234F");
    expect(e.aadhaar).toBe("111122223333");
    expect(e.uan).toBe("100200300400");
    expect(e.pf_account_number).toBe("PF-001");
    expect(e.eps_account_number).toBe("EPS-001");
    expect(e.date_of_joining_pf).toBe("2026-04-10");
    expect(e.pran).toBe("PRAN-001");
    expect(e.esi_number).toBe("ESI-001");
    expect(e.esi_dispensary_name).toBe("City Dispensary");
    expect(e.is_active).toBe(1);
  });

  it("create with no employee_code auto-generates EMP-##### numbering", async () => {
    // EmployeeCreate sends employee_code: undefined when the form field is blank.
    const payload = {
      company_id: companyId,
      name: "No Code Person",
      alias: undefined,
      employee_group_id: primaryGroupId,
      date_of_joining: undefined,
      define_salary_details: 0,
      employee_code: undefined,
      applicable_tax_regime: "New Tax Regime",
    };
    const res = await employeeController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.employee.employee_code).toMatch(/^EMP-\d{5}$/);
    expect(res.employee.define_salary_details).toBe(0);
  });

  it("getAll returns active employees for the company", async () => {
    const res = await employeeController.getAll(null, companyId);
    expect(res.success).toBe(true);
    expect(Array.isArray(res.employees)).toBe(true);
    expect(res.employees.some((e) => e.employee_id === createdId)).toBe(true);
  });

  it("getByGroup filters employees by employee_group_id", async () => {
    const res = await employeeController.getByGroup(null, {
      company_id: companyId,
      employee_group_id: primaryGroupId,
    });
    expect(res.success).toBe(true);
    expect(res.employees.every((e) => e.employee_group_id === primaryGroupId)).toBe(true);
    expect(res.employees.some((e) => e.employee_id === createdId)).toBe(true);
  });

  it("duplicate active employee_code is rejected", async () => {
    const res = await employeeController.create(null, {
      company_id: companyId,
      name: "Dup Code",
      employee_group_id: primaryGroupId,
      employee_code: "EMP-CUSTOM-1",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already exists/i);
  });

  it("update persists changed fields (EmployeeAlter payload)", async () => {
    // Mirrors EmployeeAlter.tsx handleSubmit: full payload with employee_id.
    const payload = {
      employee_id: createdId,
      name: "Asha V. Verma",
      alias: "ASHA-V",
      employee_group_id: primaryGroupId,
      date_of_joining: "2026-04-10",
      define_salary_details: 0,
      employee_code: "EMP-CUSTOM-1",
      designation: "Lead Engineer",
      function: "Engineering",
      location: "Pune Branch",
      gender: "Female",
      date_of_birth: "1992-08-15",
      blood_group: "B+",
      father_name: "Ram Verma",
      mother_name: "Sita Verma",
      spouse_name: "Mohan Verma",
      address: "99 New Road",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      mobile: "9876500099",
      phone: "020-2200110",
      email: "asha.v@example.com",
      bank_account_number: "9999000011",
      bank_name: "ICICI Bank",
      bank_branch: "Kothrud",
      ifsc_code: "ICIC0000999",
      applicable_tax_regime: "Old Tax Regime",
      pan: "ZYXWV9876L",
      aadhaar: "999988887777",
      uan: "900800700600",
      pf_account_number: "PF-999",
      eps_account_number: "EPS-999",
      date_of_joining_pf: "2026-04-10",
      pran: "PRAN-999",
      esi_number: "ESI-999",
      esi_dispensary_name: "Pune Dispensary",
    };
    const res = await employeeController.update(null, payload);
    expect(res.success).toBe(true);

    const got = await employeeController.getById(null, createdId);
    const e = got.employee;
    expect(e.name).toBe("Asha V. Verma");
    expect(e.alias).toBe("ASHA-V");
    expect(e.designation).toBe("Lead Engineer");
    expect(e.location).toBe("Pune Branch");
    expect(e.define_salary_details).toBe(0);
    expect(e.address).toBe("99 New Road");
    expect(e.city).toBe("Pune");
    expect(e.pincode).toBe("411001");
    expect(e.mobile).toBe("9876500099");
    expect(e.email).toBe("asha.v@example.com");
    expect(e.bank_name).toBe("ICICI Bank");
    expect(e.bank_branch).toBe("Kothrud");
    expect(e.ifsc_code).toBe("ICIC0000999");
    expect(e.applicable_tax_regime).toBe("Old Tax Regime");
    expect(e.pan).toBe("ZYXWV9876L");
    expect(e.uan).toBe("900800700600");
    expect(e.esi_dispensary_name).toBe("Pune Dispensary");
    // row must still exist & be active (catch update-that-deletes bugs)
    expect(e.is_active).toBe(1);
  });

  it("delete soft-deletes (is_active=0) and removes from getAll", async () => {
    const res = await employeeController.delete(null, createdId);
    expect(res.success).toBe(true);

    const got = await employeeController.getById(null, createdId);
    expect(got.success).toBe(true);
    expect(got.employee.is_active).toBe(0);
    expect(got.employee.date_of_leaving).toBeTruthy();

    const all = await employeeController.getAll(null, companyId);
    expect(all.employees.some((e) => e.employee_id === createdId)).toBe(false);

    // employee_code freed after soft-delete: can be reused.
    const reuse = await employeeController.create(null, {
      company_id: companyId,
      name: "Reuse Code",
      employee_group_id: primaryGroupId,
      employee_code: "EMP-CUSTOM-1",
    });
    expect(reuse.success).toBe(true);
  });
});
