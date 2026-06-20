module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getStatutoryReport(company_id, fy_id, { reportId: 'R458', statutoryType: 'tcs', tcsReport: 'challan_buyer_details', ...params });
  }
};
