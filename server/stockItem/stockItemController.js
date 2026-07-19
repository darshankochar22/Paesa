const stockItemService = require('../stockItem/stockItemService');
const auditTrailService = require('../auditTrail/auditTrailService');

const ENTITY_TYPE = 'stock_item';

module.exports = {
  create: async (event, data) => {
    const result = await stockItemService.create(data);
    if (result && result.success && result.item) {
      try {
        await auditTrailService.record({
          company_id: result.item.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: result.item.item_id,
          action: 'create',
          before: null,
          after: result.item,
        });
      } catch (err) {
        console.error('Error recording stock item create audit:', err);
      }
    }
    return result;
  },
  getAll: async (event, company_id) => {
    return await stockItemService.getAll(company_id);
  },
  getById: async (event, id) => {
    return await stockItemService.getById(id);
  },
  update: async (event, data) => {
    let before = null;
    try {
      const snap = await stockItemService.getById(data.item_id);
      if (snap && snap.success) before = snap.item;
    } catch (err) {
      console.error('Error fetching stock item update snapshot:', err);
    }
    const result = await stockItemService.update(data);
    if (result && result.success && result.item) {
      try {
        await auditTrailService.record({
          company_id: result.item.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: result.item.item_id,
          action: 'update',
          before,
          after: result.item,
        });
      } catch (err) {
        console.error('Error recording stock item update audit:', err);
      }
    }
    return result;
  },
  delete: async (event, id) => {
    let before = null;
    try {
      const snap = await stockItemService.getById(id);
      if (snap && snap.success) before = snap.item;
    } catch (err) {
      console.error('Error fetching stock item delete snapshot:', err);
    }
    const result = await stockItemService.delete(id);
    if (result && result.success && before) {
      try {
        await auditTrailService.record({
          company_id: before.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: before.item_id,
          action: 'delete',
          before,
          after: null,
        });
      } catch (err) {
        console.error('Error recording stock item delete audit:', err);
      }
    }
    return result;
  },
  getByGroup: async (event, { company_id, group_id }) => {
    return await stockItemService.getByGroup(company_id, group_id);
  },
  getByCategory: async (event, { company_id, category_id }) => {
    return await stockItemService.getByCategory(company_id, category_id);
  },
  getStockBalances: async (event, company_id) => {
    return await stockItemService.getStockBalances(company_id);
  },
  getStockBalancesByGodown: async (event, { company_id, item_id }) => {
    return await stockItemService.getStockBalancesByGodown(company_id, item_id);
  },
  getLastPurchaseRate: async (event, { company_id, item_id }) => {
    return await stockItemService.getLastPurchaseRate(company_id, item_id);
  },
  getLastSalesRate: async (event, { company_id, item_id }) => {
    return await stockItemService.getLastSalesRate(company_id, item_id);
  },
  getActiveBatches: async (event, { company_id, item_id }) => {
    return await stockItemService.getActiveBatches(company_id, item_id);
  },
};
