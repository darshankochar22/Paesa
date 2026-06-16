// Module: report (Postgres) — NO TABLES.
//
// The "report" backend module is READ-ONLY and owns no tables. It has no
// schema-init file (server/report/ contains only reportController.js and
// reportService.js — there is no report.js with CREATE TABLE statements).
// It only reads from tables owned by other modules:
//   - vouchers / voucher_entries  (voucher module)
//   - ledgers                     (ledger / master module)
//   - groups                      (group / master module)
//
// See docs/db/modules/report.sql — it emits no CREATE TABLE statements and
// intentionally does not duplicate the owning modules' FK constraints.
//
// Therefore this schema file intentionally defines and exports nothing.

module.exports = {};
