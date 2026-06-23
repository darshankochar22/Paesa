const cashFlowReportService = require('./cashFlowReportService');

module.exports = {
  create: async (event, data) => {
    return await cashFlowReportService.create(data);
  },
  // This explicitly handles your frontend window.api.report.cashFlow method signature
  cashFlow: async (event, payload) => {
    // Destructure compound parameters passed from the frontend invoke payload object
    const { company_id, fy_id, from_date, to_date } = payload || {};
    return await cashFlowReportService.calculateCashFlow(company_id, fy_id, from_date, to_date);
  },
  getAll: async (event, company_id) => {
    return await cashFlowReportService.getAll(company_id);
  },
  getById: async (event, id) => {
    return await cashFlowReportService.getById(id);
  },
  delete: async (event, id) => {
    return await cashFlowReportService.delete(id);
  },
};