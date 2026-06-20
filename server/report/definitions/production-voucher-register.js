module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getCostingReport(company_id, fy_id, { reportId: 'R291', costingType: 'production_voucher', ...params });
  }
};
