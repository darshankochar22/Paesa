module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getRegister(company_id, fy_id, { reportId: 'R204', registerType: 'purchase_order', subType: 'order_to_invoice', ...params });
  }
};
