const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const {
  vouchers,
  voucherEntries,
  voucherBillReferences,
  voucherOrderDetails,
  ledgers,
  groups,
  payHeads,
} = require('../db/schema');

const nullify = (v) => (v === undefined ? null : v);

const getLedgerBalance = async (ledger_id, company_id, fy_id) => {
  const rows = await db.all(
    sql`SELECT
           l.opening_balance,
           l.opening_balance_type,
           l.nature,
           COALESCE(SUM(CASE WHEN e.type = 'Dr' AND v.voucher_id IS NOT NULL THEN e.amount ELSE 0 END), 0) as total_dr,
           COALESCE(SUM(CASE WHEN e.type = 'Cr' AND v.voucher_id IS NOT NULL THEN e.amount ELSE 0 END), 0) as total_cr
         FROM ${ledgers} l
         LEFT JOIN ${voucherEntries} e ON e.ledger_id = l.ledger_id
         LEFT JOIN ${vouchers} v ON v.voucher_id = e.voucher_id AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
           AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0
         WHERE l.ledger_id = ${ledger_id} AND l.company_id = ${company_id}
         GROUP BY l.ledger_id`
  );
  const row = rows[0];
  if (!row) return { success: false, error: 'Ledger not found' };

  const rawOpening = Number(row.opening_balance) || 0;
  const absOpening = Math.abs(rawOpening);
  const isDrType = row.opening_balance_type === 'Dr';
  const isDrNature = row.nature !== 'Liabilities' && row.nature !== 'Income';

  // Legacy data: negative opening_balance means Cr (from Tally imports, etc.)
  // New data: positive opening_balance, use opening_balance_type to determine sign
  const effectiveOpening = rawOpening < 0
    ? rawOpening
    : (isDrNature === isDrType ? absOpening : -absOpening);

  const totalDr = Number(row.total_dr) || 0;
  const totalCr = Number(row.total_cr) || 0;

  const balance = isDrNature
    ? effectiveOpening + totalDr - totalCr
    : effectiveOpening + totalCr - totalDr;

  let label;
  if (balance > 0.01) label = `${balance.toFixed(2)} Dr`;
  else if (balance < -0.01) label = `${Math.abs(balance).toFixed(2)} Cr`;
  else label = '0.00';
  return { success: true, balance: label, rawBalance: balance, totalDr, totalCr };
};

const searchLedgers = async (company_id, searchTerm) => {
  const likeTerm = `%${searchTerm || ''}%`;
  const rows = await db.all(
    sql`SELECT * FROM ${ledgers} WHERE ${ledgers.companyId} = ${company_id} AND ${ledgers.isActive} = 1
        AND (LOWER(${ledgers.name}) LIKE LOWER(${likeTerm}) OR LOWER(COALESCE(${ledgers.alias}, '')) LIKE LOWER(${likeTerm}))
        ORDER BY ${ledgers.name} LIMIT 50`
  );
  return { success: true, ledgers: rows };
};

const getPendingBills = async (ledger_id, company_id, fy_id) => {
  try {
    // Get all existing bill references for this ledger in this company/fy
    // We consider bills created as 'New Ref' or 'Advance' as potential pending bills
    const rows = await db.all(
      sql`
        SELECT
          vbr.bill_name,
          COALESCE(MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN v.date ELSE NULL END), MAX(v.date)) as bill_date,
          MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.due_date ELSE NULL END) as due_date,
          MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.credit_period ELSE NULL END) as credit_period,
          SUM(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.amount ELSE -vbr.amount END) as total_amount
        FROM ${voucherBillReferences} vbr
        JOIN ${vouchers} v ON v.voucher_id = vbr.voucher_id
        WHERE vbr.ledger_id = ${ledger_id} AND v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
          AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0
          AND vbr.bill_type IN ('New Ref', 'Advance', 'Agst Ref')
        GROUP BY vbr.bill_name
        HAVING total_amount > 0.01
        ORDER BY MAX(v.date) DESC
      `
    );

    const ledgerRows = await db.all(
      sql`SELECT default_credit_period, check_credit_days FROM ${ledgers} WHERE ${ledgers.ledgerId} = ${ledger_id}`
    );
    const defaultCreditPeriod = ledgerRows[0]?.default_credit_period || 0;
    const checkCreditDays = ledgerRows[0]?.check_credit_days || 0;

    const pendingBills = rows.map((row) => ({
      bill_name: row.bill_name,
      bill_date: row.bill_date,
      due_date: row.due_date,
      credit_period: row.credit_period,
      balance: Number(row.total_amount) || 0,
      final_balance: Number(row.total_amount) || 0,
    }));

    // Order numbers on the party's saved Purchase/Sales Order vouchers — Tally
    // offers the order reference in the Pending Bills list too (name only, no
    // bill date/balance: an order is not a posted bill), so an invoice or
    // receipt can put its bill-wise reference against the order number.
    const orderRows = await db.all(
      sql`SELECT vod.order_nos AS bill_name
          FROM ${vouchers} v
          INNER JOIN ${voucherOrderDetails} vod ON vod.voucher_id = v.voucher_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
            AND v.party_ledger_id = ${ledger_id}
            AND v.voucher_type IN ('Purchase Order', 'Sales Order')
            AND vod.order_nos IS NOT NULL AND vod.order_nos <> ''
            AND v.is_cancelled = 0
            AND COALESCE(v.is_optional, 0) = 0
            AND COALESCE(v.is_post_dated, 0) = 0
          GROUP BY vod.order_nos
          ORDER BY MAX(v.date), vod.order_nos`
    );
    for (const r of orderRows) {
      if (pendingBills.some((b) => b.bill_name === r.bill_name)) continue;
      pendingBills.push({
        bill_name: r.bill_name,
        bill_date: null,
        due_date: null,
        credit_period: null,
        balance: null,
        final_balance: null,
        is_order: 1,
      });
    }

    return { success: true, pendingBills, defaultCreditPeriod, checkCreditDays };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const recalculateLedgerBalances = async (voucher_id, company_id, fy_id) => {
  try {
    const affected = await db.all(
      sql`SELECT DISTINCT ledger_id FROM ${voucherEntries} WHERE ${voucherEntries.voucherId} = ${voucher_id} AND ${voucherEntries.ledgerId} IS NOT NULL`
    );
    for (const row of affected) {
      try {
        const balRes = await getLedgerBalance(row.ledger_id, company_id, fy_id);
        if (balRes.success && balRes.rawBalance != null) {
          await db
            .update(ledgers)
            .set({ closingBalance: balRes.rawBalance })
            .where(eq(ledgers.ledgerId, row.ledger_id));
        }
      } catch (_e) { /* ignore individual errors */ }
    }
  } catch (_e) { /* ignore */ }
};

const getOrCreatePayHeadLedger = async (company_id, payHeadName) => {
  const existing = await db.all(
    sql`SELECT ledger_id FROM ${ledgers} WHERE ${ledgers.companyId} = ${company_id} AND LOWER(${ledgers.name}) = LOWER(${payHeadName}) AND ${ledgers.isActive} = 1`
  );
  if (existing.length > 0) {
    return Number(existing[0].ledger_id);
  }

  const group = await db.all(
    sql`SELECT group_id FROM ${groups} WHERE ${groups.companyId} = ${company_id} AND LOWER(${groups.name}) = 'indirect expenses'`
  );
  const groupId = group.length > 0 ? Number(group[0].group_id) : null;

  const inserted = await db
    .insert(ledgers)
    .values({
      companyId: company_id,
      groupId: groupId,
      name: payHeadName,
      alias: null,
      ledgerType: 'General',
      nature: 'Expenses',
      openingBalance: 0,
      closingBalance: 0,
      isBillWise: 0,
      maintainInventoryValues: 0,
      mailingName: null,
      address1: null,
      address2: null,
      city: null,
      state: null,
      country: null,
      pincode: null,
      phone: null,
      email: null,
      gstin: null,
      pan: null,
      registrationType: 'Unregistered',
      defaultCreditPeriod: null,
      checkCreditDays: 0,
      allowCostCentres: 0,
      invoiceRounding: 0,
      roundingMethod: null,
      roundingLimit: 0,
      isActive: 1,
      isPredefined: 0,
    })
    .returning({ id: ledgers.ledgerId });
  return Number(inserted[0].id);
};

const validateDoubleEntry = (entries) => {
  const total = entries.reduce((sum, e) => {
    return e.type === 'Dr' ? sum + e.amount : sum - e.amount;
  }, 0);
  return Math.abs(total) < 0.01;
};

module.exports = {
  nullify,
  getLedgerBalance,
  searchLedgers,
  getPendingBills,
  recalculateLedgerBalances,
  getOrCreatePayHeadLedger,
  validateDoubleEntry,
};
