module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getSummary(company_id, fy_id, { reportId: 'R003', viewType: 'gateway', ...params });
  }
};
