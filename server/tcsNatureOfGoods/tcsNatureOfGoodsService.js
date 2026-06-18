const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { tcsNatureOfGoods } = require('../db/schema');

// Fetch a single tcs_nature_of_goods row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${tcsNatureOfGoods} WHERE ${whereSql}`);
  return rows[0];
};

module.exports = {
  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT * FROM ${tcsNatureOfGoods}
            WHERE ${tcsNatureOfGoods.companyId} = ${data.company_id}
              AND LOWER(${tcsNatureOfGoods.name}) = LOWER(${data.name})
              AND ${tcsNatureOfGoods.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: 'TCS Nature of Goods already exists' };

      const inserted = await db
        .insert(tcsNatureOfGoods)
        .values({
          companyId: data.company_id,
          name: data.name,
          section: data.section || null,
          paymentCode: data.payment_code || null,
          rateIndividualWithPan: data.rate_individual_with_pan ?? 0,
          rateIndividualWithoutPan: data.rate_individual_without_pan ?? 0,
          rateOtherWithPan: data.rate_other_with_pan ?? 0,
          rateOtherWithoutPan: data.rate_other_without_pan ?? 0,
          isOwnStatus: data.is_own_status ?? 0,
          taxOnReceiptOrRealization:
            data.tax_on_receipt_or_realization || 'Tax Calculated on Receipt',
          thresholdLevel: data.threshold_level ?? data.threshold_limit ?? 0,
          isZeroRated: data.is_zero_rated ?? 0,
          isPredefined: 0,
          isActive: 1,
        })
        .returning({ id: tcsNatureOfGoods.tcsId });

      const record = await findRow(sql`${tcsNatureOfGoods.tcsId} = ${inserted[0].id}`);
      return { success: true, tcsNatureOfGoods: record };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${tcsNatureOfGoods}
            WHERE ${tcsNatureOfGoods.companyId} = ${company_id}
              AND ${tcsNatureOfGoods.isActive} = 1`
      );
      return {
        success: true,
        tcsNatureOfGoodsList: rows,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const record = await findRow(sql`${tcsNatureOfGoods.tcsId} = ${id}`);
      if (!record) return { success: false, error: 'TCS Nature of Goods not found' };
      return { success: true, tcsNatureOfGoods: record };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const c = await findRow(sql`${tcsNatureOfGoods.tcsId} = ${data.tcs_id}`);
      if (!c) return { success: false, error: 'TCS Nature of Goods not found' };

      await db
        .update(tcsNatureOfGoods)
        .set({
          name: data.name ?? c.name,
          section: data.section ?? c.section,
          paymentCode: data.payment_code ?? c.payment_code,
          rateIndividualWithPan: data.rate_individual_with_pan ?? c.rate_individual_with_pan,
          rateIndividualWithoutPan:
            data.rate_individual_without_pan ?? c.rate_individual_without_pan,
          rateOtherWithPan: data.rate_other_with_pan ?? c.rate_other_with_pan,
          rateOtherWithoutPan: data.rate_other_without_pan ?? c.rate_other_without_pan,
          isOwnStatus: data.is_own_status ?? c.is_own_status,
          taxOnReceiptOrRealization:
            data.tax_on_receipt_or_realization ?? c.tax_on_receipt_or_realization,
          thresholdLevel: data.threshold_level ?? data.threshold_limit ?? c.threshold_level,
          isZeroRated: data.is_zero_rated ?? c.is_zero_rated,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(tcsNatureOfGoods.tcsId, data.tcs_id));

      const updated = await findRow(sql`${tcsNatureOfGoods.tcsId} = ${data.tcs_id}`);
      return { success: true, tcsNatureOfGoods: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${tcsNatureOfGoods.tcsId} = ${id}`);
      if (!existing) return { success: false, error: 'TCS Nature of Goods not found' };

      await db
        .update(tcsNatureOfGoods)
        .set({ isActive: 0 })
        .where(eq(tcsNatureOfGoods.tcsId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
