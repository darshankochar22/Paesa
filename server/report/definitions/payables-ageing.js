module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const service = require('../universalReportService');
    return await service.calculateAgeing(company_id, fy_id, { reportId: 'R106', ageingType: 'payable', ...params });
  }
};
