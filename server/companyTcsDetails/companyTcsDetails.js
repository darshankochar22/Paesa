const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS company_tcs_details (
      company_id                    INTEGER PRIMARY KEY REFERENCES companies(company_id) ON DELETE CASCADE,
      tan_reg_number                TEXT,
      tan                           TEXT,
      collector_type                 TEXT DEFAULT 'Company',
      collector_branch               TEXT,
      set_alter_person_responsible  INTEGER DEFAULT 0,
      person_responsible_name       TEXT,
      person_responsible_son_daughter_of TEXT,
      person_responsible_designation TEXT,
      person_responsible_pan        TEXT,
      person_responsible_flat_no        TEXT,
      person_responsible_premises       TEXT,
      person_responsible_road           TEXT,
      person_responsible_area           TEXT,
      person_responsible_city           TEXT,
      person_responsible_state          TEXT,
      person_responsible_pincode        TEXT,
      person_responsible_phone      TEXT,
      person_responsible_std_code       TEXT,
      person_responsible_telephone      TEXT,
      person_responsible_email      TEXT,
      ignore_it_exemption           INTEGER DEFAULT 1,
      created_at                    TEXT DEFAULT (datetime('now')),
      updated_at                    TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migration: add missing columns if table already existed without them
  try {
    const info = await db.execute("PRAGMA table_info(company_tcs_details)");
    const existingColumns = info.rows.map(r => r.name);
    
    const columnsToAdd = [
      { name: 'person_responsible_son_daughter_of', type: 'TEXT' },
      { name: 'person_responsible_flat_no', type: 'TEXT' },
      { name: 'person_responsible_premises', type: 'TEXT' },
      { name: 'person_responsible_road', type: 'TEXT' },
      { name: 'person_responsible_area', type: 'TEXT' },
      { name: 'person_responsible_city', type: 'TEXT' },
      { name: 'person_responsible_state', type: 'TEXT' },
      { name: 'person_responsible_pincode', type: 'TEXT' },
      { name: 'person_responsible_std_code', type: 'TEXT' },
      { name: 'person_responsible_telephone', type: 'TEXT' }
    ];

    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        await db.execute(`ALTER TABLE company_tcs_details ADD COLUMN ${col.name} ${col.type}`);
      }
    }
  } catch (err) {
    console.error("Failed to run migrations for company_tcs_details:", err);
  }
};

module.exports = { init };
