/**
 * CRUD sweep for the priceList module, exercised the way the real UI uses it.
 *
 * Frontend pages:
 *   client/src/pages/master/inventory/pricelist(stockgroup)/pricelist(sg)Create.tsx
 *   client/src/pages/master/inventory/pricelist(stockgroup)/pricelist(sg)Alter.tsx
 *
 * PriceListSGCreate.handleSubmit() sends EXACTLY this payload to
 * window.api.priceList.create:
 *   {
 *     company_id, stock_group, price_level, applicable_from,
 *     lines: [{ item_id, particulars, qty_from, qty_less_than, rate, disc_percent }]
 *   }
 * Only filled lines (particulars non-empty) are sent; numeric line fields are
 * parseFloat()'d (so they arrive as numbers, defaulting to 0). item_id may be a
 * real stock-item id or null when the user typed a free-text particular.
 *
 * PriceListSGAlter loads the record back via getById and reads it in snake_case:
 *   record.stock_group / record.price_level / record.applicable_from /
 *   record.lines[].{ line_id, particulars, item_id, qty_from, qty_less_than,
 *   rate, disc_percent }
 * then resubmits via window.api.priceList.update with:
 *   { id, company_id, stock_group, price_level, applicable_from,
 *     lines: [{ line_id, item_id, particulars, qty_from, qty_less_than, rate,
 *     disc_percent }] }
 * So a created record MUST round-trip through getById with those exact
 * snake_case field names and the submitted values intact, and update must
 * REPLACE the lines (not soft-delete the header).
 *
 * The service returns getAll/getById/create/update payloads as
 * { success, data: { ...header, lines } }.
 */
const { setupTestDB, createTestCompany } = require("./helpers");
const priceListController = require("../priceList/priceListController");
const stockGroupController = require("../stockGroup/stockGroupController");
const stockItemController = require("../stockItem/stockItemController");

