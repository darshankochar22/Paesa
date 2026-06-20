module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getPayrollReport(company_id, fy_id, { reportId: 'R480', payrollType: 'earnings', ...params });
  }
};
