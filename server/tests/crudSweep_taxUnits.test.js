// CRUD sweep for the "taxUnits" module — exercises the controller exactly the
// way the real UI (taxCreate.tsx / taxAlter.tsx) drives it through IPC.
//
// taxCreate.tsx handleSave builds this payload (optional text fields are
// `field || undefined` when blank, the excise flags are coerced to 0/1):
//   company_id, name, alias?, address_line1?..address_line4?, state?, pincode?,
//   telephone?, registered_for:"Excise", set_alter_excise_details (0|1),
//   registration_type, ecc_number?, set_alter_excise_tariff (0|1),
//   set_alter_rule11_book (0|1)
//
// taxAlter.tsx handleSave sends the same shape plus tax_unit_id, but uses
// `field || null` (not undefined) for blank optional fields. We replay both
// shapes verbatim and assert every submitted field actually persists (catches
// "ignored field" / "dropped flag" bugs and broken update/delete handlers).

const { setupTestDB, createTestCompany } = require("./helpers");
const taxUnitController = require("../taxUnits/taxUnitController");

describe("TaxUnits CRUD sweep (UI-faithful)", () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("TaxUnits CRUD Sweep Co");
    companyId = company.company_id;
  });

  it("create persists EVERY field the taxCreate form submits (flags=1)", async () => {
    // Exact shape produced by taxCreate.tsx handleSave with all fields filled
    // and the excise sub-popup answered Yes (tariff + rule11 = 1).
    const payload = {
      company_id: companyId,
      name: "Mumbai Excise Unit",
      alias: "MUM",
      address_line1: "Plot 12, MIDC",
      address_line2: "Andheri East",
      address_line3: "Near Metro",
      address_line4: "Landmark Tower",
      state: "Maharashtra",
      pincode: "400093",
      telephone: "022-5550000",
      registered_for: "Excise",
      set_alter_excise_details: 1,
      registration_type: "Manufacturer",
      ecc_number: "ECC-AAACI1234F",
      set_alter_excise_tariff: 1,
      set_alter_rule11_book: 1,
    };

    const res = await taxUnitController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.taxUnit).toBeDefined();
    const id = res.taxUnit.tax_unit_id;
    expect(id).toBeDefined();

    // Read back through getById — the shape the alter page hydrates from.
    const got = await taxUnitController.getById(null, id);
    expect(got.success).toBe(true);
    const t = got.taxUnit;

    expect(t.company_id).toBe(companyId);
    expect(t.name).toBe("Mumbai Excise Unit");
    expect(t.alias).toBe("MUM");
    expect(t.address_line1).toBe("Plot 12, MIDC");
    expect(t.address_line2).toBe("Andheri East");
    expect(t.address_line3).toBe("Near Metro");
    expect(t.address_line4).toBe("Landmark Tower");
    expect(t.state).toBe("Maharashtra");
    expect(t.pincode).toBe("400093");
    expect(t.telephone).toBe("022-5550000");
    expect(t.registered_for).toBe("Excise");
    // Flags MUST persist as the submitted 1 (catches a dropped/overridden flag).
    expect(t.set_alter_excise_details).toBe(1);
    expect(t.registration_type).toBe("Manufacturer");
    expect(t.ecc_number).toBe("ECC-AAACI1234F");
    expect(t.set_alter_excise_tariff).toBe(1);
    expect(t.set_alter_rule11_book).toBe(1);
    expect(t.is_active).toBe(1);
  });

  it("create with the form's blank optionals (undefined) and flags=0", async () => {
    // taxCreate.tsx sends `field || undefined` for blank text inputs and the
    // excise flags as 0 when the user answers No. registration_type still
    // defaults to "Importer" in the form state.
    const payload = {
      company_id: companyId,
      name: "Bare Unit",
      alias: undefined,
      address_line1: undefined,
      address_line2: undefined,
      address_line3: undefined,
      address_line4: undefined,
      state: undefined,
      pincode: undefined,
      telephone: undefined,
      registered_for: "Excise",
      set_alter_excise_details: 0,
      registration_type: "Importer",
      ecc_number: undefined,
      set_alter_excise_tariff: 0,
      set_alter_rule11_book: 0,
    };

    const res = await taxUnitController.create(null, payload);
    expect(res.success).toBe(true);
    const got = await taxUnitController.getById(null, res.taxUnit.tax_unit_id);
    expect(got.success).toBe(true);
    const t = got.taxUnit;

    expect(t.name).toBe("Bare Unit");
    // Blank optionals stored as NULL (not the string "undefined").
    expect(t.alias).toBeNull();
    expect(t.address_line1).toBeNull();
    expect(t.state).toBeNull();
    expect(t.pincode).toBeNull();
    expect(t.ecc_number).toBeNull();
    expect(t.registration_type).toBe("Importer");
    expect(t.set_alter_excise_details).toBe(0);
    expect(t.set_alter_excise_tariff).toBe(0);
    expect(t.set_alter_rule11_book).toBe(0);
    expect(t.is_active).toBe(1);
  });

  it("rejects a duplicate active tax-unit name for the same company", async () => {
    const res = await taxUnitController.create(null, {
      company_id: companyId,
      name: "Mumbai Excise Unit", // case-insensitive dup of the first row
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already exists/i);
  });

  it("getAll returns only active units for the company", async () => {
    const res = await taxUnitController.getAll(null, companyId);
    expect(res.success).toBe(true);
    expect(Array.isArray(res.taxUnits)).toBe(true);
    const names = res.taxUnits.map((t) => t.name);
    expect(names).toContain("Mumbai Excise Unit");
    expect(names).toContain("Bare Unit");
    res.taxUnits.forEach((t) => expect(t.is_active).toBe(1));
  });

  it("update persists the changed fields the taxAlter form submits", async () => {
    const list = await taxUnitController.getAll(null, companyId);
    const unit = list.taxUnits.find((t) => t.name === "Mumbai Excise Unit");
    expect(unit).toBeDefined();

    // Replay taxAlter.tsx handleSave: full field set with `field || null` for
    // blanks, and every excise flag flipped relative to creation to catch a
    // broken/no-op update (e.g. one that deletes or ignores fields).
    const update = {
      tax_unit_id: unit.tax_unit_id,
      company_id: companyId,
      name: "Mumbai Excise Unit (Alt)",
      alias: "MUM2",
      address_line1: "New Plot 99",
      address_line2: null,
      address_line3: null,
      address_line4: null,
      state: "Gujarat",
      pincode: "380001",
      telephone: "079-1112222",
      registered_for: "Excise",
      set_alter_excise_details: 0,
      registration_type: "Dealer",
      ecc_number: "ECC-NEW999",
      set_alter_excise_tariff: 0,
      set_alter_rule11_book: 0,
    };

    const res = await taxUnitController.update(null, update);
    expect(res.success).toBe(true);

    const got = await taxUnitController.getById(null, unit.tax_unit_id);
    expect(got.success).toBe(true);
    const t = got.taxUnit;

    expect(t.tax_unit_id).toBe(unit.tax_unit_id); // not duplicated/recreated
    expect(t.name).toBe("Mumbai Excise Unit (Alt)");
    expect(t.alias).toBe("MUM2");
    expect(t.address_line1).toBe("New Plot 99");
    expect(t.address_line2).toBeNull();
    expect(t.state).toBe("Gujarat");
    expect(t.pincode).toBe("380001");
    expect(t.telephone).toBe("079-1112222");
    expect(t.registration_type).toBe("Dealer");
    expect(t.ecc_number).toBe("ECC-NEW999");
    // Flipped flags must persist (catches a dropped-flag / no-op update).
    expect(t.set_alter_excise_details).toBe(0);
    expect(t.set_alter_excise_tariff).toBe(0);
    expect(t.set_alter_rule11_book).toBe(0);
    expect(t.is_active).toBe(1);
  });

  it("update of a missing tax unit fails cleanly", async () => {
    const res = await taxUnitController.update(null, {
      tax_unit_id: 999999,
      name: "Ghost",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not found/i);
  });

  it("delete soft-removes the unit (is_active=0, gone from getAll)", async () => {
    const list = await taxUnitController.getAll(null, companyId);
    const unit = list.taxUnits.find((t) => t.name === "Mumbai Excise Unit (Alt)");
    expect(unit).toBeDefined();

    const res = await taxUnitController.delete(null, unit.tax_unit_id);
    expect(res.success).toBe(true);

    const after = await taxUnitController.getAll(null, companyId);
    const ids = after.taxUnits.map((t) => t.tax_unit_id);
    expect(ids).not.toContain(unit.tax_unit_id);

    // Soft delete: row still exists with is_active = 0.
    const gone = await taxUnitController.getById(null, unit.tax_unit_id);
    expect(gone.success).toBe(true);
    expect(gone.taxUnit.is_active).toBe(0);
  });

  it("delete of a missing tax unit fails cleanly", async () => {
    const res = await taxUnitController.delete(null, 999999);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not found/i);
  });
});
