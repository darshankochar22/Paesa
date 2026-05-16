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
};

module.exports = { init };