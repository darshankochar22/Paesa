const gstRegistrationService = require('../gstRegistration/gstRegistrationService');
const auditTrailService = require('../auditTrail/auditTrailService');

const ENTITY_TYPE = 'gst_registration';

module.exports = {
  create: async (event, data) => {
    const result = await gstRegistrationService.create(data);
    if (result && result.success && result.gstRegistration) {
      try {
        await auditTrailService.record({
          company_id: result.gstRegistration.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: result.gstRegistration.gst_id,
          action: 'create',
          before: null,
          after: result.gstRegistration,
        });
      } catch (err) {
        console.error('Error recording gst registration create audit:', err);
      }
    }
    return result;
  },
  getAll: async (event, company_id) => {
    return await gstRegistrationService.getAll(company_id);
  },
  getById: async (event, id) => {
    return await gstRegistrationService.getById(id);
  },
  update: async (event, data) => {
    let before = null;
    try {
      const snap = await gstRegistrationService.getById(data.gst_id);
      if (snap && snap.success) before = snap.gstRegistration;
    } catch (err) {
      console.error('Error fetching gst registration update snapshot:', err);
    }
    const result = await gstRegistrationService.update(data);
    if (result && result.success && result.gstRegistration) {
      try {
        await auditTrailService.record({
          company_id: result.gstRegistration.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: result.gstRegistration.gst_id,
          action: 'update',
          before,
          after: result.gstRegistration,
        });
      } catch (err) {
        console.error('Error recording gst registration update audit:', err);
      }
    }
    return result;
  },
  delete: async (event, id) => {
    let before = null;
    try {
      const snap = await gstRegistrationService.getById(id);
      if (snap && snap.success) before = snap.gstRegistration;
    } catch (err) {
      console.error('Error fetching gst registration delete snapshot:', err);
    }
    const result = await gstRegistrationService.delete(id);
    if (result && result.success && before) {
      try {
        await auditTrailService.record({
          company_id: before.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: before.gst_id,
          action: 'delete',
          before,
          after: null,
        });
      } catch (err) {
        console.error('Error recording gst registration delete audit:', err);
      }
    }
    return result;
  },
};