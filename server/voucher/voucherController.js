const voucherService = require('../voucher/voucherService');

module.exports = {
  create: async (event, data) => {
    return await voucherService.create(data);
  },
  getAll: async (event, { company_id, fy_id }) => {
    return await voucherService.getAll(company_id, fy_id);
  },
  getById: async (event, id) => {
    return await voucherService.getById(id);
  },
  update: async (event, data) => {
    return await voucherService.update(data);
  },
  delete: async (event, id) => {
    return await voucherService.delete(id);
  },
  cancel: async (event, id) => {
    return await voucherService.cancel(id);
  },
  getDaybook: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await voucherService.getDaybook(company_id, fy_id, from_date, to_date);
  },
  getByType: async (event, { company_id, fy_id, voucher_type }) => {
    return await voucherService.getByType(company_id, fy_id, voucher_type);
  },
  getByLedger: async (event, { company_id, fy_id, ledger_id }) => {
    return await voucherService.getByLedger(company_id, fy_id, ledger_id);
  },
  getNextNumber: async (event, { company_id, fy_id, voucher_type }) => {
    return await voucherService.getNextNumber(company_id, fy_id, voucher_type);
  },
  getLedgerBalance: async (event, { ledger_id, company_id, fy_id }) => {
    return await voucherService.getLedgerBalance(ledger_id, company_id, fy_id);
  },
  searchLedgers: async (event, { company_id, searchTerm }) => {
    return await voucherService.searchLedgers(company_id, searchTerm);
  },
  getOutstandingBills: async (event, { ledger_id }) => {
    return await voucherService.getOutstandingBills(ledger_id);
  },
};