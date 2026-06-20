module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.queryAuditTrail(company_id, fy_id, { reportId: 'R554', auditType: 'ledger_audit', ...params });
  }
};
