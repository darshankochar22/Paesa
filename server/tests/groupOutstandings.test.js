// Group Outstandings report shape: outstandingReportService.groupOutstandings()
// returns one Particulars row per party under a group, with the net pending split
// into Debit / Credit columns (TallyPrime layout). Ledgers directly under the
// group list individually; ledgers inside a sub-group roll up into a single
// drillable aggregate row for that sub-group.

const { setupTestDB, createTestCompany, db } = require("./helpers");
const { sql } = require("drizzle-orm");
const voucherService = require("../voucher/voucherService");
const ledgerService = require("../ledger/ledgerService");
const groupService = require("../group/groupService");
const outstandingReportService = require("../report/outstandingReportService");

describe("outstandingReportService.groupOutstandings", () => {
  let companyId, fyId, creditorsGroupId, subGroupId, cashLedgerId;
  let directCreditorId, subCreditorId, purchaseLedgerId;

  const DIRECT_AMT = 80000;  // Cr balance on a creditor directly under the group
  const SUB_AMT = 30000;     // Cr balance on a creditor inside the sub-group

  const fetchGroupId = async (name) => {
    const rows = await db.all(
      sql`SELECT group_id FROM groups WHERE company_id = ${companyId} AND name = ${name} LIMIT 1`
    );
    return rows[0].group_id;
  };

  const purchaseOnCredit = async (creditorId, billName, amount, date) => {
    await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Journal", date,
      is_accounting_voucher: 1,
      entries: [
        { ledger_id: purchaseLedgerId, type: "Dr", amount },
        { ledger_id: creditorId, type: "Cr", amount },
      ],
      bill_references: [
        { ledger_id: creditorId, bill_name: billName, bill_type: "New Ref", amount, due_date: date },
      ],
    });
  };

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Group Outstandings Co");
    companyId = company.company_id;

    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;

    const cashRows = await db.all(
      sql`SELECT ledger_id FROM ledgers WHERE company_id = ${companyId} AND ledger_type = 'Cash' LIMIT 1`
    );
    cashLedgerId = cashRows[0].ledger_id;

    creditorsGroupId = await fetchGroupId("Sundry Creditors");

    // Sub-group under Sundry Creditors.
    const sub = await groupService.create({
      company_id: companyId, name: "Local Suppliers", nature: "Liabilities",
      parent_group_id: creditorsGroupId,
    });
    expect(sub.success).toBe(true);
    subGroupId = sub.group.group_id;

    // Creditor directly under Sundry Creditors.
    const direct = await ledgerService.create({
      company_id: companyId, group_id: creditorsGroupId,
      name: "Direct Supplier", nature: "Liabilities", is_bill_wise: 1,
    });
    directCreditorId = Number(direct.ledger_id || direct.ledger?.ledger_id);

    // Creditor inside the sub-group.
    const subLed = await ledgerService.create({
      company_id: companyId, group_id: subGroupId,
      name: "Nested Supplier", nature: "Liabilities", is_bill_wise: 1,
    });
    subCreditorId = Number(subLed.ledger_id || subLed.ledger?.ledger_id);

    const purchaseLedger = await ledgerService.create({
      company_id: companyId, group_id: await fetchGroupId("Purchase Accounts"),
      name: "GO Purchases", nature: "Expenses",
    });
    purchaseLedgerId = Number(purchaseLedger.ledger_id || purchaseLedger.ledger?.ledger_id);

    await purchaseOnCredit(directCreditorId, "GO-DIR-1", DIRECT_AMT, "2026-04-10");
    await purchaseOnCredit(subCreditorId, "GO-SUB-1", SUB_AMT, "2026-04-12");
  });

  it("lists a direct creditor with its balance in the Credit column", async () => {
    const res = await outstandingReportService.groupOutstandings(companyId, fyId, creditorsGroupId);
    expect(res.success).toBe(true);

    const direct = res.rows.find((r) => r.type === "ledger" && r.ledger_id === directCreditorId);
    expect(direct).toBeDefined();
    expect(direct.credit).toBeCloseTo(DIRECT_AMT, 2); // Cr balance
    expect(direct.debit).toBeCloseTo(0, 2);
    // A direct ledger carries its bills for inline expansion.
    expect(Array.isArray(direct.bills)).toBe(true);
    expect(direct.bills.length).toBe(1);
    expect(direct.bills[0].credit).toBeCloseTo(DIRECT_AMT, 2);
  });

  it("rolls a sub-group's ledgers into one aggregate row", async () => {
    const res = await outstandingReportService.groupOutstandings(companyId, fyId, creditorsGroupId);

    const sub = res.rows.find((r) => r.type === "group");
    expect(sub).toBeDefined();
    expect(sub.group_id).toBe(subGroupId);
    expect(sub.party).toBe("Local Suppliers");
    expect(sub.credit).toBeCloseTo(SUB_AMT, 2);
    // The nested ledger itself is NOT a top-level row.
    expect(res.rows.some((r) => r.ledger_id === subCreditorId)).toBe(false);
  });

  it("totals Debit and Credit across all rows", async () => {
    const res = await outstandingReportService.groupOutstandings(companyId, fyId, creditorsGroupId);
    expect(res.totalCredit).toBeCloseTo(DIRECT_AMT + SUB_AMT, 2);
    expect(res.totalDebit).toBeCloseTo(0, 2);
  });

  it("drilling the sub-group shows the nested creditor directly", async () => {
    const res = await outstandingReportService.groupOutstandings(companyId, fyId, subGroupId);
    const nested = res.rows.find((r) => r.type === "ledger" && r.ledger_id === subCreditorId);
    expect(nested).toBeDefined();
    expect(nested.credit).toBeCloseTo(SUB_AMT, 2);
  });
});
