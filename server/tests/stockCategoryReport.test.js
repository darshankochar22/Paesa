// Stock Category Summary report (Inventory Books → Stock Category Summary, issue #111)
// integration test.
//
// Mirrors the body-screenshot chain end-to-end against the real services:
//   1. A stock category "Premium" with item "Laptop".
//   2. Purchase 50 @ 1000 in, Sales 30 @ 2000 out → closing 20.
//   3. Assert the report queries return what the screens render:
//        stockCategoryItems → Stock Category Summary (closing qty/rate/value per item)
//        stockItemMonthly   → 12-month running closing + opening (Level 3 + chart)
//        stockItemVouchers  → opening row + running closing per voucher (Level 4)
//
// Layers 3-4 reuse the #107 services; this asserts the category-scoped path
// (sibling of stockGroupReport.test.js for #110).

const { setupTestDB, createTestCompany, db } = require("./helpers");
const voucherService = require("../voucher/voucherService");
const stockItemService = require("../stockItem/stockItemService");
const stockCategoryService = require("../stockCategory/stockCategoryService");
const stockSummaryReportService = require("../report/stockSummaryReportService");

describe("Stock Category Summary Report (Inventory Books)", () => {
  let companyId, fyId, categoryId, laptopItemId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Stock Category Report Co");
    companyId = company.company_id;

    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;

    const cat = await stockCategoryService.create({ company_id: companyId, name: "Premium" });
    expect(cat.success).toBe(true);
    categoryId = cat.category?.sc_id ?? cat.category?.id ?? cat.id;

    const laptop = await stockItemService.create({ company_id: companyId, name: "Laptop", category_id: categoryId });
    expect(laptop.success).toBe(true);
    laptopItemId = laptop.item?.item_id ?? laptop.itemId ?? laptop.id;

    const purchase = await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Purchase",
      date: "2026-04-10", party_name: "Supplier", is_inventory_voucher: 1, entries: [],
      stock_entries: [{ stock_item_id: laptopItemId, item_name: "Laptop", quantity: 50, rate: 1000 }],
    });
    expect(purchase.success).toBe(true);

    const sale = await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Sales",
      date: "2026-04-20", party_name: "Customer", is_inventory_voucher: 1, entries: [],
      stock_entries: [{ stock_item_id: laptopItemId, item_name: "Laptop", quantity: 30, rate: 2000 }],
    });
    expect(sale.success).toBe(true);
  });

  it("stockCategoryItems lists items in the category with net closing", async () => {
    const res = await stockSummaryReportService.stockCategoryItems(companyId, fyId, categoryId);
    expect(res.success).toBe(true);
    const laptop = res.items.find((i) => i.item_name === "Laptop");
    expect(laptop).toBeDefined();
    expect(laptop.closing_qty).toBe(20);          // 50 in − 30 out
    expect(laptop.closing_value).toBe(-10000);    // 50,000 in − 60,000 out
    expect(res.totalClosingQty).toBe(20);
  });

  it("stockItemMonthly returns opening + 12 months with running closing", async () => {
    const res = await stockSummaryReportService.stockItemMonthly(companyId, fyId, laptopItemId);
    expect(res.success).toBe(true);
    expect(res.opening_qty).toBe(0);
    expect(res.months.length).toBe(12);
    // April: 50 in, 30 out → closing 20; carried to March.
    expect(res.months[res.months.length - 1].closing_qty).toBe(20);
  });

  it("stockItemVouchers gives running closing per voucher for the category's item", async () => {
    const res = await stockSummaryReportService.stockItemVouchers(companyId, fyId, laptopItemId, "2026-04-01", "2027-03-31");
    expect(res.success).toBe(true);
    const purchase = res.rows.find((r) => r.voucher_type === "Purchase");
    const sale = res.rows.find((r) => r.voucher_type === "Sales");
    expect(purchase.inwards_qty).toBe(50);
    expect(sale.outwards_qty).toBe(30);
    expect(res.rows[res.rows.length - 1].closing_qty).toBe(20);
  });
});
