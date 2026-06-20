module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getRegister(company_id, fy_id, { reportId: 'R206', registerType: 'purchase_order', subType: 'pending', ...params });
  }
};
