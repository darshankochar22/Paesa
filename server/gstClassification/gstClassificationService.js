const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { gstClassifications } = require('../db/schema');

// Fetch gst_classification rows in the legacy snake_case shape via db.all so the
// returned object keys (gc_id, is_predefined, gst_rate_details, ...) and numeric
// 0/1 flags match exactly what the controllers/tests assert against.
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${gstClassifications} WHERE ${whereSql}`);
  return rows[0];
};

const parseSlabRows = (classification) => {
  if (!classification) return classification;
  const result = { ...classification };
  if (typeof result.gst_rate_details === 'string' && result.gst_rate_details.trim()) {
    try {
      result.slab_rows = JSON.parse(result.gst_rate_details);
    } catch (err) {
      result.slab_rows = undefined;
    }
  } else {
    result.slab_rows = undefined;
  }
  return result;
};

const seedDefaultGSTClassifications = async (company_id) => {
  const defaults = [
    {
      name: 'GST 0%',
      igst_rate: 0,
      cgst_rate: 0,
      sgst_rate: 0,
      cess_rate: 0,
      taxability: 'Taxable',
      nature_of_transaction: 'Not Applicable',
    },
    {
      name: 'GST 5%',
      igst_rate: 5,
      cgst_rate: 2.5,
      sgst_rate: 2.5,
      cess_rate: 0,
      taxability: 'Taxable',
      nature_of_transaction: 'Not Applicable',
    },
    {
      name: 'GST 12%',
      igst_rate: 12,
      cgst_rate: 6,
      sgst_rate: 6,
      cess_rate: 0,
      taxability: 'Taxable',
      nature_of_transaction: 'Not Applicable',
    },
    {
      name: 'GST 18%',
      igst_rate: 18,
      cgst_rate: 9,
      sgst_rate: 9,
      cess_rate: 0,
      taxability: 'Taxable',
      nature_of_transaction: 'Not Applicable',
    },
    {
      name: 'GST 28%',
      igst_rate: 28,
      cgst_rate: 14,
      sgst_rate: 14,
      cess_rate: 0,
      taxability: 'Taxable',
      nature_of_transaction: 'Not Applicable',
    },
    {
      name: 'Exempt',
      igst_rate: 0,
      cgst_rate: 0,
      sgst_rate: 0,
      cess_rate: 0,
      taxability: 'Exempt',
      nature_of_transaction: 'Not Applicable',
    },
    {
      name: 'Nil Rated',
      igst_rate: 0,
      cgst_rate: 0,
      sgst_rate: 0,
      cess_rate: 0,
      taxability: 'Nil Rated',
      nature_of_transaction: 'Not Applicable',
    },
    {
      name: 'Non GST',
      igst_rate: 0,
      cgst_rate: 0,
      sgst_rate: 0,
      cess_rate: 0,
      taxability: 'Unknown',
      nature_of_transaction: 'Not Applicable',
      is_non_gst_goods: 1,
    },
  ];

  for (const g of defaults) {
    await db.insert(gstClassifications).values({
      companyId: company_id,
      name: g.name,
      description: null,
      hsnSacCode: null,
      isNonGstGoods: g.is_non_gst_goods ?? 0,
      natureOfTransaction: g.nature_of_transaction,
      taxability: g.taxability,
      isReverseCharge: 0,
      isIneligibleForItc: 0,
      rateType: 'Fixed Rate',
      igstRate: g.igst_rate,
      igstValuationType: 'Based on Value',
      cgstRate: g.cgst_rate,
      cgstValuationType: 'Based on Value',
      sgstRate: g.sgst_rate,
      sgstValuationType: 'Based on Value',
      cessRate: g.cess_rate,
      cessValuationType: 'Based on Value',
      isPredefined: 1,
      isActive: 1,
    });
  }
};

module.exports = {
  seedDefaultGSTClassifications,

  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT * FROM ${gstClassifications}
            WHERE ${gstClassifications.companyId} = ${data.company_id}
              AND LOWER(${gstClassifications.name}) = LOWER(${data.name})
              AND ${gstClassifications.isActive} = 1`,
      );
      if (exists.length > 0) return { success: false, error: 'GST Classification already exists' };

      const inserted = await db
        .insert(gstClassifications)
        .values({
          companyId: data.company_id,
          name: data.name,
          description: data.description || null,
          hsnSacCode: data.hsn_sac_code || null,
          isNonGstGoods: data.is_non_gst_goods ?? 0,
          natureOfTransaction: data.nature_of_transaction || 'Not Applicable',
          taxability: data.taxability || 'Unknown',
          isReverseCharge: data.is_reverse_charge ?? 0,
          isIneligibleForItc: data.is_ineligible_for_itc ?? 0,
          rateType: data.rate_type || 'Fixed Rate',
          igstRate: data.igst_rate ?? 0,
          igstValuationType: data.igst_valuation_type || 'Based on Value',
          cgstRate: data.cgst_rate ?? 0,
          cgstValuationType: data.cgst_valuation_type || 'Based on Value',
          sgstRate: data.sgst_rate ?? 0,
          sgstValuationType: data.sgst_valuation_type || 'Based on Value',
          cessRate: data.cess_rate ?? 0,
          cessValuationType: data.cess_valuation_type || 'Based on Value',
          gstRateDetails:
            data.rate_type === 'Slab Based' && Array.isArray(data.slab_rows)
              ? JSON.stringify(data.slab_rows)
              : null,
          isPredefined: 0,
          isActive: 1,
        })
        .returning({ id: gstClassifications.gcId });

      const classification = await findRow(sql`${gstClassifications.gcId} = ${inserted[0].id}`);
      return { success: true, classification: parseSlabRows(classification) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${gstClassifications}
            WHERE ${gstClassifications.companyId} = ${company_id}
              AND ${gstClassifications.isActive} = 1`,
      );
      return {
        success: true,
        gstClassifications: rows.map(parseSlabRows),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const classification = await findRow(sql`${gstClassifications.gcId} = ${id}`);
      if (!classification) return { success: false, error: 'GST Classification not found' };
      return { success: true, classification: parseSlabRows(classification) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const c = await findRow(sql`${gstClassifications.gcId} = ${data.gc_id}`);
      if (!c) return { success: false, error: 'GST Classification not found' };
      if (c.is_predefined)
        return { success: false, error: 'Cannot edit predefined GST classifications' };

      await db
        .update(gstClassifications)
        .set({
          name: data.name ?? c.name,
          description: data.description ?? c.description,
          hsnSacCode: data.hsn_sac_code ?? c.hsn_sac_code,
          isNonGstGoods: data.is_non_gst_goods ?? c.is_non_gst_goods,
          natureOfTransaction: data.nature_of_transaction ?? c.nature_of_transaction,
          taxability: data.taxability ?? c.taxability,
          isReverseCharge: data.is_reverse_charge ?? c.is_reverse_charge,
          isIneligibleForItc: data.is_ineligible_for_itc ?? c.is_ineligible_for_itc,
          rateType: data.rate_type ?? c.rate_type,
          igstRate: data.igst_rate ?? c.igst_rate,
          igstValuationType: data.igst_valuation_type ?? c.igst_valuation_type,
          cgstRate: data.cgst_rate ?? c.cgst_rate,
          cgstValuationType: data.cgst_valuation_type ?? c.cgst_valuation_type,
          sgstRate: data.sgst_rate ?? c.sgst_rate,
          sgstValuationType: data.sgst_valuation_type ?? c.sgst_valuation_type,
          cessRate: data.cess_rate ?? c.cess_rate,
          cessValuationType: data.cess_valuation_type ?? c.cess_valuation_type,
          gstRateDetails:
            data.rate_type === 'Slab Based' && Array.isArray(data.slab_rows)
              ? JSON.stringify(data.slab_rows)
              : c.gst_rate_details || null,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(gstClassifications.gcId, data.gc_id));

      const updated = await findRow(sql`${gstClassifications.gcId} = ${data.gc_id}`);
      return { success: true, classification: parseSlabRows(updated) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${gstClassifications.gcId} = ${id}`);
      if (!existing) return { success: false, error: 'GST Classification not found' };
      // Predefined classifications may be deleted (users can remove the seeded
      // slabs they don't want); only editing them stays blocked.

      await db
        .update(gstClassifications)
        .set({ isActive: 0 })
        .where(eq(gstClassifications.gcId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
