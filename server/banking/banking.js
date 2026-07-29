const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS reconciliations (
      reconciliation_id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id          INTEGER NOT NULL REFERENCES voucher_entries(entry_id) ON DELETE CASCADE,
      voucher_id        INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      ledger_id         INTEGER NOT NULL REFERENCES ledgers(ledger_id) ON DELETE CASCADE,
      reconciled_date   TEXT,
      bank_date         TEXT,
      bank_reference    TEXT,
      reconciled_at     TEXT DEFAULT (datetime('now'))
    )
  `);

  // Bank Statement Entry (Banking → Import Bank Statement): one row per imported
  // statement file, scoped to the bank ledger it was matched against.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS bank_statement_imports (
      import_id      INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id     INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      ledger_id      INTEGER NOT NULL REFERENCES ledgers(ledger_id) ON DELETE CASCADE,
      file_name      TEXT,
      account_number TEXT,
      statement_from TEXT,
      statement_to   TEXT,
      total_rows     INTEGER DEFAULT 0,
      is_deleted     INTEGER DEFAULT 0,
      imported_at    TEXT DEFAULT (datetime('now'))
    )
  `);

  // One row per statement transaction. voucher_type/contra_ledger_id start as the
  // classifier's suggestion (match_source says why) and become the user's choice on
  // the review screen; status: pending | created | ignored | duplicate.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS bank_statement_lines (
      line_id          INTEGER PRIMARY KEY AUTOINCREMENT,
      import_id        INTEGER NOT NULL REFERENCES bank_statement_imports(import_id) ON DELETE CASCADE,
      company_id       INTEGER NOT NULL,
      ledger_id        INTEGER NOT NULL,
      txn_date         TEXT NOT NULL,
      narration        TEXT,
      ref_no           TEXT,
      withdrawal       REAL DEFAULT 0,
      deposit          REAL DEFAULT 0,
      balance          REAL,
      voucher_type     TEXT,
      contra_ledger_id INTEGER,
      match_source     TEXT,
      status           TEXT DEFAULT 'pending',
      voucher_id       INTEGER,
      line_hash        TEXT
    )
  `);

  // Learned narration→ledger mappings: every voucher created from a statement line
  // upserts a rule keyed by the narration's counterparty tokens, so the next import
  // suggests the same ledger automatically.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS bank_statement_rules (
      rule_id      INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id   INTEGER NOT NULL,
      match_text   TEXT NOT NULL,
      ledger_id    INTEGER NOT NULL,
      voucher_type TEXT,
      hits         INTEGER DEFAULT 1,
      updated_at   TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };
