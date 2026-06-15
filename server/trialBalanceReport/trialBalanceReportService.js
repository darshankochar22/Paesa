const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { trialBalanceReports, trialBalanceRows } = require('../db/schema');

module.exports = {
  create: async (data) => {
    try {
      const inserted = await db
        .insert(trialBalanceReports)
        .values({
          companyId: data.company_id,
          companyName: data.company_name || null,
          reportDate: data.report_date || new Date().toISOString().split('T')[0],
          periodStart: data.period_start || null,
          periodEnd: data.period_end || null,
          showClosingBalance: data.show_closing_balance ?? 1,
          showDebitCredit: data.show_debit_credit ?? 1,
          showGroups: data.show_groups ?? 1,
          showGrandTotal: data.show_grand_total ?? 1,
          detailedMode: data.detailed_mode ? 1 : 0,
        })
        .returning({ id: trialBalanceReports.reportId });

      const report_id = Number(inserted[0].id);

      if (data.rows && data.rows.length > 0) {
        for (let i = 0; i < data.rows.length; i++) {
          const row = data.rows[i];
          await db
            .insert(trialBalanceRows)
            .values({
              reportId: report_id,
              parentRowId: row.parent_row_id || null,
              rowType: row.row_type || 'Ledger',
              particulars: row.particulars,
              groupId: row.group_id || null,
              ledgerId: row.ledger_id || null,
              displayOrder: row.display_order || i + 1,
              openingDebit: row.opening_debit || 0,
              openingCredit: row.opening_credit || 0,
              periodDebit: row.period_debit || 0,
              periodCredit: row.period_credit || 0,
              closingDebit: row.closing_debit || 0,
              closingCredit: row.closing_credit || 0,
              isDrillable: row.is_drillable ?? 1,
              isGrandTotal: row.is_grand_total ? 1 : 0,
              notes: row.notes || null,
            });
        }
      }

      const report = await db.all(
        sql`SELECT * FROM ${trialBalanceReports} WHERE ${trialBalanceReports.reportId} = ${report_id}`
      );
      return { success: true, report: report[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const reports = await db.all(
        sql`SELECT * FROM ${trialBalanceReports}
            WHERE ${trialBalanceReports.companyId} = ${company_id}
            ORDER BY ${trialBalanceReports.createdAt} DESC`
      );
      return { success: true, reports };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const report = await db.all(
        sql`SELECT * FROM ${trialBalanceReports} WHERE ${trialBalanceReports.reportId} = ${id}`
      );
      if (report.length === 0) return { success: false, error: 'Report not found' };

      const rows = await db.all(
        sql`SELECT * FROM ${trialBalanceRows}
            WHERE ${trialBalanceRows.reportId} = ${id}
            ORDER BY ${trialBalanceRows.displayOrder} ASC`
      );

      return { success: true, report: { ...report[0], rows } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.all(
        sql`SELECT * FROM ${trialBalanceReports} WHERE ${trialBalanceReports.reportId} = ${id}`
      );
      if (existing.length === 0) return { success: false, error: 'Report not found' };

      await db.delete(trialBalanceReports).where(eq(trialBalanceReports.reportId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
