// Attendance vouchers are stored in their own table, so they used to be invisible in
// the Day Book (which reads the main vouchers table). getDaybook now merges them in.

const { setupTestDB, createTestCompany, db } = require("./helpers");
const attendanceService = require("../attendance/attendanceService");
const attendanceTypeService = require("../attendanceType/attendanceTypeService");
const employeeService = require("../employee/employeeService");
const voucherService = require("../voucher/voucherService");
const reportController = require("../report/reportController");

describe("Attendance vouchers appear in the Day Book", () => {
  let companyId, fyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Attendance Daybook Co");
    companyId = company.company_id;
    const fy = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fy.rows[0].fy_id;

    const emp = await employeeService.create({ company_id: companyId, name: "Asha Rao", employee_code: "E-1" });
    const empId = emp.employee.employee_id;
    const type = await attendanceTypeService.create({ company_id: companyId, name: "Present", type: "Attendance" });
    const typeId = type.attendanceType.attendance_type_id;

    await attendanceService.create({
      company_id: companyId, date: "2026-04-10", narration: "Apr attendance",
      entries: [{ employee_id: empId, attendance_type_id: typeId, value: 26 }],
    });
  });

  it("getDaybook includes the Attendance voucher with the employee as particulars", async () => {
    const res = await voucherService.getDaybook(companyId, fyId, "2026-04-01", "2026-04-30");
    expect(res.success).toBe(true);
    const att = res.vouchers.find((v) => v.voucher_type === "Attendance");
    expect(att).toBeTruthy();
    expect(att.ledger_names).toBe("Asha Rao");
    expect(att.voucher_number).toBeTruthy();
    // Negative id so it never collides with a real voucher id.
    expect(att.voucher_id < 0).toBe(true);
  });

  it("excludes Attendance vouchers outside the date range", async () => {
    const res = await voucherService.getDaybook(companyId, fyId, "2026-05-01", "2026-05-31");
    expect(res.success).toBe(true);
    expect(res.vouchers.some((v) => v.voucher_type === "Attendance")).toBe(false);
  });

  it("getAll (Voucher Register) includes the Attendance voucher", async () => {
    const res = await voucherService.getAll(companyId, fyId);
    expect(res.success).toBe(true);
    const att = res.vouchers.find((v) => v.voucher_type === "Attendance");
    expect(att).toBeTruthy();
    expect(att.ledger_names).toBe("Asha Rao");
    expect(att.voucher_id < 0).toBe(true);
  });

  it("getByType('Attendance') returns only attendance vouchers", async () => {
    const res = await voucherService.getByType(companyId, fyId, "Attendance");
    expect(res.success).toBe(true);
    expect(res.vouchers.length).toBeGreaterThan(0);
    expect(res.vouchers.every((v) => v.voucher_type === "Attendance")).toBe(true);
  });

  it("voucher.getById resolves the negative Day Book id back to the Attendance voucher", async () => {
    const daybook = await voucherService.getDaybook(companyId, fyId, "2026-04-01", "2026-04-30");
    const negativeId = daybook.vouchers.find((v) => v.voucher_type === "Attendance").voucher_id;

    const res = await voucherService.getById(negativeId);
    expect(res.success).toBe(true);
    expect(res.voucher.voucher_type).toBe("Attendance");
    expect(res.voucher.voucher_id).toBe(negativeId);
    expect(res.voucher.entries).toEqual([]);
    expect(res.voucher.stock_entries).toEqual([]);
    expect(res.voucher.attendance_entries.length).toBe(1);
    expect(res.voucher.attendance_entries[0].employee_name).toBe("Asha Rao");
    expect(res.voucher.attendance_entries[0].value).toBe(26);
  });

  it("Statistics Voucher Register: Attendance is counted, drills into a monthly + day-list, and each row opens via getById", async () => {
    const stats = await reportController.statistics(null, { company_id: companyId, fy_id: fyId });
    expect(stats.success).toBe(true);
    const attStat = stats.vouchers.find((v) => v.vch_type === "Attendance");
    expect(attStat).toBeTruthy();
    expect(attStat.count).toBeGreaterThan(0);

    const monthly = await reportController.statisticsVoucherMonthly(null, { company_id: companyId, fy_id: fyId, voucher_type: "Attendance" });
    expect(monthly.success).toBe(true);
    expect(monthly.rows.length).toBe(12);
    const april = monthly.rows.find((r) => r.month === "April");
    expect(april.total_vouchers).toBe(1);

    const dayList = await reportController.statisticsVoucherDayList(null, {
      company_id: companyId, fy_id: fyId, voucher_type: "Attendance", from_date: "2026-04-01", to_date: "2026-04-30",
    });
    expect(dayList.success).toBe(true);
    expect(dayList.rows.length).toBe(1);
    expect(dayList.rows[0].voucher_id < 0).toBe(true);
    expect(dayList.rows[0].particulars).toBe("Asha Rao");

    const viewRes = await voucherService.getById(dayList.rows[0].voucher_id);
    expect(viewRes.success).toBe(true);
    expect(viewRes.voucher.voucher_type).toBe("Attendance");
  });
});
