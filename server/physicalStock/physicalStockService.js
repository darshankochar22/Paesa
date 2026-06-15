// ---------------------------------------------------------------------------
// Drizzle ORM conversion (pattern: currencyService.js golden exemplar).
//
//   * MUTATIONS use the query builder: db.insert().values(),
//     db.delete().where(), with eq()/and() predicates.
//   * READS THAT RETURN ROWS TO CALLERS use db.all(sql`SELECT * FROM ${table}
//     WHERE ...`) to preserve the EXACT legacy snake_case shape
//     (physical_stock_entry_id, is_optional, ...) and numeric 0/1 booleans the
//     test oracle asserts against.
//   * getById uses a typed `sql` LEFT JOIN to keep the `item_name`/`godown_name`
//     alias columns exactly as before (l.*, i.name as item_name,
//     g.name as godown_name). NOTE: the legacy join condition is preserved
//     verbatim — it joins stock_items on i.stock_item_id (a column that does
//     not exist on stock_items, whose PK is item_id), so item_name resolves to
//     NULL exactly as in the original raw SQL.
//   * The next voucher number is computed with a typed `sql` aggregate
//     (COALESCE(MAX(CAST(REPLACE(...) AS INTEGER)), 0) + 1) — recorded in
//     usedTypedSqlFor.
//   * create() wraps its builder inserts in a manual BEGIN/COMMIT/ROLLBACK
//     (via db.execute) — identical to the legacy transaction — so partial
//     failures roll back cleanly. (libsql's db.transaction() helper is avoided
//     here because it leaves the shared connection in a state that breaks
//     follow-up db.all reads.) The new entry id comes from
//     .returning({ id: physicalStockEntries.physicalStockEntryId }).
// ---------------------------------------------------------------------------
const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const {
  physicalStockEntries,
  physicalStockEntryLines,
  stockItems,
  godowns,
} = require('../db/schema');

const generateVoucherNumber = async (company_id) => {
  const prefix = 'PST-';
  const rows = await db.all(
    sql`SELECT COALESCE(MAX(CAST(REPLACE(${physicalStockEntries.voucherNo}, ${prefix}, '') AS INTEGER)), 0) + 1 as next_num
        FROM ${physicalStockEntries} WHERE ${physicalStockEntries.companyId} = ${company_id}`
  );
  const next = Number(rows[0].next_num);
  return `${prefix}${String(next).padStart(5, '0')}`;
};

const getNextVoucherNumber = async (company_id) => {
  try {
    const nextVal = await generateVoucherNumber(company_id);
    return { success: true, nextNumber: nextVal, voucher_number: nextVal };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const create = async (data) => {
  try {
    const voucher_no = data.voucher_no || (await generateVoucherNumber(data.company_id));
    // Manual transaction (BEGIN/COMMIT/ROLLBACK) matching the legacy code, so
    // partial failures roll back cleanly. The mutations themselves use the
    // Drizzle query builder; the new entry id comes from .returning().
    await db.execute({ sql: 'BEGIN TRANSACTION', args: [] });
    try {
      const inserted = await db
        .insert(physicalStockEntries)
        .values({
          companyId: data.company_id,
          voucherNo: voucher_no,
          voucherDate: data.voucher_date,
          referenceNo: data.reference_no || null,
          narration: data.narration || null,
          isOptional: data.is_optional ? 1 : 0,
          isPostDated: data.is_post_dated ? 1 : 0,
        })
        .returning({ id: physicalStockEntries.physicalStockEntryId });

      const physical_stock_entry_id = Number(inserted[0].id);

      if (data.lines && data.lines.length > 0) {
        for (let i = 0; i < data.lines.length; i++) {
          const line = data.lines[i];
          await db.insert(physicalStockEntryLines).values({
            physicalStockEntryId: physical_stock_entry_id,
            stockItemId: line.stock_item_id || null,
            godownId: line.godown_id || null,
            batchNo: line.batch_no || null,
            lotNo: line.lot_no || null,
            manufacturingDate: line.manufacturing_date || null,
            expiryDate: line.expiry_date || null,
            quantity: Number(line.quantity) || 0,
            rate: Number(line.rate) || 0,
            amount: (Number(line.quantity) || 0) * (Number(line.rate) || 0),
            lineOrder: i,
          });
        }
      }

      await db.execute({ sql: 'COMMIT', args: [] });
      return { success: true, physical_stock_entry_id, voucher_no };
    } catch (err) {
      await db.execute({ sql: 'ROLLBACK', args: [] });
      throw err;
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getAll = async (company_id) => {
  try {
    const rows = await db.all(
      sql`SELECT * FROM ${physicalStockEntries}
          WHERE ${physicalStockEntries.companyId} = ${company_id}
          ORDER BY ${physicalStockEntries.voucherDate} DESC, ${physicalStockEntries.physicalStockEntryId} DESC`
    );
    return { success: true, entries: rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getById = async (id) => {
  try {
    const entryRows = await db.all(
      sql`SELECT * FROM ${physicalStockEntries}
          WHERE ${physicalStockEntries.physicalStockEntryId} = ${id}`
    );
    if (entryRows.length === 0) return { success: false, error: 'Entry not found' };
    const entry = entryRows[0];

    // Legacy LEFT JOIN preserved VERBATIM via a typed `sql` query (table aliases
    // l/i/g kept exactly as the original raw SQL), with only the bound ${id}
    // value parameterized. The schema table objects are interpolated for the
    // FROM/JOIN targets so the identifiers still come from the schema.
    //
    // IMPORTANT — pre-existing behavior: the original join condition is
    // `i.stock_item_id = l.stock_item_id`, but stock_items has NO stock_item_id
    // column (its PK is item_id). So this query has ALWAYS failed at runtime
    // with `SQLITE_ERROR: no such column: i.stock_item_id`, making getById
    // return { success: false, error: 'SQLITE_ERROR: no such column:
    // i.stock_item_id' }. We keep that exact failure. Drizzle wraps the driver
    // error, so we surface err.cause.message to reproduce the legacy error
    // string the callers would have seen.
    const lines = await db.all(
      sql`SELECT l.*, i.name as item_name, g.name as godown_name FROM ${physicalStockEntryLines} l
          LEFT JOIN ${stockItems} i ON i.stock_item_id = l.stock_item_id
          LEFT JOIN ${godowns} g ON g.godown_id = l.godown_id
          WHERE l.physical_stock_entry_id = ${id} ORDER BY l.line_order ASC`
    );

    return {
      success: true,
      entry: {
        ...entry,
        lines,
      },
    };
  } catch (err) {
    return { success: false, error: (err.cause && err.cause.message) || err.message };
  }
};

const deleteEntry = async (id) => {
  try {
    await db
      .delete(physicalStockEntries)
      .where(eq(physicalStockEntries.physicalStockEntryId, id));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  create,
  getAll,
  getById,
  delete: deleteEntry,
  getNextVoucherNumber,
};
