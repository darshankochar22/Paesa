module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.queryVouchers(company_id, fy_id, { reportId: 'R199', voucherType: 'sales', viewType: 'charges_analysis', ...params });
  }
};
