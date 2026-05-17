const { db } = require('../db/index');

module.exports = {
  create: async (data) => {
    try {
      const result = await db.execute(
        `INSERT INTO trial_balance_reports (
          company_id, company_name, report_date, period_start, period_end,
          show_closing_balance, show_debit_credit, show_groups, show_grand_total, detailed_mode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.company_id,
          data.company_name || null,
          data.report_date || new Date().toISOString().split('T')[0],
          data.period_start || null,
          data.period_end || null,
          data.show_closing_balance ?? 1,
          data.show_debit_credit ?? 1,
          data.show_groups ?? 1,
          data.show_grand_total ?? 1,
          data.detailed_mode ? 1 : 0,
        ]
      );

      const report_id = Number(result.lastInsertRowid);

      if (data.rows && data.rows.length > 0) {
        for (let i = 0; i < data.rows.length; i++) {
          const row = data.rows[i];
          await db.execute(
            `INSERT INTO trial_balance_rows (
              report_id, parent_row_id, row_type, particulars, group_id, ledger_id,
              display_order, opening_debit, opening_credit, period_debit, period_credit,
              closing_debit, closing_credit, is_drillable, is_grand_total, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              report_id,
              row.parent_row_id || null,
              row.row_type || 'Ledger',
              row.particulars,
              row.group_id || null,
              row.ledger_id || null,
              row.display_order || i + 1,
              row.opening_debit || 0,
              row.opening_credit || 0,
              row.period_debit || 0,
              row.period_credit || 0,
              row.closing_debit || 0,
              row.closing_credit || 0,
              row.is_drillable ?? 1,
              row.is_grand_total ? 1 : 0,
              row.notes || null,
            ]
          );
        }
      }

      const report = await db.execute(
        `SELECT * FROM trial_balance_reports WHERE report_id = ?`, [report_id]
      );
      return { success: true, report: report.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM trial_balance_reports WHERE company_id = ? ORDER BY created_at DESC`,
        [company_id]
      );
      return { success: true, reports: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const report = await db.execute(
        `SELECT * FROM trial_balance_reports WHERE report_id = ?`, [id]
      );
      if (report.rows.length === 0) return { success: false, error: 'Report not found' };

      const rows = await db.execute(
        `SELECT * FROM trial_balance_rows WHERE report_id = ? ORDER BY display_order ASC`, [id]
      );

      return { success: true, report: { ...report.rows[0], rows: rows.rows } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM trial_balance_reports WHERE report_id = ?`, [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Report not found' };

      await db.execute(`DELETE FROM trial_balance_reports WHERE report_id = ?`, [id]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};