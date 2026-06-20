module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getStatutoryReport(company_id, fy_id, { reportId: 'R520', statutoryType: 'legacy', legacyType: 'vat_purchase_annexure', ...params });
  }
};
