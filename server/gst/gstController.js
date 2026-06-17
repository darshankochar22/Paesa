const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { gstHsnRates } = require('../db/schema');
const gstTaxEngine = require('./gstTaxEngine');
const gstr1Service = require('./gstr1Service');
const gstr3bService = require('./gstr3bService');
const annualComputationService = require('./annualComputationService');

module.exports = {
  computeTax: async (event, data) => {
    try {
      const result = await gstTaxEngine.computeVoucherTaxLines(db, data);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  generateGSTR1: async (event, { company_id, fy_id, return_period }) => {
    return await gstr1Service.generateGSTR1(company_id, fy_id, return_period);
  },

  getGSTR1: async (event, { company_id, fy_id, return_period }) => {
    return await gstr1Service.getGSTR1(company_id, fy_id, return_period);
  },

  generateGSTR3B: async (event, { company_id, fy_id, return_period }) => {
    return await gstr3bService.generateGSTR3B(company_id, fy_id, return_period);
  },

  getGSTR3B: async (event, { company_id, fy_id, return_period }) => {
    return await gstr3bService.getGSTR3B(company_id, fy_id, return_period);
  },

  getAnnualComputation: async (event, { company_id, fy_id }) => {
    return await annualComputationService.generateAnnualComputation(company_id, fy_id);
  },

  getHSNRates: async (event, company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${gstHsnRates}
            WHERE ${gstHsnRates.companyId} = ${company_id}
            ORDER BY ${gstHsnRates.hsnCode}, ${gstHsnRates.effectiveFrom} DESC`
      );
      return { success: true, hsnRates: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  upsertHSNRate: async (event, data) => {
    try {
      const {
        rate_id,
        company_id,
        hsn_code,
        effective_from,
        effective_to,
        taxability,
        gst_rate,
        cgst_rate,
        sgst_rate,
        igst_rate,
        cess_rate,
        type_of_supply
      } = data;

      if (!company_id || !hsn_code || !effective_from) {
        return { success: false, error: "company_id, hsn_code, and effective_from are required fields" };
      }

      if (rate_id) {
        await db
          .update(gstHsnRates)
          .set({
            hsnCode: hsn_code,
            effectiveFrom: effective_from,
            effectiveTo: effective_to || null,
            taxability: taxability || 'Taxable',
            gstRate: gst_rate || 0,
            cgstRate: cgst_rate || 0,
            sgstRate: sgst_rate || 0,
            igstRate: igst_rate || 0,
            cessRate: cess_rate || 0,
            typeOfSupply: type_of_supply || 'Goods',
          })
          .where(and(eq(gstHsnRates.rateId, rate_id), eq(gstHsnRates.companyId, company_id)));
      } else {
        await db.insert(gstHsnRates).values({
          companyId: company_id,
          hsnCode: hsn_code,
          effectiveFrom: effective_from,
          effectiveTo: effective_to || null,
          taxability: taxability || 'Taxable',
          gstRate: gst_rate || 0,
          cgstRate: cgst_rate || 0,
          sgstRate: sgst_rate || 0,
          igstRate: igst_rate || 0,
          cessRate: cess_rate || 0,
          typeOfSupply: type_of_supply || 'Goods',
        });
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  deleteHSNRate: async (event, { rate_id, company_id }) => {
    try {
      await db
        .delete(gstHsnRates)
        .where(and(eq(gstHsnRates.rateId, rate_id), eq(gstHsnRates.companyId, company_id)));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};
