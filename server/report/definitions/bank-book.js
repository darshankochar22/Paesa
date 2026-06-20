const reportService = require('../reportService');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const { ledger_id, from_date, to_date } = params;
    return await reportService.bankBook(company_id, fy_id, ledger_id ? Number(ledger_id) : null, from_date, to_date);
  }
};
