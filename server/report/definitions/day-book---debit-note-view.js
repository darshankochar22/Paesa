module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.getRegister(company_id, fy_id, { reportId: 'R063', registerType: 'daybook', viewType: 'debit_note', ...params });
  }
};
