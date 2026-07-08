// Verifies the per-godown balance query that drives the Physical Stock voucher's
// "List of Godowns" quantity column (stockItemService.getStockBalancesByGodown).

const { setupTestDB, createTestCompany, db } = require("./helpers");
const voucherService = require("../voucher/voucherService");
const stockItemService = require("../stockItem/stockItemService");
const godownController = require("../godown/godownController");

describe("Physical Stock — per-godown balance", () => {
  let companyId, fyId, itemId, g1, g2;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("PS Godown Co");
    companyId = company.company_id;

    const fy = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fy.rows[0].fy_id;

    const gd1 = await godownController.create(null, { company_id: companyId, name: "PSG-Alpha" });
    expect(gd1.success).toBe(true);
    g1 = gd1.godown.godown_id;
    const gd2 = await godownController.create(null, { company_id: companyId, name: "PSG-Beta" });
    expect(gd2.success).toBe(true);
    g2 = gd2.godown.godown_id;

    const itemRes = await stockItemService.create({ company_id: companyId, name: "Fan" });
    itemId = itemRes.item?.item_id ?? itemRes.itemId ?? itemRes.id;
  });

  it("returns inwards − outwards per godown for an item", async () => {
    // Inward 10 to Main Location, 8 to Burari.
    const inRes = await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Material In",
      date: "2026-04-02", party_name: "ABC Suppliers", is_inventory_voucher: 1, entries: [],
      stock_entries: [
        { stock_item_id: itemId, item_name: "Fan", godown_id: g1, quantity: 10, rate: 100 },
        { stock_item_id: itemId, item_name: "Fan", godown_id: g2, quantity: 8, rate: 100 },
      ],
    });
    expect(inRes.success).toBe(true);

    // Outward 3 from Main Location.
    const outRes = await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Material Out",
      date: "2026-04-03", party_name: "XYZ Customer", is_inventory_voucher: 1, entries: [],
      stock_entries: [
        { stock_item_id: itemId, item_name: "Fan", godown_id: g1, quantity: 3, rate: 100 },
      ],
    });
    expect(outRes.success).toBe(true);

    const res = await stockItemService.getStockBalancesByGodown(companyId, itemId);
    expect(res.success).toBe(true);
    expect(Number(res.balances[g1])).toBe(7); // 10 in − 3 out
    expect(Number(res.balances[g2])).toBe(8); // 8 in
  });

  it("lets a Physical Stock count override that godown's balance", async () => {
    const physicalStockService = require("../physicalStock/physicalStockService");
    const ps = await physicalStockService.create({
      company_id: companyId,
      voucher_no: "PS-1",
      voucher_date: "2026-04-10",
      reference_no: null,
      narration: null,
      is_optional: 0,
      is_post_dated: 0,
      lines: [
        { stock_item_id: itemId, godown_id: g1, batch_no: null, lot_no: null, manufacturing_date: null, expiry_date: null, quantity: 5, rate: 0, amount: 0, line_order: 1 },
      ],
    });
    expect(ps.success).toBe(true);

    const res = await stockItemService.getStockBalancesByGodown(companyId, itemId);
    expect(res.success).toBe(true);
    expect(Number(res.balances[g1])).toBe(5); // physical count overrides g1
    expect(Number(res.balances[g2])).toBe(8); // g2 unaffected
  });

  it("includes per-godown OPENING allocations, plus later movements", async () => {
    // Item created with an opening stock of 15 in godown g1 (no vouchers yet).
    const openRes = await stockItemService.create({
      company_id: companyId,
      name: "Table",
      allocations: [{ godown_id: g1, quantity: 15, rate: 200 }],
    });
    const tableId = openRes.item?.item_id ?? openRes.itemId ?? openRes.id;

    let res = await stockItemService.getStockBalancesByGodown(companyId, tableId);
    expect(res.success).toBe(true);
    expect(Number(res.balances[g1])).toBe(15); // opening balance shows with no movement

    // Move 5 out of g1 → opening 15 − 5 = 10.
    const outRes = await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Material Out",
      date: "2026-04-20", party_name: "XYZ Customer", is_inventory_voucher: 1, entries: [],
      stock_entries: [
        { stock_item_id: tableId, item_name: "Table", godown_id: g1, quantity: 5, rate: 300 },
      ],
    });
    expect(outRes.success).toBe(true);

    res = await stockItemService.getStockBalancesByGodown(companyId, tableId);
    expect(Number(res.balances[g1])).toBe(10); // opening 15 − 5 out
  });

  it("attributes item-level opening (no godown allocation) to Main Location", async () => {
    // Desktop Computer scenario: opening 13 entered at item level, not allocated
    // to any specific godown. The total shows 13, so the per-godown view must
    // attribute it to Main Location (else every godown reads 0 and any sale is
    // reported as negative stock).
    const dcRes = await stockItemService.create({
      company_id: companyId,
      name: "Desktop Computer",
      opening_quantity: 13,
      opening_rate: 1000,
    });
    const dcId = dcRes.item?.item_id ?? dcRes.itemId ?? dcRes.id;

    const mainRow = await db.execute(
      `SELECT godown_id FROM godowns WHERE company_id = ? AND is_main_location = 1 LIMIT 1`,
      [companyId]
    );
    const mainId = mainRow.rows[0].godown_id;

    const res = await stockItemService.getStockBalancesByGodown(companyId, dcId);
    expect(res.success).toBe(true);
    expect(Number(res.balances[mainId])).toBe(13); // unallocated opening → Main Location
  });

  it("returns empty for an unknown item", async () => {
    const res = await stockItemService.getStockBalancesByGodown(companyId, 999999);
    expect(res.success).toBe(true);
    expect(Object.keys(res.balances).length).toBe(0);
  });

  it("returns active batches (name / expiry / balance) for an item", async () => {
    await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Material In",
      date: "2026-04-15", party_name: "ABC Suppliers", is_inventory_voucher: 1, entries: [],
      stock_entries: [
        { stock_item_id: itemId, item_name: "Fan", quantity: 10, rate: 100,
          batches: [{ batch_number: "B-1", expiry_date: "9 Days", quantity: 10, rate: 100 }] },
      ],
    });
    await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Material Out",
      date: "2026-04-16", party_name: "XYZ Customer", is_inventory_voucher: 1, entries: [],
      stock_entries: [
        { stock_item_id: itemId, item_name: "Fan", quantity: 3, rate: 100,
          batches: [{ batch_number: "B-1", quantity: 3, rate: 100 }] },
      ],
    });

    const res = await stockItemService.getActiveBatches(companyId, itemId);
    expect(res.success).toBe(true);
    const b1 = res.batches.find((b) => b.name === "B-1");
    expect(b1).toBeTruthy();
    expect(Number(b1.balance)).toBe(7); // 10 in − 3 out
    expect(b1.expiry).toBe("9 Days");
  });
});
