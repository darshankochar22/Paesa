const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS whatsapp_config (
      config_id       INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id      INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      phone_number_id TEXT NOT NULL,
      waba_id         TEXT NOT NULL,
      access_token    TEXT NOT NULL,
      is_active       INTEGER DEFAULT 1,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS whatsapp_templates (
      template_id     INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id      INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      language        TEXT DEFAULT 'en',
      category        TEXT,
      status          TEXT DEFAULT 'PENDING',
      created_at      TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS whatsapp_logs (
      log_id          INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id      INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      voucher_id      INTEGER,
      to_number       TEXT NOT NULL,
      message_type    TEXT NOT NULL,
      template_name   TEXT,
      status          TEXT DEFAULT 'PENDING',
      wamid           TEXT,
      error           TEXT,
      sent_at         TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };