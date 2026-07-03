// getPendingBills also offers the party's open Sales/Purchase Order numbers as
// name-only rows (Tally's Pending Bills list shows the order reference so an
// invoice/receipt can put its Agst Ref against the order number).

const { setupTestDB, createTestCompany, db } = require("./helpers");
const { sql } = require("drizzle-orm");
const voucherService = require("../voucher/voucherService");
const ledgerService = require("../ledger/ledgerService");
const stockItemService = require("../stockItem/stockItemService");
const unitService = require("../unit/unitService");

describe("getPendingBills — order numbers in the Pending Bills list", () => {
  let companyId, fyId, debtorLedgerId, salesLedgerId, itemId, unitId;
  const ORDER_NO = "SO-PB-2";
  const BILL_NAME = "INV-PB-001";

  const fetchGroupId = async (groupName) => {
    const rows = await db.all(
      sql`SELECT group_id FROM groups WHERE company_id = ${companyId} AND name = ${groupName} LIMIT 1`
    );
    return rows[0].group_id;
  };

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Pending Bills Orders Co");
    companyId = company.company_id;

    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;

    const debtorGroupId = await fetchGroupId("Sundry Debtors");
    const salesGroupId = await fetchGroupId("Sales Accounts");

    const debtor = await ledgerService.create({
      company_id: companyId, group_id: debtorGroupId,
      name: "PB Orders Debtor", nature: "Assets", is_bill_wise: 1,
    });
    debtorLedgerId = Number(debtor.ledger_id || debtor.ledger?.ledger_id);

    const salesLedger = await ledgerService.create({
      company_id: companyId, group_id: salesGroupId, name: "PB Orders Sales", nature: "Income",
    });
    salesLedgerId = Number(salesLedger.ledger_id || salesLedger.ledger?.ledger_id);

    const unit = await unitService.create({ company_id: companyId, name: "PB Units", symbol: "pbu" });
    unitId = unit.unit?.unit_id ?? unit.unitId ?? unit.id;

    const item = await stockItemService.create({ company_id: companyId, name: "PB Keyboard", unit_id: unitId });
    itemId = item.item?.item_id ?? item.itemId ?? item.id;

    // A real pending bill, so the order row is asserted alongside it.
    const sale = await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Journal", date: "2026-04-05",
      is_accounting_voucher: 1,
      entries: [
        { ledger_id: debtorLedgerId, type: "Dr", amount: 1000 },
        { ledger_id: salesLedgerId, type: "Cr", amount: 1000 },
      ],
      bill_references: [
        { ledger_id: debtorLedgerId, bill_name: BILL_NAME, bill_type: "New Ref", amount: 1000 },
      ],
    });
    expect(sale.success).toBe(true);

    // Sales Order with an Order No. on its header (order_details).
    const order = await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Sales Order", date: "2026-04-01",
      party_ledger_id: debtorLedgerId, is_inventory_voucher: 1,
      stock_entries: [
        { stock_item_id: itemId, item_name: "PB Keyboard", unit_id: unitId, quantity: 2, rate: 300 },
      ],
      order_details: { order_nos: ORDER_NO },
    });
    expect(order.success).toBe(true);
  });

  it("appends the party's order number as a name-only pending row", async () => {
    const res = await voucherService.getPendingBills(debtorLedgerId, companyId, fyId);
    expect(res.success).toBe(true);

    const bill = res.pendingBills.find((b) => b.bill_name === BILL_NAME);
    expect(bill).toBeDefined();
    expect(bill.balance).toBeCloseTo(1000, 2);

    const orderRow = res.pendingBills.find((b) => b.bill_name === ORDER_NO);
    expect(orderRow).toBeDefined();
    expect(orderRow.is_order).toBe(1);
    expect(orderRow.balance).toBeNull();
    expect(orderRow.bill_date).toBeNull();
  });

  it("does not duplicate an order number that already exists as a real bill", async () => {
    // Advance receipt named like the order — the real bill wins.
    const adv = await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Journal", date: "2026-04-06",
      is_accounting_voucher: 1,
      entries: [
        { ledger_id: debtorLedgerId, type: "Dr", amount: 200 },
        { ledger_id: salesLedgerId, type: "Cr", amount: 200 },
      ],
      bill_references: [
        { ledger_id: debtorLedgerId, bill_name: ORDER_NO, bill_type: "New Ref", amount: 200 },
      ],
    });
    expect(adv.success).toBe(true);

    const res = await voucherService.getPendingBills(debtorLedgerId, companyId, fyId);
    const rows = res.pendingBills.filter((b) => b.bill_name === ORDER_NO);
    expect(rows).toHaveLength(1);
    expect(rows[0].balance).toBeCloseTo(200, 2);
  });
});
