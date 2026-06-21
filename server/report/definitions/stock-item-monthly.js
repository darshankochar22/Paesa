const stockSummaryReportService = require('../stockSummaryReportService');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const item_id = Number(params.item_id);
    return await stockSummaryReportService.stockItemMonthly(company_id, fy_id, item_id);
  }
};
