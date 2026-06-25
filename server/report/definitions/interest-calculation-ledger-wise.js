module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../interestReportService');
    return await service.ledgerInterest(company_id, fy_id, params);
  }
};
