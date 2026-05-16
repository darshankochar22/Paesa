const gstRegistrationService = require('../services/gstRegistrationService');

module.exports = {
  create: async (event, data) => {
    return await gstRegistrationService.create(data);
  },
  getAll: async (event, company_id) => {
    return await gstRegistrationService.getAll(company_id);
  },
  getById: async (event, id) => {
    return await gstRegistrationService.getById(id);
  },
  update: async (event, data) => {
    return await gstRegistrationService.update(data);
  },
  delete: async (event, id) => {
    return await gstRegistrationService.delete(id);
  },
};