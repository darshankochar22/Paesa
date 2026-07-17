const { db, rawDb } = require('../db/index');
const { eq } = require('drizzle-orm');

const { cashFlowReports, cashFlowViews } = require('../db/schema/sqlite/cashFlowReport');

module.exports = {
  calculateCashFlow: async (company_id, fy_id, from_date, to_date) => {
    try {
      const openingResult = await rawDb.execute({
        sql: `
          WITH RECURSIVE cash_bank_groups AS (
            SELECT group_id FROM "groups"
            WHERE name IN ('Cash-in-hand', 'Bank Accounts')
              AND company_id = ?
            UNION ALL
            SELECT g.group_id
            FROM "groups" g
            JOIN cash_bank_groups cbg ON g.parent_group_id = cbg.group_id
          )
          SELECT COALESCE(SUM(l.opening_balance), 0) AS opening
          FROM ledgers l
          WHERE l.company_id = ?
            AND l.group_id IN (SELECT group_id FROM cash_bank_groups)
        `,
        args: [company_id, company_id],
      });
      const openingRows = openingResult.rows ?? openingResult;
      const openingBalance = parseFloat(openingRows[0]?.opening) || 0;

      // Group hierarchy so we can roll cash-flow figures up to the PRIMARY
      // (top-level) group, exactly like TallyPrime's Cash Flow Summary, while
      // still keeping the sub-group -> ledger breakdown for drill-down.
      const groupsResult = await rawDb.execute({
        sql: `SELECT group_id, name, parent_group_id, is_primary FROM "groups" WHERE company_id = ?`,
        args: [company_id],
      });
      const groupRows = groupsResult.rows ?? groupsResult;
      const groupMeta = {};
      groupRows.forEach((g) => {
        groupMeta[g.group_id] = {
          name: g.name,
          parent: g.parent_group_id == null ? null : Number(g.parent_group_id),
          is_primary: Number(g.is_primary) || 0,
        };
      });

      // Build one drill-down tree (primary group -> sub-groups -> ledgers) from
      // a map of ledger-level { inflow, outflow } figures. Amounts roll up the
      // whole ancestor chain; inflow and outflow are kept SEPARATE (never netted)
      // so a group like Capital Account can appear on both sides.
      const buildTree = (ledgerMap) => {
        const nodes = {};
        const ensure = (gid) => {
          if (nodes[gid]) return nodes[gid];
          const g = groupMeta[gid] || { name: 'Unknown', parent: null, is_primary: 0 };
          nodes[gid] = {
            group_id: gid,
            group_name: g.name,
            parent_group_id: g.parent,
            inflow: 0,
            outflow: 0,
            childGroupIds: new Set(),
            ledgers: [],
          };
          return nodes[gid];
        };
        Object.values(ledgerMap).forEach((l) => {
          if (!l.group_id) return;
          ensure(l.group_id).ledgers.push({
            ledger_id: l.ledger_id,
            ledger_name: l.ledger_name,
            inflow: l.inflow,
            outflow: l.outflow,
          });
          let gid = l.group_id;
          const seen = new Set();
          while (gid != null && !seen.has(gid)) {
            seen.add(gid);
            const node = ensure(gid);
            node.inflow += l.inflow;
            node.outflow += l.outflow;
            const parent = groupMeta[gid] ? groupMeta[gid].parent : null;
            if (parent != null) ensure(parent).childGroupIds.add(gid);
            gid = parent;
          }
        });
        const serialize = (gid) => {
          const n = nodes[gid];
          const childGroups = [...n.childGroupIds]
            .map(serialize)
            .filter((c) => c.inflow > 0 || c.outflow > 0);
          const ledgerLeaves = n.ledgers
            .filter((l) => l.inflow > 0 || l.outflow > 0)
            .map((l) => ({
              type: 'ledger',
              id: `l-${l.ledger_id}`,
              ledger_id: l.ledger_id,
              name: l.ledger_name,
              inflow: l.inflow,
              outflow: l.outflow,
              children: [],
            }));
          return {
            type: 'group',
            id: `g-${n.group_id}`,
            group_id: n.group_id,
            name: n.group_name,
            inflow: n.inflow,
            outflow: n.outflow,
            children: [...childGroups, ...ledgerLeaves],
          };
        };
        return Object.values(nodes)
          .filter((n) => n.parent_group_id == null || !groupMeta[n.parent_group_id])
          .map((n) => serialize(n.group_id))
          .filter((n) => n.inflow > 0 || n.outflow > 0);
      };

      const result = await rawDb.execute({
        sql: `
          WITH RECURSIVE cash_bank_groups AS (
            SELECT group_id FROM "groups"
            WHERE name IN ('Cash-in-hand', 'Bank Accounts')
              AND company_id = ?
            UNION ALL
            SELECT g.group_id
            FROM "groups" g
            JOIN cash_bank_groups cbg ON g.parent_group_id = cbg.group_id
          ),
          relevant_vouchers AS (
            SELECT DISTINCT v.voucher_id, v.date, v.voucher_type
            FROM vouchers v
            JOIN voucher_entries ve ON ve.voucher_id = v.voucher_id
            JOIN ledgers l ON ve.ledger_id = l.ledger_id
            WHERE v.company_id = ?
              AND v.fy_id = ?
              AND v.date BETWEEN ? AND ?
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
              AND l.group_id IN (SELECT group_id FROM cash_bank_groups)
          )
          SELECT
            rv.voucher_id,
            rv.date        AS voucher_date,
            rv.voucher_type,
            ve.amount,
            ve.type        AS line_type,
            ve.ledger_name,
            ve.ledger_id,
            l.group_id,
            g.name         AS group_name,
            CASE WHEN l.group_id IN (SELECT group_id FROM cash_bank_groups) THEN 1 ELSE 0 END AS is_cash_bank
          FROM relevant_vouchers rv
          JOIN voucher_entries ve ON ve.voucher_id = rv.voucher_id
          LEFT JOIN ledgers l ON ve.ledger_id = l.ledger_id
          LEFT JOIN "groups" g ON l.group_id = g.group_id
        `,
        args: [company_id, company_id, fy_id, from_date, to_date],
      });

      const logs = result.rows ?? result;

      const monthNames = [
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
        'January',
        'February',
        'March',
      ];
      const monthsMap = {};
      monthNames.forEach((m, idx) => {
        monthsMap[m] = {
          month_name: m,
          inflow: 0,
          outflow: 0,
          nett_flow: 0,
          display_order: idx + 1,
        };
      });

      // Full-period group balances
      const groupBalances = {};
      // Per-month group balances for drill-down
      const monthGroupBalances = {};
      monthNames.forEach((m) => {
        monthGroupBalances[m] = {};
      });

      // Ledger-level gross inflow/outflow, used to build the primary-group
      // roll-up trees. Full period + per month.
      const ledgerFull = {};
      const ledgerByMonth = {};
      monthNames.forEach((m) => {
        ledgerByMonth[m] = {};
      });
      const accrueLedger = (map, r, inflow, outflow) => {
        if (!map[r.ledger_id]) {
          map[r.ledger_id] = {
            ledger_id: r.ledger_id,
            ledger_name: r.ledger_name,
            group_id: r.group_id,
            inflow: 0,
            outflow: 0,
          };
        }
        map[r.ledger_id].inflow += inflow;
        map[r.ledger_id].outflow += outflow;
      };

      // Group all rows by voucher_id so we can net the cash/bank side of
      // each voucher before touching the monthly totals.
      const byVoucher = {};
      for (const row of logs) {
        if (!byVoucher[row.voucher_id]) {
          byVoucher[row.voucher_id] = { date: row.voucher_date, cashRows: [], counterRows: [] };
        }
        if (row.is_cash_bank) {
          byVoucher[row.voucher_id].cashRows.push(row);
        } else {
          byVoucher[row.voucher_id].counterRows.push(row);
        }
      }

      Object.values(byVoucher).forEach((voucher) => {
        if (!voucher.date) return;
        const dateObj = new Date(voucher.date);
        const rawMonth = dateObj.toLocaleString('default', { month: 'long' });
        if (!monthsMap[rawMonth]) return;

        let cashDr = 0;
        let cashCr = 0;
        voucher.cashRows.forEach((r) => {
          const amt = parseFloat(r.amount) || 0;
          if (r.line_type === 'Dr') cashDr += amt;
          else if (r.line_type === 'Cr') cashCr += amt;
        });
        const netCash = cashDr - cashCr;

        if (netCash === 0) return; // Skip contra or non-cash-affecting

        if (netCash > 0) {
          monthsMap[rawMonth].inflow += netCash;
        } else if (netCash < 0) {
          monthsMap[rawMonth].outflow += Math.abs(netCash);
        }
        monthsMap[rawMonth].nett_flow = monthsMap[rawMonth].inflow - monthsMap[rawMonth].outflow;

        voucher.counterRows.forEach((r) => {
          const amt = parseFloat(r.amount) || 0;
          if (!r.group_id) return;
          const contrib = r.line_type === 'Cr' ? amt : -amt;
          // Cr counter line = source of funds (inflow); Dr = use of funds (outflow).
          const inflow = r.line_type === 'Cr' ? amt : 0;
          const outflow = r.line_type === 'Dr' ? amt : 0;

          // Full-period accumulator
          if (!groupBalances[r.group_id]) {
            groupBalances[r.group_id] = {
              group_id: r.group_id,
              group_name: r.group_name,
              balance: 0,
            };
          }
          groupBalances[r.group_id].balance += contrib;

          // Per-month accumulator
          const mgb = monthGroupBalances[rawMonth];
          if (!mgb[r.group_id]) {
            mgb[r.group_id] = { group_id: r.group_id, group_name: r.group_name, balance: 0 };
          }
          mgb[r.group_id].balance += contrib;

          // Ledger-level gross accumulators for primary-group roll-up trees
          accrueLedger(ledgerFull, r, inflow, outflow);
          accrueLedger(ledgerByMonth[rawMonth], r, inflow, outflow);
        });
      });

      // Full-period inflows / outflows
      const inflows = [];
      const outflows = [];
      Object.values(groupBalances).forEach((g) => {
        if (g.balance > 0) {
          inflows.push({ group_id: g.group_id, group_name: g.group_name, balance: g.balance });
        } else if (g.balance < 0) {
          outflows.push({
            group_id: g.group_id,
            group_name: g.group_name,
            balance: Math.abs(g.balance),
          });
        }
      });

      // Per-month inflows / outflows for drill-down
      const monthlySummary = {};
      monthNames.forEach((m) => {
        const mInflows = [];
        const mOutflows = [];
        Object.values(monthGroupBalances[m]).forEach((g) => {
          if (g.balance > 0) {
            mInflows.push({ group_id: g.group_id, group_name: g.group_name, balance: g.balance });
          } else if (g.balance < 0) {
            mOutflows.push({
              group_id: g.group_id,
              group_name: g.group_name,
              balance: Math.abs(g.balance),
            });
          }
        });
        monthlySummary[m] = { inflows: mInflows, outflows: mOutflows };
      });

      const months = Object.values(monthsMap);
      const grandTotal = {
        inflow: months.reduce((acc, curr) => acc + curr.inflow, 0),
        outflow: months.reduce((acc, curr) => acc + curr.outflow, 0),
        nett_flow: 0,
      };
      grandTotal.nett_flow = grandTotal.inflow - grandTotal.outflow;

      const closingBalance = openingBalance + grandTotal.nett_flow;

      // Primary-group roll-up trees (main summary + drill-down), full period and per month
      const tree = buildTree(ledgerFull);
      const monthlyTree = {};
      monthNames.forEach((m) => {
        monthlyTree[m] = buildTree(ledgerByMonth[m]);
      });

      return {
        success: true,
        months,
        summary: {
          inflows,
          outflows,
        },
        monthlySummary,
        tree,
        monthlyTree,
        grandTotal,
        openingBalance,
        closingBalance,
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
