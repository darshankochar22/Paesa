module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.queryVouchers(company_id, fy_id, { reportId: 'R191', voucherType: 'sales', aggregateByParty: true, partyFilter: 'customer', subType: 'dormant', ...params });
  }
};
