const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS pay_heads (
      pay_head_id             INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id              INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      name                    TEXT NOT NULL,
      alias                   TEXT,
      pay_head_type           TEXT DEFAULT 'Earnings for Employees',
      income_type             TEXT DEFAULT 'Fixed',
      under_group             TEXT,
      affects_net_salary      INTEGER DEFAULT 1,
      payslip_display_name    TEXT,
      use_for_gratuity        INTEGER DEFAULT 0,
      set_alter_income_tax    INTEGER DEFAULT 0,
      calculation_type        TEXT DEFAULT 'As User Defined Value',
      calculation_period      TEXT DEFAULT 'Months',
      rounding_method         TEXT DEFAULT 'Not Applicable',
      rounding_limit          REAL DEFAULT 0,
      statutory_component     TEXT,
      percentage_or_amount    REAL DEFAULT 0,
      is_active               INTEGER DEFAULT 1,
      is_predefined           INTEGER DEFAULT 0,
      created_at              TEXT DEFAULT (datetime('now')),
      updated_at              TEXT DEFAULT (datetime('now'))
    )
  `);

  for (const col of ['alias', 'income_type', 'payslip_display_name', 'use_for_gratuity',
    'set_alter_income_tax', 'calculation_period', 'rounding_method', 'rounding_limit']) {
    try { await db.execute(`ALTER TABLE pay_heads ADD COLUMN ${col} TEXT`); } catch (_) {}
  }

  // Issue #153 — additional TallyPrime pay-head fields.
  const newCols = [
    ['statutory_pay_type', 'TEXT'],
    ['compute_method', "TEXT DEFAULT 'On Current Earnings Total'"],
    ['registration_number', 'TEXT'],
    ['contribute_min_rs2', 'INTEGER DEFAULT 0'],
    ['leave_without_pay', 'TEXT'],
    ['production_type', 'TEXT'],
    ['opening_balance', 'REAL DEFAULT 0'],
    ['opening_balance_type', "TEXT DEFAULT 'Dr'"],
    ['it_component', 'TEXT'],
    ['it_calculation_basis', 'TEXT'],
    ['it_deduct_tds_across_periods', 'INTEGER DEFAULT 0'],
    ['gratuity_days_per_month', 'REAL DEFAULT 0'],
  ];
  for (const [col, type] of newCols) {
    try { await db.execute(`ALTER TABLE pay_heads ADD COLUMN ${col} ${type}`); } catch (_) {}
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pay_head_gratuity_slabs (
      gratuity_slab_id  INTEGER PRIMARY KEY AUTOINCREMENT,
      pay_head_id       INTEGER NOT NULL REFERENCES pay_heads(pay_head_id) ON DELETE CASCADE,
      months_from       INTEGER,
      months_to         INTEGER,
      eligibility_days  REAL DEFAULT 0,
      created_at        TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pay_head_slab_lines (
      slab_line_id      INTEGER PRIMARY KEY AUTOINCREMENT,
      pay_head_id       INTEGER NOT NULL REFERENCES pay_heads(pay_head_id) ON DELETE CASCADE,
      effective_from    TEXT,
      amount_gt         REAL DEFAULT 0,
      amount_up_to      REAL DEFAULT 0,
      slab_type         TEXT,
      value             REAL DEFAULT 0,
      created_at        TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pay_head_formula_lines (
      formula_line_id   INTEGER PRIMARY KEY AUTOINCREMENT,
      pay_head_id       INTEGER NOT NULL REFERENCES pay_heads(pay_head_id) ON DELETE CASCADE,
      sequence          INTEGER DEFAULT 0,
      function          TEXT,
      pay_head_id_ref   INTEGER REFERENCES pay_heads(pay_head_id),
      operator          TEXT,
      created_at        TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };