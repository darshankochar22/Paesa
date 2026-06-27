const costCategoryService = require('./costCategoryService');
const auditTrailService = require('../auditTrail/auditTrailService');

const ENTITY_TYPE = 'cost_category';

module.exports = {
  create: async (event, data) => {
    const result = await costCategoryService.create(data);
    if (result?.success && result.costCategory) {
      try {
        await auditTrailService.record({
          company_id: result.costCategory.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: result.costCategory.cc_cat_id,
          action: 'create',
          before: null,
          after: result.costCategory,
        });
      } catch (err) {
        console.error('Audit trail error (costCategory create):', err);
      }
    }
    return result;
  },

  getAll: async (event, company_id) => costCategoryService.getAll(company_id),

  getById: async (event, id) => costCategoryService.getById(id),

  update: async (event, data) => {
    let before = null;
    try {
      const snap = await costCategoryService.getById(data.cc_cat_id);
      if (snap?.success) before = snap.costCategory;
    } catch (_) {}
    const result = await costCategoryService.update(data);
    if (result?.success && result.costCategory) {
      try {
        await auditTrailService.record({
          company_id: result.costCategory.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: result.costCategory.cc_cat_id,
          action: 'update',
          before,
          after: result.costCategory,
        });
      } catch (err) {
        console.error('Audit trail error (costCategory update):', err);
      }
    }
    return result;
  },

  delete: async (event, id) => {
    let before = null;
    try {
      const snap = await costCategoryService.getById(id);
      if (snap?.success) before = snap.costCategory;
    } catch (_) {}
    const result = await costCategoryService.delete(id);
    if (result?.success && before) {
      try {
        await auditTrailService.record({
          company_id: before.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: before.cc_cat_id,
          action: 'delete',
          before,
          after: null,
        });
      } catch (err) {
        console.error('Audit trail error (costCategory delete):', err);
      }
    }
    return result;
  },
};
