// Bills Receivable / Payable fallback for bill-wise party ledgers that carry NO
// stored bill references — the shape TallyPrime-imported data lands in, because
// BILLALLOCATIONS are not captured on import. Each accounting voucher touching
// the party is then treated as one open bill (name = voucher number). A debtor
// is pending when its net is Dr; a creditor when its net is Cr. Reducing entries
// (credit note to a debtor, debit note to a creditor) net the other way and drop.

const { setupTestDB, createTestCompany, db } = require('./helpers');
const { sql } = require('drizzle-orm');
const voucherService = require('../voucher/voucherService');
const ledgerService = require('../ledger/ledgerService');
const outstandingReportService = require('../report/outstandingReportService');

describe('outstandingReportService — imported party (no bill references)', () => {
  let companyId, fyId, cashLedgerId;
  let debtorId, creditorId, salesId, purchaseId, radhaId;

  const RADHA_OPENING = 75453; // Dr opening balance
  const RADHA_CN = 12708.6; // Cr credit note (reduces, no ref) -> On Account

  const fetchGroupId = async (groupName) => {
    const rows = await db.all(
      sql`SELECT group_id FROM groups WHERE company_id = ${companyId} AND name = ${groupName} LIMIT 1`,
    );
    return rows[0].group_id;
  };

  const SALE = 7571; // Dr on the debtor  -> receivable
  const PURCHASE = 7400; // Cr on the creditor -> payable
  const CN = 450; // credit note, Cr on the debtor -> reduces, drops out

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('Imported Outstanding Co');
    companyId = company.company_id;

    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId],
    );
    fyId = fyResult.rows[0].fy_id;

    const cashRows = await db.all(
      sql`SELECT ledger_id FROM ledgers WHERE company_id = ${companyId} AND ledger_type = 'Cash' LIMIT 1`,
    );
    cashLedgerId = cashRows[0].ledger_id;

    const mk = async (name, group, nature) => {
      const l = await ledgerService.create({
        company_id: companyId,
        group_id: await fetchGroupId(group),
        name,
        nature,
        is_bill_wise: group === 'Sundry Debtors' || group === 'Sundry Creditors' ? 1 : 0,
      });
      return Number(l.ledger_id || l.ledger?.ledger_id);
    };

    debtorId = await mk('Vikas Traders', 'Sundry Debtors', 'Assets');
    creditorId = await mk('Milan Printers', 'Sundry Creditors', 'Liabilities');
    salesId = await mk('Sales A/c', 'Sales Accounts', 'Income');
    purchaseId = await mk('Purchase A/c', 'Purchase Accounts', 'Expenses');

    // NOTE: no bill_references passed — mirrors imported vouchers.
    // Sale — Dr on debtor.
    await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-04-01',
      is_accounting_voucher: 1,
      entries: [
        { ledger_id: debtorId, type: 'Dr', amount: SALE },
        { ledger_id: salesId, type: 'Cr', amount: SALE },
      ],
    });

    // Purchase — Cr on creditor.
    await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Purchase',
      date: '2026-04-01',
      is_accounting_voucher: 1,
      entries: [
        { ledger_id: purchaseId, type: 'Dr', amount: PURCHASE },
        { ledger_id: creditorId, type: 'Cr', amount: PURCHASE },
      ],
    });

    // Credit note — Cr on debtor. Nets negative for a receivable => excluded.
    await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Credit Note',
      date: '2026-04-01',
      is_accounting_voucher: 1,
      entries: [
        { ledger_id: salesId, type: 'Dr', amount: CN },
        { ledger_id: debtorId, type: 'Cr', amount: CN },
      ],
    });

    // "Radha": a debtor with an OPENING BALANCE and only a reducing credit note
    // (no bill references) — the Tally case where Ledger Outstandings shows one
    // On Account line = opening − credit note, with NO numbered Ref No. bill.
    const radha = await ledgerService.create({
      company_id: companyId,
      group_id: await fetchGroupId('Sundry Debtors'),
      name: 'Radha',
      nature: 'Assets',
      is_bill_wise: 1,
      opening_balance: RADHA_OPENING,
      opening_balance_type: 'Dr',
    });
    radhaId = Number(radha.ledger_id || radha.ledger?.ledger_id);
    await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Credit Note',
      date: '2026-04-01',
      is_accounting_voucher: 1,
      entries: [
        { ledger_id: salesId, type: 'Dr', amount: RADHA_CN },
        { ledger_id: radhaId, type: 'Cr', amount: RADHA_CN },
      ],
    });
  });

  it("derives a receivable bill from the debtor's sale voucher", async () => {
    const res = await outstandingReportService.billsReceivable(companyId, fyId);
    expect(res.success).toBe(true);
    const rows = res.rows.filter((r) => r.party === 'Vikas Traders');
    // Only the net-positive sale shows; the credit note nets down and is excluded.
    expect(rows.length).toBe(1);
    expect(rows[0].balance).toBeCloseTo(SALE, 2);
    expect(res.total).toBeCloseTo(SALE, 2);
    expect(res.bucketTotals['0-30']).toBeCloseTo(SALE, 2);
  });

  it("derives a payable bill from the creditor's purchase voucher", async () => {
    const res = await outstandingReportService.billsPayable(companyId, fyId);
    expect(res.success).toBe(true);
    const rows = res.rows.filter((r) => r.party === 'Milan Printers');
    expect(rows.length).toBe(1);
    expect(rows[0].balance).toBeCloseTo(PURCHASE, 2);
    expect(res.total).toBeCloseTo(PURCHASE, 2);
  });

  it('drill-down resolves the originating voucher for a derived bill', async () => {
    const list = await outstandingReportService.billsReceivable(companyId, fyId);
    const bill = list.rows.find((r) => r.party === 'Vikas Traders');
    // Exact voucher_id disambiguates when a bill name (voucher number) collides
    // across voucher types on the same party (here Sales #1 and Credit Note #1).
    const res = await outstandingReportService.billVouchers(
      companyId,
      fyId,
      bill.ledger_id,
      bill.bill,
      bill.voucher_id,
    );
    expect(res.success).toBe(true);
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].voucher_type).toBe('Sales');
    expect(res.rows[0].amount).toBeCloseTo(SALE, 2);
    expect(res.rows[0].entry_type).toBe('Dr');
  });

  it('folds opening balance + un-allocated reducing vouchers into On Account (no numbered bill)', async () => {
    const res = await outstandingReportService.ledgerOutstandings(companyId, fyId, radhaId);
    expect(res.success).toBe(true);
    // The credit note is a reduction, not a bill — no Ref No. row is emitted.
    expect(res.rows.length).toBe(0);
    // On Account nets the opening balance against the credit note, Dr.
    expect(res.on_account).not.toBeNull();
    expect(res.on_account.amount).toBeCloseTo(RADHA_OPENING - RADHA_CN, 2);
    expect(res.total).toBeCloseTo(RADHA_OPENING - RADHA_CN, 2);

    // On Account expands into: an Opening Balance line, then the credit note as
    // its real transaction (voucher type + Ref No.), NOT a generic "On Account".
    const details = res.on_account.details || [];
    const opening = details.find((d) => d.label === 'Opening Balance');
    expect(opening).toBeDefined();
    expect(opening.amount).toBeCloseTo(RADHA_OPENING, 2);
    const cn = details.find((d) => d.label === 'Credit Note');
    expect(cn).toBeDefined();
    expect(cn.amount).toBeCloseTo(-RADHA_CN, 2);
    expect(cn.voucher_id).toBeGreaterThan(0);
  });
});
