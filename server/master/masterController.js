const masterService = require('./masterService');

module.exports = {
  getMenu: async (event, company_id) => {
    return await masterService.getMenu(company_id);
  }
};