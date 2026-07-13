// Regression tests for two Tally-compatibility fixes:
//   1. Import applies a Tally opening balance onto pre-seeded ledgers
//      (Cash / Profit & Loss A/c), instead of silently dropping it.
//   2. Report opening balances carry forward across financial years the way
//      Tally closes the books: Balance-Sheet accounts carry their prior net,
//      P&L (Income/Expense) accounts reset to 0 and their net rolls into the
//      "Profit & Loss A/c" ledger (retained earnings).
const { setupTestDB, createTestCompany, db } = require('./helpers');
const { sql } = require('drizzle-orm');
const importer = require('../integrations/tally/importer');
const groupService = require('../group/groupService');
const ledgerService = require('../ledger/ledgerService');
const voucherService = require('../voucher/voucherService');
const financialYearService = require('../financialYear/financialYearService');
const { getOpeningBalances } = require('../report/utils/ledgerBalance');

describe('Tally opening-balance import + carry-forward', () => {
  let companyId;
  let fy1;
  let fy2;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('Carry Forward Test Co');
    companyId = company.company_id;
    const fyRes = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId],
    );
    fy1 = fyRes.rows[0].fy_id; // 2026-04-01 .. 2027-03-31 (seeded)
    const created = await financialYearService.create({
      company_id: companyId,
      start_date: '2027-04-01',
    });
    fy2 = created.fy.fy_id;
  });

  it('applies a Tally opening balance onto the pre-seeded Cash ledger', async () => {
    const parsed = {
      groups: [],
      ledgers: [{ name: 'Cash', openingBalance: 14482.17, openingBalanceType: 'Dr' }],
      stockItems: [],
      vouchers: [],
    };
    // importMode is what authorises writing onto a predefined ledger.
    await importer.importMasters(parsed, { company_id: companyId, importMode: true });

    const all = await ledgerService.getAll(companyId);
    const cash = all.ledgers.find((l) => l.name === 'Cash');
    expect(cash.opening_balance).toBeCloseTo(14482.17, 2);
    expect(cash.opening_balance_type).toBe('Dr');
  });

  it('carries Balance-Sheet accounts forward and resets P&L into retained earnings', async () => {
    const groups = await groupService.getAll(companyId);
    const bankGroup = groups.groups.find((g) => g.name === 'Bank Accounts');
    const salesGroup = groups.groups.find((g) => g.name === 'Sales Accounts');

    const bank = await ledgerService.create({
      company_id: companyId,
      name: 'Test Bank',
      group_id: bankGroup.group_id,
      nature: 'Assets',
    });
    const sales = await ledgerService.create({
      company_id: companyId,
      name: 'Test Sales',
      group_id: salesGroup.group_id,
      nature: 'Income',
    });
    const bankId = bank.ledger.ledger_id;
    const salesId = sales.ledger.ledger_id;

    // Year 1 sale: Dr Bank 1000 / Cr Sales 1000.
    const vres = await voucherService.create({
      company_id: companyId,
      fy_id: fy1,
      voucher_type: 'Receipt',
      date: '2026-05-01',
      is_accounting_voucher: 1,
      entries: [
        { ledger_id: bankId, ledger_name: 'Test Bank', type: 'Dr', amount: 1000 },
        { ledger_id: salesId, ledger_name: 'Test Sales', type: 'Cr', amount: 1000 },
      ],
    });
    expect(vres.success).toBe(true);

    // As of the START of year 2, Tally has closed year 1.
    const { openings, plLedgerId } = await getOpeningBalances(companyId, fy2);

    // Balance-Sheet account keeps its closing as the new opening.
    expect(openings[bankId]).toBeCloseTo(1000, 2);
    // P&L account resets to zero at year start.
    expect(openings[salesId] || 0).toBeCloseTo(0, 2);
    // The prior year's profit lands in Profit & Loss A/c (Cr => negative signed).
    expect(plLedgerId).not.toBeNull();
    expect(openings[plLedgerId]).toBeCloseTo(-1000, 2);

    // And in year 1 itself there is no carry-forward (books opening only).
    const y1 = await getOpeningBalances(companyId, fy1);
    expect(y1.openings[bankId] || 0).toBeCloseTo(0, 2);
    expect(y1.openings[salesId] || 0).toBeCloseTo(0, 2);
  });
});
