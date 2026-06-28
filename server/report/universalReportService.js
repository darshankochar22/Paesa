/**
 * universalReportService.js
 *
 * Barrel file — re-exports all report service functions from focused domain
 * modules to maintain backward compatibility with existing callers.
 *
 * Domain modules live in ./services/:
 *   reportHelpers.js         -- shared constants + helpers (sqlIn, baseVoucherFilter, etc.)
 *   voucherQueryService.js   -- queryVouchers, queryLedgerBalances, aggregateByGroup, aggregateByPeriod
 *   outstandingService.js    -- calculateOutstanding, calculateAgeing
 *   exceptionRegisterService.js -- getExceptions, getRegister, getSummary, getReconciliation
 *   statutoryService.js      -- getPartyAnalysis, getStatutoryReport (getEInvoiceReport is internal)
 *   payrollService.js        -- getPayrollReport
 *   inventoryService.js      -- queryStockBalances, getInventoryReport
 *   costingAuditService.js   -- getCostingReport, queryAuditTrail
 */

const { queryVouchers, queryLedgerBalances, aggregateByGroup, aggregateByPeriod } = require('./services/voucherQueryService');
const { calculateOutstanding, calculateAgeing } = require('./services/outstandingService');
const { getExceptions, getRegister, getSummary, getReconciliation } = require('./services/exceptionRegisterService');
const { getPartyAnalysis, getStatutoryReport } = require('./services/statutoryService');
const { getPayrollReport } = require('./services/payrollService');
const { queryStockBalances, getInventoryReport } = require('./services/inventoryService');
const { getCostingReport, queryAuditTrail } = require('./services/costingAuditService');

module.exports = {
  queryVouchers,
  queryLedgerBalances,
  queryStockBalances,
  aggregateByGroup,
  aggregateByPeriod,
  calculateOutstanding,
  calculateAgeing,
  getExceptions,
  getRegister,
  getSummary,
  getReconciliation,
  getPartyAnalysis,
  getStatutoryReport,
  getPayrollReport,
  getInventoryReport,
  getCostingReport,
  queryAuditTrail,
};
