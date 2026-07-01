// Rejection In / Rejection Out are non-accounting inventory-only vouchers
// (mirrors Delivery Note / Receipt Note): no voucher_entries row is ever
// created for the party ledger, so a bill-wise allocation against them would
// be a bill reference with no accounting entry to settle — orphaned data that
// would corrupt bill-wise outstanding reports. This asserts:
//   - even if a caller (buggy client, automation) sends bill_references for
//     these voucher types, the backend never persists them
//   - the Bills Receivable / Payable, Ledger Outstandings and Group
//     Outstandings reports stay clean for the party either way

const { setupTestDB, createTestCompany, db } = require("./helpers");
const voucherService = require("../voucher/voucherService");
const ledgerService = require("../ledger/ledgerService");
const stockItemService = require("../stockItem/stockItemService");
const outstandingReportService = require("../report/outstandingReportService");

describe("Rejection In / Rejection Out never create bill references", () => {
  let companyId, fyId, sundryCreditorsGroupId, supplierLedgerId, fanId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Rejection BillWise Co");
    companyId = company.company_id;

    const fy = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fy.rows[0].fy_id;

    const groupsResult = await db.execute(
      `SELECT group_id, name FROM groups WHERE company_id = ?`,
      [companyId]
    );
    sundryCreditorsGroupId = groupsResult.rows.find((g) => g.name === "Sundry Creditors").group_id;

    const supplier = await ledgerService.create({
      company_id: companyId,
      group_id: sundryCreditorsGroupId,
      name: "Bill-wise Supplier",
      is_bill_wise: 1,
    });
    expect(supplier.success).toBe(true);
    supplierLedgerId = supplier.ledger.ledger_id;

    const fan = await stockItemService.create({ company_id: companyId, name: "Fan" });
    fanId = fan.item?.item_id ?? fan.itemId ?? fan.id;
  });

  it("does not persist bill_references for a Rejection In voucher, even if the caller sends them", async () => {
    // Simulates the pre-fix client bug: a bill-wise allocation was collected
    // for the party even though Rejection In posts no accounting entry.
    const res = await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: "Rejection In",
      date: "2026-04-15",
      is_accounting_voucher: 0,
      is_inventory_voucher: 1,
      is_order_voucher: 1,
      party_ledger_id: supplierLedgerId,
      party_name: "Bill-wise Supplier",
      entries: [],
      stock_entries: [
        { stock_item_id: fanId, item_name: "Fan", godown_id: null, unit_id: null, quantity: 2, rate: 1000, amount: 2000 },
      ],
      bill_references: [
        { ledger_id: supplierLedgerId, bill_name: "Rej-In-1", bill_type: "New Ref", amount: 2000 },
      ],
    });
    expect(res.success).toBe(true);

    const voucher = await voucherService.getById(res.voucher.voucher_id);
    expect(voucher.success).toBe(true);
    expect(voucher.voucher.entries.length).toBe(0);
    expect(voucher.voucher.bill_references.length).toBe(0);

    const billRows = await db.execute(
      `SELECT * FROM voucher_bill_references WHERE voucher_id = ?`,
      [res.voucher.voucher_id]
    );
    expect(billRows.rows.length).toBe(0);
  });

  it("does not persist bill_references for a Rejection Out voucher either", async () => {
    const res = await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: "Rejection Out",
      date: "2026-04-16",
      is_accounting_voucher: 0,
      is_inventory_voucher: 1,
      is_order_voucher: 1,
      party_ledger_id: supplierLedgerId,
      party_name: "Bill-wise Supplier",
      entries: [],
      stock_entries: [
        { stock_item_id: fanId, item_name: "Fan", godown_id: null, unit_id: null, quantity: 1, rate: 1000, amount: 1000 },
      ],
      bill_references: [
        { ledger_id: supplierLedgerId, bill_name: "Rej-Out-1", bill_type: "New Ref", amount: 1000 },
      ],
    });
    expect(res.success).toBe(true);

    const billRows = await db.execute(
      `SELECT * FROM voucher_bill_references WHERE voucher_id = ?`,
      [res.voucher.voucher_id]
    );
    expect(billRows.rows.length).toBe(0);
  });

  it("keeps Bills Payable / Ledger Outstandings / Group Outstandings clean for the party", async () => {
    const payable = await outstandingReportService.billsPayable(companyId, fyId);
    expect(payable.success).toBe(true);
    expect(payable.rows.find((r) => r.ledger_id === supplierLedgerId)).toBeUndefined();

    const ledgerOut = await outstandingReportService.ledgerOutstandings(companyId, fyId, supplierLedgerId);
    expect(ledgerOut.success).toBe(true);
    expect(ledgerOut.rows.length).toBe(0);

    const groupOut = await outstandingReportService.groupOutstandings(companyId, fyId, sundryCreditorsGroupId);
    expect(groupOut.success).toBe(true);
    expect(groupOut.rows.find((r) => r.ledger_id === supplierLedgerId)).toBeUndefined();
  });
});
