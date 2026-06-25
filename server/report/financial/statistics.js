const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const {
  groups,
  ledgers,
  stockGroups,
  stockCategories,
  stockItems,
  voucherTypes,
  units,
  godowns,
  vouchers
} = require('../../db/schema');

/** Statistics - count of active masters (Types of Accounts) and count of entered vouchers by type (Types of Vouchers). */
const statistics = async (company_id, fy_id) => {
  try {
    // 1. Query counts for active account/master types
    const [
      groupsCount,
      ledgersCount,
      stockGroupsCount,
      stockCategoriesCount,
      stockItemsCount,
      voucherTypesCount,
      unitsCount,
      godownsCount
    ] = await Promise.all([
      db.all(sql`SELECT COUNT(*) AS count FROM ${groups} WHERE company_id = ${company_id} AND is_active = 1`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${ledgers} WHERE company_id = ${company_id} AND is_active = 1`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${stockGroups} WHERE company_id = ${company_id} AND is_active = 1`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${stockCategories} WHERE company_id = ${company_id} AND is_active = 1`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${stockItems} WHERE company_id = ${company_id} AND is_active = 1`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${voucherTypes} WHERE company_id = ${company_id} AND is_active = 1`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${units} WHERE company_id = ${company_id} AND is_active = 1`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${godowns} WHERE company_id = ${company_id} AND is_active = 1`),
    ]);

    // 2. Query entered voucher counts and all active voucher types
    const vtRows = await db.all(
      sql`SELECT name FROM ${voucherTypes} WHERE company_id = ${company_id} AND is_active = 1`
    );

    const vchRows = await db.all(
      sql`SELECT voucher_type AS vch_type, COUNT(*) AS count
          FROM ${vouchers}
          WHERE company_id = ${company_id} AND fy_id = ${fy_id} AND is_cancelled = 0
          GROUP BY voucher_type`
    );

    // Merge and count
    const countMap = {};
    for (const row of vchRows) {
      countMap[row.vch_type] = row.count || 0;
    }

    const activeTypes = new Set(vtRows.map(vt => vt.name));
    const vouchersData = vtRows.map(vt => ({
      vch_type: vt.name,
      count: countMap[vt.name] || 0
    }));

    for (const row of vchRows) {
      if (!activeTypes.has(row.vch_type)) {
        vouchersData.push({
          vch_type: row.vch_type,
          count: row.count || 0
        });
      }
    }

    // Sort alphabetically by voucher type name (matching Tally Prime)
    vouchersData.sort((a, b) => a.vch_type.localeCompare(b.vch_type));

    return {
      success: true,
      accounts: {
        groups: groupsCount[0]?.count || 0,
        ledgers: ledgersCount[0]?.count || 0,
        stockGroups: stockGroupsCount[0]?.count || 0,
        stockCategories: stockCategoriesCount[0]?.count || 0,
        stockItems: stockItemsCount[0]?.count || 0,
        voucherTypes: voucherTypesCount[0]?.count || 0,
        units: unitsCount[0]?.count || 0,
        godowns: godownsCount[0]?.count || 0
      },
      vouchers: vouchersData
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { statistics };