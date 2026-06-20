module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getStatutoryReport(company_id, fy_id, { reportId: 'R321', statutoryType: 'gst', gstReport: 'gstr1_b2c_large', ...params });
  }
};
