// Boot-time schema reconciler (SQLite only).
//
// Problem: bootStrategy='init-kept' creates tables with `CREATE TABLE IF NOT EXISTS`, which
// does NOT add new columns to a table that already exists. So a user's existing startup.db,
// created before a column was added, is missing that column — and any INSERT referencing it
// fails ("table X has no column named Y"). Migrations are not applied at boot.
//
// Fix: after init(), diff each Drizzle table's expected columns against the actual columns
// (PRAGMA table_info) and `ALTER TABLE ... ADD COLUMN` any that are missing. Idempotent and
// additive — it never drops or alters existing columns/data.

const { getTableColumns, getTableName, is } = require('drizzle-orm');
const { SQLiteTable } = require('drizzle-orm/sqlite-core');

// Only emit a DEFAULT clause for simple literals — SQLite's ALTER ADD COLUMN cannot take a
// non-constant default (e.g. datetime('now')); such columns are added nullable.
function defaultClause(col) {
  if (!col.hasDefault) return '';
  const d = col.default;
  if (typeof d === 'number') return ` DEFAULT ${d}`;
  if (typeof d === 'string') return ` DEFAULT '${d.replace(/'/g, "''")}'`;
  if (typeof d === 'boolean') return ` DEFAULT ${d ? 1 : 0}`;
  return ''; // sql`...` / functions -> add nullable
}

async function reconcileSchema(rawDb) {
  const schema = require('./schema/sqlite');
  const added = [];

  for (const exported of Object.values(schema)) {
    if (!is(exported, SQLiteTable)) continue;
    const tableName = getTableName(exported);

    let info;
    try {
      info = await rawDb.execute(`PRAGMA table_info("${tableName}")`);
    } catch (_e) {
      continue;
    }
    const existing = new Set((info.rows || []).map((r) => r.name));
    if (existing.size === 0) continue; // table not created yet — init() owns creation

    const cols = getTableColumns(exported);
    for (const col of Object.values(cols)) {
      if (existing.has(col.name)) continue;
      const type = typeof col.getSQLType === 'function' ? col.getSQLType() : 'TEXT';
      const ddl = `ALTER TABLE "${tableName}" ADD COLUMN "${col.name}" ${type}${defaultClause(col)}`;
      try {
        await rawDb.execute(ddl);
        added.push(`${tableName}.${col.name}`);
      } catch (err) {
        console.error(`[schema reconcile] could not add ${tableName}.${col.name}:`, err.message);
      }
    }
  }

  if (added.length) {
    console.log(`[schema reconcile] added ${added.length} missing column(s): ${added.join(', ')}`);
  }
  return added;
}

module.exports = { reconcileSchema };
