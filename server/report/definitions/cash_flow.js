const cashFlowReportService = require('../cashFlowReportService');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const { from_date, to_date } = params;
    return await cashFlowReportService.cashFlow(company_id, fy_id, from_date, to_date);
  }
};
