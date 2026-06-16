const { setupTestDB, createTestCompany, db } = require("./helpers");
const voucherService = require("../voucher/voucherService");
const auditTrailService = require("../auditTrail/auditTrailService");

// Proves the audit row is ATOMIC with the voucher write (MCA Rule 11(g)):
// no business write without its audit row, and no audit row without the write.
describe("Audit trail is transactional with voucher writes", () => {
  let companyId, fyId, cash, pl;

  const auditCount = async () => {
    const r = await auditTrailService.getAll(companyId, { limit: 9999 });
    return (r.rows || r).length;
  };

  beforeAll(async () => {
    await setupTestDB();
    const c = await createTestCompany("Audit Atomicity Co");
    companyId = c.company_id;
    fyId = (await db.execute(`SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`, [companyId])).rows[0].fy_id;
    const ledgers = (await db.execute(`SELECT ledger_id, name FROM ledgers WHERE company_id = ?`, [companyId])).rows;
    cash = ledgers.find((l) => l.name === "Cash").ledger_id;
    pl = ledgers.find((l) => l.name === "Profit & Loss A/c").ledger_id;
  });

  it("rolls back the audit row when the voucher write fails", async () => {
    const before = await auditCount();
    const bad = await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Journal", date: "2026-04-10", is_accounting_voucher: 1,
      entries: [{ ledger_id: cash, type: "Dr", amount: 5000 }, { ledger_id: pl, type: "Cr", amount: 4000 }], // unbalanced -> fails
    });
    expect(bad.success).toBe(false);
    expect(await auditCount()).toBe(before); // no audit row left behind
  });

  it("writes exactly one audit row, atomically, on a successful create", async () => {
    const before = await auditCount();
    const good = await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Receipt", date: "2026-04-11", is_accounting_voucher: 1,
      entries: [{ ledger_id: cash, type: "Dr", amount: 10000 }, { ledger_id: pl, type: "Cr", amount: 10000 }],
    });
    expect(good.success).toBe(true);
    expect(await auditCount()).toBe(before + 1);
    const v = await auditTrailService.verifyChain(companyId);
    expect(v.intact).toBe(true);
  });
});
