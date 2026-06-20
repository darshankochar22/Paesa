module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getInventoryReport(company_id, fy_id, { reportId: 'R279', inventoryType: 'category_summary', ...params });
  }
};
