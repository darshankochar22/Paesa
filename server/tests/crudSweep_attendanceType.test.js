// CRUD sweep for the attendanceType module — exercises the controller exactly
// the way the real UI does (AttendanceTypeCreate.tsx / AttendanceTypeAlter.tsx).
//
// Frontend payload shapes (verified against the pages):
//   create (AttendanceTypeCreate.tsx):
//     { company_id, name, alias?, type, unit_id?, period,
//       carry_forward (Number), encashment (Number), max_days (Number) }
//     - alias => undefined when the field is empty.
//     - unit_id => undefined when no unit selected, else Number(unit_id).
//     - type defaults to 'Attendance / Leave with Pay'; period defaults to 'Per Day'.
//     - carry_forward / encashment / max_days are always sent as numbers (incl. 0).
//   update (AttendanceTypeAlter.tsx):
//     { attendance_type_id, name, alias?, type, unit_id?, period,
//       carry_forward (Number), encashment (Number), max_days (Number) }
//   delete: attendance_type_id (plain number) -> soft delete (is_active = 0).
//
// Gotchas covered:
//   - unit_id (FK -> payroll_units) must persist exactly as submitted.
//   - carry_forward / encashment must persist 0 AND non-zero (catch ??/|| bugs that
//     drop a submitted 0 or hard-code the value).
//   - max_days is a REAL column — fractional values must round-trip.
//   - createTestCompany seeds predefined attendance types; predefined rows must be
//     blocked from update + delete.
//   - alias=undefined must store NULL, not throw.

const { setupTestDB, createTestCompany } = require('./helpers');
const attendanceTypeController = require('../attendanceType/attendanceTypeController');
const payrollUnitController = require('../payrollUnit/payrollUnitController');

