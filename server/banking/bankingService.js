// Bank reconciliation (BRS) service.
//
// Reconciliation matches a bank ledger's voucher_entries against the bank statement.
// The `reconciliations` table (schema in banking.js, created by db/index.js initDB) records,
// per reconciled entry, the bank_date / bank_reference. An entry is "reconciled" iff a
// reconciliations row references its entry_id.
//
// Return shapes follow the renderer contract in client/src/types/api/Transactions.ts.
// Drizzle ORM, mirroring voucherService.js: db.all(sql`...`) for reads / INSERT ... RETURNING,
// db.run(sql`...`) for plain writes; tables imported from ../db/schema.

const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const {
  reconciliations,
  voucherEntries,
  vouchers,
  ledgers,
  voucherBankDetails,
  ledgerBankDetails,
  groups,
} = require('../db/schema');
const auditTrailService = require('../auditTrail/auditTrailService');

// Instrument types that represent a physical cheque (the only ones printable).
const CHEQUE_TYPES = ['Cheque', 'Electronic Cheque'];

// Instrument types that can be deposited into a bank via a deposit slip
// (cheques / demand drafts received from parties).
const DEPOSIT_TYPES = ['Cheque', 'Electronic Cheque', 'Electronic DD/PO'];

// Signed amount for a bank ledger: Dr increases the bank balance, Cr decreases it.
const SIGNED_AMOUNT = sql`CASE WHEN e.type = 'Dr' THEN e.amount ELSE -e.amount END`;

async function ledgerName(ledger_id) {
  const rows = await db.all(
    sql`SELECT name FROM ${ledgers} WHERE ledger_id = ${ledger_id} LIMIT 1`,
  );
  return rows[0] ? rows[0].name : null;
}

// ---------------------------------------------------------------------------
// Cheque Register helpers (TallyPrime Banking → Cheque Register).
// A cheque instrument = a voucher_bank_details row (cheque type) on a bank ledger.
// ---------------------------------------------------------------------------
const NOT_IN_RANGE = 'Not in Range';

// Fetch every cheque instrument for a company's bank ledgers, tagged with the
// bank entry's reconciled flag + the voucher's cancelled flag. Optionally scoped
// to one bank ledger. Reconciled is resolved via EXISTS (the reconciliations
// table is keyed by the bank ledger's voucher_entries.entry_id) to avoid the
// row duplication a LEFT JOIN would cause when a voucher has several entries.
async function fetchChequeInstruments(company_id, fy_id, ledger_id = null) {
  const conds = [
    sql`v.company_id = ${company_id}`,
    sql`v.fy_id = ${fy_id}`,
    sql`bd.transaction_type IN (${sql.join(
      CHEQUE_TYPES.map((t) => sql`${t}`),
      sql`, `,
    )})`,
    sql`COALESCE(v.is_optional, 0) = 0`,
    sql`LOWER(COALESCE(g.name, '')) LIKE '%bank%'`,
  ];
  if (ledger_id) conds.push(sql`bd.ledger_id = ${ledger_id}`);

  return db.all(sql`
    SELECT bd.bank_detail_id, bd.voucher_id, bd.ledger_id, l.name AS ledger_name,
           bd.instrument_number, bd.instrument_date, bd.amount, bd.favouring_name,
           v.date, v.voucher_type, v.voucher_number, v.party_name,
           COALESCE(v.is_cancelled, 0) AS is_cancelled,
           CASE WHEN EXISTS (
             SELECT 1 FROM ${voucherEntries} e
             JOIN ${reconciliations} r ON r.entry_id = e.entry_id
             WHERE e.voucher_id = bd.voucher_id AND e.ledger_id = bd.ledger_id
           ) THEN 1 ELSE 0 END AS reconciled
    FROM ${voucherBankDetails} bd
    JOIN ${vouchers} v ON v.voucher_id = bd.voucher_id
    JOIN ${ledgers} l ON l.ledger_id = bd.ledger_id
    LEFT JOIN ${groups} g ON g.group_id = l.group_id
    WHERE ${sql.join(conds, sql` AND `)}
    ORDER BY v.date ASC, bd.bank_detail_id ASC
  `);
}

// Configured cheque-book ranges for a bank ledger: [{ name, from, to }] (numeric).
function parseRanges(json) {
  try {
    const arr = JSON.parse(json || '[]');
    if (!Array.isArray(arr)) return [];
    return arr
      .map((r) => ({ name: r.name || '', from: Number(r.from_number), to: Number(r.to_number) }))
      .filter((r) => Number.isFinite(r.from) && Number.isFinite(r.to) && r.to >= r.from);
  } catch {
    return [];
  }
}

// The range name an instrument number falls into, or "Not in Range".
function rangeOf(instrumentNumber, ranges) {
  const n = Number(instrumentNumber);
  if (!instrumentNumber || !Number.isFinite(n)) return NOT_IN_RANGE;
  for (const r of ranges) if (n >= r.from && n <= r.to) return r.name || `${r.from}-${r.to}`;
  return NOT_IN_RANGE;
}

