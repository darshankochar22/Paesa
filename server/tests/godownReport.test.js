// Godowns / Excise Units report (Inventory Books → Godowns / Excise Units,
// issue #109) integration test.
//
// Mirrors the 36-screenshot flow end-to-end against the real services:
//   1. A godown with an OPENING-ONLY item: HP M1005 opening-allocated 1 pcs to
//      Burari (no vouchers). This is the case that previously showed nothing
//      because stock_item_opening_allocations was ignored.
//   2. A godown with VOUCHER movement: Fan in Main Location — Purchase 50 in,
//      Sales 30 out → closing 20.
//   3. Assert the godown-report queries return what the screens render:
//        godownItems        → Godown Summary (closing qty/rate/value per item)
//        godownItemMonthly  → opening + 12-month running closing
//        godownVouchers     → opening row + running closing per voucher
//   4. Godown master persists the Excise Tax unit flag (the "Excise Units" half).
//
// Focus: executes + correct shape + obvious totals.

const { setupTestDB, createTestCompany, db } = require("./helpers");
const voucherService = require("../voucher/voucherService");
const stockItemService = require("../stockItem/stockItemService");
const godownService = require("../godown/godownService");
const stockSummaryReportService = require("../report/stockSummaryReportService");

describe("Godowns / Excise Units Report (Inventory Books)", () => {
  let companyId, fyId;
  let burariId, mainId;
  let hpItemId, fanItemId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Godown Report Co");
    companyId = company.company_id;

    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;

    // Default seeded godown is "Main Location"; add "Burari" (an excise unit).
    const all = await godownService.getAll(companyId);
    mainId = all.godowns.find((g) => g.name === "Main Location").godown_id;
    const burari = await godownService.create({
      company_id: companyId,
      name: "Burari",
      excise_tax_unit: "EU-001",
    });
    expect(burari.success).toBe(true);
    burariId = burari.godown.godown_id;

    // 1. Opening-only item — 1 pcs allocated to Burari @ 18,500 (no vouchers).
    const hp = await stockItemService.create({
      company_id: companyId,
      name: "HP M1005",
      opening_quantity: 1,
      opening_rate: 18500,
      allocations: [{ godown_id: burariId, quantity: 1, rate: 18500 }],
    });
    expect(hp.success).toBe(true);
    hpItemId = hp.item?.item_id ?? hp.itemId ?? hp.id;

    // 2. Voucher-movement item — Fan in Main Location.
    const fan = await stockItemService.create({ company_id: companyId, name: "Fan" });
    expect(fan.success).toBe(true);
    fanItemId = fan.item?.item_id ?? fan.itemId ?? fan.id;

    const purchase = await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Purchase",
      date: "2026-04-10", party_name: "Supplier", is_inventory_voucher: 1, entries: [],
      stock_entries: [{ stock_item_id: fanItemId, item_name: "Fan", quantity: 50, rate: 1000, godown_id: mainId }],
    });
    expect(purchase.success).toBe(true);

    const sale = await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Sales",
      date: "2026-04-20", party_name: "Customer", is_inventory_voucher: 1, entries: [],
      stock_entries: [{ stock_item_id: fanItemId, item_name: "Fan", quantity: 30, rate: 2000, godown_id: mainId }],
    });
    expect(sale.success).toBe(true);
  });

  it("godownItems shows opening-only item in Burari (was previously missing)", async () => {
    const res = await stockSummaryReportService.godownItems(companyId, fyId, burariId, "2027-03-31");
    expect(res.success).toBe(true);
    expect(res.godown_name).toBe("Burari");
    const hp = res.rows.find((r) => r.item_name === "HP M1005");
    expect(hp).toBeDefined();
    expect(hp.closing_qty).toBe(1);
    expect(hp.closing_value).toBe(18500);
    expect(hp.rate).toBe(18500);
  });

  it("godownItems nets purchase − sale for Fan in Main Location", async () => {
    const res = await stockSummaryReportService.godownItems(companyId, fyId, mainId, "2027-03-31");
    expect(res.success).toBe(true);
    const fan = res.rows.find((r) => r.item_name === "Fan");
    expect(fan.closing_qty).toBe(20);          // 50 in − 30 out
    expect(fan.closing_value).toBe(-10000);    // 50,000 in − 60,000 out
  });

  it("godownItemMonthly seeds the running balance from the opening allocation", async () => {
    const res = await stockSummaryReportService.godownItemMonthly(companyId, fyId, burariId, hpItemId);
    expect(res.success).toBe(true);
    expect(res.opening.qty).toBe(1);
    expect(res.opening.value).toBe(18500);
    // Every month carries the opening forward (no movement).
    expect(res.months[res.months.length - 1].closing_qty).toBe(1);
    expect(res.months[res.months.length - 1].closing_value).toBe(18500);
  });

  it("godownVouchers returns the opening balance even with no vouchers", async () => {
    const res = await stockSummaryReportService.godownVouchers(companyId, fyId, burariId, hpItemId, "2026-04-01", "2027-03-31");
    expect(res.success).toBe(true);
    expect(res.opening.qty).toBe(1);
    expect(res.opening.value).toBe(18500);
    expect(res.rows.length).toBe(0);
  });

  it("godownVouchers gives running closing per voucher for Fan", async () => {
    const res = await stockSummaryReportService.godownVouchers(companyId, fyId, mainId, fanItemId, "2026-04-01", "2027-03-31");
    expect(res.success).toBe(true);
    expect(res.opening.qty).toBe(0);
    expect(res.rows.length).toBe(2);
    const purchase = res.rows.find((r) => r.voucher_type === "Purchase");
    const sale = res.rows.find((r) => r.voucher_type === "Sales");
    expect(purchase.inwards_qty).toBe(50);
    expect(sale.outwards_qty).toBe(30);
    expect(res.rows[res.rows.length - 1].closing_qty).toBe(20);
  });

  it("godown master persists the Excise Tax unit flag", async () => {
    const res = await godownService.getById(burariId);
    expect(res.success).toBe(true);
    expect(res.godown.excise_tax_unit).toBe("EU-001");
  });
});
