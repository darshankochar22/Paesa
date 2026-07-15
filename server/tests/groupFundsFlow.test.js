// Group Funds Flow drill (issue #242): Funds Flow → Current Assets → group drill.
//
// Seeds the same period as fundsFlowReport.test.js and asserts the four-column
// shape the Group Funds Flow screen renders for the Current Assets group:
//   Opening Balance | Transactions (Debit / Credit) | Closing Balance
// and that sub-group drill (Sundry Debtors) resolves to its ledger.

const { setupTestDB, createTestCompany, db } = require('./helpers');
const voucherService = require('../voucher/voucherService');
const ledgerService = require('../ledger/ledgerService');
const fundsFlowReportService = require('../report/fundsFlowReportService');
const trailbalanceService = require('../report/services/trailbalanceService');

describe('Group Funds Flow drill (Current Assets)', () => {
  let companyId, fyId, caGroupId;
  const led = {};

  const groupId = async (name) => {
    const r = await db.execute(`SELECT group_id FROM groups WHERE company_id = ? AND name = ?`, [
      companyId,
      name,
    ]);
    return r.rows[0].group_id;
  };

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('Group Funds Flow Co');
    companyId = company.company_id;

    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId],
    );
    fyId = fyResult.rows[0].fy_id;

    const mkLedger = async (name, grpName) => {
      const res = await ledgerService.create({
        company_id: companyId,
        group_id: await groupId(grpName),
        name,
      });
      expect(res.success).toBe(true);
      led[name] = res.ledger?.ledger_id ?? res.ledger?.ledgerId;
    };
    await mkLedger('Debtors', 'Sundry Debtors');
    await mkLedger('Goods Sales', 'Sales Accounts');
    await mkLedger('Office Rent', 'Indirect Expenses');
    await mkLedger('Bank Loan', 'Loans(Liability)');

    const cash = await db.execute(
      `SELECT ledger_id FROM ledgers WHERE company_id = ? AND name = 'Cash'`,
      [companyId],
    );
    led['Cash'] = cash.rows[0].ledger_id;

    const post = async (type, date, drName, crName, amount) => {
      const res = await voucherService.create({
        company_id: companyId,
        fy_id: fyId,
        voucher_type: type,
        date,
        party_name: 'Counterparty',
        is_accounting_voucher: 1,
        entries: [
          { ledger_id: led[drName], type: 'Dr', amount },
          { ledger_id: led[crName], type: 'Cr', amount },
        ],
        stock_entries: [],
      });
      expect(res.success).toBe(true);
    };

    await post('Receipt', '2026-04-05', 'Cash', 'Bank Loan', 500000);
    await post('Payment', '2026-04-25', 'Office Rent', 'Cash', 50000);
    await post('Sales', '2026-04-20', 'Debtors', 'Goods Sales', 200000);

    const ff = await fundsFlowReportService.fundsFlow(companyId, fyId, '2026-04-01', '2026-04-30');
    caGroupId = ff.currentAssetsGroupId;
  });

  it('returns Opening | Transactions | Closing per child group', async () => {
    const r = await trailbalanceService.groupFundsFlow(companyId, fyId, caGroupId);
    expect(r.success).toBe(true);
    expect(r.group_name).toBe('Current Assets');

    // Cash: Dr 500k, Cr 50k → closing 450k Dr. Debtors: Dr 200k → closing 200k Dr.
    expect(r.totalOpening).toBe(0);
    expect(r.totalDebit).toBe(700000);
    expect(r.totalCredit).toBe(50000);
    expect(r.totalClosing).toBe(650000);

    const byName = Object.fromEntries(r.childGroups.map((g) => [g.group_name, g]));
    expect(byName['Sundry Debtors'].opening).toBe(0);
    expect(byName['Sundry Debtors'].txnDebit).toBe(200000);
    expect(byName['Sundry Debtors'].txnCredit).toBe(0);
    expect(byName['Sundry Debtors'].closing).toBe(200000);
  });

  it('drills a sub-group down to its ledger', async () => {
    const sdGroupId = await groupId('Sundry Debtors');
    const r = await trailbalanceService.groupFundsFlow(companyId, fyId, sdGroupId);
    expect(r.success).toBe(true);
    const debtor = r.ledgers.find((l) => l.ledger_name === 'Debtors');
    expect(debtor).toBeTruthy();
    expect(debtor.type).toBe('ledger');
    expect(debtor.closing).toBe(200000);
    expect(debtor.txnDebit).toBe(200000);
  });
});
