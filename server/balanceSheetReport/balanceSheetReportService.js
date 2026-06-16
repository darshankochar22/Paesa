const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { balanceSheetReports, balanceSheetViews } = require('../db/schema');

module.exports = {
  create: async (data) => {
    try {
      const report_date =
        data.report_date || new Date().toISOString().split('T')[0];

      const inserted = await db
        .insert(balanceSheetReports)
        .values({
          companyId: data.company_id,
          reportName: data.report_name || 'Balance Sheet',
          reportDate: report_date,
          comparisonPeriodStart: data.comparison_period_start || null,
          comparisonPeriodEnd: data.comparison_period_end || null,
          formatType: data.format_type || 'Vertical',
          methodOfShowing: data.method_of_showing || 'Net Balance',
          showVerticalBalanceSheet: data.show_vertical_balance_sheet ?? 1,
          showWorkingCapitalFigures: data.show_working_capital_figures ? 1 : 0,
          profitOrLossAsLiability: data.profit_or_loss_as_liability ?? 1,
          showDetailView: data.show_detail_view ? 1 : 0,
          showCondensedView: data.show_condensed_view ? 1 : 0,
          showScheduleVi: data.show_schedule_vi ? 1 : 0,
          includeClosingStock: data.include_closing_stock ?? 1,
          compareQuarterly: data.compare_quarterly ? 1 : 0,
          basisOfValues: data.basis_of_values || 'Default',
          changeView: data.change_view || null,
          exceptionReportsEnabled: data.exception_reports_enabled ? 1 : 0,
          filterEnabled: data.filter_enabled ? 1 : 0,
          savedViewName: data.saved_view_name || null,
          filterDetails: data.filter_details || null,
          showProfit: data.show_profit ?? 1,
          showColumnar: data.show_columnar ? 1 : 0,
          showOptional: data.show_optional ? 1 : 0,
          showPostDated: data.show_post_dated ? 1 : 0,
          showStatAdjustment: data.show_stat_adjustment ? 1 : 0,
        })
        .returning({ id: balanceSheetReports.reportId });

      const report_id = Number(inserted[0].id);

      if (data.rows && data.rows.length > 0) {
        for (let i = 0; i < data.rows.length; i++) {
          const row = data.rows[i];
          await db.insert(balanceSheetViews).values({
            reportId: report_id,
            companyId: data.company_id,
            reportDate: report_date,
            groupName: row.group_name,
            parentGroupName: row.parent_group_name || null,
            openingBalance: row.opening_balance || 0,
            side: row.side || 'Assets',
            currentPeriodDebit: row.current_period_debit || 0,
            currentPeriodCredit: row.current_period_credit || 0,
            closingBalance: row.closing_balance || 0,
            displayOrder: row.display_order || i + 1,
            isTotalRow: row.is_total_row ? 1 : 0,
            isDrillDownAvailable: row.is_drill_down_available ?? 1,
          });
        }
      }

      const report = await db.all(
        sql`SELECT * FROM ${balanceSheetReports} WHERE ${balanceSheetReports.reportId} = ${report_id}`
      );
      return { success: true, report: report[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const reports = await db.all(
        sql`SELECT * FROM ${balanceSheetReports}
            WHERE ${balanceSheetReports.companyId} = ${company_id}
            ORDER BY ${balanceSheetReports.createdAt} DESC`
      );
      return { success: true, reports };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const report = await db.all(
        sql`SELECT * FROM ${balanceSheetReports} WHERE ${balanceSheetReports.reportId} = ${id}`
      );
      if (report.length === 0) return { success: false, error: 'Report not found' };

      const rows = await db.all(
        sql`SELECT * FROM ${balanceSheetViews}
            WHERE ${balanceSheetViews.reportId} = ${id}
            ORDER BY ${balanceSheetViews.displayOrder} ASC`
      );

      const assets      = rows.filter(r => r.side === 'Assets');
      const liabilities = rows.filter(r => r.side === 'Liabilities');

      return {
        success: true,
        report: { ...report[0], assets, liabilities },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.all(
        sql`SELECT * FROM ${balanceSheetReports} WHERE ${balanceSheetReports.reportId} = ${id}`
      );
      if (existing.length === 0) return { success: false, error: 'Report not found' };

      await db.delete(balanceSheetReports).where(eq(balanceSheetReports.reportId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
