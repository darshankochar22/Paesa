module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getStatutoryReport(company_id, fy_id, { reportId: 'R407', statutoryType: 'tds', tdsReport: 'challan_reconciliation', ...params });
  }
};