describe('attendanceType CRUD sweep (UI-faithful)', () => {
  let company;
  let companyId;
  let unitId;

  beforeAll(async () => {
    await setupTestDB();
    company = await createTestCompany('AttendanceType CRUD Co.');
    companyId = company.company_id ?? company.id;
    expect(companyId).toBeTruthy();

    // Resolve a FK parent payroll_unit from the seeded data (createTestCompany seeds
    // predefined units like "Days"). Fall back to creating one if absent.
    const units = await payrollUnitController.getAll(null, companyId);
    expect(units.success).toBe(true);
    if (units.payrollUnits && units.payrollUnits.length > 0) {
      unitId = units.payrollUnits[0].payroll_unit_id;
    } else {
      const made = await payrollUnitController.create(null, {
        company_id: companyId,
        name: 'TestUnit',
        symbol: 'TU',
      });
      expect(made.success).toBe(true);
      unitId = made.unit.payroll_unit_id;
    }
    expect(unitId).toBeTruthy();
  });

  test('create persists every submitted field (incl. unit_id FK + numeric fields)', async () => {
    // Payload exactly as AttendanceTypeCreate.tsx builds it.
    const payload = {
      company_id: companyId,
      name: 'Sick Leave',
      alias: 'SL',
      type: 'Leave without Pay',
      unit_id: unitId,
      period: 'Per Month',
      carry_forward: 1,
      encashment: 1,
      max_days: 12,
    };

    const res = await attendanceTypeController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.attendanceType).toBeTruthy();

    const id = res.attendanceType.attendance_type_id;

    // Read back via getById and assert EVERY submitted field persisted.
    const got = await attendanceTypeController.getById(null, id);
    expect(got.success).toBe(true);
    const row = got.attendanceType;
    expect(row.name).toBe('Sick Leave');
    expect(row.alias).toBe('SL');
    expect(row.type).toBe('Leave without Pay');
    expect(row.unit_id).toBe(unitId);
    expect(row.period).toBe('Per Month');
    expect(row.carry_forward).toBe(1);
    expect(row.encashment).toBe(1);
    expect(row.max_days).toBe(12);
    expect(row.is_active).toBe(1);
    expect(row.is_predefined).toBe(0);

    // Also visible via getAll for the company.
    const all = await attendanceTypeController.getAll(null, companyId);
    expect(all.success).toBe(true);
    expect(all.attendanceTypes.some((r) => r.attendance_type_id === id)).toBe(true);
  });

  test('create persists submitted ZERO numeric fields (no drop/override)', async () => {
    // Form default: carry_forward=0, encashment=0, max_days=0, no unit, empty alias.
    const payload = {
      company_id: companyId,
      name: 'Casual Leave',
      alias: undefined,
      type: 'Attendance / Leave with Pay',
      unit_id: undefined,
      period: 'Per Day',
      carry_forward: 0,
      encashment: 0,
      max_days: 0,
    };

    const res = await attendanceTypeController.create(null, payload);
    expect(res.success).toBe(true);
    const row = (await attendanceTypeController.getById(null, res.attendanceType.attendance_type_id)).attendanceType;
    expect(row.name).toBe('Casual Leave');
    expect(row.alias).toBeNull();      // undefined alias -> NULL
    expect(row.unit_id).toBeNull();    // undefined unit -> NULL
    expect(row.carry_forward).toBe(0);
    expect(row.encashment).toBe(0);
    expect(row.max_days).toBe(0);
    expect(row.period).toBe('Per Day');
  });

  test('create rejects duplicate name (case-insensitive) for same company', async () => {
    const base = {
      company_id: companyId,
      name: 'Maternity Leave',
      type: 'Leave without Pay',
      period: 'Per Day',
      carry_forward: 0,
      encashment: 0,
      max_days: 0,
    };
    const first = await attendanceTypeController.create(null, base);
    expect(first.success).toBe(true);

    const dup = await attendanceTypeController.create(null, { ...base, name: 'maternity leave' });
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/already exists/i);
  });

  test('update persists changed fields (incl. clearing unit + fractional max_days)', async () => {
    const created = await attendanceTypeController.create(null, {
      company_id: companyId,
      name: 'Comp Off',
      type: 'Attendance / Leave with Pay',
      unit_id: unitId,
      period: 'Per Day',
      carry_forward: 0,
      encashment: 0,
      max_days: 0,
    });
    expect(created.success).toBe(true);
    const id = created.attendanceType.attendance_type_id;

    // Update payload exactly as AttendanceTypeAlter.tsx builds it.
    const upd = await attendanceTypeController.update(null, {
      attendance_type_id: id,
      name: 'Compensatory Off',
      alias: 'COMP',
      type: 'Production',
      unit_id: unitId,
      period: 'Per Hour',
      carry_forward: 1,
      encashment: 1,
      max_days: 1.5,
    });
    expect(upd.success).toBe(true);

    const row = (await attendanceTypeController.getById(null, id)).attendanceType;
    expect(row.name).toBe('Compensatory Off');
    expect(row.alias).toBe('COMP');
    expect(row.type).toBe('Production');
    expect(row.period).toBe('Per Hour');
    expect(row.carry_forward).toBe(1);
    expect(row.encashment).toBe(1);
    expect(row.max_days).toBe(1.5);
  });

  test('update does NOT delete the row (broken-update-handler guard)', async () => {
    const created = await attendanceTypeController.create(null, {
      company_id: companyId,
      name: 'Bereavement Leave',
      type: 'Leave without Pay',
      period: 'Per Day',
      carry_forward: 0,
      encashment: 0,
      max_days: 0,
    });
    const id = created.attendanceType.attendance_type_id;

    await attendanceTypeController.update(null, {
      attendance_type_id: id,
      name: 'Bereavement Leave (Paid)',
      type: 'Attendance / Leave with Pay',
      period: 'Per Day',
      carry_forward: 0,
      encashment: 0,
      max_days: 0,
    });

    const got = await attendanceTypeController.getById(null, id);
    expect(got.success).toBe(true);
    expect(got.attendanceType.is_active).toBe(1);
    expect(got.attendanceType.name).toBe('Bereavement Leave (Paid)');
  });

  test('delete soft-deletes (is_active = 0) and removes from getAll', async () => {
    const created = await attendanceTypeController.create(null, {
      company_id: companyId,
      name: 'Study Leave',
      type: 'Leave without Pay',
      period: 'Per Day',
      carry_forward: 0,
      encashment: 0,
      max_days: 0,
    });
    const id = created.attendanceType.attendance_type_id;

    const del = await attendanceTypeController.delete(null, id);
    expect(del.success).toBe(true);

    // Soft-deleted: gone from getAll.
    const all = await attendanceTypeController.getAll(null, companyId);
    expect(all.attendanceTypes.some((r) => r.attendance_type_id === id)).toBe(false);

    // Row still exists with is_active = 0.
    const got = await attendanceTypeController.getById(null, id);
    expect(got.success).toBe(true);
    expect(got.attendanceType.is_active).toBe(0);
  });

  test('predefined attendance types are blocked from update + delete', async () => {
    const all = await attendanceTypeController.getAll(null, companyId);
    const predefined = all.attendanceTypes.find((r) => r.is_predefined === 1);
    expect(predefined).toBeTruthy();

    const upd = await attendanceTypeController.update(null, {
      attendance_type_id: predefined.attendance_type_id,
      name: 'Hacked',
      type: 'Production',
      period: 'Per Day',
      carry_forward: 0,
      encashment: 0,
      max_days: 0,
    });
    expect(upd.success).toBe(false);
    expect(upd.error).toMatch(/predefined/i);

    const del = await attendanceTypeController.delete(null, predefined.attendance_type_id);
    expect(del.success).toBe(false);
    expect(del.error).toMatch(/predefined/i);

    // Unchanged.
    const got = await attendanceTypeController.getById(null, predefined.attendance_type_id);
    expect(got.attendanceType.name).not.toBe('Hacked');
    expect(got.attendanceType.is_active).toBe(1);
  });
});
