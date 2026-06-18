const { db } = require("../db/index");
const { sql, eq } = require("drizzle-orm");
const { exciseTariffDetails } = require("../db/schema");

const findTariffRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${exciseTariffDetails} WHERE ${whereSql}`);
  return rows[0];
};

module.exports = {
  create: async (data) => {
    try {
      if (!data.tariff_description?.trim()) {
        return { success: false, error: "Tariff description is required" };
      }

      const inserted = await db
        .insert(exciseTariffDetails)
        .values({
          taxUnitId: data.tax_unit_id,
          tariffDescription: data.tariff_description,
          applicability: data.applicability || "All",
          tariffType: data.tariff_type || "Standard",
          particulars: data.particulars || null,
          igstRate: data.igst_rate || 0,
          cgstRate: data.cgst_rate || 0,
          sgstRate: data.sgst_rate || 0,
        })
        .returning({ id: exciseTariffDetails.tariffDetailId });

      const tariff = await findTariffRow(
        sql`${exciseTariffDetails.tariffDetailId} = ${inserted[0].id}`
      );
      return { success: true, tariff };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByTaxUnitId: async (tax_unit_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${exciseTariffDetails}
            WHERE ${exciseTariffDetails.taxUnitId} = ${tax_unit_id}
            ORDER BY ${exciseTariffDetails.createdAt} DESC`
      );
      return { success: true, tariffs: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const tariff = await findTariffRow(
        sql`${exciseTariffDetails.tariffDetailId} = ${id}`
      );
      if (!tariff) return { success: false, error: "Tariff detail not found" };
      return { success: true, tariff };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const tariff = await findTariffRow(
        sql`${exciseTariffDetails.tariffDetailId} = ${data.tariff_detail_id}`
      );
      if (!tariff) return { success: false, error: "Tariff detail not found" };

      await db
        .update(exciseTariffDetails)
        .set({
          tariffDescription:
            data.tariff_description !== undefined
              ? data.tariff_description
              : tariff.tariff_description,
          applicability:
            data.applicability !== undefined ? data.applicability : tariff.applicability,
          tariffType:
            data.tariff_type !== undefined ? data.tariff_type : tariff.tariff_type,
          particulars:
            data.particulars !== undefined ? data.particulars : tariff.particulars,
          igstRate: data.igst_rate !== undefined ? data.igst_rate : tariff.igst_rate,
          cgstRate: data.cgst_rate !== undefined ? data.cgst_rate : tariff.cgst_rate,
          sgstRate: data.sgst_rate !== undefined ? data.sgst_rate : tariff.sgst_rate,
          updatedAt: sql`now()`,
        })
        .where(eq(exciseTariffDetails.tariffDetailId, data.tariff_detail_id));

      const updated = await findTariffRow(
        sql`${exciseTariffDetails.tariffDetailId} = ${data.tariff_detail_id}`
      );
      return { success: true, tariff: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findTariffRow(
        sql`${exciseTariffDetails.tariffDetailId} = ${id}`
      );
      if (!existing) return { success: false, error: "Tariff detail not found" };

      await db
        .delete(exciseTariffDetails)
        .where(eq(exciseTariffDetails.tariffDetailId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
