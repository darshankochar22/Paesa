#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Apply Drizzle-generated migrations.
//
//   npm run db:migrate
//
// Default (no env): applies the SQLite migrations in server/db/migrations/sqlite
// against the libsql DB resolved by the same path logic the app uses
// (in-memory under NODE_ENV=test, else the Electron userData startup.db).
//
// When DB_DIALECT=pg AND DATABASE_URL is set, ALSO applies the Postgres
// migrations in server/db/migrations/pg against that database.
//
// NOTE: the running app boots with bootStrategy="init-kept" (see
// server/db/index.js) — each module's init() still owns DDL + seed at startup,
// so this migrator is the tooling path for provisioning a fresh DB straight
// from the generated migrations (e.g. CI, a Postgres deployment, the eventual
// cut-over), not something the test oracle depends on.
// ---------------------------------------------------------------------------
const path = require('path');

const DIALECT = process.env.DB_DIALECT === 'pg' ? 'pg' : 'sqlite';

async function migrateSqlite() {
  const { createClient } = require('@libsql/client');
  const { drizzle } = require('drizzle-orm/libsql');
  const { migrate } = require('drizzle-orm/libsql/migrator');

  // Same dbPath resolution as server/db/index.js (kept in sync intentionally).
  let dbPath;
  if (process.env.NODE_ENV === 'test') {
    dbPath = 'file::memory:';
  } else {
    const { app } = require('electron');
    dbPath = `file:${path.join(app.getPath('userData'), 'startup.db')}`;
  }

  const client = createClient({ url: dbPath });
  await client.execute('PRAGMA foreign_keys = ON;');
  const db = drizzle(client);
  const migrationsFolder = path.join(__dirname, 'migrations', 'sqlite');
  console.log(`→ Applying SQLite migrations from ${migrationsFolder} (db: ${dbPath})`);
  await migrate(db, { migrationsFolder });
  console.log('✓ SQLite migrations applied.');
  if (typeof client.close === 'function') client.close();
}

async function migratePg() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DB_DIALECT=pg requires DATABASE_URL to be set.');
  }
  const { Pool } = require('pg');
  const { drizzle } = require('drizzle-orm/node-postgres');
  const { migrate } = require('drizzle-orm/node-postgres/migrator');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  const migrationsFolder = path.join(__dirname, 'migrations', 'pg');
  console.log(`→ Applying Postgres migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log('✓ Postgres migrations applied.');
  await pool.end();
}

(async () => {
  try {
    // SQLite is always the baseline (default app dialect).
    await migrateSqlite();
    // Postgres only when explicitly selected + a DATABASE_URL is available.
    if (DIALECT === 'pg') {
      await migratePg();
    }
    console.log('✓ db:migrate complete.');
  } catch (err) {
    console.error('✖ db:migrate failed:', err.message);
    process.exit(1);
  }
})();
