const stockCategoryService = require('../services/stockCategoryService');

module.exports = {
  create: async (event, data) => {
    return await stockCategoryService.create(data);
  },
  getAll: async (event, company_id) => {
    return await stockCategoryService.getAll(company_id);
  },
  getById: async (event, id) => {
    return await stockCategoryService.getById(id);
  },
  update: async (event, data) => {
    return await stockCategoryService.update(data);
  },
  delete: async (event, id) => {
    return await stockCategoryService.delete(id);
  },
};