const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS godowns (
      godown_id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id                  INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      name                        TEXT NOT NULL,
      alias                       TEXT,
      parent_godown_id            INTEGER REFERENCES godowns(godown_id),
      address                     TEXT,
      city                        TEXT,
      state                       TEXT,
      pincode                     TEXT,
      is_primary                  INTEGER DEFAULT 0,
      is_main_location            INTEGER DEFAULT 0,
      allow_storage_of_materials  INTEGER DEFAULT 1,
      is_active                   INTEGER DEFAULT 1,
      is_predefined               INTEGER DEFAULT 0,
      created_at                  TEXT DEFAULT (datetime('now')),
      updated_at                  TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };