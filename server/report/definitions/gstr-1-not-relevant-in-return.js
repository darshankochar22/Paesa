module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getStatutoryReport(company_id, fy_id, { reportId: 'R329', statutoryType: 'gst', gstReport: 'gstr1_not_relevant', ...params });
  }
};
