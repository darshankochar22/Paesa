#!/usr/bin/env node
// One-shot DB repair for an EXISTING startup.db — heals schema drift (adds any missing
// tables/columns) without launching the app or losing data.
//
//   npm run db:repair                       (auto-detects the Electron userData DB)
//   STARTUP_DB_PATH=/path/to/startup.db npm run db:repair   (explicit path)
//
// Close the app first, run this, then reopen. Runs the same initDB() the app runs on boot
// (each module's CREATE TABLE IF NOT EXISTS + seed) followed by the column reconciler.

const fs = require('fs');
const path = require('path');
const os = require('os');

function findDb() {
  if (process.env.STARTUP_DB_PATH) return process.env.STARTUP_DB_PATH;
  const home = os.homedir();
  const candidates = [
    path.join(home, 'Library/Application Support/startup/startup.db'),   // macOS (app name "startup")
    path.join(home, 'Library/Application Support/Startup/startup.db'),   // macOS (packaged "Startup")
    process.env.APPDATA && path.join(process.env.APPDATA, 'startup', 'startup.db'),  // Windows
    process.env.APPDATA && path.join(process.env.APPDATA, 'Startup', 'startup.db'),
    path.join(home, '.config', 'startup', 'startup.db'),                 // Linux
    path.join(home, '.config', 'Startup', 'startup.db'),
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}

(async () => {
  const dbPath = findDb();
  if (!dbPath) {
    console.error('Could not locate startup.db. Pass it explicitly:\n  STARTUP_DB_PATH=/full/path/to/startup.db npm run db:repair');
    process.exit(1);
  }
  console.log('Repairing DB at:', dbPath);
  process.env.STARTUP_DB_PATH = dbPath; // db/index.js uses this for the non-Electron file path

  const { initDB } = require('./index'); // runs every module's init() + the schema reconciler
  await initDB();
  console.log('✓ DB repair complete. Reopen the app.');
  process.exit(0);
})().catch((err) => {
  console.error('DB repair failed:', err);
  process.exit(1);
});
