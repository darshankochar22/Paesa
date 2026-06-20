module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getPayrollReport(company_id, fy_id, { reportId: 'R485', payrollType: 'pf_summary', ...params });
  }
};
