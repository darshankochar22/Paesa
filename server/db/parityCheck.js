#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Schema parity check.
//
//   npm run db:parity
//
// Loads the pg and sqlite Drizzle schema barrels and asserts that BOTH dialects
// declare the SAME set of tables and, per table, the SAME set of column names
// (the SQL column names — getName(), not the JS property keys). Column TYPES are
// intentionally allowed to differ (that is the whole point of the dual schema:
// REAL vs NUMERIC, INTEGER 0/1 vs BOOLEAN, TEXT ISO vs TIMESTAMPTZ, ...).
//
// Exits 1 and prints a readable diff on any mismatch; exits 0 when in parity.
// ---------------------------------------------------------------------------
const { getTableName, getTableColumns, is } = require('drizzle-orm');
const { PgTable } = require('drizzle-orm/pg-core');
const { SQLiteTable } = require('drizzle-orm/sqlite-core');

const pgSchema = require('./schema/pg');
const sqliteSchema = require('./schema/sqlite');

// Build { sqlTableName -> Set<sqlColumnName> } from a schema barrel, keeping
// only objects that are actual Drizzle tables of the given dialect.
function tableMap(schema, tableClass) {
  const map = new Map();
  for (const value of Object.values(schema)) {
    if (!value || !is(value, tableClass)) continue;
    const tableName = getTableName(value);
    const cols = getTableColumns(value);
    const colNames = new Set(Object.values(cols).map((c) => c.name));
    map.set(tableName, colNames);
  }
  return map;
}

const pg = tableMap(pgSchema, PgTable);
const sqlite = tableMap(sqliteSchema, SQLiteTable);

const problems = [];

// 1. Same set of tables.
const pgTables = new Set(pg.keys());
const sqliteTables = new Set(sqlite.keys());

const onlyPg = [...pgTables].filter((t) => !sqliteTables.has(t)).sort();
const onlySqlite = [...sqliteTables].filter((t) => !pgTables.has(t)).sort();

if (onlyPg.length) {
  problems.push(
    `Tables present in pg but missing in sqlite:\n` +
      onlyPg.map((t) => `    + ${t}`).join('\n')
  );
}
if (onlySqlite.length) {
  problems.push(
    `Tables present in sqlite but missing in pg:\n` +
      onlySqlite.map((t) => `    + ${t}`).join('\n')
  );
}

// 2. Same column names per shared table.
const sharedTables = [...pgTables].filter((t) => sqliteTables.has(t)).sort();
for (const table of sharedTables) {
  const pgCols = pg.get(table);
  const sqliteCols = sqlite.get(table);
  const onlyInPg = [...pgCols].filter((c) => !sqliteCols.has(c)).sort();
  const onlyInSqlite = [...sqliteCols].filter((c) => !pgCols.has(c)).sort();
  if (onlyInPg.length || onlyInSqlite.length) {
    const lines = [`Column mismatch in table "${table}":`];
    for (const c of onlyInPg) lines.push(`    pg-only:     ${c}`);
    for (const c of onlyInSqlite) lines.push(`    sqlite-only: ${c}`);
    problems.push(lines.join('\n'));
  }
}

if (problems.length) {
  console.error('✖ Schema parity check FAILED\n');
  for (const p of problems) console.error(p + '\n');
  console.error(
    `Summary: pg=${pg.size} tables, sqlite=${sqlite.size} tables, ` +
      `${problems.length} mismatch group(s).`
  );
  process.exit(1);
}

console.log(
  `✓ Schema parity OK — ${pg.size} tables, identical table sets and ` +
    `column names across pg + sqlite (types differ by design).`
);
