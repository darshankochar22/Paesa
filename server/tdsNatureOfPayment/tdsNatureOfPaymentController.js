const tdsNatureOfPaymentService = require('./tdsNatureOfPaymentService');

module.exports = {
  create: async (event, data) => {
    return await tdsNatureOfPaymentService.create(data);
  },
  getAll: async (event, company_id) => {
    return await tdsNatureOfPaymentService.getAll(company_id);
  },
  getById: async (event, id) => {
    return await tdsNatureOfPaymentService.getById(id);
  },
  update: async (event, data) => {
    return await tdsNatureOfPaymentService.update(data);
  },
  delete: async (event, id) => {
    return await tdsNatureOfPaymentService.delete(id);
  },
};
