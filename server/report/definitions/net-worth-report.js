module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.queryLedgerBalances(company_id, fy_id, { reportId: 'R044', statementType: 'net_worth', ...params });
  }
};
