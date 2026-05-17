const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS salary_structures (
      structure_id      INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id        INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      employee_id       INTEGER NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
      effective_from    TEXT NOT NULL,
      pay_head_id       INTEGER NOT NULL REFERENCES pay_heads(pay_head_id) ON DELETE CASCADE,
      amount            REAL DEFAULT 0,
      calculation_mode  TEXT DEFAULT 'Flat Rate',
      is_active         INTEGER DEFAULT 1,
      created_at        TEXT DEFAULT (datetime('now')),
      updated_at        TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };