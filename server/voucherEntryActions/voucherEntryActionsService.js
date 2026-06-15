// ---------------------------------------------------------------------------
// Drizzle ORM conversion — follows the GOLDEN EXEMPLAR (currencyService.js).
//
//   * MUTATIONS use the query builder: db.insert(...).values(...),
//     db.delete(...).where(...), with eq()/and()/sql`` predicates.
//   * READS THAT RETURN ROWS TO CALLERS use db.all(sql`SELECT * FROM ${table}
//     WHERE ...`) to preserve the EXACT legacy snake_case row shape that the
//     controllers / test oracle assert against (and which parseAction below
//     post-processes by snake_case key).
//   * New-row id after INSERT comes from .returning({ id: table.pkCol }).
//   * Dynamic optional filters are appended with sql.join (still parameterized
//     Drizzle), mirroring the original string-concatenated WHERE builder.
// ---------------------------------------------------------------------------
const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { voucherEntryActions } = require('../db/schema');

const serialize = (v) => (v != null && typeof v === 'object' ? JSON.stringify(v) : v ?? null);
const nullify   = (v) => (v === undefined ? null : v ?? null);

// Fetch a single action row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${voucherEntryActions} WHERE ${whereSql}`);
  return rows[0];
};

module.exports = {
  create: async (data) => {
    try {
      const inserted = await db
        .insert(voucherEntryActions)
        .values({
          companyId: data.company_id,
          voucherId: nullify(data.voucher_id),
          actionType: data.action_type,
          actionData: serialize(data.action_data),
          autofillLedgerId: nullify(data.autofill_ledger_id),
          autofillAmount: nullify(data.autofill_amount),
          autofillNarration: nullify(data.autofill_narration),
          previousMode: nullify(data.previous_mode),
          newMode: nullify(data.new_mode),
          additionalDetails: serialize(data.additional_details),
          relatedReportType: nullify(data.related_report_type),
          relatedReportId: nullify(data.related_report_id),
          isOptional: data.is_optional ? 1 : 0,
          optionalReason: nullify(data.optional_reason),
          performedBy: nullify(data.performed_by),
          performedAt: data.performed_at || new Date().toISOString(),
        })
        .returning({ id: voucherEntryActions.actionId });

      const action = await findRow(sql`${voucherEntryActions.actionId} = ${inserted[0].id}`);
      return { success: true, action: parseAction(action) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${voucherEntryActions}
            WHERE ${voucherEntryActions.companyId} = ${company_id}
            ORDER BY ${voucherEntryActions.performedAt} DESC`
      );
      return { success: true, actions: rows.map(parseAction) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByVoucher: async (voucher_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${voucherEntryActions}
            WHERE ${voucherEntryActions.voucherId} = ${voucher_id}
            ORDER BY ${voucherEntryActions.performedAt} ASC`
      );
      return { success: true, actions: rows.map(parseAction) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByCompany: async (company_id, { from_date, to_date, action_type, limit = 200 } = {}) => {
    try {
      const conditions = [sql`${voucherEntryActions.companyId} = ${company_id}`];

      if (from_date)   conditions.push(sql`${voucherEntryActions.performedAt} >= ${from_date}`);
      if (to_date)     conditions.push(sql`${voucherEntryActions.performedAt} <= ${to_date}`);
      if (action_type) conditions.push(sql`${voucherEntryActions.actionType} = ${action_type}`);

      const rows = await db.all(
        sql`SELECT * FROM ${voucherEntryActions}
            WHERE ${sql.join(conditions, sql` AND `)}
            ORDER BY ${voucherEntryActions.performedAt} DESC
            LIMIT ${limit}`
      );
      return { success: true, actions: rows.map(parseAction) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${voucherEntryActions.actionId} = ${id}`);
      if (!existing) return { success: false, error: 'Action not found' };

      await db
        .delete(voucherEntryActions)
        .where(eq(voucherEntryActions.actionId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};

// Parse JSON fields back to objects on read
function parseAction(row) {
  if (!row) return row;
  return {
    ...row,
    action_data:        tryParse(row.action_data),
    additional_details: tryParse(row.additional_details),
  };
}

function tryParse(v) {
  if (v == null || typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
}
