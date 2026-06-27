// Excise Duty Classification master (TallyPrime Statutory Master, issue #140).
// A classification has a name, a duty code (chosen from the List of Excise Duty
// Codes — e.g. CENVAT, EDU_CESS, NCCD …) and a multi-row "Calculation method"
// list: one or more methods ("On Assessable Value" / "Basic Excise Duty") added
// until "End of List" -> excise_duty_calculation_methods. Child rows are removed
// via ON DELETE CASCADE when the parent is hard deleted; soft delete
// (is_active = 0) leaves them intact.
const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS excise_duty_classifications (
      excise_duty_classification_id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id          INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      name                TEXT NOT NULL,
      duty_code           TEXT,
      is_active           INTEGER DEFAULT 1,
      created_at          TEXT DEFAULT (datetime('now')),
      updated_at          TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS excise_duty_calculation_methods (
      id                            INTEGER PRIMARY KEY AUTOINCREMENT,
      excise_duty_classification_id INTEGER NOT NULL REFERENCES excise_duty_classifications(excise_duty_classification_id) ON DELETE CASCADE,
      method                        TEXT NOT NULL,
      sort_order                    INTEGER DEFAULT 0
    )
  `);
};

module.exports = { init };
