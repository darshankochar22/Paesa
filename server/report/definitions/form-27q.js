module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getStatutoryReport(company_id, fy_id, { reportId: 'R411', statutoryType: 'tds', tdsReport: 'form_27q', ...params });
  }
};
