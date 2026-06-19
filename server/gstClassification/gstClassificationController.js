const gstClassificationService = require('../gstClassification/gstClassificationService');
const auditTrailService = require('../auditTrail/auditTrailService');

const ENTITY_TYPE = 'gst_classification';

module.exports = {
  create: async (event, data) => {
    const result = await gstClassificationService.create(data);
    if (result && result.success && result.classification) {
      try {
        await auditTrailService.record({
          company_id: result.classification.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: result.classification.gc_id,
          action: 'create',
          before: null,
          after: result.classification,
        });
      } catch (err) {
        console.error('Error recording gst classification create audit:', err);
      }
    }
    return result;
  },
  getAll: async (event, company_id) => {
    return await gstClassificationService.getAll(company_id);
  },
  getById: async (event, id) => {
    return await gstClassificationService.getById(id);
  },
  update: async (event, data) => {
    let before = null;
    try {
      const snap = await gstClassificationService.getById(data.gc_id);
      if (snap && snap.success) before = snap.classification;
    } catch (err) {
      console.error('Error fetching gst classification update snapshot:', err);
    }
    const result = await gstClassificationService.update(data);
    if (result && result.success && result.classification) {
      try {
        await auditTrailService.record({
          company_id: result.classification.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: result.classification.gc_id,
          action: 'update',
          before,
          after: result.classification,
        });
      } catch (err) {
        console.error('Error recording gst classification update audit:', err);
      }
    }
    return result;
  },
  delete: async (event, id) => {
    let before = null;
    try {
      const snap = await gstClassificationService.getById(id);
      if (snap && snap.success) before = snap.classification;
    } catch (err) {
      console.error('Error fetching gst classification delete snapshot:', err);
    }
    const result = await gstClassificationService.delete(id);
    if (result && result.success && before) {
      try {
        await auditTrailService.record({
          company_id: before.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: before.gc_id,
          action: 'delete',
          before,
          after: null,
        });
      } catch (err) {
        console.error('Error recording gst classification delete audit:', err);
      }
    }
    return result;
  },
};