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
};

module.exports = { init };