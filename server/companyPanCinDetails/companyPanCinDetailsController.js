const companyPanCinDetailsService = require('./companyPanCinDetailsService');

module.exports = {
  get: async (event, company_id) => {
    return await companyPanCinDetailsService.get(company_id);
  },
  save: async (event, data) => {
    return await companyPanCinDetailsService.save(data);
  },
};
