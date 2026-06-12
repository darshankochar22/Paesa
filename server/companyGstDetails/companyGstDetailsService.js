const { db } = require('../db/index');

const get = async (company_id) => {
  try {
    const result = await db.execute({
      sql: `SELECT * FROM company_gst_details WHERE company_id = ? LIMIT 1`,
      args: [company_id],
    });

    if (!result.rows || result.rows.length === 0) {
      return { success: true, exists: false, data: null };
    }

    const record = result.rows[0];
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
        showGSTAdvances: record.show_gst_advances === 1,
        updateGSTStatus: record.update_gst_status === 1,
        gstReturnsConfigured: record.gst_returns_configured === 1,
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
    const existing = await db.execute({
      sql: `SELECT company_id FROM company_gst_details WHERE company_id = ? LIMIT 1`,
      args: [company_id],
    });

    if (existing.rows && existing.rows.length > 0) {
      // UPDATE
      await db.execute({
        sql: `UPDATE company_gst_details SET
                hsn_sac_type = ?,
                hsn_sac_code = ?,
                description = ?,
                taxability_type = ?,
                gst_rate = ?,
                interstate_threshold_limit = ?,
                intrastate_threshold_limit = ?,
                threshold_limit_includes = ?,
                create_hsn_summary_for = ?,
                minimum_hsn_length = ?,
                show_gst_advances = ?,
                update_gst_status = ?,
                gst_returns_configured = ?,
                updated_at = datetime('now')
              WHERE company_id = ?`,
        args: [
          data.hsnSacType,
          data.hsnSacCode || null,
          data.description || null,
          data.taxabilityType,
          Number(data.gstRate) || 0,
          Number(data.interstateThresholdLimit) || 0,
          Number(data.intrastateThresholdLimit) || 0,
          data.thresholdLimitIncludes,
          data.createHSNSummaryFor,
          Number(data.minimumHSNLength) || 4,
          data.showGSTAdvances ? 1 : 0,
          data.updateGSTStatus ? 1 : 0,
          data.gstReturnsConfigured ? 1 : 0,
          company_id,
        ],
      });
    } else {
      // INSERT
      await db.execute({
        sql: `INSERT INTO company_gst_details (
                company_id,
                hsn_sac_type,
                hsn_sac_code,
                description,
                taxability_type,
                gst_rate,
                interstate_threshold_limit,
                intrastate_threshold_limit,
                threshold_limit_includes,
                create_hsn_summary_for,
                minimum_hsn_length,
                show_gst_advances,
                update_gst_status,
                gst_returns_configured
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          company_id,
          data.hsnSacType,
          data.hsnSacCode || null,
          data.description || null,
          data.taxabilityType,
          Number(data.gstRate) || 0,
          Number(data.interstateThresholdLimit) || 0,
          Number(data.intrastateThresholdLimit) || 0,
          data.thresholdLimitIncludes,
          data.createHSNSummaryFor,
          Number(data.minimumHSNLength) || 4,
          data.showGSTAdvances ? 1 : 0,
          data.updateGSTStatus ? 1 : 0,
          data.gstReturnsConfigured ? 1 : 0,
        ],
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
