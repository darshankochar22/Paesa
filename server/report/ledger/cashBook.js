const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { ledgers, groups } = require('../../db/schema');
const ledgerReport = require('./ledgerReport');

const cashBook = async (company_id, fy_id, from_date, to_date) => {
  try {
    let cashLedger = await db.all(
      sql`SELECT * FROM ${ledgers}
          WHERE ${ledgers.companyId} = ${company_id}
            AND ${ledgers.ledgerType} = 'Cash'
            AND ${ledgers.isActive} = 1
          LIMIT 1`
    );
    if (cashLedger.length === 0) {
      cashLedger = await db.all(
        sql`SELECT l.* FROM ${ledgers} l
            INNER JOIN ${groups} g ON g.group_id = l.group_id
            WHERE l.company_id = ${company_id}
              AND g.name = 'Cash-in-Hand'
              AND l.is_active = 1
            LIMIT 1`
      );
    }
    if (cashLedger.length === 0) {
      cashLedger = await db.all(
        sql`SELECT l.* FROM ${ledgers} l
            INNER JOIN ${groups} g ON g.group_id = l.group_id
            WHERE l.company_id = ${company_id}
              AND (g.nature = 'Assets' AND l.name LIKE '%Cash%')
              AND l.is_active = 1
            LIMIT 1`
      );
    }
    if (cashLedger.length === 0) return { success: true, rows: [], vouchers: [] };

    return await ledgerReport(
      company_id, fy_id, cashLedger[0].ledger_id, from_date, to_date
    );
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { cashBook };