const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { companyGstDetails } = require('../db/schema');

const get = async (company_id) => {
  try {
    // Read in the legacy snake_case shape (db.all returns raw column keys),
    // so the field mapping below stays identical to the original service.
    const rows = await db.all(
      sql`SELECT * FROM ${companyGstDetails}
          WHERE ${companyGstDetails.companyId} = ${company_id}
          LIMIT 1`
    );

    if (!rows || rows.length === 0) {
      return {
        success: true,
        exists: false,
        data: {
          hsnSacType: 'Not Defined',
          hsnSacCode: '',
          description: '',
          taxabilityType: 'Not Defined',
          gstRate: 0,
          interstateThresholdLimit: 50000,
          intrastateThresholdLimit: 50000,
          thresholdLimitIncludes: 'Value of Invoice',
          createHSNSummaryFor: 'All Sections',
          minimumHSNLength: 4,
          showGSTAdvances: false,
          updateGSTStatus: false,
          gstReturnsConfigured: false,
          effectiveDate: '1-Apr-26',
          downloadGSTRegistration: '',
          downloadReturnType: 'All Returns',
          setStateWiseThresholdLimit: false,
          stateWiseLimits: [],
          gstAdvancesApplicableFrom: '',
        },
      };
    }

    const record = rows[0];
    return {
      success: true,
      exists: true,
      data: {
        hsnSacType: record.hsn_sac_type,
        hsnSacCode: record.hsn_sac_code || '',
        description: record.description || '',
        taxabilityType: record.taxability_type,
        gstRate: record.gst_rate,
        interstateThresholdLimit: record.interstate_threshold_limit,
        intrastateThresholdLimit: record.intrastate_threshold_limit,
        thresholdLimitIncludes: record.threshold_limit_includes,
        createHSNSummaryFor: record.create_hsn_summary_for,
        minimumHSNLength: record.minimum_hsn_length,
        showGSTAdvances: record.show_gst_advances === 1 || record.show_gst_advances === true || String(record.show_gst_advances) === 'true',
        updateGSTStatus: record.update_gst_status === 1 || record.update_gst_status === true || String(record.update_gst_status) === 'true',
        gstReturnsConfigured: record.gst_returns_configured === 1 || record.gst_returns_configured === true || String(record.gst_returns_configured) === 'true',
        effectiveDate: record.effective_date || '1-Apr-26',
        downloadGSTRegistration: record.download_gst_registration || '',
        downloadReturnType: record.download_return_type || 'All Returns',
        setStateWiseThresholdLimit: record.set_state_wise_threshold_limit === 1 || record.set_state_wise_threshold_limit === true || String(record.set_state_wise_threshold_limit) === 'true',
        stateWiseLimits: record.state_wise_limits ? JSON.parse(record.state_wise_limits) : [],
        gstAdvancesApplicableFrom: record.gst_advances_applicable_from || '',
      },
    };
  } catch (err) {
    console.error('Error fetching company GST details:', err);
    return { success: false, error: err.message };
  }
};

const save = async (data) => {
  try {
    const company_id = data.company_id;
    if (!company_id) {
      return { success: false, error: 'Company ID is required' };
    }

    // Check if a record already exists
    const existing = await db.all(
      sql`SELECT ${companyGstDetails.companyId} FROM ${companyGstDetails}
          WHERE ${companyGstDetails.companyId} = ${company_id}
          LIMIT 1`
    );

    if (existing && existing.length > 0) {
      // UPDATE
      await db
        .update(companyGstDetails)
        .set({
          hsnSacType: data.hsnSacType,
          hsnSacCode: data.hsnSacCode || null,
          description: data.description || null,
          taxabilityType: data.taxabilityType,
          gstRate: Number(data.gstRate) || 0,
          interstateThresholdLimit: Number(data.interstateThresholdLimit) || 0,
          intrastateThresholdLimit: Number(data.intrastateThresholdLimit) || 0,
          thresholdLimitIncludes: data.thresholdLimitIncludes,
          createHsnSummaryFor: data.createHSNSummaryFor,
          minimumHsnLength: Number(data.minimumHSNLength) || 4,
          showGstAdvances: data.showGSTAdvances ? 1 : 0,
          updateGstStatus: data.updateGSTStatus ? 1 : 0,
          gstReturnsConfigured: data.gstReturnsConfigured ? 1 : 0,
          effectiveDate: data.effectiveDate || '1-Apr-26',
          downloadGstRegistration: data.downloadGSTRegistration || null,
          downloadReturnType: data.downloadReturnType || 'All Returns',
          setStateWiseThresholdLimit: data.setStateWiseThresholdLimit ? 1 : 0,
          stateWiseLimits: data.stateWiseLimits ? JSON.stringify(data.stateWiseLimits) : null,
          gstAdvancesApplicableFrom: data.gstAdvancesApplicableFrom || null,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(companyGstDetails.companyId, company_id));
    } else {
      // INSERT
      await db
        .insert(companyGstDetails)
        .values({
          companyId: company_id,
          hsnSacType: data.hsnSacType,
          hsnSacCode: data.hsnSacCode || null,
          description: data.description || null,
          taxabilityType: data.taxabilityType,
          gstRate: Number(data.gstRate) || 0,
          interstateThresholdLimit: Number(data.interstateThresholdLimit) || 0,
          intrastateThresholdLimit: Number(data.intrastateThresholdLimit) || 0,
          thresholdLimitIncludes: data.thresholdLimitIncludes,
          createHsnSummaryFor: data.createHSNSummaryFor,
          minimumHsnLength: Number(data.minimumHSNLength) || 4,
          showGstAdvances: data.showGSTAdvances ? 1 : 0,
          updateGstStatus: data.updateGSTStatus ? 1 : 0,
          gstReturnsConfigured: data.gstReturnsConfigured ? 1 : 0,
          effectiveDate: data.effectiveDate || '1-Apr-26',
          downloadGstRegistration: data.downloadGSTRegistration || null,
          downloadReturnType: data.downloadReturnType || 'All Returns',
          setStateWiseThresholdLimit: data.setStateWiseThresholdLimit ? 1 : 0,
          stateWiseLimits: data.stateWiseLimits ? JSON.stringify(data.stateWiseLimits) : null,
          gstAdvancesApplicableFrom: data.gstAdvancesApplicableFrom || null,
        });
    }

    return { success: true };
  } catch (err) {
    console.error('Error saving company GST details:', err);
    return { success: false, error: err.message };
  }
};

module.exports = {
  get,
  save,
};
