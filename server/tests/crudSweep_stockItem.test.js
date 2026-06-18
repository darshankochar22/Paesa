/**
 * CRUD sweep for the stockItem module, exercised the way the real UI uses it.
 *
 * Frontend pages:
 *   client/src/pages/master/inventory/stock-item/StockItemCreate.tsx
 *   client/src/pages/master/inventory/stock-item/StockItemAlter.tsx
 *
 * StockItemCreate.executeSave() computes a `gst` object via calculateGstDetails()
 * and sends exactly the keys spelled out in buildCreatePayload() below to
 * window.api.stockItem.create. Notable UI behaviours this test pins down:
 *   - boolean-ish flags are sent as 0/1 ints (track_batches, track_expiry,
 *     track_date_of_manufacturing, enable_cost_tracking) OR as raw booleans
 *     (has_bom) — both must persist.
 *   - excise_details / vat_details are sent as the "Yes"/"No" strings
 *     (form.set_alter_excise_details / form.set_alter_vat_details). The Alter
 *     form reads them back with `=== "Yes"`, so the exact string must round-trip.
 *   - rate_of_duty is sent and must persist (it is NOT a GST field).
 *   - allocations is an ARRAY of objects (godown/batch/qty/rate). The service
 *     must JSON-explode it into stock_item_opening_allocations and read it back.
 *   - opening_value must be computed = opening_quantity * opening_rate.
 *
 * The Alter form reads everything back via getById (res.item.*), populates the
 * form, then resubmits via update(). So a created item must round-trip through
 * getById with the submitted field values intact.
 */
const { setupTestDB, createTestCompany } = require("./helpers");
const stockItemController = require("../stockItem/stockItemController");
const stockGroupController = require("../stockGroup/stockGroupController");
const unitController = require("../unit/unitController");
const godownController = require("../godown/godownController");

