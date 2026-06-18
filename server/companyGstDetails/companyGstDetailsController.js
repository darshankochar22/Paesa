const companyGstDetailsService = require('./companyGstDetailsService');
const auditTrailService = require('../auditTrail/auditTrailService');

const ENTITY_TYPE = 'company_gst_details';

module.exports = {
  get: async (event, company_id) => {
    return await companyGstDetailsService.get(company_id);
  },
  save: async (event, data) => {
    let before = null;
    try {
      const snap = await companyGstDetailsService.get(data.company_id);
      if (snap && snap.success && snap.exists) before = snap.data;
    } catch (err) {
      console.error('Error fetching company GST details snapshot before:', err);
    }
    const result = await companyGstDetailsService.save(data);
    if (result && result.success) {
      try {
        const afterSnap = await companyGstDetailsService.get(data.company_id);
        const after = (afterSnap && afterSnap.success) ? afterSnap.data : null;
        await auditTrailService.record({
          company_id: data.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: data.company_id,
          action: before ? 'update' : 'create',
          before,
          after,
        });
      } catch (err) {
        console.error('Error recording company GST details audit:', err);
      }
    }
    return result;
  }
};
