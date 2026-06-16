// ---------------------------------------------------------------------------
// Drizzle ORM conversion — follows the currencyService GOLDEN EXEMPLAR pattern.
//
//   * Mutations (INSERT/UPDATE) use the query builder with the schema table
//     objects and eq()/and() predicates.
//   * Reads that return rows to callers use db.all(sql`SELECT ...`) so the
//     EXACT legacy shape is preserved: snake_case column keys (value_boolean,
//     is_enabled, feature_key, ...) and numeric 0/1 booleans, which callers /
//     the test oracle assert against. Column + table identifiers inside the
//     template come from the schema objects, not hardcoded strings.
// ---------------------------------------------------------------------------
const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { companyFeatureValues, featureItems } = require('../db/schema');

const DEFAULT_VALUES = [
  { feature_item_id: 1,  value_boolean: 1, is_enabled: 1 },
  { feature_item_id: 2,  value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 3,  value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 4,  value_boolean: 1, is_enabled: 1 },
  { feature_item_id: 5,  value_boolean: 1, is_enabled: 1 },
  { feature_item_id: 6,  value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 7,  value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 8,  value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 9,  value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 10, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 11, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 12, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 13, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 14, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 15, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 16, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 17, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 18, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 19, value_boolean: 0, is_enabled: 0 },
];

// Fetch a single feature-value row (by company + feature item) in the legacy
// snake_case shape, or undefined.
const findRow = async (company_id, feature_item_id) => {
  const rows = await db.all(
    sql`SELECT * FROM ${companyFeatureValues}
        WHERE ${companyFeatureValues.companyId} = ${company_id}
          AND ${companyFeatureValues.featureItemId} = ${feature_item_id}`
  );
  return rows[0];
};

const seedCompanyFeatureValues = async (company_id) => {
  for (const v of DEFAULT_VALUES) {
    await db
      .insert(companyFeatureValues)
      .values({
        companyId: company_id,
        featureItemId: v.feature_item_id,
        valueBoolean: v.value_boolean,
        valueText: null,
        valueNumber: null,
        valueDate: null,
        isEnabled: v.is_enabled,
      });
  }
};

module.exports = {
  seedCompanyFeatureValues,

  get: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT ${companyFeatureValues}.*,
                   ${featureItems.featureKey},
                   ${featureItems.featureName},
                   ${featureItems.featureGroupId}
            FROM ${companyFeatureValues}
            INNER JOIN ${featureItems}
              ON ${featureItems.featureItemId} = ${companyFeatureValues.featureItemId}
            WHERE ${companyFeatureValues.companyId} = ${company_id}`
      );
      if (rows.length === 0) return { success: false, error: 'No feature values found' };
      return { success: true, values: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByGroup: async (company_id, feature_group_id) => {
    try {
      const rows = await db.all(
        sql`SELECT ${companyFeatureValues}.*,
                   ${featureItems.featureKey},
                   ${featureItems.featureName}
            FROM ${companyFeatureValues}
            INNER JOIN ${featureItems}
              ON ${featureItems.featureItemId} = ${companyFeatureValues.featureItemId}
            WHERE ${companyFeatureValues.companyId} = ${company_id}
              AND ${featureItems.featureGroupId} = ${feature_group_id}`
      );
      return { success: true, values: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findRow(data.company_id, data.feature_item_id);
      if (!current) return { success: false, error: 'Feature value not found' };

      await db
        .update(companyFeatureValues)
        .set({
          valueBoolean: data.value_boolean ?? current.value_boolean,
          valueText: data.value_text ?? current.value_text,
          valueNumber: data.value_number ?? current.value_number,
          valueDate: data.value_date ?? current.value_date,
          isEnabled: data.is_enabled ?? current.is_enabled,
          updatedAt: sql`datetime('now')`,
        })
        .where(
          and(
            eq(companyFeatureValues.companyId, data.company_id),
            eq(companyFeatureValues.featureItemId, data.feature_item_id)
          )
        );

      const updated = await findRow(data.company_id, data.feature_item_id);
      return { success: true, value: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  updateBulk: async (company_id, values) => {
    try {
      const updated = [];
      for (const v of values) {
        const current = await findRow(company_id, v.feature_item_id);
        if (!current) continue;

        await db
          .update(companyFeatureValues)
          .set({
            valueBoolean: v.value_boolean ?? current.value_boolean,
            valueText: v.value_text ?? current.value_text,
            valueNumber: v.value_number ?? current.value_number,
            valueDate: v.value_date ?? current.value_date,
            isEnabled: v.is_enabled ?? current.is_enabled,
            updatedAt: sql`datetime('now')`,
          })
          .where(
            and(
              eq(companyFeatureValues.companyId, company_id),
              eq(companyFeatureValues.featureItemId, v.feature_item_id)
            )
          );

        const updatedRow = await findRow(company_id, v.feature_item_id);
        updated.push(updatedRow);
      }
      return { success: true, updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
