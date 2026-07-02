# Reports — implementation status (ground truth from ReportRunner.tsx)

`ReportRunner` dispatches by the last URL segment (`reportType`). It renders a
**dedicated Layout** for ~35 reports; everything else falls through to the
generic, data-driven `ReportTable` (columns + `apiMethod` from
`reportDefinitions.ts`, ~580 definitions total).

**Theme:** ✅ all reports swept to strict gray this pass (every `#e5eff5`/`#ffcc00`/
green/teal/blue/red leak → zinc; `components/reports/*`, `pages/reports/*`,
`ReportRunner`, `ReportTable`). Typechecks clean.

Legend: **L** = dedicated layout (real impl) · **G** = generic ReportTable · data
path noted where known.

## Dedicated layouts (the "properly implemented" reports)

| reportType | Layout component | Data source | Notes |
|---|---|---|---|
| balance-sheet | BalanceSheetLayout | `api.report.balanceSheet` | two-column; → group drill |
| profit-loss | ProfitLossLayout **(from `ProfitnLossLayout.tsx`)** | `api.report.profitLoss` | ⚠ `ProfitLossLayout.tsx` is the DEAD duplicate |
| trial-balance | TrialBalanceLayout | `api.report.trialBalance` | |
| stock-summary | StockSummaryLayout | `api.report.stockSummary` | valuation method aware |
| stock-item | StockItemSelectionLayout | `api.stockItem.getAll` | selection screen |
| group-summary | GroupSummaryLayout | `api.report.groupSummary` | |
| ledger-summary | LedgerMonthlySummaryLayout | `api.report.ledgerMonthly` | |
| ledger | LedgerVouchersLayout | `api.report.ledgerReport` | takes from/to props |
| ratio-analysis | RatioAnalysisLayout | `api.report.ratioAnalysis` | |
| group-vouchers | GroupVouchersLayout | `api.report.groupVouchers` | |
| cash-bank | CashBankSummaryLayout | `api.report.cashBank` | |
| outstandings-receivable / -payable | BillsLayout (mode) | `api.report.billsReceivable/Payable` | |
| ledger-outstandings / outstandings-ledger | LedgerOutstandingsLayout | `api.report.*` | |
| group-outstandings / outstandings-group | GroupOutstandingsLayout | `api.report.*` | |
| interest-receivable / -payable | InterestBillsLayout (mode) | `api.report.*` | |
| interest-calculation-ledger-wise | InterestLedgerLayout | `api.report.ledgerInterest` | drills → Ledger Vouchers → Voucher |
| interest-calculation-group-wise | InterestGroupLayout / InterestGroupTable | `api.report.groupInterest` | drills → Ledger Interest Calc |
| contra/payment/receipt/sales/purchase/credit-note/debit-note/journal-register | *RegisterLayout (8) | `api.report.*Register` | month→voucher drill |
| voucher-clarification | VoucherClarificationLayout | `api.report.voucherClarificationSummary` | |
| cost-category-summary | CostCategorySummaryLayout | `api.report.*` | |
| cost-centre-summary | CostCentreSummaryLayout | `api.report.*` | |
| cost-centre-break-up | CostCentreBreakupLayout | `api.report.*` | |
| cost-centre-ledger | CostCentreLedgerLayout | `api.report.*` | |
| cost-centre-wise-p-and-l | CostCentreWisePLLayout | `api.report.*` | |
| statistics | StatisticsLayout | `api.report.statistics` | |

## Self-contained report pages (not via ReportRunner switch, full impl)
`FundsFlowStatement` (782), `CashFlowStatement` (248), `GroupSummary` (194),
`LedgerMonthlySummary` (203) under `pages/reports/accounts/`; `StockSummary` (614),
`GodownSummary` (522), `StockGroupSummary` (516), `StockCategorySummary` (516),
`BatchVouchers` (435), `InventoryVoucherRegister` (275) under
`pages/reports/inventory/`. All de-colored this pass.

## Generic (G) reports
The remaining ~545 `reportDefinitions` render through `ReportTable` with
`apiMethod: "run"` → `window.api.report.run(reportId, …)`. Whether each shows data
depends on the backend `run` handler for that `reportId`. These share ONE renderer,
so fixing `ReportTable` (done: de-colored) fixes all of them visually at once.

## Done
- ✅ **Theme**: all reports strict-gray (see top).
- ✅ **Dead code removed**: deleted `ProfitLossLayout.tsx` duplicate; stripped the
  never-run `renderRegisterTable`/`renderRegisterChart` + `isRegister` helpers from
  `ReportRunner` (1303 → ~912 lines).
- ✅ **Core reports migrated onto the kit:**
  - `BalanceSheetLayout` → `ui/TwoColumnReport` + `@/lib/format` (bespoke Panel/GroupRows gone).
  - `TrialBalanceLayout` → `ui/DataTable variant="report"` + totals row + `@/lib/format`.
  - `StockSummaryLayout` → `ui/DataTable variant="report"` (expandable group→item subItems) + `@/lib/format`.
  - `Daybook` (Day Book) → formatter delegated to `@/lib/format`.
  - `ProfitnLossLayout` (live P&L) → de-colored only; local `fmt` kept (shows `0.00` for 0;
    not equivalent to `lib.fmtAbs`, left to avoid output drift in its 702-line recursive tree).
- Verified: `tsc --noEmit` clean + `vite build` succeeds (2527 modules).

## Open (long tail, intentionally deferred)
- The other ~30 dedicated layouts (registers, cost-centre, interest, outstandings) are
  de-colored but still hand-roll `<table>` + local `fmt`. Migrate onto `DataTable variant="report"`
  the same way when needed.
- Data correctness for the ~545 generic reports depends on each backend `run` handler — verify in-app.
