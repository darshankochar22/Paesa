module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getCostingReport(company_id, fy_id, { reportId: 'R313', costingType: 'department_cost', ...params });
  }
};
