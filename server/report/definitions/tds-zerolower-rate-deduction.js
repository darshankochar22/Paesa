module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getStatutoryReport(company_id, fy_id, { reportId: 'R425', statutoryType: 'tds', tdsReport: 'zero_lower_rate', ...params });
  }
};
