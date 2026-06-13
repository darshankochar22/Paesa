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
      person_responsible_designation TEXT,
      person_responsible_pan        TEXT,
      person_responsible_phone      TEXT,
      person_responsible_email      TEXT,
      ignore_it_exemption           INTEGER DEFAULT 1,
      created_at                    TEXT DEFAULT (datetime('now')),
      updated_at                    TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };
