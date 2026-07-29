module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../services/bankStatementReportService');
    return await service.getStatementMatching(company_id, fy_id, params);
  },
};
