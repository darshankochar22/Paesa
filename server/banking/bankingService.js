// Bank reconciliation (BRS) service.
//
// Reconciliation matches a bank ledger's voucher_entries against the bank statement.
// The `reconciliations` table (schema in banking.js, created by db/index.js initDB) records,
// per reconciled entry, the bank_date / bank_reference. An entry is "reconciled" iff a
// reconciliations row references its entry_id.
//
// Drizzle ORM, mirroring the pattern in voucherService.js: db.all(sql`...`) for reads and
// INSERT ... RETURNING, db.run(sql`...`) for plain writes; tables imported from ../db/schema.

const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { reconciliations, voucherEntries, vouchers } = require('../db/schema');

// Signed amount for a bank ledger: Dr increases the bank balance, Cr decreases it.
const SIGNED_AMOUNT = sql`CASE WHEN e.type = 'Dr' THEN e.amount ELSE -e.amount END`;

module.exports = {
  // Bank entries for a ledger that have NOT been reconciled yet.
  getUnreconciled: async (company_id, fy_id, ledger_id) => {
    try {
      const rows = await db.all(sql`
        SELECT e.entry_id, e.voucher_id, e.ledger_id, e.ledger_name, e.type, e.amount, e.narration,
               v.voucher_number, v.date, v.voucher_type, v.party_name
        FROM ${voucherEntries} e
        JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        WHERE v.company_id = ${company_id}
          AND v.fy_id = ${fy_id}
          AND e.ledger_id = ${ledger_id}
          AND COALESCE(v.is_cancelled, 0) = 0
          AND e.entry_id NOT IN (SELECT entry_id FROM ${reconciliations})
        ORDER BY v.date ASC, e.entry_id ASC
      `);
      return rows;
    } catch (err) {
      console.error('Error in banking.getUnreconciled:', err);
      throw err;
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

      // Re-reconciling an entry replaces the prior record (no UNIQUE on entry_id).
      await db.run(sql`DELETE FROM ${reconciliations} WHERE entry_id = ${entry_id}`);
      const rows = await db.all(sql`
        INSERT INTO ${reconciliations}
          (entry_id, voucher_id, ledger_id, reconciled_date, bank_date, bank_reference)
        VALUES (${entry_id}, ${voucher_id}, ${ledger_id}, ${reconciled_date}, ${bank_date}, ${bank_reference})
        RETURNING *
      `);
      return { success: true, reconciliation: rows[0] };
    } catch (err) {
      console.error('Error in banking.reconcile:', err);
      return { success: false, error: err.message };
    }
  },

  // Remove a reconciliation. Accepts a reconciliation_id (number) or { reconciliation_id } / { entry_id }.
  unreconcile: async (idOrData) => {
    try {
      let reconciliationId = null;
      let entryId = null;
      if (idOrData && typeof idOrData === 'object') {
        reconciliationId = idOrData.reconciliation_id ?? null;
        entryId = idOrData.entry_id ?? null;
      } else {
        reconciliationId = idOrData ?? null;
      }
      if (reconciliationId == null && entryId == null) {
        return { success: false, error: 'reconciliation_id or entry_id is required' };
      }

      const res = reconciliationId != null
        ? await db.run(sql`DELETE FROM ${reconciliations} WHERE reconciliation_id = ${reconciliationId}`)
        : await db.run(sql`DELETE FROM ${reconciliations} WHERE entry_id = ${entryId}`);

      const removed = (res && (res.rowsAffected ?? res.changes)) || 0;
      return { success: true, removed };
    } catch (err) {
      console.error('Error in banking.unreconcile:', err);
      return { success: false, error: err.message };
    }
  },

  // All bank entries for a ledger (reconciled + unreconciled) with status, optionally date-bounded.
  getStatement: async (company_id, fy_id, ledger_id, from_date, to_date) => {
    try {
      const conds = [
        sql`v.company_id = ${company_id}`,
        sql`v.fy_id = ${fy_id}`,
        sql`e.ledger_id = ${ledger_id}`,
        sql`COALESCE(v.is_cancelled, 0) = 0`,
      ];
      if (from_date) conds.push(sql`v.date >= ${from_date}`);
      if (to_date) conds.push(sql`v.date <= ${to_date}`);

      const rows = await db.all(sql`
        SELECT e.entry_id, e.voucher_id, e.ledger_id, e.ledger_name, e.type, e.amount, e.narration,
               v.voucher_number, v.date, v.voucher_type, v.party_name,
               r.reconciliation_id, r.bank_date, r.bank_reference, r.reconciled_date,
               CASE WHEN r.reconciliation_id IS NOT NULL THEN 1 ELSE 0 END AS reconciled
        FROM ${voucherEntries} e
        JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        LEFT JOIN ${reconciliations} r ON r.entry_id = e.entry_id
        WHERE ${sql.join(conds, sql` AND `)}
        ORDER BY v.date ASC, e.entry_id ASC
      `);
      return rows;
    } catch (err) {
      console.error('Error in banking.getStatement:', err);
      throw err;
    }
  },

  // BRS summary: counts and signed balances split by reconciled status.
  getSummary: async (company_id, fy_id, ledger_id) => {
    try {
      const rows = await db.all(sql`
        SELECT
          COUNT(*) AS total_count,
          COALESCE(SUM(CASE WHEN r.reconciliation_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS reconciled_count,
          COALESCE(SUM(CASE WHEN r.reconciliation_id IS NULL THEN 1 ELSE 0 END), 0) AS unreconciled_count,
          COALESCE(SUM(CASE WHEN r.reconciliation_id IS NOT NULL THEN (${SIGNED_AMOUNT}) ELSE 0 END), 0) AS reconciled_balance,
          COALESCE(SUM(CASE WHEN r.reconciliation_id IS NULL THEN (${SIGNED_AMOUNT}) ELSE 0 END), 0) AS unreconciled_balance,
          COALESCE(SUM(${SIGNED_AMOUNT}), 0) AS book_balance
        FROM ${voucherEntries} e
        JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        LEFT JOIN ${reconciliations} r ON r.entry_id = e.entry_id
        WHERE v.company_id = ${company_id}
          AND v.fy_id = ${fy_id}
          AND e.ledger_id = ${ledger_id}
          AND COALESCE(v.is_cancelled, 0) = 0
      `);
      return rows[0];
    } catch (err) {
      console.error('Error in banking.getSummary:', err);
      throw err;
    }
  },
};
