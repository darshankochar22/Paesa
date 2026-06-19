const reportService = require('../reportService');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    return await reportService.trialBalance(company_id, fy_id);
  }
};
