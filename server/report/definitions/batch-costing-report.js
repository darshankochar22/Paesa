module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getCostingReport(company_id, fy_id, { reportId: 'R314', costingType: 'batch_costing', ...params });
  }
};
