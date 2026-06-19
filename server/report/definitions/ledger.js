const reportService = require('../reportService');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const { ledger_id, from_date, to_date } = params;
    if (!ledger_id) {
      return { success: false, error: 'ledger_id parameter is required' };
    }
    return await reportService.ledgerReport(company_id, fy_id, Number(ledger_id), from_date, to_date);
  }
};
