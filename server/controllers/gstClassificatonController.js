const gstClassificationService = require('../services/gstClassificationService');

module.exports = {
  create: async (event, data) => {
    return await gstClassificationService.create(data);
  },
  getAll: async (event, company_id) => {
    return await gstClassificationService.getAll(company_id);
  },
  getById: async (event, id) => {
    return await gstClassificationService.getById(id);
  },
  update: async (event, data) => {
    return await gstClassificationService.update(data);
  },
  delete: async (event, id) => {
    return await gstClassificationService.delete(id);
  },
};