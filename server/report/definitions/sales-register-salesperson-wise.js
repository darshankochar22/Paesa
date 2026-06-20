module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.queryVouchers(company_id, fy_id, { reportId: 'R173', voucherType: 'sales', viewType: 'salesperson_wise', ...params });
  }
};
