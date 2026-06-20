module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getStatutoryReport(company_id, fy_id, { reportId: 'R346', statutoryType: 'gst', gstReport: 'gstr3b_not_relevant', ...params });
  }
};
