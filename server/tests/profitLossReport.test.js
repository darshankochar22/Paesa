// Profit & Loss A/c report (Reports → Accounts → Profit & Loss, issue #87)
// integration test against the real services.
//
// Seeds a small trading set under the default P&L primary groups and asserts
// the live computation the screen renders:
//   • 6-bucket categorisation (purchase/sales/direct/indirect)
//   • gross profit  = (sales + direct income + closing) − (opening + purchase + direct exp)
//   • net profit    = gross profit + indirect income − indirect expense
//   • period (F2) scoping — entries outside [from,to] are excluded

const { setupTestDB, createTestCompany, db } = require("./helpers");
const voucherService = require("../voucher/voucherService");
const ledgerService = require("../ledger/ledgerService");
const { profitLoss } = require("../report/services/profitlossService");

describe("Profit & Loss A/c Report (Accounts)", () => {
  let companyId, fyId;
  const led = {}; // ledger name -> ledger_id

  const groupId = async (name) => {
    const r = await db.execute(
      `SELECT group_id FROM groups WHERE company_id = ? AND name = ?`,
      [companyId, name]
    );
    return r.rows[0].group_id;
  };

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("P&L Report Co");
    companyId = company.company_id;

    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;

    // P&L ledgers, one per bucket, under the default primary groups.
    const mkLedger = async (name, grpName) => {
      const res = await ledgerService.create({
        company_id: companyId,
        group_id: await groupId(grpName),
        name,
      });
      expect(res.success).toBe(true);
      led[name] = res.ledger?.ledger_id ?? res.ledger?.ledgerId;
    };
    await mkLedger("Goods Purchase", "Purchase Accounts");
    await mkLedger("Goods Sales", "Sales Accounts");
    await mkLedger("Carriage Inward", "Direct Expenses");
    await mkLedger("Office Rent", "Indirect Expenses");

    // Cash is seeded by default — the balancing (non-P&L) side of each voucher.
    const cash = await db.execute(
      `SELECT ledger_id FROM ledgers WHERE company_id = ? AND name = 'Cash'`,
      [companyId]
    );
    led["Cash"] = cash.rows[0].ledger_id;

    const post = async (type, date, drName, crName, amount) => {
      const res = await voucherService.create({
        company_id: companyId,
        fy_id: fyId,
        voucher_type: type,
        date,
        party_name: "Counterparty",
        is_accounting_voucher: 1,
        entries: [
          { ledger_id: led[drName], type: "Dr", amount },
          { ledger_id: led[crName], type: "Cr", amount },
        ],
        stock_entries: [],
      });
      expect(res.success).toBe(true);
    };

    await post("Purchase", "2026-04-10", "Goods Purchase", "Cash", 100000);
    await post("Sales", "2026-04-20", "Cash", "Goods Sales", 200000);
    await post("Payment", "2026-04-15", "Carriage Inward", "Cash", 10000);
    await post("Payment", "2026-08-05", "Office Rent", "Cash", 20000); // later month
  });

  it("computes full-year buckets, gross & net profit", async () => {
    const r = await profitLoss(companyId, fyId);
    expect(r.success).toBe(true);
    expect(r.totalPurchase).toBe(100000);
    expect(r.totalSales).toBe(200000);
    expect(r.totalDirectExpenses).toBe(10000);
    expect(r.totalIndirectExpenses).toBe(20000);
    // (200000 sales) − (100000 purchase + 10000 direct exp) = 90000 gross profit
    expect(r.grossProfit).toBe(90000);
    expect(r.isGrossProfit).toBe(true);
    // 90000 − 20000 indirect exp = 70000 net profit
    expect(r.netProfit).toBe(70000);
    expect(r.isProfit).toBe(true);
  });

  it("categorises each ledger under its P&L bucket", async () => {
    const r = await profitLoss(companyId, fyId);
    const ledgerNames = (groups) =>
      groups.flatMap((g) => g.ledgers.map((l) => l.ledger_name));
    expect(ledgerNames(r.purchaseAccounts)).toContain("Goods Purchase");
    expect(ledgerNames(r.salesAccounts)).toContain("Goods Sales");
    expect(ledgerNames(r.directExpenses)).toContain("Carriage Inward");
    expect(ledgerNames(r.indirectExpenses)).toContain("Office Rent");
  });

  it("scopes to the selected period (F2) — April excludes the August rent", async () => {
    const r = await profitLoss(companyId, fyId, "2026-04-01", "2026-04-30");
    expect(r.success).toBe(true);
    expect(r.totalIndirectExpenses).toBe(0); // August rent is outside April
    expect(r.netProfit).toBe(90000); // = gross profit, no indirect expense booked yet
  });
});
