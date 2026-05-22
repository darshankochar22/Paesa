const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS employees (
      employee_id          INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id           INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      employee_category_id INTEGER REFERENCES employee_categories(employee_category_id),
      employee_group_id    INTEGER REFERENCES employee_groups(employee_group_id),
      name                 TEXT NOT NULL,
      alias                TEXT,
      employee_code        TEXT,
      designation          TEXT,
      department           TEXT,
      function             TEXT,
      location             TEXT,
      date_of_joining      TEXT,
      date_of_leaving      TEXT,
      date_of_birth        TEXT,
      gender               TEXT,
      blood_group          TEXT,
      father_name          TEXT,
      mother_name          TEXT,
      spouse_name          TEXT,
      address              TEXT,
      city                 TEXT,
      state                TEXT,
      pincode              TEXT,
      mobile               TEXT,
      phone                TEXT,
      email                TEXT,
      define_salary_details INTEGER DEFAULT 0,
      bank_account_number  TEXT,
      bank_name            TEXT,
      bank_branch          TEXT,
      ifsc_code            TEXT,
      applicable_tax_regime TEXT,
      pan                  TEXT,
      aadhaar              TEXT,
      uan                  TEXT,
      pf_account_number    TEXT,
      eps_account_number   TEXT,
      date_of_joining_pf   TEXT,
      pran                 TEXT,
      esi_number           TEXT,
      esi_dispensary_name  TEXT,
      is_active            INTEGER DEFAULT 1,
      created_at           TEXT DEFAULT (datetime('now')),
      updated_at           TEXT DEFAULT (datetime('now'))
    )
  `);

  const cols = [
    'alias', 'function', 'location', 'date_of_birth', 'gender', 'blood_group',
    'father_name', 'mother_name', 'spouse_name', 'address', 'city', 'state',
    'pincode', 'phone', 'define_salary_details', 'bank_name', 'bank_branch',
    'applicable_tax_regime', 'uan', 'pf_account_number', 'eps_account_number',
    'date_of_joining_pf', 'pran', 'esi_number', 'esi_dispensary_name'
  ];
  for (const col of cols) {
    try {
      await db.execute(`ALTER TABLE employees ADD COLUMN ${col} TEXT`);
    } catch (_) {}
  }
  try {
    await db.execute('ALTER TABLE employees ADD COLUMN employee_category_id INTEGER REFERENCES employee_categories(employee_category_id)');
  } catch (_) {}
};

module.exports = { init };