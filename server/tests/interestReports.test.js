const { setupTestDB, createTestCompany, db } = require("./helpers");
const { sql } = require("drizzle-orm");
const voucherService = require("../voucher/voucherService");
const ledgerService = require("../ledger/ledgerService");
const interestReportService = require("../report/interestReportService");

describe("Interest Reports", () => {
  let companyId;
  let fyId;
  let debtorLedgerId;
  let creditorLedgerId;

  const fetchGroupId = async (groupName) => {
    const rows = await db.all(
      sql`SELECT group_id FROM groups WHERE company_id = ${companyId} AND name = ${groupName} LIMIT 1`
    );
    if (!rows.length) throw new Error(`Group not found: ${groupName}`);
    return rows[0].group_id;
  };

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Interest Test Company");
    companyId = company.company_id;

    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;

    const debtorGroupId = await fetchGroupId("Sundry Debtors");
    const creditorGroupId = await fetchGroupId("Sundry Creditors");

    // Predefined groups, we create ledgers with interest active
    const debtor = await ledgerService.create({
      company_id: companyId,
      group_id: debtorGroupId,
      name: "ACME Buyer (Interest)",
      nature: "Assets",
      is_bill_wise: 1,
      activate_interest: 1,
      interest_rate: 12,
      interest_style: "365-Day Year",
      interest_balances: "Debit Balances Only",
    });
    expect(debtor.success).toBe(true);
    debtorLedgerId = Number(debtor.ledger_id || debtor.ledger?.ledger_id);

    const creditor = await ledgerService.create({
      company_id: companyId,
      group_id: creditorGroupId,
      name: "Globex Supplier (Interest)",
      nature: "Liabilities",
      is_bill_wise: 1,
      activate_interest: 1,
      interest_rate: 18,
      interest_style: "365-Day Year",
      interest_balances: "Credit Balances Only",
    });
    expect(creditor.success).toBe(true);
    creditorLedgerId = Number(creditor.ledger_id || creditor.ledger?.ledger_id);

    // Default seeded Sales and Purchase ledgers
    const salesRows = await db.all(
      sql`SELECT ledger_id FROM ledgers WHERE company_id = ${companyId} AND name = 'Sales' LIMIT 1`
    );
    const salesLedgerId = salesRows.length > 0 ? salesRows[0].ledger_id : null;

    const purchaseRows = await db.all(
      sql`SELECT ledger_id FROM ledgers WHERE company_id = ${companyId} AND name = 'Purchase' LIMIT 1`
    );
    const purchaseLedgerId = purchaseRows.length > 0 ? purchaseRows[0].ledger_id : null;

    // Seed balanced vouchers
    // 1. Sale to debtor (Dr Debtor / Cr Sales) on 2026-04-01
    await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: "Journal",
      date: "2026-04-01",
      is_accounting_voucher: 1,
      narration: "Debit sale",
      entries: [
        { ledger_id: debtorLedgerId, type: "Dr", amount: 10000 },
        { ledger_id: salesLedgerId || 1, type: "Cr", amount: 10000 },
      ],
      bill_references: [
        { bill_name: "INV-101", bill_type: "New Ref", amount: 10000, ledger_id: debtorLedgerId }
      ]
    });

    // 2. Purchase from creditor (Dr Purchase / Cr Creditor) on 2026-04-01
    await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: "Journal",
      date: "2026-04-01",
      is_accounting_voucher: 1,
      narration: "Credit purchase",
      entries: [
        { ledger_id: purchaseLedgerId || 2, type: "Dr", amount: 5000 },
        { ledger_id: creditorLedgerId, type: "Cr", amount: 5000 },
      ],
      bill_references: [
        { bill_name: "INV-201", bill_type: "New Ref", amount: 5000, ledger_id: creditorLedgerId }
      ]
    });
  });

  it("calculates interestReceivable correctly", async () => {
    // 30 days of interest at 12% on 10,000 should be: 10000 * 0.12 * (30 / 365) = 98.63
    const res = await interestReportService.interestReceivable(companyId, fyId, { to_date: "2026-05-01" });
    expect(res.success).toBe(true);
    expect(res.rows.length).toBeGreaterThan(0);
    const row = res.rows.find(r => r.ledger_id === debtorLedgerId);
    expect(row).toBeDefined();
    expect(row.interest_amount).toBeCloseTo(98.63, 1);
  });

  it("calculates interestPayable correctly", async () => {
    // 30 days of interest at 18% on 5,000 should be: 5000 * 0.18 * (30 / 365) = 73.97
    const res = await interestReportService.interestPayable(companyId, fyId, { to_date: "2026-05-01" });
    expect(res.success).toBe(true);
    expect(res.rows.length).toBeGreaterThan(0);
    const row = res.rows.find(r => r.ledger_id === creditorLedgerId);
    expect(row).toBeDefined();
    expect(row.interest_amount).toBeCloseTo(73.97, 1);
  });

  it("calculates ledgerInterest correctly", async () => {
    // Test with object parameters
    const res = await interestReportService.ledgerInterest(companyId, fyId, { ledger_id: debtorLedgerId, to_date: "2026-05-01" });
    expect(res.success).toBe(true);
    expect(res.rows.length).toBeGreaterThan(0);
    expect(res.total_interest).toBeCloseTo(101.92, 1);

    // Test with raw number parameter (legacy / alternative invocation)
    const resLegacy = await interestReportService.ledgerInterest(companyId, fyId, debtorLedgerId);
    expect(resLegacy.success).toBe(true);
  });

  it("calculates billWiseInterest correctly", async () => {
    const res = await interestReportService.billWiseInterest(companyId, fyId, { ledger_id: debtorLedgerId, to_date: "2026-05-01" });
    expect(res.success).toBe(true);
    expect(res.rows.length).toBeGreaterThan(0);
    expect(res.total_interest).toBeCloseTo(98.63, 1);
    expect(res.rows[0].bill_ref).toBe("INV-101");
  });
});
