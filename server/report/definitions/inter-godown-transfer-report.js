module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getInventoryReport(company_id, fy_id, { reportId: 'R270', inventoryType: 'inter_godown_transfer', ...params });
  }
};
