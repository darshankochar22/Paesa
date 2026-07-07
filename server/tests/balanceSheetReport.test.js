// Balance Sheet (Reports → Accounts → Balance Sheet) integration test against the
// live service (server/report/services/balanceSheetService). The non-negotiable
// property is that it BALANCES: total Assets == total Liabilities once the year's
// net profit/loss and closing balances are folded in.

const { setupTestDB, createTestCompany, db } = require('./helpers');
const voucherService = require('../voucher/voucherService');
const ledgerService = require('../ledger/ledgerService');
const { balanceSheet } = require('../report/services/balanceSheetService');

const groupId = async (companyId, name) => {
  const r = await db.execute(`SELECT group_id FROM groups WHERE company_id = ? AND name = ?`, [
    companyId,
    name,
  ]);
  return r.rows[0].group_id;
};

function scenario(label) {
  const ctx = { companyId: null, fyId: null, led: {} };

  const mk = async (name, grpName, opening_balance = 0, opening_balance_type = 'Dr') => {
    const res = await ledgerService.create({
      company_id: ctx.companyId,
      group_id: await groupId(ctx.companyId, grpName),
      name,
      opening_balance,
      opening_balance_type,
    });
    expect(res.success).toBe(true);
    ctx.led[name] = res.ledger?.ledger_id ?? res.ledger?.ledgerId;
  };

  const post = async (type, drName, crName, amount) => {
    const res = await voucherService.create({
      company_id: ctx.companyId,
      fy_id: ctx.fyId,
      voucher_type: type,
      date: '2026-05-01',
      party_name: 'X',
      is_accounting_voucher: 1,
      entries: [
        { ledger_id: ctx.led[drName], type: 'Dr', amount },
        { ledger_id: ctx.led[crName], type: 'Cr', amount },
      ],
      stock_entries: [],
    });
    expect(res.success).toBe(true);
  };

  const init = async (cashOpening) => {
    await setupTestDB();
    const company = await createTestCompany(label);
    ctx.companyId = company.company_id;
    const fy = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [ctx.companyId],
    );
    ctx.fyId = fy.rows[0].fy_id;
    const cash = await db.execute(
      `SELECT ledger_id FROM ledgers WHERE company_id = ? AND name = 'Cash'`,
      [ctx.companyId],
    );
    ctx.led['Cash'] = cash.rows[0].ledger_id;
    if (cashOpening) {
      await db.execute(
        `UPDATE ledgers SET opening_balance = ?, opening_balance_type = 'Dr' WHERE ledger_id = ?`,
        [cashOpening, ctx.led['Cash']],
      );
    }
  };

  return { ctx, mk, post, init };
}

describe('Balance Sheet — net profit folds in and the sheet balances', () => {
  const { ctx, mk, post, init } = scenario('BS Profit Co');

  beforeAll(async () => {
    await init(200000); // Cash opening 200000 Dr balances the capital.
    await mk('Owner Capital', 'Capital Account', 200000, 'Cr');
    await mk('Sales', 'Sales Accounts');
    await mk('Purchases', 'Purchase Accounts');
    await mk('Office Rent', 'Indirect Expenses');
    await mk('Commission', 'Indirect Incomes');

    await post('Sales', 'Cash', 'Sales', 40000);
    await post('Purchase', 'Purchases', 'Cash', 20000);
    await post('Payment', 'Office Rent', 'Cash', 5000);
    await post('Receipt', 'Cash', 'Commission', 3000);
  });

  it('balances: total Assets == total Liabilities', async () => {
    const bs = await balanceSheet(ctx.companyId, ctx.fyId);
    expect(bs.success).toBe(true);
    expect(bs.totalAssets).toBe(bs.totalLiabilities);
    expect(bs.totalAssets).toBe(218000);
  });

  it('shows the net profit (18000) as P&L A/c on the Liabilities side', async () => {
    const bs = await balanceSheet(ctx.companyId, ctx.fyId);
    expect(bs.netProfit).toBe(18000);
    const pnl = bs.liabilities.find((g) => g.isPnL);
    expect(pnl).toBeTruthy();
    expect(pnl.balance).toBe(18000);
    expect(pnl.pnlBreakup.currentPeriod).toBe(18000);
    // A profit must NOT appear on the assets side.
    expect(bs.assets.find((g) => g.isPnL)).toBeFalsy();
  });
});

describe('Balance Sheet — net loss lands on Assets and still balances', () => {
  const { ctx, mk, post, init } = scenario('BS Loss Co');

  beforeAll(async () => {
    await init(100000);
    await mk('Owner Capital', 'Capital Account', 100000, 'Cr');
    await mk('Sales', 'Sales Accounts');
    await mk('Purchases', 'Purchase Accounts');

    // Bought 50000, sold 20000 → 30000 net loss.
    await post('Purchase', 'Purchases', 'Cash', 50000);
    await post('Sales', 'Cash', 'Sales', 20000);
  });

  it('balances with the loss carried to the Assets side', async () => {
    const bs = await balanceSheet(ctx.companyId, ctx.fyId);
    expect(bs.success).toBe(true);
    expect(bs.netProfit).toBe(-30000);
    expect(bs.totalAssets).toBe(bs.totalLiabilities);
    expect(bs.totalAssets).toBe(100000);
    const pnl = bs.assets.find((g) => g.isPnL);
    expect(pnl).toBeTruthy();
    expect(bs.liabilities.find((g) => g.isPnL)).toBeFalsy();
  });
});
