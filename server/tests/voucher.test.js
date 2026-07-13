const { setupTestDB, createTestCompany, db } = require('./helpers');
const voucherService = require('../voucher/voucherService');
const ledgerService = require('../ledger/ledgerService');

describe('Vouchers Service Tests', () => {
  let companyId;
  let fyId;
  let cashLedgerId;
  let plLedgerId;
  let voucherId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('Vouchers Test Co');
    companyId = company.company_id;

    // Get active financial year
    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId],
    );
    fyId = fyResult.rows[0].fy_id;

    // Get default seeded ledgers
    const ledgersResult = await db.execute(
      `SELECT ledger_id, name FROM ledgers WHERE company_id = ?`,
      [companyId],
    );
    cashLedgerId = ledgersResult.rows.find((l) => l.name === 'Cash').ledger_id;
    plLedgerId = ledgersResult.rows.find((l) => l.name === 'Profit & Loss A/c').ledger_id;
  });

  it('should fail to create an unbalanced accounting voucher', async () => {
    const data = {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Journal',
      date: '2026-04-15',
      is_accounting_voucher: 1,
      entries: [
        {
          ledger_id: cashLedgerId,
          type: 'Dr',
          amount: 5000,
        },
        {
          ledger_id: plLedgerId,
          type: 'Cr',
          amount: 4000, // Unbalanced!
        },
      ],
    };

    const result = await voucherService.create(data);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Debit and Credit amounts must be equal');
  });

  it('should successfully create a balanced accounting voucher', async () => {
    const data = {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Receipt',
      date: '2026-04-15',
      is_accounting_voucher: 1,
      narration: 'Capital introduced in cash',
      entries: [
        {
          ledger_id: cashLedgerId,
          type: 'Dr',
          amount: 10000,
        },
        {
          ledger_id: plLedgerId,
          type: 'Cr',
          amount: 10000,
        },
      ],
    };

    const result = await voucherService.create(data);
    expect(result.success).toBe(true);
    expect(result.voucher.voucher_id).toBeDefined();
    voucherId = result.voucher.voucher_id;
  });

  it('should get ledger balances updating correctly', async () => {
    // Cash balance should now be 10000 Dr
    const cashBal = await voucherService.getLedgerBalance(cashLedgerId, companyId, fyId);
    expect(cashBal.success).toBe(true);
    expect(cashBal.rawBalance).toBe(10000);
    expect(cashBal.balance).toBe('10000.00 Dr');

    // PL balance should be 10000 Cr (income/liability nature → credit side).
    const plBal = await voucherService.getLedgerBalance(plLedgerId, companyId, fyId);
    expect(plBal.success).toBe(true);
    expect(plBal.rawBalance).toBe(10000); // raw balance stays positive on the natural (Cr) side
    expect(plBal.balance).toBe('10000.00 Cr'); // label now respects nature instead of bare sign
  });

  it('should fetch next voucher number', async () => {
    const res = await voucherService.getNextNumber(companyId, fyId, 'Receipt');
    expect(res.success).toBe(true);
    expect(res.nextNumber).toBe(2); // The next number should be 2
  });

  it('should list vouchers in the daybook', async () => {
    const res = await voucherService.getDaybook(companyId, fyId, '2026-04-01', '2026-04-30');
    expect(res.success).toBe(true);
    expect(res.vouchers.length).toBe(1);
    expect(res.vouchers[0].voucher_id).toBe(voucherId);
  });

  it('should get voucher by id with detailed entries', async () => {
    const res = await voucherService.getById(voucherId);
    if (!res.success) console.error('getById failed with error:', res.error);
    expect(res.success).toBe(true);
    expect(res.voucher.entries.length).toBe(2);
    expect(res.voucher.narration).toBe('Capital introduced in cash');
  });

  it('should cancel a voucher and recalculate balances to zero', async () => {
    const res = await voucherService.cancel(voucherId);
    expect(res.success).toBe(true);

    const cashBal = await voucherService.getLedgerBalance(cashLedgerId, companyId, fyId);
    expect(cashBal.success).toBe(true);
    expect(cashBal.rawBalance).toBe(0);
    expect(cashBal.balance).toBe('0.00');
  });

  it('should delete a voucher completely', async () => {
    const res = await voucherService.delete(voucherId);
    expect(res.success).toBe(true);

    const check = await voucherService.getById(voucherId);
    expect(check.success).toBe(false);
  });
});
