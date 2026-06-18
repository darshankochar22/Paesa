const outstandingReportService = require('../outstandingReportService');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    return await outstandingReportService.billsReceivable(company_id, fy_id);
  }
};
