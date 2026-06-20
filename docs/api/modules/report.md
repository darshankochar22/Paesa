# Report Module — IPC API Reference

Backend module: **report** (`server/report/`)
Namespace: **report** (channel prefix `report:`)
Controller: `server/report/reportController.js`
Services: `server/report/reportService.js`, `server/report/universalReportService.js`, and 8 dedicated report services
Renderer binding root: `window.api.report`

This is a **read-only reporting module**. It owns **no tables**; every operation
aggregates rows from tables owned by other modules (`vouchers`,
`voucher_entries`, `ledgers`, `groups`, `voucher_stock_entries`,
`voucher_bill_references`, `voucher_cost_centres`, `voucher_payroll_entries`,
`stock_items`, `employees`, `salary_structures`, `audit_trail`, etc.).

## Dynamic Report Engine

The module includes a **dynamic report engine** (`report:run`) that serves
**586 registered reports** across 15 Tally Prime-compatible categories:

| # | Category | Reports |
|---|---|---|
| 1 | Gateway, Navigation & Global Report Shells | 20 |
| 2 | Core Financial Statements | 35 |
| 3 | Account Books & Voucher Registers | 45 |
| 4 | Receivables, Payables & Bill-wise Reports | 35 |
| 5 | Cash, Bank, Finance & Banking | 30 |
| 6 | Sales, Purchase & Party Analysis | 55 |
| 7 | Inventory, Stock & Godown Reports | 65 |
| 8 | Manufacturing, Job Work & Costing | 30 |
| 9 | GST Reports | 60 |
| 10 | e-Invoice, e-Way Bill & Exchange | 30 |
| 11 | TDS Reports | 30 |
| 12 | TCS Reports | 25 |
| 13 | Payroll & HR Reports | 55 |
| 14 | VAT, Excise, Service Tax, MSME & Legacy Statutory | 35 |
| 15 | Audit, Edit Log, Security & Admin | 35 |
| | **Total** | **586** |

Reports are registered in `server/report/reportRegistry.js` and dispatched
through definition files in `server/report/definitions/`. Each definition
calls the appropriate service method (dedicated or universal).

## Core Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `report:trialBalance` | `window.api.report.trialBalance(company_id, fy_id)` | `{ company_id, fy_id }` | `{ success, rows[], totalDebit, totalCredit }` | Net debit/credit per active ledger for a company + FY. |
| `report:balanceSheet` | `window.api.report.balanceSheet(company_id, fy_id)` | `{ company_id, fy_id }` | `{ success, assets[], liabilities[], totalAssets, totalLiabilities }` | Assets vs Liabilities ledger balances. |
| `report:profitLoss` | `window.api.report.profitLoss(company_id, fy_id)` | `{ company_id, fy_id }` | `{ success, income[], expenses[], totalIncome, totalExpenses, netProfit, isProfit }` | Income vs Expenses and net profit. |
| `report:ledgerReport` | `window.api.report.ledgerReport(company_id, fy_id, ledger_id, from_date, to_date)` | `{ company_id, fy_id, ledger_id, from_date?, to_date? }` | `{ success, ledger_name, opening_balance, rows[], closing_balance }` | Ledger statement with running balance. Auto-picks first ledger if ledger_id omitted. |
| `report:cashBook` | `window.api.report.cashBook(company_id, fy_id, from_date, to_date)` | `{ company_id, fy_id, from_date?, to_date? }` | `{ success, ledger_name, opening_balance, rows[], closing_balance }` | Ledger statement for cash ledger. Finds by ledger_type='Cash' or group nature='Cash-in-Hand'. |
| `report:bankBook` | `window.api.report.bankBook(company_id, fy_id, ledger_id, from_date, to_date)` | `{ company_id, fy_id, ledger_id?, from_date?, to_date? }` | `{ success, ledger_name, opening_balance, rows[], closing_balance }` | Ledger statement for bank ledger. Auto-finds first bank ledger if ledger_id omitted. |
| `report:daybook` | `window.api.report.daybook(company_id, fy_id, from_date, to_date)` | `{ company_id, fy_id, from_date?, to_date? }` | `{ success, vouchers[] }` | All non-cancelled vouchers, fully expanded. |

## Dynamic Report Engine Channel

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `report:run` | `window.api.report.run(reportId, params)` | `{ reportId: string, params: { company_id, fy_id, ... } }` | `{ success, ...reportData }` | Execute any of 586 registered reports by reportId. |
| `report:getSavedViews` | `window.api.report.getSavedViews(company_id)` | `{ company_id }` | `{ success, views[] }` | Retrieve saved report views for a company. |
| `report:saveView` | `window.api.report.saveView(payload)` | `{ company_id, name, reportId, ... }` | `{ success, view }` | Save a report view/configuration. |
| `report:deleteSavedView` | `window.api.report.deleteSavedView(id)` | `{ id }` | `{ success }` | Delete a saved view by ID. |

## Advanced Report Channels

These are also accessible via `report:run` but have dedicated optimized service methods:

