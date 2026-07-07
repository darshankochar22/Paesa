// Trial Balance (Reports → Accounts → Trial Balance) integration test against the
// live service (server/report/services/trailbalanceService). Verifies the core
// accounting invariants the screen depends on:
//   • a balanced set (openings + double-entry vouchers) => grand total Dr == Cr
//   • primary-group aggregation rolls every ledger into exactly one primary group
//   • group drill-down lists the ledgers under a group
//   • an opening-balance imbalance surfaces as the Dr/Cr gap the UI shows as the
//     "Difference in opening balances" row

const { setupTestDB, createTestCompany, db } = require('./helpers');
const voucherService = require('../voucher/voucherService');
const ledgerService = require('../ledger/ledgerService');
const { trialBalance, groupSummary } = require('../report/services/trailbalanceService');

const groupId = async (companyId, name) => {
  const r = await db.execute(`SELECT group_id FROM groups WHERE company_id = ? AND name = ?`, [
    companyId,
    name,
  ]);
  return r.rows[0].group_id;
};

const findGroup = (res, name) => res.groups.find((g) => g.group_name === name);

describe('Trial Balance Report (balanced set)', () => {
  let companyId, fyId;
  const led = {};

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('Trial Balance Co');
    companyId = company.company_id;
    const fy = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId],
    );
    fyId = fy.rows[0].fy_id;

    const mk = async (name, grpName, opening_balance = 0, opening_balance_type = 'Dr') => {
      const res = await ledgerService.create({
        company_id: companyId,
        group_id: await groupId(companyId, grpName),
        name,
        opening_balance,
        opening_balance_type,
      });
      expect(res.success).toBe(true);
      led[name] = res.ledger?.ledger_id ?? res.ledger?.ledgerId;
    };

    // Balanced opening: Capital 100000 Cr, Bank 100000 Dr.
    await mk('Owner Capital', 'Capital Account', 100000, 'Cr');
    await mk('Bank', 'Current Assets', 100000, 'Dr');
    await mk('Goods Sales', 'Sales Accounts');

    const cash = await db.execute(
      `SELECT ledger_id FROM ledgers WHERE company_id = ? AND name = 'Cash'`,
      [companyId],
    );
    led['Cash'] = cash.rows[0].ledger_id;

    // A balanced sale: Dr Cash 50000 / Cr Goods Sales 50000.
    const v = await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-04-20',
      party_name: 'Buyer',
      is_accounting_voucher: 1,
      entries: [
        { ledger_id: led['Cash'], type: 'Dr', amount: 50000 },
        { ledger_id: led['Goods Sales'], type: 'Cr', amount: 50000 },
      ],
      stock_entries: [],
    });
    expect(v.success).toBe(true);
  });

  it('balances — grand total Dr equals grand total Cr', async () => {
    const res = await trialBalance(companyId, fyId);
    expect(res.success).toBe(true);
    expect(res.grandTotalDr).toBe(res.grandTotalCr);
    expect(res.grandTotalDr).toBeGreaterThan(0);
  });

  it('aggregates ledgers into their primary group with the correct side', async () => {
    const res = await trialBalance(companyId, fyId);
    // Capital Account: only Owner Capital (100000 Cr).
    const capital = findGroup(res, 'Capital Account');
    expect(capital).toBeTruthy();
    expect(capital.cr).toBe(100000);
    expect(capital.dr).toBe(0);
    // Sales Accounts: only Goods Sales (50000 Cr).
    const sales = findGroup(res, 'Sales Accounts');
    expect(sales.cr).toBe(50000);
    // Current Assets rolls up Bank (100000) + Cash (50000) = 150000 Dr.
    const ca = findGroup(res, 'Current Assets');
    expect(ca.dr).toBe(150000);
    expect(ca.cr).toBe(0);
  });

  it('drills into a group to list its ledgers', async () => {
    const gid = await groupId(companyId, 'Capital Account');
    const res = await groupSummary(companyId, fyId, gid);
    expect(res.success).toBe(true);
    const cap = res.ledgers.find((l) => l.ledger_name === 'Owner Capital');
    expect(cap).toBeTruthy();
    expect(cap.cr).toBe(100000);
    expect(res.totalCr).toBe(100000);
  });
});

describe('Trial Balance Report (opening imbalance)', () => {
  let companyId, fyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('TB Imbalance Co');
    companyId = company.company_id;
    const fy = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId],
    );
    fyId = fy.rows[0].fy_id;

    const mk = async (name, grpName, opening_balance, opening_balance_type) => {
      const res = await ledgerService.create({
        company_id: companyId,
        group_id: await groupId(companyId, grpName),
        name,
        opening_balance,
        opening_balance_type,
      });
      expect(res.success).toBe(true);
    };
    // Capital 100000 Cr but Bank only 80000 Dr => 20000 Cr excess (unbalanced openings).
    await mk('Owner Capital', 'Capital Account', 100000, 'Cr');
    await mk('Bank', 'Current Assets', 80000, 'Dr');
  });

  it('surfaces the opening imbalance as the Dr/Cr grand-total gap', async () => {
    const res = await trialBalance(companyId, fyId);
    expect(res.success).toBe(true);
    // Cr side exceeds Dr side by exactly the 20000 opening imbalance — this gap is
    // what the layout renders as the "Difference in opening balances" row.
    expect(res.grandTotalCr - res.grandTotalDr).toBe(20000);
  });
});
