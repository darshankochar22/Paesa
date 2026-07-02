// statutoryService.getPartyAnalysis(..., 'outstanding') parity test.
//
// The party-wise Outstanding analysis now computes pending amounts through the
// shared bill-settlement engine (services/billSettlementService) instead of a
// private SUM(New Ref/Advance - Agst Ref) query. This pins the money numbers so
// that refactor can't drift: a partially-settled debtor bill must report
// (original - settlement) as its outstanding, with the right bill count/dates.

const { setupTestDB, createTestCompany, db } = require("./helpers");
const { sql } = require("drizzle-orm");
const voucherService = require("../voucher/voucherService");
const ledgerService = require("../ledger/ledgerService");
const statutoryService = require("../report/services/statutoryService");

describe("statutoryService party Outstanding (shared settlement engine)", () => {
  let companyId, fyId, debtorLedgerId, cashLedgerId, salesLedgerId;

  const INV = "STAT-INV-1";   // sale, partially settled
  const INV2 = "STAT-INV-2";  // second sale, fully open
  const SALE = 50000;
  const SETTLE = 20000;       // partial receipt against INV
  const SALE2 = 15000;

  const fetchGroupId = async (groupName) => {
    const rows = await db.all(
      sql`SELECT group_id FROM groups WHERE company_id = ${companyId} AND name = ${groupName} LIMIT 1`
    );
    return rows[0].group_id;
  };

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Statutory Outstanding Co");
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

    const debtor = await ledgerService.create({
      company_id: companyId, group_id: await fetchGroupId("Sundry Debtors"),
      name: "STAT Debtor", nature: "Assets", is_bill_wise: 1,
    });
    debtorLedgerId = Number(debtor.ledger_id || debtor.ledger?.ledger_id);

    const salesLedger = await ledgerService.create({
      company_id: companyId, group_id: await fetchGroupId("Sales Accounts"), name: "STAT Sales", nature: "Income",
    });
    salesLedgerId = Number(salesLedger.ledger_id || salesLedger.ledger?.ledger_id);

    // Sale — New Ref, Dr on the debtor.
    await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Journal", date: "2026-04-10",
      is_accounting_voucher: 1,
      entries: [
        { ledger_id: debtorLedgerId, type: "Dr", amount: SALE },
        { ledger_id: salesLedgerId, type: "Cr", amount: SALE },
      ],
      bill_references: [
        { ledger_id: debtorLedgerId, bill_name: INV, bill_type: "New Ref", amount: SALE, due_date: "2026-04-10" },
      ],
    });

    // Partial receipt — Agst Ref against INV. Pending on INV drops to 30,000.
    await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Receipt", date: "2026-04-20",
      is_accounting_voucher: 1,
      entries: [
        { ledger_id: cashLedgerId, type: "Dr", amount: SETTLE },
        { ledger_id: debtorLedgerId, type: "Cr", amount: SETTLE },
      ],
      bill_references: [
        { ledger_id: debtorLedgerId, bill_name: INV, bill_type: "Agst Ref", amount: SETTLE },
      ],
    });

    // Second, fully-open sale — New Ref on the debtor.
    await voucherService.create({
      company_id: companyId, fy_id: fyId, voucher_type: "Journal", date: "2026-05-01",
      is_accounting_voucher: 1,
      entries: [
        { ledger_id: debtorLedgerId, type: "Dr", amount: SALE2 },
        { ledger_id: salesLedgerId, type: "Cr", amount: SALE2 },
      ],
      bill_references: [
        { ledger_id: debtorLedgerId, bill_name: INV2, bill_type: "New Ref", amount: SALE2, due_date: "2026-05-01" },
      ],
    });
  });

  it("nets Agst Ref settlements into the per-party outstanding total", async () => {
    const res = await statutoryService.getPartyAnalysis(companyId, fyId, "debtors", "outstanding");
    expect(res.success).toBe(true);

    const party = res.rows.find((r) => r.ledger_id === debtorLedgerId);
    expect(party).toBeDefined();

    // (50,000 - 20,000) + 15,000 = 45,000 outstanding, across 2 bills.
    expect(party.outstanding).toBeCloseTo(SALE - SETTLE + SALE2, 2);
    expect(party.bill_count).toBe(2);

    // Dates span the earliest origin to the latest settlement voucher.
    expect(party.first_bill_date).toBe("2026-04-10");
    expect(party.last_bill_date).toBe("2026-05-01");

    // Report total agrees with the single party's outstanding.
    expect(res.total).toBeCloseTo(SALE - SETTLE + SALE2, 2);
  });
});
