const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { profitLossReports, profitLossViews } = require('../db/schema');

module.exports = {
  create: async (data) => {
    try {
      const inserted = await db
        .insert(profitLossReports)
        .values({
          companyId: data.company_id,
          reportName: data.report_name || 'Profit & Loss A/c',
          reportDate: data.report_date || new Date().toISOString().split('T')[0],
          periodStart: data.period_start || null,
          periodEnd: data.period_end || null,
          formatType: data.format_type || 'Vertical',
          compareWithPreviousPeriod: data.compare_with_previous_period ? 1 : 0,
          comparisonPeriodStart: data.comparison_period_start || null,
          comparisonPeriodEnd: data.comparison_period_end || null,
          basisOfValues: data.basis_of_values || 'Default',
          changeView: data.change_view || null,
          exceptionReportEnabled: data.exception_report_enabled ? 1 : 0,
          savedViewName: data.saved_view_name || null,
          filterEnabled: data.filter_enabled ? 1 : 0,
          filterDetails: data.filter_details || null,
          showDetailView: data.show_detail_view ? 1 : 0,
          showCondensedView: data.show_condensed_view ? 1 : 0,
          showPercentageOfSales: data.show_percentage_of_sales ? 1 : 0,
          showAutoColumn: data.show_auto_column ? 1 : 0,
          showProfit: data.show_profit ?? 1,
          showOptional: data.show_optional ? 1 : 0,
          showPostDated: data.show_post_dated ? 1 : 0,
          showStatAdjustment: data.show_stat_adjustment ? 1 : 0,
          showScheduleVi: data.show_schedule_vi ? 1 : 0,
        })
        .returning({ id: profitLossReports.reportId });

      const report_id = Number(inserted[0].id);

      if (data.rows && data.rows.length > 0) {
        for (let i = 0; i < data.rows.length; i++) {
          const row = data.rows[i];
          await db
            .insert(profitLossViews)
            .values({
              reportId: report_id,
              companyId: data.company_id,
              reportDate: data.report_date || new Date().toISOString().split('T')[0],
              section: row.section || 'Income',
              groupName: row.group_name,
              parentGroupName: row.parent_group_name || null,
              openingBalance: row.opening_balance || 0,
              currentPeriodAmount: row.current_period_amount || 0,
              closingBalance: row.closing_balance || 0,
              displayOrder: row.display_order || i + 1,
              isTotalRow: row.is_total_row ? 1 : 0,
              isGrossProfitRow: row.is_gross_profit_row ? 1 : 0,
              isDrillDownAvailable: row.is_drill_down_available ?? 1,
            });
        }
      }

      const report = await db.all(
        sql`SELECT * FROM ${profitLossReports} WHERE ${profitLossReports.reportId} = ${report_id}`
      );
      return { success: true, report: report[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const reports = await db.all(
        sql`SELECT * FROM ${profitLossReports}
            WHERE ${profitLossReports.companyId} = ${company_id}
            ORDER BY ${profitLossReports.createdAt} DESC`
      );
      return { success: true, reports };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const report = await db.all(
        sql`SELECT * FROM ${profitLossReports} WHERE ${profitLossReports.reportId} = ${id}`
      );
      if (report.length === 0) return { success: false, error: 'Report not found' };

      const rows = await db.all(
        sql`SELECT * FROM ${profitLossViews}
            WHERE ${profitLossViews.reportId} = ${id}
            ORDER BY ${profitLossViews.displayOrder} ASC`
      );

      const income      = rows.filter(r => r.section === 'Income');
      const expenses    = rows.filter(r => r.section === 'Expense');
      const grossProfit = rows.filter(r => r.section === 'GrossProfit');
      const netProfit   = rows.filter(r => r.section === 'NetProfit');

      return {
        success: true,
        report: { ...report[0], income, expenses, grossProfit, netProfit },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.all(
        sql`SELECT * FROM ${profitLossReports} WHERE ${profitLossReports.reportId} = ${id}`
      );
      if (existing.length === 0) return { success: false, error: 'Report not found' };

      await db.delete(profitLossReports).where(eq(profitLossReports.reportId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
