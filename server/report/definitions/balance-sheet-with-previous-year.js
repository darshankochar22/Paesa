module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.queryLedgerBalances(company_id, fy_id, { reportId: 'R025', statementType: 'balance_sheet', variant: 'with_previous_year', ...params });
  }
};