describe("priceList CRUD sweep (UI parity)", () => {
  let company;
  let groupId;
  let itemId;

  beforeAll(async () => {
    await setupTestDB();
    company = await createTestCompany("PriceList Sweep Co");

    // FK parents the UI populates its dropdowns from (stockGroup.getAll,
    // stockItem.getAll). stock_group is stored by NAME on the header; item_id is
    // an FK on each line.
    const grp = await stockGroupController.create(null, {
      company_id: company.company_id,
      name: "Beverages",
      alias: null,
      parent_group_id: null,
      should_quantities_be_added: 1,
      taxability_type: "Taxable",
    });
    expect(grp.success).toBe(true);
    groupId = grp.group.sg_id;

    // Resolve a unit FK from whatever the company already has (UI uses
    // unit.getAll to populate the dropdown). Seed one only if none exist.
    const unitMod = require("../unit/unitController");
    let units = await unitMod.getAll(null, company.company_id);
    let unitId = units.success && units.units && units.units.length
      ? units.units[0].unit_id
      : null;
    if (!unitId) {
      const unit = await unitMod.create(null, {
        company_id: company.company_id,
        name: "PL Sweep Unit",
        symbol: "PLSU",
        formal_name: "PL Sweep Unit",
        unit_type: "Simple",
        decimal_places: 0,
      });
      expect(unit.success).toBe(true);
      unitId = unit.unit.unit_id;
    }

    const item = await stockItemController.create(null, {
      company_id: company.company_id,
      name: "Cola 500ml",
      alias: null,
      group_id: groupId,
      unit_id: unitId,
      gst_applicable: "Not Applicable",
      opening_quantity: 0,
      opening_rate: 0,
      allocations: [],
    });
    expect(item.success).toBe(true);
    itemId = item.item.item_id;
  });

  // Mirrors PriceListSGCreate.handleSubmit() verbatim: a 2-line list, one line
  // bound to a real stock item, one free-text line with item_id null, numeric
  // fields already parseFloat()'d to numbers (including an all-zero defaulted
  // line to catch "0 dropped" bugs).
  const buildCreatePayload = (overrides = {}) => ({
    company_id: company.company_id,
    stock_group: "Beverages",
    price_level: "Wholesale",
    applicable_from: "2026-04-01",
    lines: [
      {
        item_id: itemId,
        particulars: "Cola 500ml",
        qty_from: 1,
        qty_less_than: 100,
        rate: 18.5,
        disc_percent: 5,
      },
      {
        item_id: null,
        particulars: "Bulk Slab",
        qty_from: 0,
        qty_less_than: 0,
        rate: 0,
        disc_percent: 0,
      },
    ],
    ...overrides,
  });

  test("create persists every header + line field the Create form submits (read back via getById)", async () => {
    const res = await priceListController.create(null, buildCreatePayload());
    expect(res.success).toBe(true);
    expect(res.data).toBeTruthy();
    const id = res.data.price_list_id;
    expect(id).toBeTruthy();

    const byId = await priceListController.getById(null, id);
    expect(byId.success).toBe(true);
    const pl = byId.data;

    // Header fields — must persist exactly (snake_case, as the Alter form reads).
    expect(pl.company_id).toBe(company.company_id);
    expect(pl.stock_group).toBe("Beverages");
    expect(pl.price_level).toBe("Wholesale");
    expect(pl.applicable_from).toBe("2026-04-01");
    expect(pl.is_active).toBe(1);

    // Lines — order preserved, every submitted field round-tripped including the
    // all-zero defaulted second line and its null item_id.
    expect(Array.isArray(pl.lines)).toBe(true);
    expect(pl.lines.length).toBe(2);

    const l0 = pl.lines[0];
    expect(l0.item_id).toBe(itemId);
    expect(l0.particulars).toBe("Cola 500ml");
    expect(l0.qty_from).toBe(1);
    expect(l0.qty_less_than).toBe(100);
    expect(l0.rate).toBe(18.5);
    expect(l0.disc_percent).toBe(5);

    const l1 = pl.lines[1];
    expect(l1.item_id).toBeNull();
    expect(l1.particulars).toBe("Bulk Slab");
    expect(l1.qty_from).toBe(0);
    expect(l1.qty_less_than).toBe(0);
    expect(l1.rate).toBe(0);
    expect(l1.disc_percent).toBe(0);

    // getAll must surface it for the company.
    const all = await priceListController.getAll(null, company.company_id);
    expect(all.success).toBe(true);
    expect(all.data.some((r) => r.price_list_id === id && r.price_level === "Wholesale")).toBe(true);
    const fromAll = all.data.find((r) => r.price_list_id === id);
    expect(fromAll.lines.length).toBe(2);
  });

  test("create defaults stock_group to 'All Items' when omitted (UI 'All Items' selection)", async () => {
    const res = await priceListController.create(
      null,
      buildCreatePayload({
        stock_group: "All Items",
        price_level: "Retail",
        applicable_from: "2026-05-01",
        lines: [
          { item_id: null, particulars: "Generic", qty_from: 0, qty_less_than: 0, rate: 9, disc_percent: 0 },
        ],
      })
    );
    expect(res.success).toBe(true);
    const byId = await priceListController.getById(null, res.data.price_list_id);
    expect(byId.data.stock_group).toBe("All Items");
    expect(byId.data.lines[0].rate).toBe(9);
  });

  test("create rejects missing required fields the way the controller guards them", async () => {
    const noLevel = await priceListController.create(
      null,
      buildCreatePayload({ price_level: "" })
    );
    expect(noLevel.success).toBe(false);

    const noLines = await priceListController.create(
      null,
      buildCreatePayload({ lines: [] })
    );
    expect(noLines.success).toBe(false);
  });

  test("update persists changed header + replaces lines the Alter form submits (does NOT soft-delete header)", async () => {
    const created = await priceListController.create(
      null,
      buildCreatePayload({ price_level: "Distributor", applicable_from: "2026-06-01" })
    );
    expect(created.success).toBe(true);
    const id = created.data.price_list_id;

    // Mirrors PriceListSGAlter.handleSubmit(): id + full payload, lines carry
    // line_id for existing rows but the service replaces them wholesale. Here we
    // change the header level/date/group and shrink to a single, edited line.
    const upd = await priceListController.update(null, {
      id,
      company_id: company.company_id,
      stock_group: "All Items",
      price_level: "Distributor Special",
      applicable_from: "2026-07-15",
      lines: [
        {
          line_id: created.data.lines[0].line_id,
          item_id: itemId,
          particulars: "Cola 500ml",
          qty_from: 10,
          qty_less_than: 500,
          rate: 16.25,
          disc_percent: 8,
        },
      ],
    });
    expect(upd.success).toBe(true);

    const after = await priceListController.getById(null, id);
    expect(after.success).toBe(true);
    const pl = after.data;
    expect(pl.stock_group).toBe("All Items");
    expect(pl.price_level).toBe("Distributor Special");
    expect(pl.applicable_from).toBe("2026-07-15");
    // header must NOT have been soft-deleted by update.
    expect(pl.is_active).toBe(1);

    // lines replaced (2 -> 1) with the edited values.
    expect(pl.lines.length).toBe(1);
    expect(pl.lines[0].particulars).toBe("Cola 500ml");
    expect(pl.lines[0].qty_from).toBe(10);
    expect(pl.lines[0].qty_less_than).toBe(500);
    expect(pl.lines[0].rate).toBe(16.25);
    expect(pl.lines[0].disc_percent).toBe(8);
  });

  test("delete soft-deletes (is_active=0) and removes the record from getAll", async () => {
    const created = await priceListController.create(
      null,
      buildCreatePayload({ price_level: "TempLevel", applicable_from: "2026-08-01" })
    );
    const id = created.data.price_list_id;

    const del = await priceListController.delete(null, id);
    expect(del.success).toBe(true);

    const all = await priceListController.getAll(null, company.company_id);
    expect(all.data.some((r) => r.price_list_id === id)).toBe(false);

    // getById filters on is_active=1, so a soft-deleted record is no longer found.
    const byId = await priceListController.getById(null, id);
    expect(byId.success).toBe(false);
  });
});
