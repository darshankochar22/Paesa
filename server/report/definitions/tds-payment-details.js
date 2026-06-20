module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getStatutoryReport(company_id, fy_id, { reportId: 'R427', statutoryType: 'tds', tdsReport: 'payment_details', ...params });
  }
};
