const { setupTestDB, createTestCompany, db } = require("./helpers");
const voucherController = require("../voucher/voucherController");
const voucherService = require("../voucher/voucherService");
const auditTrailService = require("../auditTrail/auditTrailService");

describe("Audit Trail Tests", () => {
  let companyId;
  let fyId;
  let cashLedgerId;
  let plLedgerId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Audit Trail Test Co");
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
    cashLedgerId = ledgersResult.rows.find((l) => l.name === "Cash").ledger_id;
    plLedgerId = ledgersResult.rows.find((l) => l.name === "Profit & Loss A/c").ledger_id;
  });

  describe("AUDIT: tamper-evident chain via voucherController", () => {
    let voucherId;

    it("records a 'create' audit row through voucherController.create", async () => {
      const data = {
        company_id: companyId,
        fy_id: fyId,
        voucher_type: "Receipt",
        date: "2026-04-15",
        is_accounting_voucher: 1,
        narration: "Audit create",
        entries: [
          { ledger_id: cashLedgerId, type: "Dr", amount: 5000 },
          { ledger_id: plLedgerId, type: "Cr", amount: 5000 },
        ],
      };

      const result = await voucherController.create(null, data);
      expect(result.success).toBe(true);
      voucherId = result.voucher.voucher_id;

      const rows = await auditTrailService.getByEntity(companyId, "voucher", voucherId);
      const createRow = rows.find((r) => r.action === "create");
      expect(createRow).toBeDefined();
      expect(createRow.entity_type).toBe("voucher");
      expect(createRow.after_snapshot).not.toBeNull();
      expect(createRow.before_snapshot).toBeNull();
      expect(createRow.row_hash).toBeTruthy();
    });

    it("records an 'update' audit row with before+after", async () => {
      const data = {
        voucher_id: voucherId,
        company_id: companyId,
        fy_id: fyId,
        voucher_type: "Receipt",
        date: "2026-04-15",
        is_accounting_voucher: 1,
        narration: "Audit update",
        entries: [
          { ledger_id: cashLedgerId, type: "Dr", amount: 7000 },
          { ledger_id: plLedgerId, type: "Cr", amount: 7000 },
        ],
      };

      const result = await voucherController.update(null, data);
      expect(result.success).toBe(true);

      const rows = await auditTrailService.getByEntity(companyId, "voucher", voucherId);
      const updateRow = rows.find((r) => r.action === "update");
      expect(updateRow).toBeDefined();
      expect(updateRow.before_snapshot).not.toBeNull();
      expect(updateRow.after_snapshot).not.toBeNull();
      expect(updateRow.row_hash).toBeTruthy();
    });

    it("verifyChain reports intact:true for an untouched chain", async () => {
      const res = await auditTrailService.verifyChain(companyId);
      expect(res.intact).toBe(true);
    });

    it("verifyChain detects tampering done via raw SQL", async () => {
      const rows = await auditTrailService.getByEntity(companyId, "voucher", voucherId);
      const target = rows[0];
      expect(target).toBeDefined();

      // Tamper the stored snapshot WITHOUT updating the hash chain.
      await db.execute(
        `UPDATE audit_trail SET after_snapshot = ? WHERE log_id = ?`,
        [JSON.stringify({ tampered: true }), target.log_id]
      );

      const res = await auditTrailService.verifyChain(companyId);
      expect(res.intact).toBe(false);
      expect(res.brokenAt).toBe(target.log_id);
    });
  });

  describe("FILTER: optional & post-dated vouchers excluded from balances", () => {
    let filterCompanyId;
    let filterFyId;
    let cashId;
    let salesLedgerId;

    beforeAll(async () => {
      const company = await createTestCompany("Audit Filter Test Co");
      filterCompanyId = company.company_id;

      const fyResult = await db.execute(
        `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
        [filterCompanyId]
      );
      filterFyId = fyResult.rows[0].fy_id;

      const ledgersResult = await db.execute(
        `SELECT ledger_id, name FROM ledgers WHERE company_id = ?`,
        [filterCompanyId]
      );
      cashId = ledgersResult.rows.find((l) => l.name === "Cash").ledger_id;
      salesLedgerId = ledgersResult.rows.find(
        (l) => l.name === "Profit & Loss A/c"
      ).ledger_id;
    });

    it("optional voucher does NOT affect ledger balance; normal one does", async () => {
      // Normal balanced voucher: Cash Dr 1000 / PL Cr 1000
      const normal = await voucherService.create({
        company_id: filterCompanyId,
        fy_id: filterFyId,
        voucher_type: "Receipt",
        date: "2026-04-15",
        is_accounting_voucher: 1,
        entries: [
          { ledger_id: cashId, type: "Dr", amount: 1000 },
          { ledger_id: salesLedgerId, type: "Cr", amount: 1000 },
        ],
      });
      expect(normal.success).toBe(true);

      // Optional voucher of equal value (is_optional: 1)
      const optional = await voucherService.create({
        company_id: filterCompanyId,
        fy_id: filterFyId,
        voucher_type: "Receipt",
        date: "2026-04-15",
        is_accounting_voucher: 1,
        is_optional: 1,
        entries: [
          { ledger_id: cashId, type: "Dr", amount: 1000 },
          { ledger_id: salesLedgerId, type: "Cr", amount: 1000 },
        ],
      });
      expect(optional.success).toBe(true);

      // Only the normal voucher should count: Cash = 1000 Dr (not 2000).
      const cashBal = await voucherService.getLedgerBalance(
        cashId,
        filterCompanyId,
        filterFyId
      );
      expect(cashBal.success).toBe(true);
      expect(cashBal.rawBalance).toBe(1000);
    });

    it("post-dated voucher is excluded from current balances", async () => {
      // Cash balance currently 1000 Dr from the normal voucher above.
      const before = await voucherService.getLedgerBalance(
        cashId,
        filterCompanyId,
        filterFyId
      );
      expect(before.rawBalance).toBe(1000);

      const postDated = await voucherService.create({
        company_id: filterCompanyId,
        fy_id: filterFyId,
        voucher_type: "Receipt",
        date: "2026-04-15",
        is_accounting_voucher: 1,
        is_post_dated: 1,
        entries: [
          { ledger_id: cashId, type: "Dr", amount: 1000 },
          { ledger_id: salesLedgerId, type: "Cr", amount: 1000 },
        ],
      });
      expect(postDated.success).toBe(true);

      // Post-dated voucher must NOT change the current balance.
      const after = await voucherService.getLedgerBalance(
        cashId,
        filterCompanyId,
        filterFyId
      );
      expect(after.rawBalance).toBe(1000);
    });
  });
});