describe("stockItem CRUD sweep (UI parity)", () => {
  let company;
  let groupId;
  let unitId;
  let godownId;

  beforeAll(async () => {
    await setupTestDB();
    company = await createTestCompany("StockItem Sweep Co");

    // Resolve FK parents from seeded/created data, the way the UI populates its
    // dropdowns (stockGroup.getAll, unit.getAll, godown.getAll).
    const grp = await stockGroupController.create(null, {
      company_id: company.company_id,
      name: "Finished Goods",
      alias: null,
      parent_group_id: null,
      should_quantities_be_added: 1,
      taxability_type: "Taxable",
    });
    expect(grp.success).toBe(true);
    groupId = grp.group.sg_id;

    const unit = await unitController.create(null, {
      company_id: company.company_id,
      name: "Sweep Units",
      symbol: "SWU",
      formal_name: "Sweep Units",
      unit_type: "Simple",
    });
    expect(unit.success).toBe(true);
    unitId = unit.unit.unit_id;

    const gd = await godownController.create(null, {
      company_id: company.company_id,
      name: "Main Warehouse",
    });
    expect(gd.success).toBe(true);
    godownId = gd.godown.godown_id;
  });

  // Mirrors StockItemCreate.executeSave() verbatim for a GST-applicable,
  // specify-here, batch-tracked item with an opening-balance allocation.
  const buildCreatePayload = (overrides = {}) => ({
    company_id: company.company_id,
    name: "Laptop Model X",
    alias: "LMX",
    group_id: groupId,
    unit_id: unitId,
    rate_of_duty: 12.5,
    has_bom: false,
    bom_name: undefined,
    opening_quantity: 10,
    opening_rate: 50000,
    // gst object (calculateGstDetails -> Applicable / specify_here / Taxable @18%)
    gst_applicable: "Applicable",
    gst_rate: 18,
    cgst_rate: 9,
    sgst_rate: 9,
    igst_rate: 18,
    type_of_supply: "Goods",
    hsn_sac: "8471",
    source_of_details: "Specified Here",
    hsn_sac_description: "Portable computers",
    hsn_code: "8471",
    gst_rate_details: "specify_here",
    source_of_gst_rate: "Specified Here",
    taxability_type: "Taxable",
    rate_classification_id: null,
    hsn_classification_id: null,
    reorder_level: 0,
    reorder_quantity: 0,
    track_batches: 1,
    track_expiry: 1,
    allocations: [
      {
        godown_id: godownId,
        batch_number: "BATCH-001",
        mfg_date: "2026-01-01",
        expiry_date: "2027-01-01",
        quantity: 10,
        rate: 50000,
      },
    ],
    track_date_of_manufacturing: 1,
    enable_cost_tracking: 1,
    excise_applicable: "Not Applicable",
    excise_details: "No",        // form.set_alter_excise_details
    excise_tariff_name: "",
    excise_tariff_hsn_code: "",
    excise_tariff_uom: "Undefined",
    excise_tariff_valuation_type: "Undefined",
    excise_tariff_rate: 0,
    excise_tariff_rate_per_unit: 0,
    vat_applicable: "Applicable",
    vat_details: "No",           // form.set_alter_vat_details
    ...overrides,
  });

  test("create persists every field the Create form submits (read back via getById)", async () => {
    const res = await stockItemController.create(null, buildCreatePayload());
    expect(res.success).toBe(true);
    expect(res.item).toBeTruthy();
    const id = res.item.item_id;

    const byId = await stockItemController.getById(null, id);
    expect(byId.success).toBe(true);
    const it = byId.item;

    // Core identity / FK
    expect(it.name).toBe("Laptop Model X");
    expect(it.alias).toBe("LMX");
    expect(it.company_id).toBe(company.company_id);
    expect(it.group_id).toBe(groupId);
    expect(it.unit_id).toBe(unitId);

    // rate_of_duty must NOT be dropped/overridden (it is not a GST field).
    expect(it.rate_of_duty).toBe(12.5);

    // GST block
    expect(it.gst_applicable).toBe("Applicable");
    expect(it.hsn_sac).toBe("8471");
    expect(it.hsn_sac_description).toBe("Portable computers");
    expect(it.source_of_details).toBe("Specified Here");
    expect(it.gst_rate_details).toBe("specify_here");
    expect(it.source_of_gst_rate).toBe("Specified Here");
    expect(it.taxability_type).toBe("Taxable");
    expect(it.gst_rate).toBe(18);
    expect(it.cgst_rate).toBe(9);
    expect(it.sgst_rate).toBe(9);
    expect(it.igst_rate).toBe(18);
    expect(it.type_of_supply).toBe("Goods");
    // legacy column kept in sync
    expect(it.hsn_code).toBe("8471");

    // Opening balance + computed value
    expect(it.opening_quantity).toBe(10);
    expect(it.opening_rate).toBe(50000);
    expect(it.opening_value).toBe(10 * 50000);

    // Boolean-ish flags stored as 0/1
    expect(it.track_batches).toBe(1);
    expect(it.track_expiry).toBe(1);
    expect(it.track_date_of_manufacturing).toBe(1);
    expect(it.enable_cost_tracking).toBe(1);
    expect(it.has_bom).toBe(0);

    // Excise / VAT — the "Yes"/"No" strings the Alter form reads back with === "Yes"
    expect(it.excise_applicable).toBe("Not Applicable");
    expect(it.excise_details).toBe("No");
    expect(it.excise_tariff_uom).toBe("Undefined");
    expect(it.excise_tariff_valuation_type).toBe("Undefined");
    expect(it.vat_applicable).toBe("Applicable");
    expect(it.vat_details).toBe("No");

    expect(it.is_active).toBe(1);

    // allocations array round-trip (JSON-exploded into child table)
    expect(Array.isArray(it.allocations)).toBe(true);
    expect(it.allocations.length).toBe(1);
    const a = it.allocations[0];
    expect(a.godown_id).toBe(godownId);
    expect(a.batch_number).toBe("BATCH-001");
    expect(a.mfg_date).toBe("2026-01-01");
    expect(a.expiry_date).toBe("2027-01-01");
    expect(a.quantity).toBe(10);
    expect(a.rate).toBe(50000);
    expect(a.amount).toBe(10 * 50000);

    // getAll must surface it for the company.
    const all = await stockItemController.getAll(null, company.company_id);
    expect(all.success).toBe(true);
    expect(all.stockItems.some((r) => r.item_id === id && r.name === "Laptop Model X")).toBe(true);
  });

  test("create rejects duplicate names (case-insensitive)", async () => {
    const dup = await stockItemController.create(
      null,
      buildCreatePayload({ name: "laptop model x", alias: null, allocations: [] })
    );
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/already exists/i);
  });

  test("create of a GST-not-applicable / no-allocation item works (UI defaults)", async () => {
    const res = await stockItemController.create(
      null,
      buildCreatePayload({
        name: "Simple Service",
        alias: undefined,
        gst_applicable: "Not Applicable",
        gst_rate: 0,
        cgst_rate: 0,
        sgst_rate: 0,
        igst_rate: 0,
        hsn_sac: null,
        hsn_sac_description: null,
        source_of_details: "As per Company/Stock Group",
        gst_rate_details: "as_per_company",
        source_of_gst_rate: "As per Company/Stock Group",
        taxability_type: null,
        hsn_code: null,
        track_batches: 0,
        track_expiry: 0,
        track_date_of_manufacturing: 0,
        enable_cost_tracking: 0,
        opening_quantity: 0,
        opening_rate: 0,
        allocations: [],
      })
    );
    expect(res.success).toBe(true);
    const byId = await stockItemController.getById(null, res.item.item_id);
    expect(byId.item.gst_applicable).toBe("Not Applicable");
    expect(byId.item.opening_value).toBe(0);
    expect(byId.item.allocations).toEqual([]);
  });

  test("getByGroup returns items filtered to the stock group", async () => {
    const res = await stockItemController.getByGroup(null, {
      company_id: company.company_id,
      group_id: groupId,
    });
    expect(res.success).toBe(true);
    expect(res.stockItems.every((r) => r.group_id === groupId)).toBe(true);
    expect(res.stockItems.some((r) => r.name === "Laptop Model X")).toBe(true);
  });

  test("update persists changed fields the Alter form submits (and does not delete the row)", async () => {
    const created = await stockItemController.create(
      null,
      buildCreatePayload({ name: "Mouse Wireless", alias: "MW", allocations: [] })
    );
    expect(created.success).toBe(true);
    const id = created.item.item_id;

    // Mirrors StockItemAlter.executeSave(): item_id + full payload with changes.
    const upd = await stockItemController.update(null, {
      item_id: id,
      company_id: company.company_id,
      name: "Mouse Wireless Pro",
      alias: "MWP",
      group_id: groupId,
      unit_id: unitId,
      rate_of_duty: 5,
      has_bom: false,
      bom_name: null,
      opening_quantity: 25,
      opening_rate: 800,
      gst_applicable: "Applicable",
      gst_rate: 12,
      cgst_rate: 6,
      sgst_rate: 6,
      igst_rate: 12,
      type_of_supply: "Goods",
      hsn_sac: "8471",
      source_of_details: "Specified Here",
      hsn_sac_description: "Computer mouse",
      hsn_code: "8471",
      gst_rate_details: "specify_here",
      source_of_gst_rate: "Specified Here",
      taxability_type: "Taxable",
      rate_classification_id: null,
      hsn_classification_id: null,
      reorder_level: 0,
      reorder_quantity: 0,
      track_batches: 0,
      track_expiry: 0,
      allocations: [],
      track_date_of_manufacturing: 0,
      enable_cost_tracking: 1,
      excise_applicable: "Not Applicable",
      excise_details: "No",
      excise_tariff_name: "",
      excise_tariff_hsn_code: "",
      excise_tariff_uom: "Undefined",
      excise_tariff_valuation_type: "Undefined",
      excise_tariff_rate: 0,
      excise_tariff_rate_per_unit: 0,
      vat_applicable: "Applicable",
      vat_details: "No",
    });
    expect(upd.success).toBe(true);

    const after = await stockItemController.getById(null, id);
    expect(after.success).toBe(true);
    const it = after.item;
    expect(it.name).toBe("Mouse Wireless Pro");
    expect(it.alias).toBe("MWP");
    expect(it.rate_of_duty).toBe(5);
    expect(it.opening_quantity).toBe(25);
    expect(it.opening_rate).toBe(800);
    expect(it.opening_value).toBe(25 * 800);
    expect(it.gst_rate).toBe(12);
    expect(it.cgst_rate).toBe(6);
    expect(it.sgst_rate).toBe(6);
    expect(it.taxability_type).toBe("Taxable");
    expect(it.enable_cost_tracking).toBe(1);
    // update must NOT have soft-deleted the row.
    expect(it.is_active).toBe(1);
  });

  test("update replaces the allocations array (add then change)", async () => {
    const created = await stockItemController.create(
      null,
      buildCreatePayload({ name: "Keyboard Mech", alias: "KM", allocations: [] })
    );
    const id = created.item.item_id;

    const upd = await stockItemController.update(null, {
      item_id: id,
      company_id: company.company_id,
      name: "Keyboard Mech",
      track_batches: 1,
      track_expiry: 0,
      opening_quantity: 7,
      opening_rate: 1500,
      allocations: [
        { godown_id: godownId, batch_number: "KB-A", mfg_date: "", expiry_date: "", quantity: 4, rate: 1500 },
        { godown_id: godownId, batch_number: "KB-B", mfg_date: "", expiry_date: "", quantity: 3, rate: 1500 },
      ],
    });
    expect(upd.success).toBe(true);

    const after = await stockItemController.getById(null, id);
    expect(after.item.allocations.length).toBe(2);
    const batches = after.item.allocations.map((a) => a.batch_number).sort();
    expect(batches).toEqual(["KB-A", "KB-B"]);
  });

  test("delete soft-deletes (is_active=0) and removes from getAll", async () => {
    const created = await stockItemController.create(
      null,
      buildCreatePayload({ name: "Temp Item", alias: null, allocations: [] })
    );
    const id = created.item.item_id;

    const del = await stockItemController.delete(null, id);
    expect(del.success).toBe(true);

    const all = await stockItemController.getAll(null, company.company_id);
    expect(all.stockItems.some((r) => r.item_id === id)).toBe(false);

    const byId = await stockItemController.getById(null, id);
    expect(byId.success).toBe(true);
    expect(byId.item.is_active).toBe(0);
  });
});
