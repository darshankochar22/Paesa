module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.queryVouchers(company_id, fy_id, { reportId: 'R186', voucherType: 'purchase', aggregateByParty: true, partyFilter: 'supplier', subType: 'summary', ...params });
  }
};
