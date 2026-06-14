const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS company_pan_cin_details (
      company_id                    INTEGER PRIMARY KEY REFERENCES companies(company_id) ON DELETE CASCADE,
      pan                           TEXT,
      cin                           TEXT,
      created_at                    TEXT DEFAULT (datetime('now')),
      updated_at                    TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };
