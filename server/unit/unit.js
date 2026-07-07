const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS units (
      unit_id             INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id          INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      name                TEXT NOT NULL,
      symbol              TEXT NOT NULL,
      formal_name         TEXT,
      decimal_places      INTEGER DEFAULT 0,
      unit_quantity_code  TEXT,
      uqc_effective_date  TEXT,
      unit_type           TEXT DEFAULT 'Simple',
      is_simple           INTEGER DEFAULT 1,
      is_active           INTEGER DEFAULT 1,
      is_predefined       INTEGER DEFAULT 0,
      first_unit_id       INTEGER REFERENCES units(unit_id),
      second_unit_id      INTEGER REFERENCES units(unit_id),
      conversion_factor   REAL DEFAULT 1,
      created_at          TEXT DEFAULT (datetime('now')),
      updated_at          TEXT DEFAULT (datetime('now'))
    )
  `);

  // Add compound-unit columns if they don't exist (migration for existing DBs)
  try {
    await db.execute(`ALTER TABLE units ADD COLUMN first_unit_id INTEGER REFERENCES units(unit_id)`);
  } catch (e) { /* ignore if already exists */ }
  try {
    await db.execute(`ALTER TABLE units ADD COLUMN second_unit_id INTEGER REFERENCES units(unit_id)`);
  } catch (e) { /* ignore if already exists */ }
  try {
    await db.execute(`ALTER TABLE units ADD COLUMN conversion_factor REAL DEFAULT 1`);
  } catch (e) { /* ignore if already exists */ }
  try {
    await db.execute(`ALTER TABLE units ADD COLUMN uqc_effective_date TEXT`);
  } catch (e) { /* ignore if already exists */ }

  // Units are no longer pre-seeded. Retire any predefined units left behind by
  // earlier versions so the List of Units shows only user-created units. Soft-delete
  // (is_active = 0) rather than DELETE to avoid breaking stock items that may
  // already reference them. Idempotent — safe to run on every boot.
  try {
    await db.execute(`UPDATE units SET is_active = 0 WHERE is_predefined = 1 AND is_active = 1`);
  } catch (e) { /* ignore */ }
};

module.exports = { init };