// Status bucket for one instrument, given the active period.
function bucketOf(row, from, to) {
  if (row.is_cancelled) return 'cancelled';
  if (from && row.date < from) return 'out_of_period';
  if (to && row.date > to) return 'out_of_period';
  if (row.reconciled) return 'reconciled';
  return 'unreconciled';
}

const STATUS_LABEL = {
  unreconciled: 'Unreconciled',
  reconciled: 'Reconciled',
  cancelled: 'Cancelled',
  out_of_period: 'Out of Period',
  blank: 'Blank',
};

function emptyCounts() {
  return {
    unreconciled: 0,
    reconciled: 0,
    cancelled: 0,
    out_of_period: 0,
    blank: 0,
    available: 0,
    total: 0,
  };
}

// Bank ledgers with their parsed cheque ranges.
async function bankLedgersWithRanges(company_id) {
  const rows = await db.all(sql`
    SELECT l.ledger_id, l.name, bd.cheque_ranges
    FROM ${ledgers} l
    LEFT JOIN ${groups} g ON g.group_id = l.group_id
    LEFT JOIN ${ledgerBankDetails} bd ON bd.ledger_id = l.ledger_id
    WHERE l.company_id = ${company_id}
      AND COALESCE(l.is_active, 1) = 1
      AND LOWER(COALESCE(g.name, '')) LIKE '%bank%'
    ORDER BY l.name ASC
  `);
  return rows.map((r) => ({
    ledger_id: r.ledger_id,
    name: r.name,
    ranges: parseRanges(r.cheque_ranges),
  }));
}

module.exports = {
  // Bank entries for a ledger that have NOT been reconciled yet.
  getUnreconciled: async (company_id, fy_id, ledger_id) => {
    try {
      const transactions = await db.all(sql`
        SELECT e.entry_id, e.voucher_id, e.ledger_id, e.ledger_name, e.type, e.amount, e.narration,
               v.voucher_number, v.date, v.voucher_type, v.party_name
        FROM ${voucherEntries} e
        JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        WHERE v.company_id = ${company_id}
          AND v.fy_id = ${fy_id}
          AND e.ledger_id = ${ledger_id}
          AND COALESCE(v.is_cancelled, 0) = 0
          AND COALESCE(v.is_optional, 0) = 0
          AND COALESCE(v.is_post_dated, 0) = 0
          AND e.entry_id NOT IN (SELECT entry_id FROM ${reconciliations})
        ORDER BY v.date ASC, e.entry_id ASC
      `);
      return { success: true, transactions };
    } catch (err) {
      console.error('Error in banking.getUnreconciled:', err);
      return { success: false, error: err.message, transactions: [] };
    }
  },

  // Mark a bank entry as reconciled (idempotent per entry_id).
  reconcile: async (data) => {
    try {
      const {
        entry_id,
        voucher_id,
        ledger_id,
        bank_date = null,
        bank_reference = null,
        reconciled_date = null,
      } = data || {};

      if (!entry_id || !voucher_id || !ledger_id) {
        return { success: false, error: 'entry_id, voucher_id and ledger_id are required' };
      }

      const ledgerRows = await db.all(
        sql`SELECT company_id FROM ${ledgers} WHERE ledger_id = ${ledger_id} LIMIT 1`,
      );
      const company_id = ledgerRows[0]?.company_id;

      let before = null;
      const prior = await db.all(
        sql`SELECT * FROM ${reconciliations} WHERE entry_id = ${entry_id} LIMIT 1`,
      );
      if (prior.length > 0) before = prior[0];

      // Re-reconciling an entry replaces the prior record (no UNIQUE on entry_id).
      await db.run(sql`DELETE FROM ${reconciliations} WHERE entry_id = ${entry_id}`);
      const rows = await db.all(sql`
        INSERT INTO ${reconciliations}
          (entry_id, voucher_id, ledger_id, reconciled_date, bank_date, bank_reference)
        VALUES (${entry_id}, ${voucher_id}, ${ledger_id}, ${reconciled_date}, ${bank_date}, ${bank_reference})
        RETURNING *
      `);

      if (company_id) {
        await auditTrailService.record({
          company_id,
          entity_type: 'bank_reconciliation',
          entity_id: entry_id,
          action: before ? 'update' : 'create',
          before,
          after: rows[0],
        });
      }

      return { success: true, reconciliation: rows[0] };
    } catch (err) {
      console.error('Error in banking.reconcile:', err);
      return { success: false, error: err.message };
    }
  },

  // Remove a reconciliation. Accepts an entry_id (number, per the renderer contract) or
  // { entry_id } / { reconciliation_id }.
  unreconcile: async (idOrData) => {
    try {
      let reconciliationId = null;
      let entryId = null;
      if (idOrData && typeof idOrData === 'object') {
        reconciliationId = idOrData.reconciliation_id ?? null;
        entryId = idOrData.entry_id ?? null;
      } else {
        entryId = idOrData ?? null; // bare number is an entry_id
      }
      if (reconciliationId == null && entryId == null) {
        return { success: false, error: 'entry_id or reconciliation_id is required' };
      }

      let prior = [];
      if (reconciliationId != null) {
        prior = await db.all(
          sql`SELECT * FROM ${reconciliations} WHERE reconciliation_id = ${reconciliationId} LIMIT 1`,
        );
      } else if (entryId != null) {
        prior = await db.all(
          sql`SELECT * FROM ${reconciliations} WHERE entry_id = ${entryId} LIMIT 1`,
        );
      }
      const before = prior[0] || null;

      const res =
        reconciliationId != null
          ? await db.run(
              sql`DELETE FROM ${reconciliations} WHERE reconciliation_id = ${reconciliationId}`,
            )
          : await db.run(sql`DELETE FROM ${reconciliations} WHERE entry_id = ${entryId}`);

      const removed = (res && (res.rowsAffected ?? res.changes)) || 0;

      if (removed && before) {
        const ledgerRows = await db.all(
          sql`SELECT company_id FROM ${ledgers} WHERE ledger_id = ${before.ledger_id} LIMIT 1`,
        );
        const company_id = ledgerRows[0]?.company_id;
        if (company_id) {
          await auditTrailService.record({
            company_id,
            entity_type: 'bank_reconciliation',
            entity_id: before.entry_id,
            action: 'delete',
            before,
            after: null,
          });
        }
      }

      return { success: true, removed };
    } catch (err) {
      console.error('Error in banking.unreconcile:', err);
      return { success: false, error: err.message };
    }
  },

  // All bank entries for a ledger (reconciled + unreconciled) with status + running balance.
  getStatement: async (company_id, fy_id, ledger_id, from_date, to_date) => {
    try {
      const conds = [
        sql`v.company_id = ${company_id}`,
        sql`v.fy_id = ${fy_id}`,
        sql`e.ledger_id = ${ledger_id}`,
        sql`COALESCE(v.is_cancelled, 0) = 0`,
        sql`COALESCE(v.is_optional, 0) = 0`,
        sql`COALESCE(v.is_post_dated, 0) = 0`,
      ];
      if (from_date) conds.push(sql`v.date >= ${from_date}`);
      if (to_date) conds.push(sql`v.date <= ${to_date}`);

      const raw = await db.all(sql`
        SELECT e.entry_id, e.voucher_id, e.ledger_id, e.type, e.amount, e.narration,
               v.voucher_number, v.date, v.voucher_type, v.party_name,
               bd.transaction_type, bd.instrument_number, bd.instrument_date,
               r.reconciliation_id, r.bank_date, r.bank_reference, r.reconciled_date
        FROM ${voucherEntries} e
        JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        LEFT JOIN ${voucherBankDetails} bd
          ON bd.voucher_id = e.voucher_id AND bd.ledger_id = e.ledger_id
        LEFT JOIN ${reconciliations} r ON r.entry_id = e.entry_id
        WHERE ${sql.join(conds, sql` AND `)}
        ORDER BY v.date ASC, e.entry_id ASC
      `);

      let balance = 0; // running book balance (Dr +, Cr -)
      let unreconciled_dr = 0;
      let unreconciled_cr = 0;
      const rows = raw.map((r) => {
        balance += r.type === 'Dr' ? r.amount : -r.amount;
        const is_reconciled = !!r.reconciliation_id;
        if (!is_reconciled) {
          if (r.type === 'Dr') unreconciled_dr += r.amount;
          else unreconciled_cr += r.amount;
        }
        return {
          entry_id: r.entry_id,
          voucher_id: r.voucher_id,
          voucher_number: r.voucher_number,
          date: r.date,
          voucher_type: r.voucher_type,
          party_name: r.party_name,
          narration: r.narration,
          transaction_type: r.transaction_type ?? null,
          instrument_number: r.instrument_number ?? null,
          instrument_date: r.instrument_date ?? null,
          type: r.type,
          amount: r.amount,
          is_reconciled,
          reconciliation_id: r.reconciliation_id ?? null,
          bank_date: r.bank_date ?? null,
          bank_reference: r.bank_reference ?? null,
          balance,
        };
      });

      // TallyPrime BRS footer: unreconciled entries are "not reflected in bank";
      // Balance as per Bank = book balance less the net of amounts not yet in the bank.
      const book_balance = balance;
      const balance_as_per_bank = book_balance - unreconciled_dr + unreconciled_cr;

      return {
        success: true,
        ledger_name: await ledgerName(ledger_id),
        rows,
        book_balance,
        unreconciled_dr,
        unreconciled_cr,
        balance_as_per_bank,
      };
    } catch (err) {
      console.error('Error in banking.getStatement:', err);
      return { success: false, error: err.message, rows: [] };
    }
  },

  // BRS summary: book balance plus reconciled / unreconciled split.
  getSummary: async (company_id, fy_id, ledger_id) => {
    try {
      const rows = await db.all(sql`
        SELECT
          COUNT(*) AS total_count,
          COALESCE(SUM(CASE WHEN r.reconciliation_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS reconciled_count,
          COALESCE(SUM(CASE WHEN r.reconciliation_id IS NULL THEN 1 ELSE 0 END), 0) AS unreconciled_count,
          COALESCE(SUM(CASE WHEN r.reconciliation_id IS NOT NULL THEN (${SIGNED_AMOUNT}) ELSE 0 END), 0) AS reconciled_amount,
          COALESCE(SUM(CASE WHEN r.reconciliation_id IS NULL THEN (${SIGNED_AMOUNT}) ELSE 0 END), 0) AS unreconciled_amount,
          COALESCE(SUM(${SIGNED_AMOUNT}), 0) AS book_balance
        FROM ${voucherEntries} e
        JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        LEFT JOIN ${reconciliations} r ON r.entry_id = e.entry_id
        WHERE v.company_id = ${company_id}
          AND v.fy_id = ${fy_id}
          AND e.ledger_id = ${ledger_id}
          AND COALESCE(v.is_cancelled, 0) = 0
          AND COALESCE(v.is_optional, 0) = 0
          AND COALESCE(v.is_post_dated, 0) = 0
      `);
      const s = rows[0] || {};
      return {
        success: true,
        ledger_name: await ledgerName(ledger_id),
        book_balance: s.book_balance || 0,
        reconciled_amount: s.reconciled_amount || 0,
        unreconciled_amount: s.unreconciled_amount || 0,
        total_reconciled_count: s.reconciled_count || 0,
        total_unreconciled_count: s.unreconciled_count || 0,
        total_count: s.total_count || 0,
      };
    } catch (err) {
      console.error('Error in banking.getSummary:', err);
      return { success: false, error: err.message };
    }
  },

  // Bank ledgers eligible for Cheque Printing — the "Select Bank" list (Tally).
  // Any ledger under a group whose name contains "Bank" that has bank details.
  getBankLedgers: async (company_id) => {
    try {
      const rows = await db.all(sql`
        SELECT l.ledger_id, l.name, g.name AS group_name,
               COALESCE(bd.enable_cheque_printing, 0) AS enable_cheque_printing
        FROM ${ledgers} l
        LEFT JOIN ${groups} g ON g.group_id = l.group_id
        LEFT JOIN ${ledgerBankDetails} bd ON bd.ledger_id = l.ledger_id
        WHERE l.company_id = ${company_id}
          AND COALESCE(l.is_active, 1) = 1
          AND LOWER(COALESCE(g.name, '')) LIKE '%bank%'
        ORDER BY l.name ASC
      `);
      return { success: true, ledgers: rows };
    } catch (err) {
      console.error('Error in banking.getBankLedgers:', err);
      return { success: false, error: err.message, ledgers: [] };
    }
  },

  // Cheque Printing register for a bank ledger: every cheque instrument drawn on
  // it (from voucher_bank_details), with printed status. Mirrors TallyPrime's
  // Banking → Cheque Printing screen (Date, Particulars, Instrument No.,
  // Instrument Date, Printed?, Amount). include_printed keeps already-printed rows.
  getChequePrinting: async (
    company_id,
    fy_id,
    ledger_id,
    from_date,
    to_date,
    include_printed = false,
  ) => {
    try {
      const conds = [
        sql`v.company_id = ${company_id}`,
        sql`v.fy_id = ${fy_id}`,
        sql`bd.ledger_id = ${ledger_id}`,
        sql`bd.transaction_type IN (${sql.join(
          CHEQUE_TYPES.map((t) => sql`${t}`),
          sql`, `,
        )})`,
        sql`COALESCE(v.is_cancelled, 0) = 0`,
        sql`COALESCE(v.is_optional, 0) = 0`,
      ];
      if (from_date) conds.push(sql`v.date >= ${from_date}`);
      if (to_date) conds.push(sql`v.date <= ${to_date}`);
      if (!include_printed) conds.push(sql`COALESCE(bd.cheque_printed, 0) = 0`);

      const rows = await db.all(sql`
        SELECT bd.bank_detail_id, bd.voucher_id, bd.instrument_number, bd.instrument_date,
               bd.favouring_name, bd.amount, COALESCE(bd.cheque_printed, 0) AS cheque_printed,
               v.voucher_number, v.date, v.voucher_type, v.party_name
        FROM ${voucherBankDetails} bd
        JOIN ${vouchers} v ON v.voucher_id = bd.voucher_id
        WHERE ${sql.join(conds, sql` AND `)}
        ORDER BY v.date ASC, bd.bank_detail_id ASC
      `);

      const cfg = await db.all(sql`
        SELECT l.name, COALESCE(bd.enable_cheque_printing, 0) AS enable_cheque_printing
        FROM ${ledgers} l
        LEFT JOIN ${ledgerBankDetails} bd ON bd.ledger_id = l.ledger_id
        WHERE l.ledger_id = ${ledger_id} LIMIT 1
      `);

      const grand_total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      return {
        success: true,
        ledger_name: cfg[0]?.name ?? null,
        is_configured: !!cfg[0]?.enable_cheque_printing,
        rows: rows.map((r) => ({
          bank_detail_id: r.bank_detail_id,
          voucher_id: r.voucher_id,
          voucher_number: r.voucher_number,
          date: r.date,
          particulars: r.favouring_name || r.party_name || '',
          instrument_number: r.instrument_number || '',
          instrument_date: r.instrument_date || '',
          printed: !!r.cheque_printed,
          amount: Number(r.amount) || 0,
        })),
        grand_total,
      };
    } catch (err) {
      console.error('Error in banking.getChequePrinting:', err);
      return { success: false, error: err.message, rows: [] };
    }
  },

  // Cheque Deposit Slip for a bank ledger (TallyPrime Banking → Deposit Slip):
  // cheques / DDs RECEIVED from parties and deposited into this bank — i.e.
  // instrument rows whose bank entry is a Dr (bank balance increases).
  // Columns mirror Tally: Date, Particulars, Instrument No., Instrument Date,
  // Printed?, Amount. include_printed keeps already-printed rows. The `printed`
  // status reuses cheque_printed (a deposited instrument is never also issued).
  getDepositSlip: async (
    company_id,
    fy_id,
    ledger_id,
    from_date,
    to_date,
    include_printed = false,
  ) => {
    try {
      const conds = [
        sql`v.company_id = ${company_id}`,
        sql`v.fy_id = ${fy_id}`,
        sql`bd.ledger_id = ${ledger_id}`,
        sql`e.type = 'Dr'`,
        sql`bd.transaction_type IN (${sql.join(
          DEPOSIT_TYPES.map((t) => sql`${t}`),
          sql`, `,
        )})`,
        sql`COALESCE(v.is_cancelled, 0) = 0`,
        sql`COALESCE(v.is_optional, 0) = 0`,
        sql`COALESCE(v.is_post_dated, 0) = 0`,
      ];
      if (from_date) conds.push(sql`v.date >= ${from_date}`);
      if (to_date) conds.push(sql`v.date <= ${to_date}`);
      if (!include_printed) conds.push(sql`COALESCE(bd.cheque_printed, 0) = 0`);

      const rows = await db.all(sql`
        SELECT bd.bank_detail_id, bd.voucher_id, bd.instrument_number, bd.instrument_date,
               bd.favouring_name, bd.amount, COALESCE(bd.cheque_printed, 0) AS cheque_printed,
               v.voucher_number, v.date, v.voucher_type, v.party_name
        FROM ${voucherBankDetails} bd
        JOIN ${vouchers} v ON v.voucher_id = bd.voucher_id
        JOIN ${voucherEntries} e ON e.voucher_id = bd.voucher_id AND e.ledger_id = bd.ledger_id
        WHERE ${sql.join(conds, sql` AND `)}
        ORDER BY v.date ASC, bd.bank_detail_id ASC
      `);

      const grand_total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      return {
        success: true,
        ledger_name: await ledgerName(ledger_id),
        rows: rows.map((r) => ({
          bank_detail_id: r.bank_detail_id,
          voucher_id: r.voucher_id,
          voucher_number: r.voucher_number,
          date: r.date,
          particulars: r.party_name || r.favouring_name || '',
          instrument_number: r.instrument_number || '',
          instrument_date: r.instrument_date || '',
          printed: !!r.cheque_printed,
          amount: Number(r.amount) || 0,
        })),
        grand_total,
      };
    } catch (err) {
      console.error('Error in banking.getDepositSlip:', err);
      return { success: false, error: err.message, rows: [] };
    }
  },

  // Party ledgers for the Payment Advice "Select Item" list (TallyPrime shows the
  // full List of Ledgers). Returns every active ledger with its e-mail (used by
  // "Update E-mail ID"), name-sorted.
  getPartyLedgers: async (company_id) => {
    try {
      const rows = await db.all(sql`
        SELECT l.ledger_id, l.name, COALESCE(l.email, '') AS email
        FROM ${ledgers} l
        WHERE l.company_id = ${company_id}
          AND COALESCE(l.is_active, 1) = 1
        ORDER BY l.name ASC
      `);
      return { success: true, ledgers: rows };
    } catch (err) {
      console.error('Error in banking.getPartyLedgers:', err);
      return { success: false, error: err.message, ledgers: [] };
    }
  },

  // Payment Advice for a party ledger (TallyPrime Banking → Payment Advice):
  // the payments MADE to the selected party — Payment vouchers in which the
  // party ledger is debited (its payable is settled) and a bank/cash ledger is
  // credited. Columns mirror Tally: Date, Particulars (the credited bank/cash
  // ledger), Vch Type, Vch No., Reconciled, Printed/Emailed?, Amount.
  // `reconciled_only` keeps only rows whose bank entry is reconciled (F8). The
  // printed flag reuses the voucher's cheque instrument (voucher_bank_details).
  getPaymentAdvice: async (
    company_id,
    fy_id,
    ledger_id,
    from_date,
    to_date,
    reconciled_only = false,
  ) => {
    try {
      const conds = [
        sql`v.company_id = ${company_id}`,
        sql`v.fy_id = ${fy_id}`,
        sql`e.ledger_id = ${ledger_id}`,
        sql`e.type = 'Dr'`,
        sql`v.voucher_type = 'Payment'`,
        sql`COALESCE(v.is_cancelled, 0) = 0`,
        sql`COALESCE(v.is_optional, 0) = 0`,
      ];
      if (from_date) conds.push(sql`v.date >= ${from_date}`);
      if (to_date) conds.push(sql`v.date <= ${to_date}`);

      const reconciledExpr = sql`CASE WHEN EXISTS (
        SELECT 1 FROM ${voucherEntries} e3
        JOIN ${reconciliations} r ON r.entry_id = e3.entry_id
        WHERE e3.voucher_id = v.voucher_id
      ) THEN 1 ELSE 0 END`;
      if (reconciled_only) conds.push(sql`(${reconciledExpr}) = 1`);

      const rows = await db.all(sql`
        SELECT v.voucher_id, v.date, v.voucher_type, v.voucher_number,
               e.amount AS amount,
               (SELECT e2.ledger_name FROM ${voucherEntries} e2
                  WHERE e2.voucher_id = v.voucher_id AND e2.type = 'Cr'
                  ORDER BY e2.entry_id LIMIT 1) AS particulars,
               (SELECT bd.bank_detail_id FROM ${voucherBankDetails} bd
                  WHERE bd.voucher_id = v.voucher_id
                  ORDER BY bd.bank_detail_id LIMIT 1) AS bank_detail_id,
               (SELECT COALESCE(bd.cheque_printed, 0) FROM ${voucherBankDetails} bd
                  WHERE bd.voucher_id = v.voucher_id
                  ORDER BY bd.bank_detail_id LIMIT 1) AS cheque_printed,
               ${reconciledExpr} AS reconciled
        FROM ${voucherEntries} e
        JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        WHERE ${sql.join(conds, sql` AND `)}
        ORDER BY v.date ASC, v.voucher_id ASC
      `);

      const grand_total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      return {
        success: true,
        ledger_name: await ledgerName(ledger_id),
        rows: rows.map((r) => ({
          voucher_id: r.voucher_id,
          bank_detail_id: r.bank_detail_id ?? null,
          voucher_number: r.voucher_number || '',
          voucher_type: r.voucher_type || '',
          date: r.date,
          particulars: r.particulars || '',
          reconciled: !!r.reconciled,
          printed: !!r.cheque_printed,
          amount: Number(r.amount) || 0,
        })),
        grand_total,
      };
    } catch (err) {
      console.error('Error in banking.getPaymentAdvice:', err);
      return { success: false, error: err.message, rows: [] };
    }
  },

  // Update a party ledger's e-mail ID (TallyPrime Payment Advice → W: Update E-mail ID).
  updateLedgerEmail: async (ledger_id, email) => {
    try {
      await db.run(
        sql`UPDATE ${ledgers} SET email = ${email ?? ''} WHERE ledger_id = ${ledger_id}`,
      );
      return { success: true };
    } catch (err) {
      console.error('Error in banking.updateLedgerEmail:', err);
      return { success: false, error: err.message };
    }
  },

  // Post-Dated Transactions Monthly Summary (TallyPrime Banking → PosT-dated Summary).
  // Post-dated vouchers are is_post_dated = 1. For a bank ledger, a Dr entry is a
  // cheque/instrument RECEIVED (bank increases), a Cr entry is one ISSUED (bank decreases).
  // Returns one aggregated row per calendar month present, keyed 'YYYY-MM'; the
  // renderer lays out the full FY (Apr→Mar) and merges these in.
  getPostDatedSummary: async (company_id, fy_id, ledger_id) => {
    try {
      const conds = [
        sql`v.company_id = ${company_id}`,
        sql`v.fy_id = ${fy_id}`,
        sql`COALESCE(v.is_cancelled, 0) = 0`,
        sql`COALESCE(v.is_optional, 0) = 0`,
        sql`COALESCE(v.is_post_dated, 0) = 1`,
      ];
      if (ledger_id) conds.push(sql`e.ledger_id = ${ledger_id}`);

      const months = await db.all(sql`
        SELECT substr(v.date, 1, 7) AS ym,
          COALESCE(SUM(CASE WHEN e.type = 'Dr' THEN e.amount ELSE 0 END), 0) AS received_amount,
          COALESCE(SUM(CASE WHEN e.type = 'Dr' THEN 1 ELSE 0 END), 0) AS received_count,
          COALESCE(SUM(CASE WHEN e.type = 'Cr' THEN e.amount ELSE 0 END), 0) AS issued_amount,
          COALESCE(SUM(CASE WHEN e.type = 'Cr' THEN 1 ELSE 0 END), 0) AS issued_count
        FROM ${voucherEntries} e
        JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        WHERE ${sql.join(conds, sql` AND `)}
        GROUP BY ym
        ORDER BY ym ASC
      `);

      const grand_total = months.reduce(
        (g, m) => ({
          received_amount: g.received_amount + Number(m.received_amount || 0),
          received_count: g.received_count + Number(m.received_count || 0),
          issued_amount: g.issued_amount + Number(m.issued_amount || 0),
          issued_count: g.issued_count + Number(m.issued_count || 0),
        }),
        { received_amount: 0, received_count: 0, issued_amount: 0, issued_count: 0 },
      );

      return { success: true, ledger_name: await ledgerName(ledger_id), months, grand_total };
    } catch (err) {
      console.error('Error in banking.getPostDatedSummary:', err);
      return { success: false, error: err.message, months: [] };
    }
  },

  // Post-Dated Transactions detail (drill-down from the monthly summary).
  // Every post-dated instrument on the bank ledger in the period, with instrument
  // no./date and Received/Issued type. Columns mirror Tally: Date, Type,
  // Particulars, Instrument no., Instrument date, Status, Amount.
  getPostDatedTransactions: async (company_id, fy_id, ledger_id, from_date, to_date) => {
    try {
      const conds = [
        sql`v.company_id = ${company_id}`,
        sql`v.fy_id = ${fy_id}`,
        sql`COALESCE(v.is_cancelled, 0) = 0`,
        sql`COALESCE(v.is_optional, 0) = 0`,
        sql`COALESCE(v.is_post_dated, 0) = 1`,
      ];
      if (ledger_id) conds.push(sql`e.ledger_id = ${ledger_id}`);
      if (from_date) conds.push(sql`v.date >= ${from_date}`);
      if (to_date) conds.push(sql`v.date <= ${to_date}`);

      const raw = await db.all(sql`
        SELECT e.entry_id, e.voucher_id, e.type, e.amount,
               v.voucher_number, v.date, v.voucher_type, v.party_name,
               bd.instrument_number, bd.instrument_date, bd.transaction_type
        FROM ${voucherEntries} e
        JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        LEFT JOIN ${voucherBankDetails} bd
          ON bd.voucher_id = e.voucher_id AND bd.ledger_id = e.ledger_id
        WHERE ${sql.join(conds, sql` AND `)}
        ORDER BY v.date ASC, e.entry_id ASC
      `);

      const rows = raw.map((r) => ({
        entry_id: r.entry_id,
        voucher_id: r.voucher_id,
        voucher_number: r.voucher_number,
        date: r.date,
        type: r.type === 'Dr' ? 'Received' : 'Issued',
        particulars: r.party_name || '',
        instrument_number: r.instrument_number || '',
        instrument_date: r.instrument_date || '',
        status: 'Post-Dated',
        amount: Number(r.amount) || 0,
      }));

      const grand_total = rows.reduce((s, r) => s + r.amount, 0);
      return { success: true, ledger_name: await ledgerName(ledger_id), rows, grand_total };
    } catch (err) {
      console.error('Error in banking.getPostDatedTransactions:', err);
      return { success: false, error: err.message, rows: [] };
    }
  },

  // Cheque Register — Level 1: Bank wise Register. One row per bank ledger with
  // cheque activity (or a configured cheque book), bucketed by status. Mirrors
  // TallyPrime: Available Cheques | Unreconciled | Reconciled | Blank | Cancelled
  // | Out of Period | Total Cheques.
  getChequeRegisterBankWise: async (company_id, fy_id, from_date, to_date) => {
    try {
      const instruments = await fetchChequeInstruments(company_id, fy_id);
      const banks = await bankLedgersWithRanges(company_id);

      const byLedger = new Map(); // ledger_id -> { ledger_id, name, ranges, counts, usedByRange }
      for (const b of banks) {
        byLedger.set(b.ledger_id, {
          ledger_id: b.ledger_id,
          name: b.name,
          ranges: b.ranges,
          counts: emptyCounts(),
          usedByRange: new Map(),
        });
      }
      for (const it of instruments) {
        let g = byLedger.get(it.ledger_id);
        if (!g) {
          g = {
            ledger_id: it.ledger_id,
            name: it.ledger_name,
            ranges: [],
            counts: emptyCounts(),
            usedByRange: new Map(),
          };
          byLedger.set(it.ledger_id, g);
        }
        const bucket = bucketOf(it, from_date, to_date);
        g.counts[bucket] += 1;
        const rn = rangeOf(it.instrument_number, g.ranges);
        g.usedByRange.set(rn, (g.usedByRange.get(rn) || 0) + 1);
      }

      const rows = [];
      for (const g of byLedger.values()) {
        // Blank leaves = configured range capacity minus leaves already used in that range.
        let blank = 0;
        for (const r of g.ranges) {
          const cap = r.to - r.from + 1;
          const used = g.usedByRange.get(r.name || `${r.from}-${r.to}`) || 0;
          blank += Math.max(cap - used, 0);
        }
        g.counts.blank = blank;
        g.counts.available = blank;
        g.counts.total =
          g.counts.unreconciled +
          g.counts.reconciled +
          g.counts.cancelled +
          g.counts.out_of_period +
          blank;
        if (g.counts.total > 0)
          rows.push({ ledger_id: g.ledger_id, particulars: g.name, ...g.counts });
      }
      rows.sort((a, b) => a.particulars.localeCompare(b.particulars));

      const grand_total = rows.reduce((acc, r) => {
        for (const k of [
          'unreconciled',
          'reconciled',
          'cancelled',
          'out_of_period',
          'blank',
          'available',
          'total',
        ])
          acc[k] += r[k];
        return acc;
      }, emptyCounts());

      return { success: true, rows, grand_total };
    } catch (err) {
      console.error('Error in banking.getChequeRegisterBankWise:', err);
      return { success: false, error: err.message, rows: [] };
    }
  },

  // Cheque Register — Level 2: Cheque Range Register for one bank ledger. One row
  // per configured cheque range plus "Not in Range", same status columns.
  getChequeRegisterRanges: async (company_id, fy_id, ledger_id, from_date, to_date) => {
    try {
      const instruments = await fetchChequeInstruments(company_id, fy_id, ledger_id);
      const banks = await bankLedgersWithRanges(company_id);
      const bank = banks.find((b) => b.ledger_id === Number(ledger_id));
      const ranges = bank ? bank.ranges : [];

      const byRange = new Map(); // rangeName -> counts
      const ensure = (name) => {
        if (!byRange.has(name)) byRange.set(name, { range: name, ...emptyCounts() });
        return byRange.get(name);
      };
      // Seed configured ranges so empty-but-configured ranges still show their blank leaves.
      for (const r of ranges) ensure(r.name || `${r.from}-${r.to}`);

      const usedByRange = new Map();
      for (const it of instruments) {
        const rn = rangeOf(it.instrument_number, ranges);
        const c = ensure(rn);
        c[bucketOf(it, from_date, to_date)] += 1;
        usedByRange.set(rn, (usedByRange.get(rn) || 0) + 1);
      }

      for (const r of ranges) {
        const name = r.name || `${r.from}-${r.to}`;
        const cap = r.to - r.from + 1;
        const used = usedByRange.get(name) || 0;
        const blank = Math.max(cap - used, 0);
        const c = ensure(name);
        c.blank = blank;
        c.available = blank;
      }

      const rows = [];
      for (const c of byRange.values()) {
        c.total = c.unreconciled + c.reconciled + c.cancelled + c.out_of_period + c.blank;
        if (c.total > 0 || c.range !== NOT_IN_RANGE) rows.push(c);
      }
      // "Not in Range" last, configured ranges alphabetically.
      rows.sort((a, b) =>
        a.range === NOT_IN_RANGE
          ? 1
          : b.range === NOT_IN_RANGE
            ? -1
            : a.range.localeCompare(b.range),
      );

      const grand_total = rows.reduce((acc, r) => {
        for (const k of [
          'unreconciled',
          'reconciled',
          'cancelled',
          'out_of_period',
          'blank',
          'available',
          'total',
        ])
          acc[k] += r[k];
        return acc;
      }, emptyCounts());

      return {
        success: true,
        ledger_name: bank ? bank.name : await ledgerName(ledger_id),
        rows,
        grand_total,
      };
    } catch (err) {
      console.error('Error in banking.getChequeRegisterRanges:', err);
      return { success: false, error: err.message, rows: [] };
    }
  },

  // Cheque Register — Level 3: Instrument Wise list for one bank ledger, optionally
  // scoped to a cheque range and/or a status. Columns: Cheque No., Status, Date,
  // Particulars, Vch Type, Vch No., Inst. Date, Amount.
  getChequeRegisterInstruments: async (
    company_id,
    fy_id,
    ledger_id,
    range,
    from_date,
    to_date,
    status,
  ) => {
    try {
      const instruments = await fetchChequeInstruments(company_id, fy_id, ledger_id);
      const banks = await bankLedgersWithRanges(company_id);
      const bank = banks.find((b) => b.ledger_id === Number(ledger_id));
      const ranges = bank ? bank.ranges : [];

      const rows = [];
      for (const it of instruments) {
        if (range && rangeOf(it.instrument_number, ranges) !== range) continue;
        const bucket = bucketOf(it, from_date, to_date);
        if (status && bucket !== status) continue;
        rows.push({
          bank_detail_id: it.bank_detail_id,
          voucher_id: it.voucher_id,
          cheque_no: it.instrument_number || '',
          status: STATUS_LABEL[bucket] || 'Unreconciled',
          date: it.date,
          particulars: it.party_name || it.favouring_name || '',
          vch_type: it.voucher_type,
          vch_no: it.voucher_number || '',
          instrument_date: it.instrument_date || '',
          amount: Number(it.amount) || 0,
        });
      }

      const grand_total = rows.reduce((s, r) => s + r.amount, 0);
      return {
        success: true,
        ledger_name: bank ? bank.name : await ledgerName(ledger_id),
        range: range || 'All',
        rows,
        grand_total,
      };
    } catch (err) {
      console.error('Error in banking.getChequeRegisterInstruments:', err);
      return { success: false, error: err.message, rows: [] };
    }
  },

  // Mark cheques as printed / not printed (Space-select then print in Tally).
  markChequePrinted: async (bank_detail_ids, printed = true) => {
    try {
      const ids = Array.isArray(bank_detail_ids) ? bank_detail_ids : [bank_detail_ids];
      const clean = ids.map((n) => Number(n)).filter((n) => Number.isFinite(n));
      if (clean.length === 0) return { success: false, error: 'No cheques selected' };
      const flag = printed ? 1 : 0;
      await db.run(sql`
        UPDATE ${voucherBankDetails}
        SET cheque_printed = ${flag}
        WHERE bank_detail_id IN (${sql.join(
          clean.map((n) => sql`${n}`),
          sql`, `,
        )})
      `);
      return { success: true, updated: clean.length };
    } catch (err) {
      console.error('Error in banking.markChequePrinted:', err);
      return { success: false, error: err.message };
    }
  },
};
