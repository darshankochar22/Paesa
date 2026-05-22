const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS employee_groups (
      employee_group_id   INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id          INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      employee_category_id INTEGER REFERENCES employee_categories(employee_category_id),
      name                TEXT NOT NULL,
      alias               TEXT,
      parent_group_id     INTEGER REFERENCES employee_groups(employee_group_id),
      is_active           INTEGER DEFAULT 1,
      is_predefined       INTEGER DEFAULT 0,
      created_at          TEXT DEFAULT (datetime('now')),
      updated_at          TEXT DEFAULT (datetime('now'))
    )
  `);

  try {
    await db.execute('ALTER TABLE employee_groups ADD COLUMN employee_category_id INTEGER REFERENCES employee_categories(employee_category_id)');
  } catch (_) {}
};

module.exports = { init };