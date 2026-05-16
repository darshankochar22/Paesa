const payHeadService = require('../services/payHeadService');

module.exports = {
  create: async (event, data) => {
    return await payHeadService.create(data);
  },
  getAll: async (event, company_id) => {
    return await payHeadService.getAll(company_id);
  },
  getById: async (event, id) => {
    return await payHeadService.getById(id);
  },
  update: async (event, data) => {
    return await payHeadService.update(data);
  },
  delete: async (event, id) => {
    return await payHeadService.delete(id);
  },
};