const { setupTestDB, createTestCompany, db } = require("./helpers");
const voucherService = require("../voucher/voucherService");
const bankingService = require("../banking/bankingService");

describe("Banking / Reconciliation Service Tests", () => {
  let companyId;
  let fyId;
  let bankLedgerId; // using the seeded Cash ledger as the reconcilable bank ledger
  let plLedgerId;
  let entryId;
  let voucherId;
  let reconciliationId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Banking Test Co");
    companyId = company.company_id;

    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;

    const ledgersResult = await db.execute(
      `SELECT ledger_id, name FROM ledgers WHERE company_id = ?`,
      [companyId]
    );
    bankLedgerId = ledgersResult.rows.find((l) => l.name === "Cash").ledger_id;
    plLedgerId = ledgersResult.rows.find((l) => l.name === "Profit & Loss A/c").ledger_id;

    // Post a balanced voucher with a Dr entry against the bank ledger.
    const result = await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: "Receipt",
      date: "2026-04-15",
      is_accounting_voucher: 1,
      narration: "Bank receipt",
      entries: [
        { ledger_id: bankLedgerId, type: "Dr", amount: 10000 },
        { ledger_id: plLedgerId, type: "Cr", amount: 10000 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("lists the bank entry as unreconciled", async () => {
    const res = await bankingService.getUnreconciled(companyId, fyId, bankLedgerId);
    expect(res.success).toBe(true);
    expect(res.transactions.length).toBe(1);
    expect(res.transactions[0].type).toBe("Dr");
    expect(res.transactions[0].amount).toBe(10000);
    entryId = res.transactions[0].entry_id;
    voucherId = res.transactions[0].voucher_id;
    expect(entryId).toBeDefined();
  });

  it("summarises an all-unreconciled bank ledger", async () => {
    const s = await bankingService.getSummary(companyId, fyId, bankLedgerId);
    expect(s.success).toBe(true);
    expect(s.total_count).toBe(1);
    expect(s.total_unreconciled_count).toBe(1);
    expect(s.total_reconciled_count).toBe(0);
    expect(s.book_balance).toBe(10000);
    expect(s.unreconciled_amount).toBe(10000);
    expect(s.ledger_name).toBe("Cash");
  });

  it("reconciles the entry", async () => {
    const res = await bankingService.reconcile({
      entry_id: entryId,
      voucher_id: voucherId,
      ledger_id: bankLedgerId,
      bank_date: "2026-04-17",
      bank_reference: "NEFT-001",
      reconciled_date: "2026-04-17",
    });
    expect(res.success).toBe(true);
    expect(res.reconciliation.entry_id).toBe(entryId);
    expect(res.reconciliation.bank_reference).toBe("NEFT-001");
    reconciliationId = res.reconciliation.reconciliation_id;
  });

  it("removes the entry from the unreconciled list once reconciled", async () => {
    const res = await bankingService.getUnreconciled(companyId, fyId, bankLedgerId);
    expect(res.transactions.length).toBe(0);
  });

  it("shows the entry as reconciled in the statement with a running balance", async () => {
    const res = await bankingService.getStatement(companyId, fyId, bankLedgerId);
    expect(res.success).toBe(true);
    expect(res.ledger_name).toBe("Cash");
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].is_reconciled).toBe(true);
    expect(res.rows[0].bank_reference).toBe("NEFT-001");
    expect(res.rows[0].balance).toBe(10000);
  });

  it("reflects reconciliation in the summary", async () => {
    const s = await bankingService.getSummary(companyId, fyId, bankLedgerId);
    expect(s.total_reconciled_count).toBe(1);
    expect(s.total_unreconciled_count).toBe(0);
    expect(s.reconciled_amount).toBe(10000);
  });

  it("honours the date range in the statement", async () => {
    const inRange = await bankingService.getStatement(companyId, fyId, bankLedgerId, "2026-04-01", "2026-04-30");
    expect(inRange.rows.length).toBe(1);
    const outOfRange = await bankingService.getStatement(companyId, fyId, bankLedgerId, "2026-05-01", "2026-05-31");
    expect(outOfRange.rows.length).toBe(0);
  });

  it("unreconciles the entry by entry_id", async () => {
    const res = await bankingService.unreconcile(entryId);
    expect(res.success).toBe(true);
    expect(res.removed).toBe(1);
    const back = await bankingService.getUnreconciled(companyId, fyId, bankLedgerId);
    expect(back.transactions.length).toBe(1);
  });

  it("validates required fields on reconcile", async () => {
    const res = await bankingService.reconcile({ bank_reference: "X" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/required/i);
  });
});
