// Stock Group Summary report (Inventory Books → Stock Group Summary, issue #110)
// integration test.
//
// Mirrors the body-screenshot chain end-to-end against the real services:
//   1. A stock group "Ceiling Fan" with item "Fan".
//   2. Purchase 50 @ 1000 in, Sales 30 @ 2000 out → closing 20.
//   3. Assert the report queries return what the screens render:
//        stockGroupItems   → Stock Group Summary (closing qty/rate/value per item)
//        stockItemMonthly  → 12-month running closing + opening (Level 3 + chart)
//        stockItemVouchers → opening row + running closing per voucher (Level 4)
//
// Layers 3-4 reuse the #107 services; this asserts the group-scoped path.

const { setupTestDB, createTestCompany, db } = require("./helpers");
const voucherService = require("../voucher/voucherService");
const stockItemService = require("../stockItem/stockItemService");
const stockGroupService = require("../stockGroup/stockGroupService");
const stockSummaryReportService = require("../report/stockSummaryReportService");

describe("Stock Group Summary Report (Inventory Books)", () => {
  let companyId, fyId, groupId, fanItemId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Stock Group Report Co");
    companyId = company.company_id;

    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;

    const grp = await stockGroupService.create({ company_id: companyId, name: "Ceiling Fan" });
    expect(grp.success).toBe(true);
    groupId = grp.group?.sg_id ?? grp.group?.id ?? grp.id;

    const fan = await stockItemService.create({ company_id: companyId, name: "Fan", group_id: groupId });
    expect(fan.success).toBe(true);
    fanItemId = fan.item?.item_id ?? fan.itemId ?? fan.id;

    const purchase = await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Purchase",
      date: "2026-04-10", party_name: "Supplier", is_inventory_voucher: 1, entries: [],
      stock_entries: [{ stock_item_id: fanItemId, item_name: "Fan", quantity: 50, rate: 1000 }],
    });
    expect(purchase.success).toBe(true);

    const sale = await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Sales",
      date: "2026-04-20", party_name: "Customer", is_inventory_voucher: 1, entries: [],
      stock_entries: [{ stock_item_id: fanItemId, item_name: "Fan", quantity: 30, rate: 2000 }],
    });
    expect(sale.success).toBe(true);
  });

  it("stockGroupItems lists items in the group with net closing", async () => {
    const res = await stockSummaryReportService.stockGroupItems(companyId, fyId, groupId);
    expect(res.success).toBe(true);
    const fan = res.items.find((i) => i.item_name === "Fan");
    expect(fan).toBeDefined();
    expect(fan.closing_qty).toBe(20);          // 50 in − 30 out
    expect(fan.closing_value).toBe(-10000);    // 50,000 in − 60,000 out
  });

  it("stockItemMonthly returns opening + 12 months with running closing", async () => {
    const res = await stockSummaryReportService.stockItemMonthly(companyId, fyId, fanItemId);
    expect(res.success).toBe(true);
    expect(res.opening_qty).toBe(0);
    expect(res.months.length).toBe(12);
    // April: 50 in, 30 out → closing 20; carried to March.
    expect(res.months[res.months.length - 1].closing_qty).toBe(20);
  });

  it("stockItemVouchers gives running closing per voucher for the group's item", async () => {
    const res = await stockSummaryReportService.stockItemVouchers(companyId, fyId, fanItemId, "2026-04-01", "2027-03-31");
    expect(res.success).toBe(true);
    const purchase = res.rows.find((r) => r.voucher_type === "Purchase");
    const sale = res.rows.find((r) => r.voucher_type === "Sales");
    expect(purchase.inwards_qty).toBe(50);
    expect(sale.outwards_qty).toBe(30);
    expect(res.rows[res.rows.length - 1].closing_qty).toBe(20);
  });
});
