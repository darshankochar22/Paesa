const outstandingReportService = require('../outstandingReportService');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    return await outstandingReportService.billsPayable(company_id, fy_id);
  }
};
