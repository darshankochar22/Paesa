// VoucherView renders per-type columns (Godown, per/unit) that Create captures but
// voucher.getById previously returned as bare godown_id/unit_id with no name to show.
// getById now joins godowns/units so the view can display them (see VoucherView.tsx
// ReadOnlyStockTable variants).

const { setupTestDB, createTestCompany, db } = require("./helpers");
const godownService = require("../godown/godownService");
const unitService = require("../unit/unitService");
const voucherController = require("../voucher/voucherController");

describe("voucher.getById resolves godown/unit names on stock entries", () => {
  let companyId, fyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("VoucherView Columns Co");
    companyId = company.company_id;
    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;
  });

  it("Delivery Note stock entries carry godown_name and unit_symbol", async () => {
    const godown = await godownService.create({ company_id: companyId, name: "Main Store" });
    expect(godown.success).toBe(true);
    const unit = await unitService.create({ company_id: companyId, name: "Test Units", symbol: "Tux" });
    expect(unit.success).toBe(true);

    const created = await voucherController.create(null, {
      company_id: companyId, fy_id: fyId, voucher_type: "Delivery Note", date: "2026-04-15",
      status: "Regular", party_name: "Walk-in",
      is_accounting_voucher: 0, is_invoice: 0, is_inventory_voucher: 1, is_order_voucher: 0, is_post_dated: 0,
      stock_entries: [
        {
          item_name: "Widget", quantity: 5, rate: 100, amount: 500,
          godown_id: godown.godown.godown_id, unit_id: unit.unit.unit_id,
        },
      ],
    });
    expect(created.success).toBe(true);

    const res = await voucherController.getById(null, created.voucher.voucher_id);
    expect(res.success).toBe(true);
    expect(res.voucher.stock_entries.length).toBe(1);
    expect(res.voucher.stock_entries[0].godown_name).toBe("Main Store");
    expect(res.voucher.stock_entries[0].unit_symbol).toBe("Tux");
  });
});
