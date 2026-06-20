module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.queryVouchers(company_id, fy_id, { reportId: 'R182', voucherType: 'purchase', viewType: 'state_wise', ...params });
  }
};
