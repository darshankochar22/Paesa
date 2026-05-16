const currencyService = require('../services/currencyService');

module.exports = {
  create: async (event, data) => {
    return await currencyService.create(data);
  },
  getAll: async (event, company_id) => {
    return await currencyService.getAll(company_id);
  },
  getById: async (event, id) => {
    return await currencyService.getById(id);
  },
  update: async (event, data) => {
    return await currencyService.update(data);
  },
  delete: async (event, id) => {
    return await currencyService.delete(id);
  },
  setDefault: async (event, { company_id, id }) => {
    return await currencyService.setDefault(company_id, id);
  },
};