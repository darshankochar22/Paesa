const { db } = require('../db/index');

module.exports = {
  create: async (data) => {
    try {
      const result = await db.execute(
        `INSERT INTO balance_sheet_reports (
          company_id, report_name, report_date, comparison_period_start, comparison_period_end,
          format_type, method_of_showing, show_vertical_balance_sheet, show_working_capital_figures,
          profit_or_loss_as_liability, show_detail_view, show_condensed_view, show_schedule_vi,
          include_closing_stock, compare_quarterly, basis_of_values, change_view,
          exception_reports_enabled, filter_enabled, saved_view_name, filter_details,
          show_profit, show_columnar, show_optional, show_post_dated, show_stat_adjustment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.company_id,
          data.report_name || 'Balance Sheet',
          data.report_date || new Date().toISOString().split('T')[0],
          data.comparison_period_start || null,
          data.comparison_period_end || null,
          data.format_type || 'Vertical',
          data.method_of_showing || 'Net Balance',
          data.show_vertical_balance_sheet ?? 1,
          data.show_working_capital_figures ? 1 : 0,
          data.profit_or_loss_as_liability ?? 1,
          data.show_detail_view ? 1 : 0,
          data.show_condensed_view ? 1 : 0,
          data.show_schedule_vi ? 1 : 0,
          data.include_closing_stock ?? 1,
          data.compare_quarterly ? 1 : 0,
          data.basis_of_values || 'Default',
          data.change_view || null,
          data.exception_reports_enabled ? 1 : 0,
          data.filter_enabled ? 1 : 0,
          data.saved_view_name || null,
          data.filter_details || null,
          data.show_profit ?? 1,
          data.show_columnar ? 1 : 0,
          data.show_optional ? 1 : 0,
          data.show_post_dated ? 1 : 0,
          data.show_stat_adjustment ? 1 : 0,
        ]
      );

      const report_id = Number(result.lastInsertRowid);

      if (data.rows && data.rows.length > 0) {
        for (let i = 0; i < data.rows.length; i++) {
          const row = data.rows[i];
          await db.execute(
            `INSERT INTO balance_sheet_views (
              report_id, company_id, report_date, group_name, parent_group_name,
              opening_balance, side, current_period_debit, current_period_credit,
              closing_balance, display_order, is_total_row, is_drill_down_available
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              report_id,
              data.company_id,
              data.report_date || new Date().toISOString().split('T')[0],
              row.group_name,
              row.parent_group_name || null,
              row.opening_balance || 0,
              row.side || 'Assets',
              row.current_period_debit || 0,
              row.current_period_credit || 0,
              row.closing_balance || 0,
              row.display_order || i + 1,
              row.is_total_row ? 1 : 0,
              row.is_drill_down_available ?? 1,
            ]
          );
        }
      }

      const report = await db.execute(
        `SELECT * FROM balance_sheet_reports WHERE report_id = ?`,
        [report_id]
      );
      return { success: true, report: report.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM balance_sheet_reports WHERE company_id = ? ORDER BY created_at DESC`,
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
        `SELECT * FROM balance_sheet_reports WHERE report_id = ?`,
        [id]
      );
      if (report.rows.length === 0) return { success: false, error: 'Report not found' };

      const rows = await db.execute(
        `SELECT * FROM balance_sheet_views WHERE report_id = ? ORDER BY display_order ASC`,
        [id]
      );

      const assets      = rows.rows.filter(r => r.side === 'Assets');
      const liabilities = rows.rows.filter(r => r.side === 'Liabilities');

      return {
        success: true,
        report: { ...report.rows[0], assets, liabilities },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM balance_sheet_reports WHERE report_id = ?`,
        [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Report not found' };

      await db.execute(
        `DELETE FROM balance_sheet_reports WHERE report_id = ?`,
        [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};