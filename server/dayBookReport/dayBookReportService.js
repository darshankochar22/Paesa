const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { dayBookReports, dayBookEntries, dayBookEntryLines } = require('../db/schema');

module.exports = {
  create: async (data) => {
    try {
      const insertedReport = await db
        .insert(dayBookReports)
        .values({
          companyId: data.company_id,
          reportName: data.report_name || 'Day Book',
          dateFrom: data.date_from,
          dateTo: data.date_to,
          selectedCompanyId: data.selected_company_id || data.company_id,
          basisOfValues: data.basis_of_values || 'Default',
          changeView: data.change_view || null,
          exceptionReportsEnabled: data.exception_reports_enabled ? 1 : 0,
          savedViewName: data.saved_view_name || null,
          filterEnabled: data.filter_enabled ? 1 : 0,
          filterDetails: data.filter_details || null,
          showProfit: data.show_profit ? 1 : 0,
          showColumnar: data.show_columnar ? 1 : 0,
          showOptional: data.show_optional ? 1 : 0,
          showPostDated: data.show_post_dated ? 1 : 0,
          showStatAdjustment: data.show_stat_adjustment ? 1 : 0,
          showDetails: data.show_details ?? 1,
          showRelatedReports: data.show_related_reports ? 1 : 0,
        })
        .returning({ id: dayBookReports.reportId });

      const report_id = Number(insertedReport[0].id);

      if (data.entries && data.entries.length > 0) {
        for (let i = 0; i < data.entries.length; i++) {
          const entry = data.entries[i];

          const insertedEntry = await db
            .insert(dayBookEntries)
            .values({
              reportId: report_id,
              companyId: data.company_id,
              voucherId: entry.voucher_id || null,
              voucherDate: entry.voucher_date,
              particulars: entry.particulars || null,
              voucherType: entry.voucher_type,
              voucherNumber: entry.voucher_number,
              debitAmount: entry.debit_amount || 0,
              creditAmount: entry.credit_amount || 0,
              narration: entry.narration || null,
              partyLedgerName: entry.party_ledger_name || null,
              showProfit: entry.show_profit ? 1 : 0,
              isOptional: entry.is_optional ? 1 : 0,
              isPostDated: entry.is_post_dated ? 1 : 0,
              isStatAdjustment: entry.is_stat_adjustment ? 1 : 0,
              grossProfit: entry.gross_profit || 0,
              cost: entry.cost || 0,
              displayOrder: entry.display_order || i + 1,
              isDrillable: entry.is_drillable ?? 1,
              notes: entry.notes || null,
            })
            .returning({ id: dayBookEntries.entryId });

          const entry_id = Number(insertedEntry[0].id);

          if (entry.lines && entry.lines.length > 0) {
            for (let j = 0; j < entry.lines.length; j++) {
              const line = entry.lines[j];
              await db.insert(dayBookEntryLines).values({
                entryId: entry_id,
                ledgerId: line.ledger_id || null,
                particulars: line.particulars || null,
                debitAmount: line.debit_amount || 0,
                creditAmount: line.credit_amount || 0,
                lineOrder: line.line_order || j + 1,
                notes: line.notes || null,
              });
            }
          }
        }
      }

      const report = await db.all(
        sql`SELECT * FROM ${dayBookReports} WHERE ${dayBookReports.reportId} = ${report_id}`
      );
      return { success: true, report: report[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const reports = await db.all(
        sql`SELECT * FROM ${dayBookReports}
            WHERE ${dayBookReports.companyId} = ${company_id}
            ORDER BY ${dayBookReports.createdAt} DESC`
      );
      return { success: true, reports };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const report = await db.all(
        sql`SELECT * FROM ${dayBookReports} WHERE ${dayBookReports.reportId} = ${id}`
      );
      if (report.length === 0) return { success: false, error: 'Report not found' };

      const entries = await db.all(
        sql`SELECT * FROM ${dayBookEntries}
            WHERE ${dayBookEntries.reportId} = ${id}
            ORDER BY ${dayBookEntries.displayOrder} ASC`
      );

      const entriesWithLines = await Promise.all(
        entries.map(async (entry) => {
          const lines = await db.all(
            sql`SELECT * FROM ${dayBookEntryLines}
                WHERE ${dayBookEntryLines.entryId} = ${entry.entry_id}
                ORDER BY ${dayBookEntryLines.lineOrder} ASC`
          );
          return { ...entry, lines };
        })
      );

      const totalDebit  = entriesWithLines.reduce((s, e) => s + e.debit_amount, 0);
      const totalCredit = entriesWithLines.reduce((s, e) => s + e.credit_amount, 0);

      return {
        success: true,
        report: {
          ...report[0],
          entries: entriesWithLines,
          totalDebit,
          totalCredit,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.all(
        sql`SELECT * FROM ${dayBookReports} WHERE ${dayBookReports.reportId} = ${id}`
      );
      if (existing.length === 0) return { success: false, error: 'Report not found' };

      await db.delete(dayBookReports).where(eq(dayBookReports.reportId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
