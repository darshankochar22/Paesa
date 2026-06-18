// CRUD sweep for the "payrollUnit" module — exercises the controller exactly
// the way the real UI (PayrollUnitCreate.tsx / PayrollUnitAlter.tsx) drives it
// through IPC.
//
// PayrollUnitCreate.tsx handleSubmit sends:
//   company_id, name (= symbol.trim()), symbol, formal_name (or undefined),
//   unit_type ("Simple" | "Compound"), decimal_places (Number),
//   first_unit / conversion (Number) / second_unit  — only when Compound,
//   otherwise `undefined`.
// PayrollUnitAlter.tsx update sends the same field set plus payroll_unit_id.
//
// We replay those shapes verbatim and assert every submitted field actually
// persists (catches "ignored field" / "dropped flag" bugs), plus the
// predefined-protection and soft-delete behaviors the UI relies on.

const { setupTestDB, createTestCompany } = require("./helpers");
const payrollUnitController = require("../payrollUnit/payrollUnitController");

describe("PayrollUnit CRUD sweep (UI-faithful)", () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("PayrollUnit CRUD Sweep Co");
    companyId = company.company_id;
  });

  it("seeds predefined payroll units on company creation", async () => {
    const res = await payrollUnitController.getAll(null, companyId);
    expect(res.success).toBe(true);
    expect(Array.isArray(res.payrollUnits)).toBe(true);
    const days = res.payrollUnits.find((u) => u.name === "Days");
    expect(days).toBeDefined();
    expect(days.is_predefined).toBe(1);
    expect(days.is_active).toBe(1);
  });

  it("create persists EVERY field a Simple-unit PayrollUnitCreate form submits", async () => {
    // Exact shape produced by PayrollUnitCreate.tsx handleSubmit for a Simple
    // unit: compound fields are `undefined`.
    const payload = {
      company_id: companyId,
      name: "Weeks", // form sets name = symbol.trim()
      symbol: "Weeks",
      formal_name: "Number of Weeks",
      unit_type: "Simple",
      decimal_places: 2,
      first_unit: undefined,
      conversion: undefined,
      second_unit: undefined,
    };

    const res = await payrollUnitController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.unit).toBeDefined();
    const id = res.unit.payroll_unit_id;
    expect(id).toBeDefined();

    const got = await payrollUnitController.getById(null, id);
    expect(got.success).toBe(true);
    const u = got.unit;

    expect(u.company_id).toBe(companyId);
    expect(u.name).toBe("Weeks");
    expect(u.symbol).toBe("Weeks");
    expect(u.formal_name).toBe("Number of Weeks");
    expect(u.unit_type).toBe("Simple");
    expect(u.decimal_places).toBe(2);
    expect(u.first_unit).toBeNull();
    expect(u.conversion).toBeNull();
    expect(u.second_unit).toBeNull();
    expect(u.is_active).toBe(1);
    expect(u.is_predefined).toBe(0);
  });

  it("create persists EVERY field a Compound-unit PayrollUnitCreate form submits", async () => {
    // Exact shape produced by PayrollUnitCreate.tsx for a Compound unit.
    const payload = {
      company_id: companyId,
      name: "Hrs-Min",
      symbol: "Hrs-Min",
      formal_name: "Hours and Minutes",
      unit_type: "Compound",
      decimal_places: 0,
      first_unit: "Hours",
      conversion: 60,
      second_unit: "Minutes",
    };

    const res = await payrollUnitController.create(null, payload);
    expect(res.success).toBe(true);
    const id = res.unit.payroll_unit_id;

    const got = await payrollUnitController.getById(null, id);
    expect(got.success).toBe(true);
    const u = got.unit;
    expect(u.unit_type).toBe("Compound");
    expect(u.first_unit).toBe("Hours");
    expect(u.conversion).toBe(60);
    expect(u.second_unit).toBe("Minutes");
    expect(u.decimal_places).toBe(0);
  });

  it("create with blank formal_name (form sends undefined) leaves it null", async () => {
    const payload = {
      company_id: companyId,
      name: "Shifts",
      symbol: "Shifts",
      formal_name: undefined,
      unit_type: "Simple",
      decimal_places: 0,
      first_unit: undefined,
      conversion: undefined,
      second_unit: undefined,
    };
    const res = await payrollUnitController.create(null, payload);
    expect(res.success).toBe(true);
    const got = await payrollUnitController.getById(null, res.unit.payroll_unit_id);
    expect(got.unit.formal_name).toBeNull();
  });

  it("rejects a duplicate name for the same company (case-insensitive)", async () => {
    const res = await payrollUnitController.create(null, {
      company_id: companyId,
      name: "weeks", // duplicate of "Weeks"
      symbol: "weeks",
      unit_type: "Simple",
      decimal_places: 0,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already exists/i);
  });

  it("update persists the changed fields the PayrollUnitAlter form submits", async () => {
    const list = await payrollUnitController.getAll(null, companyId);
    const weeks = list.payrollUnits.find((u) => u.name === "Weeks");
    expect(weeks).toBeDefined();

    // Replay PayrollUnitAlter.tsx handleSubmit: change to a Compound unit with
    // new values for every editable field.
    const update = {
      payroll_unit_id: weeks.payroll_unit_id,
      name: "Weeks-Alt",
      symbol: "Weeks-Alt",
      formal_name: "Weeks Formal Alt",
      unit_type: "Compound",
      decimal_places: 3,
      first_unit: "Week",
      conversion: 7,
      second_unit: "Days",
    };

    const res = await payrollUnitController.update(null, update);
    expect(res.success).toBe(true);

    const got = await payrollUnitController.getById(null, weeks.payroll_unit_id);
    expect(got.success).toBe(true);
    const u = got.unit;
    expect(u.name).toBe("Weeks-Alt");
    expect(u.symbol).toBe("Weeks-Alt");
    expect(u.formal_name).toBe("Weeks Formal Alt");
    expect(u.unit_type).toBe("Compound");
    expect(u.decimal_places).toBe(3);
    expect(u.first_unit).toBe("Week");
    expect(u.conversion).toBe(7);
    expect(u.second_unit).toBe("Days");
    // Same row, still active (update must NOT delete/duplicate).
    expect(u.payroll_unit_id).toBe(weeks.payroll_unit_id);
    expect(u.is_active).toBe(1);
  });

  it("refuses to edit a predefined payroll unit", async () => {
    const list = await payrollUnitController.getAll(null, companyId);
    const days = list.payrollUnits.find((u) => u.name === "Days");
    const res = await payrollUnitController.update(null, {
      payroll_unit_id: days.payroll_unit_id,
      name: "Hacked Days",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/predefined/i);
  });

  it("refuses to delete a predefined payroll unit", async () => {
    const list = await payrollUnitController.getAll(null, companyId);
    const days = list.payrollUnits.find((u) => u.name === "Days");
    const res = await payrollUnitController.delete(null, days.payroll_unit_id);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/predefined/i);
  });

  it("delete soft-removes a custom unit (is_active=0, gone from getAll)", async () => {
    const list = await payrollUnitController.getAll(null, companyId);
    const shifts = list.payrollUnits.find((u) => u.name === "Shifts");
    expect(shifts).toBeDefined();

    const res = await payrollUnitController.delete(null, shifts.payroll_unit_id);
    expect(res.success).toBe(true);

    const after = await payrollUnitController.getAll(null, companyId);
    const ids = after.payrollUnits.map((u) => u.payroll_unit_id);
    expect(ids).not.toContain(shifts.payroll_unit_id);

    // Soft delete: row still exists with is_active = 0.
    const gone = await payrollUnitController.getById(null, shifts.payroll_unit_id);
    expect(gone.success).toBe(true);
    expect(gone.unit.is_active).toBe(0);
  });
});
