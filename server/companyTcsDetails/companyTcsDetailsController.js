const companyTcsDetailsService = require('./companyTcsDetailsService');

module.exports = {
  get: async (event, company_id) => {
    return await companyTcsDetailsService.get(company_id);
  },
  save: async (event, data) => {
    return await companyTcsDetailsService.save(data);
  }
};
