module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getStatutoryReport(company_id, fy_id, { reportId: 'R399', statutoryType: 'einvoice', subType: 'exchange_log', ...params });
  }
};
