// voucherCRUD — thin barrel over the voucher modules. The full implementations
// live in sibling files (voucherReads / voucherCreate / voucherUpdate, with shared
// helpers in voucherCommon); this module assembles them into the single public API
// every call site imports, so nothing downstream changed when the original
// god-object was split.
const { getNextVoucherNumber } = require('./voucherNumbering');
const { getLedgerBalance, searchLedgers, getPendingBills } = require('./voucherLedgerHelpers');
const voucherReads = require('./voucherReads');
const voucherCreate = require('./voucherCreate');
const voucherUpdate = require('./voucherUpdate');

module.exports = {
  fetchAttendanceVoucherRows: voucherReads.fetchAttendanceVoucherRows,

  getAll: voucherReads.getAll,
  getById: voucherReads.getById,
  getDaybook: voucherReads.getDaybook,
  getByType: voucherReads.getByType,
  getByLedger: voucherReads.getByLedger,

  create: voucherCreate.create,

  update: voucherUpdate.update,
  cancel: voucherUpdate.cancel,
  delete: voucherUpdate.delete,

  getNextNumber: async (company_id, fy_id, voucher_type) => {
    return await getNextVoucherNumber(company_id, fy_id, voucher_type);
  },

  getLedgerBalance: async (ledger_id, company_id, fy_id) => {
    return await getLedgerBalance(ledger_id, company_id, fy_id);
  },

  searchLedgers: async (company_id, searchTerm) => {
    return await searchLedgers(company_id, searchTerm);
  },

  getPendingBills: async (ledger_id, company_id, fy_id) => {
    return await getPendingBills(ledger_id, company_id, fy_id);
  },
};
