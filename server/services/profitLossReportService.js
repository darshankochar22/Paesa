const { db } = require('../db/index');

module.exports = {
  create: async (data) => {
    try {
      const result = await db.execute(
        `INSERT INTO profit_loss_reports (
          company_id, report_name, report_date, period_start, period_end,
          format_type, compare_with_previous_period, comparison_period_start,
          comparison_period_end, basis_of_values, change_view, exception_report_enabled,
          saved_view_name, filter_enabled, filter_details, show_detail_view,
          show_condensed_view, show_percentage_of_sales, show_auto_column,
          show_profit, show_optional, show_post_dated, show_stat_adjustment, show_schedule_vi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.company_id,
          data.report_name || 'Profit & Loss A/c',
          data.report_date || new Date().toISOString().split('T')[0],
          data.period_start || null,
          data.period_end || null,
          data.format_type || 'Vertical',
          data.compare_with_previous_period ? 1 : 0,
          data.comparison_period_start || null,
          data.comparison_period_end || null,
          data.basis_of_values || 'Default',
          data.change_view || null,
          data.exception_report_enabled ? 1 : 0,
          data.saved_view_name || null,
          data.filter_enabled ? 1 : 0,
          data.filter_details || null,
          data.show_detail_view ? 1 : 0,
          data.show_condensed_view ? 1 : 0,
          data.show_percentage_of_sales ? 1 : 0,
          data.show_auto_column ? 1 : 0,
          data.show_profit ?? 1,
          data.show_optional ? 1 : 0,
          data.show_post_dated ? 1 : 0,
          data.show_stat_adjustment ? 1 : 0,
          data.show_schedule_vi ? 1 : 0,
        ]
      );

      const report_id = Number(result.lastInsertRowid);

      if (data.rows && data.rows.length > 0) {
        for (let i = 0; i < data.rows.length; i++) {
          const row = data.rows[i];
          await db.execute(
            `INSERT INTO profit_loss_views (
              report_id, company_id, report_date, section, group_name, parent_group_name,
              opening_balance, current_period_amount, closing_balance, display_order,
              is_total_row, is_gross_profit_row, is_drill_down_available
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              report_id, data.company_id,
              data.report_date || new Date().toISOString().split('T')[0],
              row.section || 'Income',
              row.group_name, row.parent_group_name || null,
              row.opening_balance || 0, row.current_period_amount || 0,
              row.closing_balance || 0, row.display_order || i + 1,
              row.is_total_row ? 1 : 0, row.is_gross_profit_row ? 1 : 0,
              row.is_drill_down_available ?? 1,
            ]
          );
        }
      }

      const report = await db.execute(
        `SELECT * FROM profit_loss_reports WHERE report_id = ?`, [report_id]
      );
      return { success: true, report: report.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM profit_loss_reports WHERE company_id = ? ORDER BY created_at DESC`,
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
        `SELECT * FROM profit_loss_reports WHERE report_id = ?`, [id]
      );
      if (report.rows.length === 0) return { success: false, error: 'Report not found' };

      const rows = await db.execute(
        `SELECT * FROM profit_loss_views WHERE report_id = ? ORDER BY display_order ASC`, [id]
      );

      const income      = rows.rows.filter(r => r.section === 'Income');
      const expenses    = rows.rows.filter(r => r.section === 'Expense');
      const grossProfit = rows.rows.filter(r => r.section === 'GrossProfit');
      const netProfit   = rows.rows.filter(r => r.section === 'NetProfit');

      return {
        success: true,
        report: { ...report.rows[0], income, expenses, grossProfit, netProfit },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM profit_loss_reports WHERE report_id = ?`, [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Report not found' };

      await db.execute(`DELETE FROM profit_loss_reports WHERE report_id = ?`, [id]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};