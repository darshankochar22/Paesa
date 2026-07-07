const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { gstHsnRates } = require('../db/schema');
const gstTaxEngine = require('./gstTaxEngine');
const gstr1Service = require('./gstr1Service');
const gstr3bService = require('./gstr3bService');
const reconciliationService = require('./reconciliationService');

module.exports = {
  computeTax: async (event, data) => {
    try {
      const result = await gstTaxEngine.computeVoucherTaxLines(db, data);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  generateGSTR1: async (event, { company_id, fy_id, return_period, gst_registration_id }) => {
    return await gstr1Service.generateGSTR1(
      company_id,
      fy_id,
      return_period,
      gst_registration_id ?? null,
    );
  },

  getGSTR1: async (event, { company_id, fy_id, return_period, gst_registration_id }) => {
    return await gstr1Service.getGSTR1(
      company_id,
      fy_id,
      return_period,
      gst_registration_id ?? null,
    );
  },

  generateGSTR3B: async (event, { company_id, fy_id, return_period, gst_registration_id }) => {
    return await gstr3bService.generateGSTR3B(
      company_id,
      fy_id,
      return_period,
      gst_registration_id ?? null,
    );
  },

  getGSTR3B: async (event, { company_id, fy_id, return_period, gst_registration_id }) => {
    return await gstr3bService.getGSTR3B(
      company_id,
      fy_id,
      return_period,
      gst_registration_id ?? null,
    );
  },

  getAnnualComputation: async (event, { company_id, fy_id, gst_registration_id }) => {
    // Uses the shared drill-engine classifier (reconciliationService) so the report's
    // voucher counts + section amounts match the Statistics / Not-Relevant / Uncertain
    // drills exactly. The older annualComputationService payload shape did not match the
    // frontend contract (report rendered blank).
    return await reconciliationService.getAnnualComputation(company_id, fy_id, {
      gst_registration_id,
    });
  },

  getHSNRates: async (event, company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${gstHsnRates}
            WHERE ${gstHsnRates.companyId} = ${company_id}
            ORDER BY ${gstHsnRates.hsnCode}, ${gstHsnRates.effectiveFrom} DESC`,
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
        type_of_supply,
      } = data;

      if (!company_id || !hsn_code || !effective_from) {
        return {
          success: false,
          error: 'company_id, hsn_code, and effective_from are required fields',
        };
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
  },

  getGSTR1Reconciliation: async (event, { company_id, fy_id }) => {
    return await reconciliationService.getGSTR1Reconciliation(company_id, fy_id);
  },

  getGSTR2AReconciliation: async (event, { company_id, fy_id }) => {
    return await reconciliationService.getGSTR2AReconciliation(company_id, fy_id);
  },

  getGSTR2BReconciliation: async (event, { company_id, fy_id }) => {
    return await reconciliationService.getGSTR2BReconciliation(company_id, fy_id);
  },

  importGSTR2B: async (event, { company_id, fy_id, return_period, payload }) => {
    return await reconciliationService.importGSTR2B(company_id, fy_id, return_period, payload);
  },

  importGSTR2A: async (event, { company_id, fy_id, return_period, payload }) => {
    return await reconciliationService.importGSTR2A(company_id, fy_id, return_period, payload);
  },

  getGSTR1vs3BComparison: async (event, { company_id, fy_id }) => {
    return await reconciliationService.getGSTR1vs3BComparison(company_id, fy_id);
  },

  getIMSInwardSupplies: async (event, { company_id, fy_id }) => {
    return await reconciliationService.getIMSInwardSupplies(company_id, fy_id);
  },

  getChallanReconciliation: async (event, { company_id, fy_id }) => {
    return await reconciliationService.getChallanReconciliation(company_id, fy_id);
  },

  getGstRateSetup: async (event, { company_id, master_type }) => {
    return await reconciliationService.getGstRateSetup(company_id, master_type);
  },

  validatePartyGstin: async (event, { company_id, group_name, ledger_name }) => {
    return await reconciliationService.validatePartyGstin(company_id, { group_name, ledger_name });
  },

  createPartiesFromGstin: async (event, { company_id, gstins, group_name }) => {
    return await reconciliationService.createPartiesFromGstin(company_id, { gstins, group_name });
  },

  getGstOpeningAdvances: async (event, { company_id }) => {
    return await reconciliationService.getGstOpeningAdvances(company_id);
  },

  createGstOpeningAdvance: async (event, { company_id, ...data }) => {
    return await reconciliationService.createGstOpeningAdvance(company_id, data);
  },

  deleteGstOpeningAdvance: async (event, { advance_id, company_id }) => {
    return await reconciliationService.deleteGstOpeningAdvance(advance_id, company_id);
  },

  getMarkedVouchers: async (event, { company_id, fy_id }) => {
    return await reconciliationService.getMarkedVouchers(company_id, fy_id);
  },

  getGstAdvancesReport: async (event, { company_id, fy_id, type }) => {
    return await reconciliationService.getGstAdvancesReport(company_id, fy_id, type);
  },

  getReverseChargeSupplies: async (event, { company_id, fy_id }) => {
    return await reconciliationService.getReverseChargeSupplies(company_id, fy_id);
  },

  getReturnActivities: async (event, { company_id, fy_id }) => {
    return await reconciliationService.getReturnActivities(company_id, fy_id);
  },

  getReturnStatistics: async (
    event,
    { company_id, fy_id, return_period, return_type, gst_registration_id, annual },
  ) => {
    return await reconciliationService.getReturnStatistics(company_id, fy_id, return_period, {
      return_type,
      gst_registration_id,
      annual,
    });
  },

  getReturnVouchers: async (
    event,
    {
      company_id,
      fy_id,
      return_period,
      return_type,
      gst_registration_id,
      bucket,
      category,
      voucher_type,
      section,
      annual,
      direction,
      annual_category,
      exception,
    },
  ) => {
    return await reconciliationService.getReturnVouchers(company_id, fy_id, return_period, {
      return_type,
      gst_registration_id,
      bucket,
      category,
      voucher_type,
      section,
      annual,
      direction,
      annual_category,
      exception,
    });
  },

  getAnnualSectionBreakdown: async (event, { company_id, fy_id, gst_registration_id, path }) => {
    return await reconciliationService.getAnnualSectionBreakdown(company_id, fy_id, {
      gst_registration_id,
      path,
    });
  },

  getAnnualMonthly: async (event, { company_id, fy_id, gst_registration_id, category, month }) => {
    return await reconciliationService.getAnnualMonthly(company_id, fy_id, {
      gst_registration_id,
      category,
      month,
    });
  },

  getNotRelevantBreakdown: async (
    event,
    { company_id, fy_id, return_period, return_type, gst_registration_id, annual },
  ) => {
    return await reconciliationService.getNotRelevantBreakdown(company_id, fy_id, return_period, {
      return_type,
      gst_registration_id,
      annual,
    });
  },
};
