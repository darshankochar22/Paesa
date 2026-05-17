const { db } = require('../db/index');

module.exports = {
  create: async (data) => {
    try {
      const result = await db.execute(
        `INSERT INTO day_book_reports (
          company_id, report_name, date_from, date_to, selected_company_id,
          basis_of_values, change_view, exception_reports_enabled, saved_view_name,
          filter_enabled, filter_details, show_profit, show_columnar, show_optional,
          show_post_dated, show_stat_adjustment, show_details, show_related_reports
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.company_id,
          data.report_name || 'Day Book',
          data.date_from,
          data.date_to,
          data.selected_company_id || data.company_id,
          data.basis_of_values || 'Default',
          data.change_view || null,
          data.exception_reports_enabled ? 1 : 0,
          data.saved_view_name || null,
          data.filter_enabled ? 1 : 0,
          data.filter_details || null,
          data.show_profit ? 1 : 0,
          data.show_columnar ? 1 : 0,
          data.show_optional ? 1 : 0,
          data.show_post_dated ? 1 : 0,
          data.show_stat_adjustment ? 1 : 0,
          data.show_details ?? 1,
          data.show_related_reports ? 1 : 0,
        ]
      );

      const report_id = Number(result.lastInsertRowid);

      if (data.entries && data.entries.length > 0) {
        for (let i = 0; i < data.entries.length; i++) {
          const entry = data.entries[i];

          const entryResult = await db.execute(
            `INSERT INTO day_book_entries (
              report_id, company_id, voucher_id, voucher_date, particulars,
              voucher_type, voucher_number, debit_amount, credit_amount,
              narration, party_ledger_name, show_profit, is_optional,
              is_post_dated, is_stat_adjustment, gross_profit, cost,
              display_order, is_drillable, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              report_id,
              data.company_id,
              entry.voucher_id || null,
              entry.voucher_date,
              entry.particulars || null,
              entry.voucher_type,
              entry.voucher_number,
              entry.debit_amount || 0,
              entry.credit_amount || 0,
              entry.narration || null,
              entry.party_ledger_name || null,
              entry.show_profit ? 1 : 0,
              entry.is_optional ? 1 : 0,
              entry.is_post_dated ? 1 : 0,
              entry.is_stat_adjustment ? 1 : 0,
              entry.gross_profit || 0,
              entry.cost || 0,
              entry.display_order || i + 1,
              entry.is_drillable ?? 1,
              entry.notes || null,
            ]
          );

          const entry_id = Number(entryResult.lastInsertRowid);

          if (entry.lines && entry.lines.length > 0) {
            for (let j = 0; j < entry.lines.length; j++) {
              const line = entry.lines[j];
              await db.execute(
                `INSERT INTO day_book_entry_lines (
                  entry_id, ledger_id, particulars, debit_amount, credit_amount, line_order, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  entry_id,
                  line.ledger_id || null,
                  line.particulars || null,
                  line.debit_amount || 0,
                  line.credit_amount || 0,
                  line.line_order || j + 1,
                  line.notes || null,
                ]
              );
            }
          }
        }
      }

      const report = await db.execute(
        `SELECT * FROM day_book_reports WHERE report_id = ?`,
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
        `SELECT * FROM day_book_reports WHERE company_id = ? ORDER BY created_at DESC`,
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
        `SELECT * FROM day_book_reports WHERE report_id = ?`,
        [id]
      );
      if (report.rows.length === 0) return { success: false, error: 'Report not found' };

      const entries = await db.execute(
        `SELECT * FROM day_book_entries WHERE report_id = ? ORDER BY display_order ASC`,
        [id]
      );

      const entriesWithLines = await Promise.all(
        entries.rows.map(async (entry) => {
          const lines = await db.execute(
            `SELECT * FROM day_book_entry_lines WHERE entry_id = ? ORDER BY line_order ASC`,
            [entry.entry_id]
          );
          return { ...entry, lines: lines.rows };
        })
      );

      const totalDebit  = entriesWithLines.reduce((s, e) => s + e.debit_amount, 0);
      const totalCredit = entriesWithLines.reduce((s, e) => s + e.credit_amount, 0);

      return {
        success: true,
        report: {
          ...report.rows[0],
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
      const existing = await db.execute(
        `SELECT * FROM day_book_reports WHERE report_id = ?`,
        [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Report not found' };

      await db.execute(`DELETE FROM day_book_reports WHERE report_id = ?`, [id]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};