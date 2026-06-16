// Audit-trail runtime DDL (bootStrategy: init-kept).
//
// Tamper-evident edit log per MCA Rule 11(g): every business write (voucher /
// ledger / group create|update|delete|cancel) appends a row whose row_hash is
// chained to the previous row's row_hash for the same company_id. Any later
// mutation of a logged row breaks the chain (see auditTrailService.verifyChain).
//
// init(db) receives the raw libsql client (db/index.js initDB passes rawDb) and
// is idempotent (CREATE TABLE IF NOT EXISTS). The Drizzle dual schema in
// server/db/schema/{sqlite,pg}/auditTrail.js mirrors these column NAMES.

const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_trail (
      log_id          INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id      INTEGER NOT NULL,
      entity_type     TEXT NOT NULL,
      entity_id       INTEGER,
      action          TEXT NOT NULL,
      user            TEXT DEFAULT 'system',
      before_snapshot TEXT,
      after_snapshot  TEXT,
      prev_hash       TEXT,
      row_hash        TEXT,
      created_at      TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };
