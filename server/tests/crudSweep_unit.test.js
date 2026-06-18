/**
 * CRUD sweep for the "unit" module — exercises unitController the way the real UI does.
 *
 * Frontend pages mirrored here:
 *   client/src/pages/master/inventory/unit/UnitCreate.tsx  (create: simple + compound)
 *   client/src/pages/master/inventory/unit/UnitAlter.tsx   (update + delete)
 *
 * The payloads below match EXACTLY what those forms send via window.api.unit.*,
 * including the field set used for simple vs compound.
 */
const { setupTestDB, createTestCompany } = require("./helpers");
const unitController = require("../unit/unitController");

let company;
let companyId;

beforeAll(async () => {
  await setupTestDB();
  company = await createTestCompany("Unit CRUD Co");
  companyId = company.company_id;
});

// Resolve seeded simple units (createTestCompany seeds 7 predefined simple units).
async function getSimpleSeeded() {
  const res = await unitController.getSimpleUnits(null, companyId);
  expect(res.success).toBe(true);
  expect(res.units.length).toBeGreaterThanOrEqual(2);
  return res.units;
}

describe("unit module CRUD (UI parity)", () => {
  test("create SIMPLE unit persists exactly the fields the form sends", async () => {
    // Payload mirrors UnitCreate.tsx handleSubmit() simple branch.
    const payload = {
      company_id: companyId,
      name: "Dozen",
      symbol: "Dz",
      formal_name: "Dozen Units",
      unit_type: "Simple",
      decimal_places: 2,
    };

    const result = await unitController.create(null, payload);
    expect(result.success).toBe(true);
    expect(result.unit).toBeTruthy();

    const id = result.unit.unit_id;

    // Read back via getById (used by alter flow).
    const got = await unitController.getById(null, id);
    expect(got.success).toBe(true);
    const u = got.unit;

    expect(u.symbol).toBe("Dz");
    expect(u.name).toBe("Dozen");
    expect(u.formal_name).toBe("Dozen Units");
    expect(u.unit_type).toBe("Simple");
    expect(Number(u.decimal_places)).toBe(2);
    expect(Number(u.is_simple)).toBe(1);
    expect(Number(u.is_active)).toBe(1);
    expect(Number(u.is_predefined)).toBe(0);
  });

  test("create simple unit appears in getAll for the company", async () => {
    const all = await unitController.getAll(null, companyId);
    expect(all.success).toBe(true);
    const found = all.units.find((x) => x.symbol === "Dz");
    expect(found).toBeTruthy();
    expect(found.formal_name).toBe("Dozen Units");
  });

  test("duplicate symbol (case-insensitive) is rejected", async () => {
    const dup = await unitController.create(null, {
      company_id: companyId,
      name: "dozen2",
      symbol: "dz", // same as "Dz" ignoring case
      formal_name: "",
      unit_type: "Simple",
      decimal_places: 0,
    });
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/already exists/i);
  });

  test("create missing company_id fails cleanly", async () => {
    const res = await unitController.create(null, { symbol: "X", name: "X" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/company/i);
  });

  test("update changes persist (UnitAlter payload incl. unit_quantity_code)", async () => {
    // Create a fresh editable simple unit
    const created = await unitController.create(null, {
      company_id: companyId,
      name: "Roll",
      symbol: "Rll",
      formal_name: "Roll",
      unit_type: "Simple",
      decimal_places: 0,
    });
    expect(created.success).toBe(true);
    const id = created.unit.unit_id;

    // Payload mirrors UnitAlter.tsx handleSubmit() simple branch.
    const upd = await unitController.update(null, {
      unit_id: id,
      company_id: companyId,
      name: "RollX",
      symbol: "RllX",
      formal_name: "Roll Extended",
      unit_type: "Simple",
      decimal_places: 3,
      unit_quantity_code: "ROL-ROLLS",
      first_unit_id: null,
      second_unit_id: null,
      conversion_factor: null,
    });
    expect(upd.success).toBe(true);

    const got = await unitController.getById(null, id);
    expect(got.success).toBe(true);
    expect(got.unit.symbol).toBe("RllX");
    expect(got.unit.name).toBe("RollX");
    expect(got.unit.formal_name).toBe("Roll Extended");
    expect(Number(got.unit.decimal_places)).toBe(3);
    // unit_quantity_code is only settable via alter — must persist.
    expect(got.unit.unit_quantity_code).toBe("ROL-ROLLS");
  });

  test("update does NOT delete the row (guards against delete-as-update bug)", async () => {
    const created = await unitController.create(null, {
      company_id: companyId,
      name: "Bundle",
      symbol: "Bdl",
      formal_name: "Bundle",
      unit_type: "Simple",
      decimal_places: 0,
    });
    const id = created.unit.unit_id;

    await unitController.update(null, {
      unit_id: id,
      company_id: companyId,
      name: "Bundle",
      symbol: "Bdl",
      formal_name: "Bundle Pack",
      unit_type: "Simple",
      decimal_places: 0,
      unit_quantity_code: null,
      first_unit_id: null,
      second_unit_id: null,
      conversion_factor: null,
    });

    const got = await unitController.getById(null, id);
    expect(got.success).toBe(true);
    expect(Number(got.unit.is_active)).toBe(1);
    expect(got.unit.formal_name).toBe("Bundle Pack");
  });

  test("predefined units cannot be updated or deleted", async () => {
    const simple = await getSimpleSeeded();
    const predef = simple.find((u) => Number(u.is_predefined) === 1);
    expect(predef).toBeTruthy();

    const upd = await unitController.update(null, {
      unit_id: predef.unit_id,
      company_id: companyId,
      name: "Hacked",
      symbol: "Hk",
      formal_name: "Hacked",
      unit_type: "Simple",
      decimal_places: 0,
    });
    expect(upd.success).toBe(false);
    expect(upd.error).toMatch(/predefined/i);

    const del = await unitController.delete(null, predef.unit_id);
    expect(del.success).toBe(false);
    expect(del.error).toMatch(/predefined/i);
  });

  test("delete soft-removes the unit (is_active=0, gone from getAll)", async () => {
    const created = await unitController.create(null, {
      company_id: companyId,
      name: "Carton",
      symbol: "Ctn",
      formal_name: "Carton",
      unit_type: "Simple",
      decimal_places: 0,
    });
    const id = created.unit.unit_id;

    const del = await unitController.delete(null, id);
    expect(del.success).toBe(true);

    const all = await unitController.getAll(null, companyId);
    expect(all.units.find((x) => x.unit_id === id)).toBeFalsy();
  });

  test("create COMPOUND unit converts an existing simple unit (UnitCreate compound payload)", async () => {
    const simple = await getSimpleSeeded();
    // pick two distinct non-compound simple units to use as first/second
    const first = simple[0];
    const second = simple.find((u) => u.unit_id !== first.unit_id);
    expect(second).toBeTruthy();

    // Payload mirrors UnitCreate.tsx handleSubmit() compound branch.
    const res = await unitController.create(null, {
      company_id: companyId,
      unit_type: "Compound",
      first_unit_id: first.unit_id,
      second_unit_id: second.unit_id,
      conversion_factor: 12,
    });
    expect(res.success).toBe(true);

    // The first unit is mutated into the compound unit.
    const got = await unitController.getById(null, first.unit_id);
    expect(got.success).toBe(true);
    expect(got.unit.unit_type).toBe("Compound");
    expect(Number(got.unit.is_simple)).toBe(0);
    expect(Number(got.unit.first_unit_id)).toBe(Number(first.unit_id));
    expect(Number(got.unit.second_unit_id)).toBe(Number(second.unit_id));
    expect(Number(got.unit.conversion_factor)).toBe(12);
    // joined symbols populated for the UI table
    expect(got.unit.second_unit_symbol).toBe(second.symbol);
  });

  test("compound create rejects identical first/second units", async () => {
    const simple = await getSimpleSeeded();
    const u = simple.find((x) => Number(x.is_predefined) === 1 && x.unit_type === "Simple");
    const res = await unitController.create(null, {
      company_id: companyId,
      unit_type: "Compound",
      first_unit_id: u.unit_id,
      second_unit_id: u.unit_id,
      conversion_factor: 10,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/same/i);
  });

  test("compound create rejects non-positive conversion factor", async () => {
    const simple = await getSimpleSeeded();
    const a = simple[0];
    const b = simple.find((u) => u.unit_id !== a.unit_id && u.unit_type === "Simple");
    const res = await unitController.create(null, {
      company_id: companyId,
      unit_type: "Compound",
      first_unit_id: a.unit_id,
      second_unit_id: b.unit_id,
      conversion_factor: 0,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/conversion factor/i);
  });
});
