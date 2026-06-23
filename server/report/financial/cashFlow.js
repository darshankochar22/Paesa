const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { ledgers, groups } = require('../../db/schema');
const { getEntries } = require('../utils/reportDb');

const cashFlowReport = async (company_id, fy_id) => {
  try {
    // Fetch all transaction voucher entries for the current FY period
    const entries = await getEntries(company_id, fy_id);

    // Fetch primary parent groups and their nature associations
    const ledgerRows = await db.all(
      sql`SELECT l.ledger_id, l.name as ledger_name, l.group_id, g.name as group_name, g.nature
          FROM ${ledgers} l
          INNER JOIN ${groups} g ON g.group_id = l.group_id
          WHERE l.company_id = ${company_id} AND l.is_active = 1`
    );

    // Array of standard financial months to map timeline indexes 
    const monthNames = [
      "April", "May", "June", "July", "August", "September",
      "October", "November", "December", "January", "February", "March"
    ];

    // Initialize 12-month array matrix
    const monthlyMap = monthNames.map(name => ({
      month_name: name,
      inflow: 0,
      outflow: 0,
      nett_flow: 0
    }));

    // Group maps to compile the summary drill-down on Page 2
    const groupInflowMap = {};
    const groupOutflowMap = {};

    // Process every single ledger voucher item line
    entries.forEach(entry => {
      const ledger = ledgerRows.find(l => l.ledger_id === entry.ledger_id);
      if (!ledger) return;

      // Extract month name from entry timestamp
      const dateObj = new Date(entry.date || entry.voucher_date);
      const rawMonth = dateObj.toLocaleString('en-US', { month: 'long' });
      const monthData = monthlyMap.find(m => m.month_name === rawMonth);

      const amount = parseFloat(entry.amount || 0);
      const type = entry.entry_type || entry.type; // 'Dr' or 'Cr'

      // Identify inflows and outflows
      // Realized Receipts/Inflows present as Credits in Sales/Income but Debit adjustments overall
      if (type === 'Dr') {
        if (monthData) monthData.inflow += amount;
        
        if (!groupInflowMap[ledger.group_id]) {
          groupInflowMap[ledger.group_id] = { group_id: ledger.group_id, group_name: ledger.group_name, balance: 0 };
        }
        groupInflowMap[ledger.group_id].balance += amount;
      } else if (type === 'Cr') {
        if (monthData) monthData.outflow += amount;

        if (!groupOutflowMap[ledger.group_id]) {
          groupOutflowMap[ledger.group_id] = { group_id: ledger.group_id, group_name: ledger.group_name, balance: 0 };
        }
        groupOutflowMap[ledger.group_id].balance += amount;
      }
    });

    // Compute net balances for months
    let totalInflow = 0;
    let totalOutflow = 0;
    monthlyMap.forEach(m => {
      m.nett_flow = m.inflow - m.outflow;
      totalInflow += m.inflow;
      totalOutflow += m.outflow;
    });

    return {
      success: true,
      months: monthlyMap,
      grandTotal: {
        inflow: totalInflow,
        outflow: totalOutflow,
        nett_flow: totalInflow - totalOutflow
      },
      summary: {
        inflows: Object.values(groupInflowMap),
        outflows: Object.values(groupOutflowMap)
      }
    };

  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { cashFlowReport };