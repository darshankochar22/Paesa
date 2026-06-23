const { db, rawDb } = require('../db/index');
const { eq } = require('drizzle-orm');

const { cashFlowReports, cashFlowViews } = require('../db/schema/sqlite/cashFlowReport');

module.exports = {
  calculateCashFlow: async (company_id, fy_id, from_date, to_date) => {
    try {
      const result = await rawDb.execute({
        sql: `
          SELECT
            v.date           AS voucher_date,
            v.voucher_type,
            ve.amount,
            ve.type          AS line_type,
            ve.ledger_name,
            l.group_id,
            g.name
          FROM vouchers v
          JOIN voucher_entries ve ON v.voucher_id = ve.voucher_id
          LEFT JOIN ledgers l ON ve.ledger_id = l.ledger_id
          LEFT JOIN "groups" g ON l.group_id = g.group_id
          WHERE v.company_id = ?
            AND v.fy_id = ?
            AND v.date BETWEEN ? AND ?
            AND v.is_cancelled = 0
        `,
        args: [company_id, fy_id, from_date, to_date],
      });

      const logs = result.rows ?? result;

      const monthNames = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];
      const monthsMap = {};
      monthNames.forEach((m, idx) => {
        monthsMap[m] = { month_name: m, inflow: 0, outflow: 0, nett_flow: 0, display_order: idx + 1 };
      });

      const groupInflows = {};
      const groupOutflows = {};

      logs.forEach(row => {
        if (!row.voucher_date) return;
        const dateObj = new Date(row.voucher_date);
        const rawMonth = dateObj.toLocaleString('default', { month: 'long' });

        if (!monthsMap[rawMonth]) return;
        const amt = parseFloat(row.amount) || 0;

        // Dr entries = money coming in (inflow), Cr entries = money going out (outflow)
        if (row.line_type === 'Dr') {
          monthsMap[rawMonth].inflow += amt;
          if (row.group_id) {
            if (!groupInflows[row.group_id]) {
              groupInflows[row.group_id] = { group_id: row.group_id, group_name: row.name, balance: 0 };
            }
            groupInflows[row.group_id].balance += amt;
          }
        } else if (row.line_type === 'Cr') {
          monthsMap[rawMonth].outflow += amt;
          if (row.group_id) {
            if (!groupOutflows[row.group_id]) {
              groupOutflows[row.group_id] = { group_id: row.group_id, group_name: row.name, balance: 0 };
            }
            groupOutflows[row.group_id].balance += amt;
          }
        }

        monthsMap[rawMonth].nett_flow = monthsMap[rawMonth].inflow - monthsMap[rawMonth].outflow;
      });

      const months = Object.values(monthsMap);
      const grandTotal = {
        inflow: months.reduce((acc, curr) => acc + curr.inflow, 0),
        outflow: months.reduce((acc, curr) => acc + curr.outflow, 0),
        nett_flow: 0,
      };
      grandTotal.nett_flow = grandTotal.inflow - grandTotal.outflow;

      return {
        success: true,
        months,
        summary: {
          inflows: Object.values(groupInflows),
          outflows: Object.values(groupOutflows),
        },
        grandTotal,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  create: async (data) => {
    try {
      const start_date = data.start_date || new Date().toISOString().split('T')[0];
      const end_date = data.end_date || new Date().toISOString().split('T')[0];

      const inserted = await db
        .insert(cashFlowReports)
        .values({
          companyId: Number(data.company_id),
          reportName: data.report_name || 'Cash Flow',
          startDate: start_date,
          endDate: end_date,
          grandTotalInflow: data.grand_total_inflow || 0,
          grandTotalOutflow: data.grand_total_outflow || 0,
          grandTotalNett: data.grand_total_nett || 0,
        })
        .returning({ id: cashFlowReports.reportId });

      const report_id = Number(inserted[0].id);

      if (data.rows && data.rows.length > 0) {
        for (let i = 0; i < data.rows.length; i++) {
          const row = data.rows[i];
          await db.insert(cashFlowViews).values({
            reportId: report_id,
            companyId: Number(data.company_id),
            monthName: row.month_name,
            inflow: row.inflow || 0,
            outflow: row.outflow || 0,
            nettFlow: row.nett_flow || 0,
            displayOrder: row.display_order || i + 1,
          });
        }
      }

      return { success: true, report: { id: report_id } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await rawDb.execute({
        sql: `SELECT * FROM cash_flow_reports WHERE company_id = ? ORDER BY created_at DESC`,
        args: [company_id],
      });
      const reports = result.rows ?? result;
      return { success: true, reports };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const reportResult = await rawDb.execute({
        sql: `SELECT * FROM cash_flow_reports WHERE report_id = ?`,
        args: [id],
      });
      const report = reportResult.rows ?? reportResult;
      if (report.length === 0) return { success: false, error: 'Report not found' };

      const rowsResult = await rawDb.execute({
        sql: `SELECT * FROM cash_flow_views WHERE report_id = ? ORDER BY display_order ASC`,
        args: [id],
      });
      const rows = rowsResult.rows ?? rowsResult;

      return { success: true, report: { ...report[0], rows } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      await db.delete(cashFlowReports).where(eq(cashFlowReports.reportId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};