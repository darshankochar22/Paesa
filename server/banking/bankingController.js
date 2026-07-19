const bankingService = require('../banking/bankingService');

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
  getBankLedgers: async (event, { company_id }) => {
    return await bankingService.getBankLedgers(company_id);
  },
  getChequePrinting: async (
    event,
    { company_id, fy_id, ledger_id, from_date, to_date, include_printed },
  ) => {
    return await bankingService.getChequePrinting(
      company_id,
      fy_id,
      ledger_id,
      from_date,
      to_date,
      include_printed,
    );
  },
  getDepositSlip: async (
    event,
    { company_id, fy_id, ledger_id, from_date, to_date, include_printed },
  ) => {
    return await bankingService.getDepositSlip(
      company_id,
      fy_id,
      ledger_id,
      from_date,
      to_date,
      include_printed,
    );
  },
  getPartyLedgers: async (event, { company_id }) => {
    return await bankingService.getPartyLedgers(company_id);
  },
  getPaymentAdvice: async (
    event,
    { company_id, fy_id, ledger_id, from_date, to_date, reconciled_only },
  ) => {
    return await bankingService.getPaymentAdvice(
      company_id,
      fy_id,
      ledger_id,
      from_date,
      to_date,
      reconciled_only,
    );
  },
  updateLedgerEmail: async (event, { ledger_id, email }) => {
    return await bankingService.updateLedgerEmail(ledger_id, email);
  },
  getPostDatedSummary: async (event, { company_id, fy_id, ledger_id }) => {
    return await bankingService.getPostDatedSummary(company_id, fy_id, ledger_id);
  },
  getPostDatedTransactions: async (event, { company_id, fy_id, ledger_id, from_date, to_date }) => {
    return await bankingService.getPostDatedTransactions(
      company_id,
      fy_id,
      ledger_id,
      from_date,
      to_date,
    );
  },
  getChequeRegisterBankWise: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await bankingService.getChequeRegisterBankWise(company_id, fy_id, from_date, to_date);
  },
  getChequeRegisterRanges: async (event, { company_id, fy_id, ledger_id, from_date, to_date }) => {
    return await bankingService.getChequeRegisterRanges(
      company_id,
      fy_id,
      ledger_id,
      from_date,
      to_date,
    );
  },
  getChequeRegisterInstruments: async (
    event,
    { company_id, fy_id, ledger_id, range, from_date, to_date, status },
  ) => {
    return await bankingService.getChequeRegisterInstruments(
      company_id,
      fy_id,
      ledger_id,
      range,
      from_date,
      to_date,
      status,
    );
  },
  markChequePrinted: async (event, { bank_detail_ids, printed }) => {
    return await bankingService.markChequePrinted(bank_detail_ids, printed);
  },
};
