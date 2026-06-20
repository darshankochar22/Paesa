module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.queryVouchers(company_id, fy_id, { reportId: 'R195', voucherType: 'sales', aggregateByParty: true, viewType: 'credit_analysis', ...params });
  }
};
