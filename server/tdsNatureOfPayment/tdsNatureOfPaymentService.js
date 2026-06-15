const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { tdsNatureOfPayment } = require('../db/schema');

// Fetch a single tds_nature_of_payment row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${tdsNatureOfPayment} WHERE ${whereSql}`);
  return rows[0];
};

module.exports = {
  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT * FROM ${tdsNatureOfPayment}
            WHERE ${tdsNatureOfPayment.companyId} = ${data.company_id}
              AND LOWER(${tdsNatureOfPayment.name}) = LOWER(${data.name})
              AND ${tdsNatureOfPayment.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: 'TDS Nature of Payment already exists' };

      const inserted = await db
        .insert(tdsNatureOfPayment)
        .values({
          companyId: data.company_id,
          name: data.name,
          section: data.section || null,
          paymentCode: data.payment_code || null,
          remittanceCode: data.remittance_code || null,
          rateIndividualWithPan: data.rate_individual_with_pan ?? 0,
          rateOtherWithPan: data.rate_other_with_pan ?? 0,
          isZeroRated: data.is_zero_rated ?? 0,
          thresholdLimit: data.threshold_limit ?? 0,
          isPredefined: 0,
          isActive: 1,
        })
        .returning({ id: tdsNatureOfPayment.tdsId });

      const record = await findRow(sql`${tdsNatureOfPayment.tdsId} = ${inserted[0].id}`);
      return { success: true, tdsNatureOfPayment: record };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${tdsNatureOfPayment}
            WHERE ${tdsNatureOfPayment.companyId} = ${company_id}
              AND ${tdsNatureOfPayment.isActive} = 1`
      );
      return {
        success: true,
        tdsNatureOfPaymentList: rows,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const record = await findRow(sql`${tdsNatureOfPayment.tdsId} = ${id}`);
      if (!record) return { success: false, error: 'TDS Nature of Payment not found' };
      return { success: true, tdsNatureOfPayment: record };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const c = await findRow(sql`${tdsNatureOfPayment.tdsId} = ${data.tds_id}`);
      if (!c) return { success: false, error: 'TDS Nature of Payment not found' };

      await db
        .update(tdsNatureOfPayment)
        .set({
          name: data.name ?? c.name,
          section: data.section ?? c.section,
          paymentCode: data.payment_code ?? c.payment_code,
          remittanceCode: data.remittance_code ?? c.remittance_code,
          rateIndividualWithPan: data.rate_individual_with_pan ?? c.rate_individual_with_pan,
          rateOtherWithPan: data.rate_other_with_pan ?? c.rate_other_with_pan,
          isZeroRated: data.is_zero_rated ?? c.is_zero_rated,
          thresholdLimit: data.threshold_limit ?? c.threshold_limit,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(tdsNatureOfPayment.tdsId, data.tds_id));

      const updated = await findRow(sql`${tdsNatureOfPayment.tdsId} = ${data.tds_id}`);
      return { success: true, tdsNatureOfPayment: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${tdsNatureOfPayment.tdsId} = ${id}`);
      if (!existing) return { success: false, error: 'TDS Nature of Payment not found' };

      await db
        .update(tdsNatureOfPayment)
        .set({ isActive: 0 })
        .where(eq(tdsNatureOfPayment.tdsId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
