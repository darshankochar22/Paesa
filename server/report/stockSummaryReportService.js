// Barrel — the stock/inventory report methods were split by domain into sibling
// modules; this re-assembles them into the single public API every call site
// (reportController, ai/tools, ratioAnalysisReportService, report/definitions/*)
// imports, so nothing downstream changed. The shared voucher-register row-builder
// lives in stockRegisterBuilder.js and is consumed by the register modules.
module.exports = {
  ...require('./stockBalanceReports'),
  ...require('./orderTrackingReports'),
  ...require('./batchGodownReports'),
  ...require('./registerReports'),
};
