const priceLevelService = require('../priceLevels/priceLevelService');

module.exports = {
  get:    async (event, company_id) => priceLevelService.getPriceLevels(company_id),
  save:   async (event, data)       => priceLevelService.savePriceLevels(data),
  delete: async (event, company_id) => priceLevelService.deletePriceLevels(company_id),
};