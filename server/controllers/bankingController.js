const bankingService = require('../services/bankingService');

module.exports = {
  getUnreconciled: async (event, { company_id, fy_id, ledger_id }) => {
    return await bankingService.getUnreconciled(company_id, fy_id, ledger_id);
  },
  reconcile: async (event, data) => {
    return await bankingService.reconcile(data);
  },
  unreconcile: async (event, id) => {
    return await bankingService.unreconcile(id);
  },
  getStatement: async (event, { company_id, fy_id, ledger_id, from_date, to_date }) => {
    return await bankingService.getStatement(company_id, fy_id, ledger_id, from_date, to_date);
  },
  getSummary: async (event, { company_id, fy_id, ledger_id }) => {
    return await bankingService.getSummary(company_id, fy_id, ledger_id);
  },
};