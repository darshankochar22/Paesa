module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.queryLedgerBalances(company_id, fy_id, { reportId: 'R048', statementType: 'group_summary', groupName: 'fixed_assets', ...params });
  }
};
