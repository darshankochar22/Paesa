module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getInventoryReport(company_id, fy_id, { reportId: 'R250', inventoryType: 'expired_stock', ...params });
  }
};
