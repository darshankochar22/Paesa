// Fund Flow report (Reports → Accounts → Fund Flow, issue #89) integration test.
//
// Seeds one period with current + non-current + P&L movements and asserts the
// working-capital reconciliation and the sources/applications identity that the
// Funds Flow Summary screen renders:
//   • current items (Cash/Debtors/Creditors) drive working capital, NOT sources
//   • non-current asset increase  → application; non-current liability increase → source
//   • Nett Profit → source
//   • totalSources − totalApplications === workingCapitalChange  (balance identity)

const { setupTestDB, createTestCompany, db } = require('./helpers');
const voucherService = require('../voucher/voucherService');
const ledgerService = require('../ledger/ledgerService');
const fundsFlowReportService = require('../report/fundsFlowReportService');

describe('Fund Flow Report (Accounts)', () => {
  let companyId, fyId;
  const led = {}; // ledger name -> ledger_id

  const groupId = async (name) => {
    const r = await db.execute(`SELECT group_id FROM groups WHERE company_id = ? AND name = ?`, [
      companyId,
      name,
    ]);
    return r.rows[0].group_id;
  };

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('Fund Flow Report Co');
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
    await mkLedger('Machinery', 'Fixed Assets'); // non-current asset
    await mkLedger('Bank Loan', 'Loans(Liability)'); // non-current liability
    await mkLedger('Debtors', 'Sundry Debtors'); // current asset
    await mkLedger('Creditors', 'Sundry Creditors'); // current liability
    await mkLedger('Goods Sales', 'Sales Accounts'); // income
    await mkLedger('Office Rent', 'Indirect Expenses'); // expense

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

    await post('Receipt', '2026-04-05', 'Cash', 'Bank Loan', 500000); // loan in
    await post('Payment', '2026-04-10', 'Machinery', 'Cash', 300000); // buy machine
    await post('Sales', '2026-04-20', 'Debtors', 'Goods Sales', 200000); // credit sale
    await post('Payment', '2026-04-25', 'Office Rent', 'Cash', 50000); // expense
  });

  it('reconciles working capital from current items only', async () => {
    const r = await fundsFlowReportService.fundsFlow(companyId, fyId, '2026-04-01', '2026-04-30');
    expect(r.success).toBe(true);
    // CA: Cash 150,000 (500k−300k−50k) + Debtors 200,000 = 350,000
    expect(r.currentAssetsOpening).toBe(0);
    expect(r.currentAssetsClosing).toBe(350000);
    expect(r.currentLiabilitiesOpening).toBe(0);
    expect(r.currentLiabilitiesClosing).toBe(0); // creditors unused
    expect(r.workingCapitalOpening).toBe(0);
    expect(r.workingCapitalClosing).toBe(350000);
    expect(r.workingCapitalChange).toBe(350000);
    expect(r.isNetIncrease).toBe(true);
    expect(r.currentAssetsGroupId).toBeTruthy();
    expect(r.currentLiabilitiesGroupId).toBeTruthy();
  });

  it('aggregates non-current movement by primary group + lists operations', async () => {
    const r = await fundsFlowReportService.fundsFlow(companyId, fyId, '2026-04-01', '2026-04-30');
    const src = Object.fromEntries(r.sources.map((s) => [s.particulars, s.amount]));
    const app = Object.fromEntries(r.applications.map((a) => [a.particulars, a.amount]));

    expect(r.fundsFromOperations).toBe(150000); // 200k income − 50k expense
    expect(src['Nett Profit']).toBe(150000);
    // Non-current rows are the ledger's PRIMARY GROUP, not the ledger itself.
    expect(src['Loans(Liability)']).toBe(500000);
    expect(app['Fixed Assets']).toBe(300000);
    // Group rows carry group_id so the UI can drill into them.
    expect(r.sources.find((s) => s.particulars === 'Loans(Liability)').group_id).toBeTruthy();
    expect(r.applications.find((a) => a.particulars === 'Fixed Assets').group_id).toBeTruthy();
    expect(r.totalSources).toBe(650000);
    expect(r.totalApplications).toBe(300000);

    // current items must NOT appear as sources/applications
    const allParticulars = [...r.sources, ...r.applications].map((x) => x.particulars).join('|');
    expect(allParticulars).not.toMatch(/Cash|Debtors|Creditors/);
  });

  it('satisfies the funds-flow identity (sources − applications = WC change)', async () => {
    const r = await fundsFlowReportService.fundsFlow(companyId, fyId, '2026-04-01', '2026-04-30');
    expect(r.totalSources - r.totalApplications).toBeCloseTo(r.workingCapitalChange, 6);
  });
});