| Channel | Service | Summary |
|---|---|---|
| `report:billsReceivable` | `outstandingReportService` | Bills receivable with ageing buckets |
| `report:billsPayable` | `outstandingReportService` | Bills payable with ageing buckets |
| `report:cashFlow` | `cashFlowReportService` | Cash flow by counter-ledger and voucher type |
| `report:fundsFlow` | `fundsFlowReportService` | Sources/applications of funds with working capital |
| `report:stockSummary` | `stockSummaryReportService` | Closing stock qty+value with group rollup (FIFO/Avg) |
| `report:ratioAnalysis` | `ratioAnalysisReportService` | Financial ratios (current, quick, debt-equity, margins) |
| `report:godownSummary` | `advancedInventoryReportService` | Location-wise stock summary |
| `report:stockAgeing` | `advancedInventoryReportService` | Stock ageing analysis |
| `report:movementAnalysis` | `advancedInventoryReportService` | Stock movement inwards/outwards |
| `report:reorderStatus` | `advancedInventoryReportService` | Reorder level status |
| `report:orderOutstanding` | `advancedInventoryReportService` | Sales/Purchase order outstanding |
| `report:costCentreReport` | `advancedAccountingReportService` | Cost centre summary/detail |
| `report:budgetVsActual` | `advancedAccountingReportService` | Budget vs actual variance |
| `report:groupSummary` | `reportService` | Group-wise ledger summary |
| `report:statistics` | `reportService` | Voucher/ledger/group statistics |
| `report:costCategorySummary` | `reportService` | Cost category summary |
| `report:stockItemSummary` | `reportService` | Stock item summary |
| `report:stockGroupSummary` | `reportService` | Stock group summary |
| `report:stockCategorySummary` | `reportService` | Stock category summary |
| `report:payslipReport` | `payrollReportService` | Employee payslips |
| `report:salaryStatement` | `payrollReportService` | Salary statements |
| `report:salaryRegister` | `payrollReportService` | Salary register |
| `report:attendanceReport` | `payrollReportService` | Attendance register |
| `report:payHeadBreakup` | `payrollReportService` | Pay head employee-wise breakup |
| `report:pfReport` | `payrollReportService` | Provident Fund report |
| `report:esiReport` | `payrollReportService` | ESI report |
| `report:professionalTax` | `payrollReportService` | Professional Tax summary |
| `report:gratuity` | `payrollReportService` | Gratuity liability report |

## Universal Report Service Methods

The `universalReportService.js` provides 17 generic query methods used by the
dynamic report engine for reports without dedicated services:

| Method | Purpose |
|---|---|
| `queryVouchers` | Voucher queries with type/date/party filters |
| `queryLedgerBalances` | Ledger balance queries (JS calculation, no correlated subqueries) |
| `queryStockBalances` | Stock balance queries with godown/group filters |
| `aggregateByGroup` | Aggregate by group/nature/voucher_type |
| `aggregateByPeriod` | Monthly/quarterly/yearly aggregation |
| `calculateOutstanding` | Bills receivable/payable outstanding |
| `calculateAgeing` | Ageing analysis with configurable buckets |
| `getExceptions` | Exception reports (negative stock/ledger/cash, overdue, audit) |
| `getRegister` | Voucher registers with type filtering and fallback |
| `getSummary` | Entity summaries (ledger, group, stock, godown, cost centre) |
| `getReconciliation` | Bank and party reconciliation |
| `getPartyAnalysis` | Party-wise analysis (turnover, outstanding, ageing) |
| `getStatutoryReport` | GST/TDS/TCS reports with fallback data queries |
| `getPayrollReport` | Payroll reports with employee/salary data |
| `getInventoryReport` | Inventory reports with stock item data |
| `getCostingReport` | Cost centre/project reports with allocation data |
| `queryAuditTrail` | Audit trail / edit log queries |

## Notes & behavior

- **Trial balance**: `balance > 0` is shown as debit, `balance < 0` as credit (abs). Zero-balance ledgers are filtered out.
- **Balance sheet / P&L**: ledgers are bucketed by their group's `nature` column (`Assets`, `Liabilities`, `Income`, `Expenses`). Only `is_active = 1` ledgers participate.
- **Running balance**: seeded from `ledgers.opening_balance`; `Dr` adds, `Cr` subtracts.
- **cashBook** finds cash ledger by `ledger_type = 'Cash'` first, falls back to group nature `Cash-in-Hand`, then `name LIKE '%Cash%'`.
- **bankBook** auto-finds first bank ledger by group nature `Bank Accounts` or `name LIKE '%Bank%'` when ledger_id is omitted.
- **ledgerReport** auto-picks first active ledger when ledger_id is omitted.
- **Optional/post-dated vouchers**: All report queries filter `COALESCE(v.is_optional, 0) = 0` and `COALESCE(v.is_post_dated, 0) = 0`.
- **report:run** dispatches to `server/report/reportRegistry.js` which maps reportId to a definition file. Each definition calls the appropriate service method.
- **Fallback data**: Universal service methods return meaningful fallback data when specific report types don't match (e.g., all stock items instead of just negative ones, all vouchers instead of specific type).

## Verification

All 586 reports have been verified to:
- Execute successfully (0 failures)
- Return real data (586/586 = 100%, no empty reports)
- Pass 378 backend tests across 51 test suites
