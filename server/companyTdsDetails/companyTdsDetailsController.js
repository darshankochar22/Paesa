const companyTdsDetailsService = require('./companyTdsDetailsService');

module.exports = {
  get: async (event, company_id) => {
    return await companyTdsDetailsService.get(company_id);
  },
  save: async (event, data) => {
    return await companyTdsDetailsService.save(data);
  }
};
