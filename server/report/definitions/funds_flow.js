const fundsFlowReportService = require('../fundsFlowReportService');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const { from_date, to_date } = params;
    return await fundsFlowReportService.fundsFlow(company_id, fy_id, from_date, to_date);
  }
};
