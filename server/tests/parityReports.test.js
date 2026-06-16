// Parity reports integration test.
//
// Exercises the five new READ-ONLY report services that mirror Tally's
// "parity" reports, on top of seeded, balanced vouchers:
//
//   outstandingReportService.billsReceivable / billsPayable
//   cashFlowReportService.cashFlow
//   stockSummaryReportService.stockSummary
//   ratioAnalysisReportService.ratioAnalysis
//   fundsFlowReportService.fundsFlow
//
// Data is seeded through the real voucherService (and ledger/stockItem
// services) so the reports run against the same shapes production produces.
// Assertions focus on "executes + correct shape + obvious totals", not exact
// figures.

const { setupTestDB, createTestCompany, db } = require("./helpers");
const { sql } = require("drizzle-orm");
const voucherService = require("../voucher/voucherService");
const ledgerService = require("../ledger/ledgerService");
const stockItemService = require("../stockItem/stockItemService");

const outstandingReportService = require("../report/outstandingReportService");
const cashFlowReportService = require("../report/cashFlowReportService");
const stockSummaryReportService = require("../report/stockSummaryReportService");
const ratioAnalysisReportService = require("../report/ratioAnalysisReportService");
const fundsFlowReportService = require("../report/fundsFlowReportService");

describe("Parity Reports (read-only)", () => {
  let companyId;
  let fyId;

  let cashLedgerId;
  let debtorLedgerId;
  let salesLedgerId;
  let purchaseLedgerId;
  let creditorLedgerId;

  const SALE_AMOUNT = 50000;
  const RECEIPT_AMOUNT = 20000;
  const PURCHASE_AMOUNT = 30000;

  // Reference date for the bill so it lands clearly in an ageing bucket.
  const SALE_DATE = "2026-04-10";
  const RECEIPT_DATE = "2026-04-15";
  const PURCHASE_DATE = "2026-04-20";
  const BILL_NAME = "INV-PARITY-001";

  const fetchGroupId = async (groupName) => {
    const rows = await db.all(
      sql`SELECT group_id FROM groups WHERE company_id = ${companyId} AND name = ${groupName} LIMIT 1`
    );
    if (!rows.length) throw new Error(`Group not found: ${groupName}`);
    return rows[0].group_id;
  };

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Parity Reports Co");
    companyId = company.company_id;

    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;

    // Default seeded Cash ledger.
    const cashRows = await db.all(
      sql`SELECT ledger_id FROM ledgers WHERE company_id = ${companyId} AND ledger_type = 'Cash' LIMIT 1`
    );
    cashLedgerId = cashRows[0].ledger_id;

    // Resolve predefined groups that drive the report classifications.
    const debtorGroupId = await fetchGroupId("Sundry Debtors");
    const creditorGroupId = await fetchGroupId("Sundry Creditors");
    const salesGroupId = await fetchGroupId("Sales Accounts");
    const purchaseGroupId = await fetchGroupId("Purchase Accounts");

    // Party + nominal ledgers used by the seeded vouchers.
    const debtor = await ledgerService.create({
      company_id: companyId,
      group_id: debtorGroupId,
      name: "ACME Buyer (Debtor)",
      nature: "Assets",
      is_bill_wise: 1,
    });
    expect(debtor.success).toBe(true);
    debtorLedgerId = Number(debtor.ledger_id || debtor.ledger?.ledger_id);

    const creditor = await ledgerService.create({
      company_id: companyId,
      group_id: creditorGroupId,
      name: "Globex Supplier (Creditor)",
      nature: "Liabilities",
      is_bill_wise: 1,
    });
    expect(creditor.success).toBe(true);
    creditorLedgerId = Number(creditor.ledger_id || creditor.ledger?.ledger_id);

    const salesLedger = await ledgerService.create({
      company_id: companyId,
      group_id: salesGroupId,
      name: "Sales - Goods",
      nature: "Income",
    });
    expect(salesLedger.success).toBe(true);
    salesLedgerId = Number(salesLedger.ledger_id || salesLedger.ledger?.ledger_id);

    const purchaseLedger = await ledgerService.create({
      company_id: companyId,
      group_id: purchaseGroupId,
      name: "Purchase - Goods",
      nature: "Expenses",
    });
    expect(purchaseLedger.success).toBe(true);
    purchaseLedgerId = Number(
      purchaseLedger.ledger_id || purchaseLedger.ledger?.ledger_id
    );

    // A stock item so stockSummary has at least one row to report on.
    // (No group_id: stock_items.group_id references stock_groups, not the
    // accounting "Stock-in-hand" group — the item is left ungrouped.)
    const stockItem = await stockItemService.create({
      company_id: companyId,
      name: "Widget A",
      opening_quantity: 100,
      opening_rate: 200,
    });
    expect(stockItem.success).toBe(true);

    // ---- Seed balanced vouchers -------------------------------------------

    // 1. Credit sale to a debtor with a bill reference (Dr Debtor / Cr Sales).
    //    Posted as a Journal accounting voucher with explicit balanced entries
    //    so the bill-wise allocation drives the outstanding (billsReceivable)
    //    report deterministically.
    const sale = await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: "Journal",
      date: SALE_DATE,
      is_accounting_voucher: 1,
      narration: "Credit sale to ACME Buyer",
      entries: [
        { ledger_id: debtorLedgerId, type: "Dr", amount: SALE_AMOUNT },
        { ledger_id: salesLedgerId, type: "Cr", amount: SALE_AMOUNT },
      ],
      bill_references: [
        {
          ledger_id: debtorLedgerId,
          bill_name: BILL_NAME,
          bill_type: "New Ref",
          amount: SALE_AMOUNT,
          due_date: SALE_DATE,
        },
      ],
    });
    expect(sale.success).toBe(true);

    // 2. Cash receipt (Dr Cash / Cr Debtor) — money coming in.
    const receipt = await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: "Receipt",
      date: RECEIPT_DATE,
      is_accounting_voucher: 1,
      narration: "Cash received from ACME Buyer",
      entries: [
        { ledger_id: cashLedgerId, type: "Dr", amount: RECEIPT_AMOUNT },
        { ledger_id: debtorLedgerId, type: "Cr", amount: RECEIPT_AMOUNT },
      ],
    });
    expect(receipt.success).toBe(true);

    // 3. Purchase (Dr Purchase / Cr Creditor).
    const purchase = await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: "Journal",
      date: PURCHASE_DATE,
      is_accounting_voucher: 1,
      narration: "Goods purchased from Globex",
      entries: [
        { ledger_id: purchaseLedgerId, type: "Dr", amount: PURCHASE_AMOUNT },
        { ledger_id: creditorLedgerId, type: "Cr", amount: PURCHASE_AMOUNT },
      ],
      bill_references: [
        {
          ledger_id: creditorLedgerId,
          bill_name: "PUR-PARITY-001",
          bill_type: "New Ref",
          amount: PURCHASE_AMOUNT,
          due_date: PURCHASE_DATE,
        },
      ],
    });
    expect(purchase.success).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Outstanding (Bills Receivable / Payable)
  // --------------------------------------------------------------------------
  it("billsReceivable shows the debtor bill with an ageing bucket", async () => {
    const res = await outstandingReportService.billsReceivable(companyId, fyId);
    expect(res.success).toBe(true);
    expect(Array.isArray(res.rows)).toBe(true);

    const bill = res.rows.find((r) => r.bill === BILL_NAME);
    expect(bill).toBeDefined();
    expect(bill.ledger_id).toBe(debtorLedgerId);
    expect(bill.balance).toBeCloseTo(SALE_AMOUNT, 2);

    // Sane ageing classification.
    expect(["0-30", "31-60", "61-90", "90+"]).toContain(bill.ageing);

    // Bucket totals scaffold present and the bill's bucket carries its balance.
    expect(res.bucketTotals).toBeDefined();
    expect(res.bucketTotals[bill.ageing]).toBeGreaterThanOrEqual(SALE_AMOUNT);
    expect(res.total).toBeGreaterThanOrEqual(SALE_AMOUNT);
    expect(typeof res.as_on).toBe("string");
  });

  it("billsPayable shows the creditor bill", async () => {
    const res = await outstandingReportService.billsPayable(companyId, fyId);
    expect(res.success).toBe(true);
    expect(Array.isArray(res.rows)).toBe(true);

    const bill = res.rows.find((r) => r.ledger_id === creditorLedgerId);
    expect(bill).toBeDefined();
    expect(bill.balance).toBeCloseTo(PURCHASE_AMOUNT, 2);
    expect(["0-30", "31-60", "61-90", "90+"]).toContain(bill.ageing);
  });

  // --------------------------------------------------------------------------
  // Cash Flow
  // --------------------------------------------------------------------------
  it("cashFlow returns inflow/outflow rows for the cash receipt period", async () => {
    const res = await cashFlowReportService.cashFlow(
      companyId,
      fyId,
      "2026-04-01",
      "2026-04-30"
    );
    expect(res.success).toBe(true);

    // Cash & Bank ledgers were resolved.
    expect(Array.isArray(res.cashBankLedgers)).toBe(true);
    expect(res.cashBankLedgers.length).toBeGreaterThan(0);

    // The receipt (Dr Cash / Cr Debtor) is a net cash inflow whose counter
    // ledger is the debtor.
    expect(Array.isArray(res.byCounterLedger)).toBe(true);
    expect(Array.isArray(res.byVoucherType)).toBe(true);

    const counter = res.byCounterLedger.find(
      (r) => r.ledger_id === debtorLedgerId
    );
    expect(counter).toBeDefined();
    expect(counter.inflow).toBeCloseTo(RECEIPT_AMOUNT, 2);

    // Period-level totals reflect the inflow.
    expect(res.totalInflow).toBeCloseTo(RECEIPT_AMOUNT, 2);
    expect(typeof res.totalOutflow).toBe("number");
    expect(res.netCashFlow).toBeCloseTo(res.totalInflow - res.totalOutflow, 2);

    // The Receipt voucher type carries the inflow.
    const receiptType = res.byVoucherType.find(
      (r) => r.voucher_type === "Receipt"
    );
    expect(receiptType).toBeDefined();
    expect(receiptType.inflow).toBeCloseTo(RECEIPT_AMOUNT, 2);
  });

  // --------------------------------------------------------------------------
  // Stock Summary
  // --------------------------------------------------------------------------
  it("stockSummary returns an array of items with closing figures", async () => {
    const res = await stockSummaryReportService.stockSummary(companyId, fyId);
    expect(res.success).toBe(true);
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.items.length).toBeGreaterThan(0);

    const widget = res.items.find((i) => i.item_name === "Widget A");
    expect(widget).toBeDefined();
    // No inventory vouchers were posted, so closing == opening (100 @ 200).
    expect(widget.closing_qty).toBeCloseTo(100, 2);
    expect(widget.closing_value).toBeCloseTo(20000, 2);

    expect(Array.isArray(res.groups)).toBe(true);
    expect(typeof res.totalClosingQty).toBe("number");
    expect(typeof res.totalClosingValue).toBe("number");
  });

  // --------------------------------------------------------------------------
  // Ratio Analysis
  // --------------------------------------------------------------------------
  it("ratioAnalysis returns numeric ratios and components", async () => {
    const res = await ratioAnalysisReportService.ratioAnalysis(companyId, fyId);
    expect(res.success).toBe(true);
    expect(Array.isArray(res.ratios)).toBe(true);
    expect(res.ratios.length).toBeGreaterThan(0);

    // Every ratio has a key/label and a numeric-or-null value.
    for (const r of res.ratios) {
      expect(typeof r.key).toBe("string");
      expect(typeof r.label).toBe("string");
      expect(r.value === null || typeof r.value === "number").toBe(true);
    }

    // At least one ratio resolved to an actual number given the seeded data.
    const numericRatios = res.ratios.filter((r) => typeof r.value === "number");
    expect(numericRatios.length).toBeGreaterThan(0);

    // Components carry the derived figures used by the ratios.
    expect(res.components).toBeDefined();
    expect(typeof res.components.totalIncome).toBe("number");
    expect(typeof res.components.totalExpenses).toBe("number");
    // Sales posted (50k) should be reflected in income.
    expect(res.components.sales).toBeCloseTo(SALE_AMOUNT, 2);
    // Stock opening value (100 * 200) feeds the inventory figure.
    expect(res.components.inventory).toBeCloseTo(20000, 2);
  });

  // --------------------------------------------------------------------------
  // Funds Flow
  // --------------------------------------------------------------------------
  it("fundsFlow runs and reconciles sources/applications", async () => {
    const res = await fundsFlowReportService.fundsFlow(
      companyId,
      fyId,
      "2026-04-01",
      "2026-04-30"
    );
    expect(res.success).toBe(true);
    expect(Array.isArray(res.sources)).toBe(true);
    expect(Array.isArray(res.applications)).toBe(true);

    expect(typeof res.totalSources).toBe("number");
    expect(typeof res.totalApplications).toBe("number");
    expect(typeof res.fundsFromOperations).toBe("number");

    // Income (sales 50k) net of expenses (purchase 30k) drives funds from
    // operations = 20k for the period.
    expect(res.fundsFromOperations).toBeCloseTo(
      SALE_AMOUNT - PURCHASE_AMOUNT,
      2
    );

    // The net working-capital change is the balancing figure between the two
    // sides of the statement.
    expect(res.netWorkingCapitalChange).toBeCloseTo(
      res.totalSources - res.totalApplications,
      2
    );

    // Every source/application row carries particulars + a positive amount.
    for (const row of [...res.sources, ...res.applications]) {
      expect(typeof row.particulars).toBe("string");
      expect(row.amount).toBeGreaterThan(0);
    }
  });
});
