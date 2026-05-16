const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS employees (
      employee_id       INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id        INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      employee_group_id INTEGER REFERENCES employee_groups(employee_group_id),
      name              TEXT NOT NULL,
      employee_code     TEXT,
      designation       TEXT,
      department        TEXT,
      date_of_joining   TEXT,
      date_of_leaving   TEXT,
      mobile            TEXT,
      email             TEXT,
      bank_account_number TEXT,
      ifsc_code         TEXT,
      pan               TEXT,
      aadhaar           TEXT,
      is_active         INTEGER DEFAULT 1,
      created_at        TEXT DEFAULT (datetime('now')),
      updated_at        TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };