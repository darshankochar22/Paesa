// Profit & Loss A/c — edge-case correctness tests against the live service
// (server/report/services/profitlossService). Complements profitLossReport.test.js
// (which covers the happy-path buckets) by pinning down the accounting identities
// the screen must get right: gross LOSS, net LOSS, direct/indirect income, and the
// trading identity net = gross + indirectIncome − indirectExpense.

const { setupTestDB, createTestCompany, db } = require('./helpers');
const voucherService = require('../voucher/voucherService');
const ledgerService = require('../ledger/ledgerService');
const { profitLoss } = require('../report/services/profitlossService');

const groupId = async (companyId, name) => {
  const r = await db.execute(`SELECT group_id FROM groups WHERE company_id = ? AND name = ?`, [
    companyId,
    name,
  ]);
  return r.rows[0].group_id;
};

function makeCompany(label) {
  const ctx = { companyId: null, fyId: null, led: {} };

  const mkLedger = async (name, grpName) => {
    const res = await ledgerService.create({
      company_id: ctx.companyId,
      group_id: await groupId(ctx.companyId, grpName),
      name,
    });
    expect(res.success).toBe(true);
    ctx.led[name] = res.ledger?.ledger_id ?? res.ledger?.ledgerId;
  };

  const post = async (type, date, drName, crName, amount) => {
    const res = await voucherService.create({
      company_id: ctx.companyId,
      fy_id: ctx.fyId,
      voucher_type: type,
      date,
      party_name: 'Counterparty',
      is_accounting_voucher: 1,
      entries: [
        { ledger_id: ctx.led[drName], type: 'Dr', amount },
        { ledger_id: ctx.led[crName], type: 'Cr', amount },
      ],
      stock_entries: [],
    });
    expect(res.success).toBe(true);
  };

  const init = async () => {
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
  };

  return { ctx, mkLedger, post, init };
}

describe('P&L — profit with direct + indirect income', () => {
  const { ctx, mkLedger, post, init } = makeCompany('P&L Profit Co');

  beforeAll(async () => {
    await init();
    await mkLedger('Purchases', 'Purchase Accounts');
    await mkLedger('Sales', 'Sales Accounts');
    await mkLedger('Carriage Inward', 'Direct Expenses');
    await mkLedger('Freight Recovered', 'Direct Incomes');
    await mkLedger('Office Rent', 'Indirect Expenses');
    await mkLedger('Commission Earned', 'Indirect Incomes');

    await post('Purchase', '2026-04-05', 'Purchases', 'Cash', 60000);
    await post('Sales', '2026-04-10', 'Cash', 'Sales', 100000);
    await post('Payment', '2026-04-12', 'Carriage Inward', 'Cash', 5000);
    await post('Receipt', '2026-04-15', 'Cash', 'Freight Recovered', 3000);
    await post('Payment', '2026-04-20', 'Office Rent', 'Cash', 20000);
    await post('Receipt', '2026-04-25', 'Cash', 'Commission Earned', 8000);
  });

  it('buckets each nominal ledger correctly', async () => {
    const r = await profitLoss(ctx.companyId, ctx.fyId);
    expect(r.success).toBe(true);
    expect(r.totalPurchase).toBe(60000);
    expect(r.totalSales).toBe(100000);
    expect(r.totalDirectExpenses).toBe(5000);
    expect(r.totalDirectIncomes).toBe(3000);
    expect(r.totalIndirectExpenses).toBe(20000);
    expect(r.totalIndirectIncomes).toBe(8000);
  });

  it('gross profit = (sales + direct income) − (purchase + direct expense)', async () => {
    const r = await profitLoss(ctx.companyId, ctx.fyId);
    // (100000 + 3000) − (60000 + 5000) = 38000
    expect(r.grossProfit).toBe(38000);
    expect(r.isGrossProfit).toBe(true);
  });

  it('net profit = gross + indirect income − indirect expense', async () => {
    const r = await profitLoss(ctx.companyId, ctx.fyId);
    // 38000 + 8000 − 20000 = 26000
    expect(r.netProfit).toBe(26000);
    expect(r.isProfit).toBe(true);
  });
});

describe('P&L — gross loss and net loss', () => {
  const { ctx, mkLedger, post, init } = makeCompany('P&L Loss Co');

  beforeAll(async () => {
    await init();
    await mkLedger('Purchases', 'Purchase Accounts');
    await mkLedger('Sales', 'Sales Accounts');
    await mkLedger('Office Rent', 'Indirect Expenses');
    await mkLedger('Commission Earned', 'Indirect Incomes');

    // Bought more than sold → gross loss.
    await post('Purchase', '2026-04-05', 'Purchases', 'Cash', 150000);
    await post('Sales', '2026-04-10', 'Cash', 'Sales', 100000);
    await post('Payment', '2026-04-20', 'Office Rent', 'Cash', 10000);
    await post('Receipt', '2026-04-25', 'Cash', 'Commission Earned', 5000);
  });

  it('reports a gross loss (negative, isGrossProfit false)', async () => {
    const r = await profitLoss(ctx.companyId, ctx.fyId);
    // (100000) − (150000) = −50000
    expect(r.grossProfit).toBe(-50000);
    expect(r.isGrossProfit).toBe(false);
  });

  it('reports a net loss (negative, isProfit false)', async () => {
    const r = await profitLoss(ctx.companyId, ctx.fyId);
    // −50000 + 5000 − 10000 = −55000
    expect(r.netProfit).toBe(-55000);
    expect(r.isProfit).toBe(false);
  });
});
