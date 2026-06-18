const { setupTestDB, createTestCompany } = require("./helpers");
const attendanceController = require("../attendance/attendanceController");
const employeeService = require("../employee/employeeService");
const employeeGroupService = require("../employeeGroup/employeeGroupService");
const attendanceTypeService = require("../attendanceType/attendanceTypeService");

// CRUD sweep for the "attendance" (attendance voucher) module, exercised exactly
// the way the real UI drives it. The Attendance voucher is created from
// client/src/pages/transactions/hooks/useVoucherForm.ts which calls
// window.api.attendance.create({ company_id, voucher_number, date, narration,
// entries: [{ employee_id, attendance_type_id, value }] }) and
// window.api.attendance.getNextNumber(company_id) for numbering.
//
// The module exposes: getNextNumber, create, getAll, getById, delete.
// (No update op — the UI does not alter attendance vouchers.)

describe("Attendance voucher CRUD sweep (UI parity)", () => {
  let companyId;
  let employeeId;
  let employee2Id;
  let attendanceTypeId;
  let attendanceType2Id;
  let createdVoucherId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Attendance CRUD Sweep Co");
    companyId = company.company_id;

    // Resolve the FK parent for employees: the seeded "Primary" employee group.
    const gRes = await employeeGroupService.getAll(companyId);
    expect(gRes.success).toBe(true);
    const primary = gRes.employeeGroups.find((g) => g.name === "Primary");
    expect(primary).toBeDefined();

    // Create two employees (FK parents for entries).
    const e1 = await employeeService.create({
      company_id: companyId,
      name: "Att Emp One",
      employee_group_id: primary.employee_group_id,
    });
    expect(e1.success).toBe(true);
    employeeId = e1.employee.employee_id;

    const e2 = await employeeService.create({
      company_id: companyId,
      name: "Att Emp Two",
      employee_group_id: primary.employee_group_id,
    });
    expect(e2.success).toBe(true);
    employee2Id = e2.employee.employee_id;

    // Attendance types are seeded on company create; pick two from getAll.
    const tRes = await attendanceTypeService.getAll(companyId);
    expect(tRes.success).toBe(true);
    expect(tRes.attendanceTypes.length).toBeGreaterThanOrEqual(2);
    attendanceTypeId = tRes.attendanceTypes[0].attendance_type_id;
    attendanceType2Id = tRes.attendanceTypes[1].attendance_type_id;
  });

  it("getNextNumber returns an ATT-##### style number", async () => {
    const res = await attendanceController.getNextNumber(null, {
      company_id: companyId,
    });
    expect(res.success).toBe(true);
    expect(res.nextNumber).toMatch(/^ATT-\d{5}$/);
    // UI reads meta.voucherNumber, which comes from this; keep alias too.
    expect(res.voucher_number).toBe(res.nextNumber);
  });

  it("create persists the exact payload the Attendance form sends (header + entries)", async () => {
    // Mirrors useVoucherForm.ts: it pulls voucher_number from getNextNumber,
    // then submits header + entries[{employee_id, attendance_type_id, value}].
    const nn = await attendanceController.getNextNumber(null, {
      company_id: companyId,
    });
    const voucherNumber = nn.nextNumber;

    const payload = {
      company_id: companyId,
      voucher_number: voucherNumber,
      date: "2026-04-15",
      narration: "April attendance batch",
      entries: [
        {
          employee_id: employeeId,
          attendance_type_id: attendanceTypeId,
          value: 22,
        },
        {
          employee_id: employee2Id,
          attendance_type_id: attendanceType2Id,
          value: 1.5,
        },
      ],
    };

    const res = await attendanceController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.attendance_voucher_id).toBeDefined();
    // The form-supplied voucher_number must be honored, not overridden.
    expect(res.voucher_number).toBe(voucherNumber);
    createdVoucherId = res.attendance_voucher_id;

    // Read back via getById (the shape the UI consumes).
    const got = await attendanceController.getById(null, createdVoucherId);
    expect(got.success).toBe(true);
    const v = got.voucher;

    // Header fields must persist.
    expect(v.company_id).toBe(companyId);
    expect(v.voucher_number).toBe(voucherNumber);
    expect(v.date).toBe("2026-04-15");
    expect(v.narration).toBe("April attendance batch");

    // Entry array must persist with the exact employee/type/value submitted.
    expect(Array.isArray(v.entries)).toBe(true);
    expect(v.entries.length).toBe(2);

    const byEmp = {};
    for (const e of v.entries) byEmp[e.employee_id] = e;

    expect(byEmp[employeeId]).toBeDefined();
    expect(byEmp[employeeId].attendance_type_id).toBe(attendanceTypeId);
    expect(byEmp[employeeId].value).toBe(22);

    expect(byEmp[employee2Id]).toBeDefined();
    expect(byEmp[employee2Id].attendance_type_id).toBe(attendanceType2Id);
    expect(byEmp[employee2Id].value).toBe(1.5);

    // The join columns the UI displays must be populated.
    expect(byEmp[employeeId].employee_name).toBe("Att Emp One");
    expect(byEmp[employeeId].attendance_type_name).toBeTruthy();
  });

  it("create with no voucher_number auto-generates the next ATT number", async () => {
    const payload = {
      company_id: companyId,
      voucher_number: undefined,
      date: "2026-04-16",
      narration: null,
      entries: [
        {
          employee_id: employeeId,
          attendance_type_id: attendanceTypeId,
          value: 0,
        },
      ],
    };
    const res = await attendanceController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.voucher_number).toMatch(/^ATT-\d{5}$/);

    const got = await attendanceController.getById(null, res.attendance_voucher_id);
    expect(got.success).toBe(true);
    expect(got.voucher.narration).toBeNull();
    // value 0 must round-trip (not be coerced away/dropped).
    expect(got.voucher.entries.length).toBe(1);
    expect(got.voucher.entries[0].value).toBe(0);
  });

  it("getAll lists the company's attendance vouchers", async () => {
    const res = await attendanceController.getAll(null, companyId);
    expect(res.success).toBe(true);
    expect(Array.isArray(res.vouchers)).toBe(true);
    expect(res.vouchers.some((v) => v.attendance_voucher_id === createdVoucherId)).toBe(true);
  });

  it("delete removes the voucher (and cascades its entries)", async () => {
    const res = await attendanceController.delete(null, createdVoucherId);
    expect(res.success).toBe(true);

    const got = await attendanceController.getById(null, createdVoucherId);
    expect(got.success).toBe(false);

    const all = await attendanceController.getAll(null, companyId);
    expect(all.vouchers.some((v) => v.attendance_voucher_id === createdVoucherId)).toBe(false);
  });
});
