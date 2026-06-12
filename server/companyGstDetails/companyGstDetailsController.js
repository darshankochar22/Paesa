const companyGstDetailsService = require('./companyGstDetailsService');

module.exports = {
  get: async (event, company_id) => {
    return await companyGstDetailsService.get(company_id);
  },
  save: async (event, data) => {
    return await companyGstDetailsService.save(data);
  }
};
