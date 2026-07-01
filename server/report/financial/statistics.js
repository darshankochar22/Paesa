const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const {
  groups,
  ledgers,
  costCentres,
  stockGroups,
  stockCategories,
  stockItems,
  voucherTypes,
  units,
  currencies,
  employeeGroups,
  employees,
  vouchers,
  voucherEntries
} = require('../../db/schema');

const MONTH_NAMES = ['April','May','June','July','August','September','October','November','December','January','February','March'];

// Attendance vouchers live in attendance_vouchers, not the main vouchers table
// (see fetchAttendanceVoucherRows in voucherCRUD.js), so every query below needs
// an explicit branch to surface them alongside the other 23 voucher types.
const { fetchAttendanceVoucherRows } = require('../../voucher/voucherCRUD');

const resolveFyRange = async (fy_id) => {
  const fyRows = await db.all(sql`SELECT start_date, end_date FROM financial_years WHERE fy_id = ${fy_id}`);
  return fyRows[0] || null;
};

/** Statistics - count of active masters (Types of Accounts) and count of entered vouchers by type (Types of Vouchers). */
const statistics = async (company_id, fy_id) => {
  try {
    const [
      groupsCount,
      ledgersCount,
      costCentresCount,
      stockGroupsCount,
      stockCategoriesCount,
      stockItemsCount,
      voucherTypesCount,
      unitsCount,
      currenciesCount,
      employeeGroupsCount,
      employeesCount,
    ] = await Promise.all([
      db.all(sql`SELECT COUNT(*) AS count FROM ${groups}       WHERE company_id = ${company_id} AND is_active = 1`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${ledgers}      WHERE company_id = ${company_id} AND is_active = 1`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${costCentres}  WHERE company_id = ${company_id}`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${stockGroups}  WHERE company_id = ${company_id} AND is_active = 1`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${stockCategories} WHERE company_id = ${company_id} AND is_active = 1`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${stockItems}   WHERE company_id = ${company_id} AND is_active = 1`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${voucherTypes} WHERE company_id = ${company_id} AND is_active = 1`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${units}        WHERE company_id = ${company_id} AND is_active = 1`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${currencies}   WHERE company_id = ${company_id}`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${employeeGroups} WHERE company_id = ${company_id}`),
      db.all(sql`SELECT COUNT(*) AS count FROM ${employees}    WHERE company_id = ${company_id}`),
    ]);

    // Voucher counts per active voucher type
    const vtRows = await db.all(
      sql`SELECT name FROM ${voucherTypes} WHERE company_id = ${company_id} AND is_active = 1`
    );
    const vchRows = await db.all(
      sql`SELECT voucher_type AS vch_type, COUNT(*) AS count
          FROM ${vouchers}
          WHERE company_id = ${company_id} AND fy_id = ${fy_id} AND is_cancelled = 0
          GROUP BY voucher_type`
    );

    const countMap = {};
    for (const row of vchRows) countMap[row.vch_type] = row.count || 0;

    const activeTypes = new Set(vtRows.map(vt => vt.name));
    const vouchersData = vtRows.map(vt => ({ vch_type: vt.name, count: countMap[vt.name] || 0 }));
    for (const row of vchRows) {
      if (!activeTypes.has(row.vch_type)) {
        vouchersData.push({ vch_type: row.vch_type, count: row.count || 0 });
      }
    }

    // Attendance isn't in the main vouchers table — count it separately, scoped
    // to the financial year the same way the regular counts are, and merge into
    // (rather than duplicate) any zero-count placeholder row already added above.
    const fyRange = await resolveFyRange(fy_id);
    const attendanceRows = fyRange
      ? await fetchAttendanceVoucherRows(company_id, fy_id, fyRange.start_date, fyRange.end_date)
      : [];
    const existingAttendanceRow = vouchersData.find(v => v.vch_type === 'Attendance');
    if (existingAttendanceRow) {
      existingAttendanceRow.count = attendanceRows.length;
    } else {
      vouchersData.push({ vch_type: 'Attendance', count: attendanceRows.length });
    }

    vouchersData.sort((a, b) => a.vch_type.localeCompare(b.vch_type));

    return {
      success: true,
      accounts: {
        groups:               groupsCount[0]?.count        || 0,
        ledgers:              ledgersCount[0]?.count       || 0,
        costCentres:          costCentresCount[0]?.count   || 0,
        stockGroups:          stockGroupsCount[0]?.count   || 0,
        stockCategories:      stockCategoriesCount[0]?.count || 0,
        stockItems:           stockItemsCount[0]?.count    || 0,
        voucherTypes:         voucherTypesCount[0]?.count  || 0,
        units:                unitsCount[0]?.count         || 0,
        currencies:           currenciesCount[0]?.count    || 0,
        employeeGroups:       employeeGroupsCount[0]?.count || 0,
        employees:            employeesCount[0]?.count     || 0,
      },
      vouchers: vouchersData
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/** Voucher Monthly Register — month-wise count of vouchers of one type (Statistics drill, level 1). */
const statisticsVoucherMonthly = async (company_id, fy_id, voucher_type) => {
  try {
    const fyRows = await db.all(sql`SELECT start_date FROM financial_years WHERE fy_id = ${fy_id}`);
    if (fyRows.length === 0) return { success: false, error: 'Financial year not found' };
    const startYear = new Date(fyRows[0].start_date).getFullYear();

    // Attendance vouchers live in attendance_vouchers, not the main table — pull
    // the date list from there so this type buckets by month like the other 23.
    const voucherRows = voucher_type === 'Attendance'
      ? (await fetchAttendanceVoucherRows(company_id, fy_id)).map(a => ({
          date: a.date, is_cancelled: 0, is_optional: 0, is_post_dated: 0,
        }))
      : await db.all(
          sql`SELECT date, is_cancelled, COALESCE(is_optional, 0) AS is_optional, COALESCE(is_post_dated, 0) AS is_post_dated
              FROM ${vouchers}
              WHERE company_id = ${company_id} AND fy_id = ${fy_id} AND voucher_type = ${voucher_type}`
        );

    const rows = MONTH_NAMES.map((name, idx) => {
      let m = idx + 4, y = startYear;
      if (m > 12) { m -= 12; y = startYear + 1; }
      const prefix = `${y}-${String(m).padStart(2, '0')}`;
      const monthVouchers = voucherRows.filter(v => v.date && v.date.startsWith(prefix));
      const active = monthVouchers.filter(v => v.is_cancelled === 0 && v.is_optional === 0 && v.is_post_dated === 0);
      const cancelled = monthVouchers.filter(v => v.is_cancelled === 1);
      return { month: name, total_vouchers: active.length, cancelled: cancelled.length };
    });
    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/** Voucher Register — accounting day-list of vouchers of one type within a date range (Statistics drill, level 2).
 *  Each row is one voucher; particulars + Dr/Cr taken from its primary (first) accounting entry. */
const statisticsVoucherDayList = async (company_id, fy_id, voucher_type, from_date, to_date) => {
  try {
    // Attendance vouchers live in attendance_vouchers, not the main table —
    // reuse the shared Day Book mapper (negated voucher_id, non-accounting) and
    // shape it into this report's row contract instead of querying voucherEntries.
    if (voucher_type === 'Attendance') {
      const attendanceRows = await fetchAttendanceVoucherRows(company_id, fy_id, from_date || null, to_date || null);
      const rows = attendanceRows.map(a => ({
        voucher_id: a.voucher_id,
        date: a.date,
        particulars: a.party_name || '',
        voucher_type: a.voucher_type,
        voucher_number: a.voucher_number,
        debit: 0,
        credit: 0,
      }));
      return { success: true, rows };
    }

    const dateFrom = from_date ? sql` AND v.date >= ${from_date}` : sql``;
    const dateTo   = to_date   ? sql` AND v.date <= ${to_date}`   : sql``;

    const vchRows = await db.all(
      sql`SELECT v.voucher_id AS voucher_id, v.date AS date, v.voucher_type AS voucher_type,
                 v.voucher_number AS voucher_number, v.party_name AS party_name
          FROM ${vouchers} v
          WHERE v.company_id = ${company_id}
            AND v.fy_id = ${fy_id}
            AND v.voucher_type = ${voucher_type}
            AND v.is_cancelled = 0
            AND COALESCE(v.is_optional, 0) = 0
            AND COALESCE(v.is_post_dated, 0) = 0
            ${dateFrom}${dateTo}
          ORDER BY v.date ASC, v.voucher_id ASC`
    );
    if (vchRows.length === 0) return { success: true, rows: [] };

    const ids = vchRows.map(v => v.voucher_id);
    const entryRows = await db.all(
      sql`SELECT entry_id, voucher_id, ledger_name, type, COALESCE(amount, 0) AS amount
          FROM ${voucherEntries}
          WHERE voucher_id IN (${sql.join(ids, sql`, `)})
          ORDER BY entry_id ASC`
    );
    const byVoucher = {};
    for (const e of entryRows) (byVoucher[e.voucher_id] ||= []).push(e);

    const rows = vchRows.map(v => {
      const entries = byVoucher[v.voucher_id] || [];
      const primary = entries[0];
      const debit  = primary && primary.type === 'Dr' ? Number(primary.amount) || 0 : 0;
      const credit = primary && primary.type === 'Cr' ? Number(primary.amount) || 0 : 0;
      return {
        voucher_id: v.voucher_id,
        date: v.date,
        particulars: v.party_name || primary?.ledger_name || '',
        voucher_type: v.voucher_type,
        voucher_number: v.voucher_number,
        debit,
        credit,
      };
    });
    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { statistics, statisticsVoucherMonthly, statisticsVoucherDayList };