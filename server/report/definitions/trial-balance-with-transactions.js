module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.queryLedgerBalances(company_id, fy_id, { reportId: 'R037', statementType: 'trial_balance', variant: 'with_transactions', ...params });
  }
};
