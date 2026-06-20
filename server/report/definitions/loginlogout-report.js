module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getExceptions(company_id, fy_id, { reportId: 'R564', exceptionType: 'login_logout', ...params });
  }
};
