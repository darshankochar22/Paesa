const path = require('path');

const registry = {
  trial_balance: require('./definitions/trial_balance'),
  balance_sheet: require('./definitions/balance_sheet'),
  profit_loss: require('./definitions/profit_loss'),
  ledger: require('./definitions/ledger'),
  cash_book: require('./definitions/cash_book'),
  bank_book: require('./definitions/bank_book'),
  daybook: require('./definitions/daybook'),
  bills_receivable: require('./definitions/bills_receivable'),
  bills_payable: require('./definitions/bills_payable'),
  cash_flow: require('./definitions/cash_flow'),
  funds_flow: require('./definitions/funds_flow'),
  stock_summary: require('./definitions/stock_summary'),
  ratio_analysis: require('./definitions/ratio_analysis'),
  negative_cash: require('./definitions/negative_cash'),
  negative_stock: require('./definitions/negative_stock'),
  negative_ledger: require('./definitions/negative_ledger'),
  audit_trail_verification: require('./definitions/audit_trail_verification')
};

function getReport(reportId) {
  return registry[reportId] || null;
}

module.exports = {
  registry,
  getReport
};
