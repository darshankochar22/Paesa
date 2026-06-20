module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.calculateOutstanding(company_id, fy_id, { reportId: 'R135', outstandingType: 'ledger_confirmation', ...params });
  }
};
