// ---------------------------------------------------------------------------
// Drizzle ORM conversion (follows the currencyService golden exemplar).
//
//   * MUTATIONS use the query builder: db.insert(...).values(...),
//     db.update(...).set(...).where(...).
//   * READS THAT RETURN ROWS TO CALLERS use db.all(sql`SELECT * FROM ${table}
//     WHERE ...`) so the legacy snake_case column keys and numeric 0/1 flag
//     values are preserved exactly (the test oracle asserts against them).
//   * The 0/1 flag columns are raw integers (no boolean mode), matching the
//     SQLite ground truth and the original raw SQL.
// ---------------------------------------------------------------------------
const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { companyCreationSuccess } = require('../db/schema');

// Fetch a single record in the legacy snake_case shape (or undefined).
const findRow = async (company_id) => {
  const rows = await db.all(
    sql`SELECT * FROM ${companyCreationSuccess}
        WHERE ${companyCreationSuccess.companyId} = ${company_id}`
  );
  return rows[0];
};

const seedCompanyCreationSuccess = async (company_id) => {
  await db
    .insert(companyCreationSuccess)
    .values({
      companyId: company_id,
      createdSuccessfully: 1,
      successScreenShown: 0,
      showMoreFeatures: 0,
      showAllFeatures: 0,
      defaultFeaturesLoaded: 1,
      featureSetupCompleted: 0,
    });
};

module.exports = {
  seedCompanyCreationSuccess,

  get: async (company_id) => {
    try {
      const record = await findRow(company_id);
      if (!record) return { success: false, error: 'Record not found' };
      return { success: true, record };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findRow(data.company_id);
      if (!current) return { success: false, error: 'Record not found' };

      await db
        .update(companyCreationSuccess)
        .set({
          createdSuccessfully: data.created_successfully ?? current.created_successfully,
          successScreenShown: data.success_screen_shown ?? current.success_screen_shown,
          showMoreFeatures: data.show_more_features ?? current.show_more_features,
          showAllFeatures: data.show_all_features ?? current.show_all_features,
          defaultFeaturesLoaded: data.default_features_loaded ?? current.default_features_loaded,
          featureSetupCompleted: data.feature_setup_completed ?? current.feature_setup_completed,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(companyCreationSuccess.companyId, data.company_id));

      const updated = await findRow(data.company_id);
      return { success: true, record: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
