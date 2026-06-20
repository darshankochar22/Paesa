module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getStatutoryReport(company_id, fy_id, { reportId: 'R360', statutoryType: 'gst', gstReport: 'rate_wise_sales', ...params });
  }
};
