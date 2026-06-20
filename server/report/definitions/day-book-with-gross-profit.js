module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getRegister(company_id, fy_id, { reportId: 'R065', registerType: 'daybook', viewType: 'with_gross_profit', ...params });
  }
};
