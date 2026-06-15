# Report Module — IPC API Reference

Backend module: **report** (`server/report/`)
Namespace: **report** (channel prefix `report:`)
Controller: `server/report/reportController.js`
Service: `server/report/reportService.js`
Renderer binding root: `window.api.report`

This is a **read-only reporting module**. It owns **no tables**; every operation
aggregates rows from tables owned by other modules (`vouchers`,
`voucher_entries`, `ledgers`, `groups`) and from `voucherService`.

Every handler returns a service envelope: `{ success: true, ... }` on success or
`{ success: false, error }` on a caught error. Errors are returned in-band — the
handlers do not throw across the IPC boundary.

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `report:trialBalance` | `window.api.report.trialBalance(company_id, fy_id)` | `{ company_id, fy_id }` | `{ success, rows[], totalDebit, totalCredit }` | Net debit/credit per active ledger for a company + FY. |
| `report:balanceSheet` | `window.api.report.balanceSheet(company_id, fy_id)` | `{ company_id, fy_id }` | `{ success, assets[], liabilities[], totalAssets, totalLiabilities }` | Assets vs Liabilities ledger balances. |
| `report:profitLoss` | `window.api.report.profitLoss(company_id, fy_id)` | `{ company_id, fy_id }` | `{ success, income[], expenses[], totalIncome, totalExpenses, netProfit, isProfit }` | Income vs Expenses and net profit. |
| `report:ledgerReport` | `window.api.report.ledgerReport(company_id, fy_id, ledger_id, from_date, to_date)` | `{ company_id, fy_id, ledger_id, from_date?, to_date? }` | `{ success, ledger_name, opening_balance, rows[], closing_balance }` | Ledger statement with running balance over an optional date range. |
| `report:cashBook` | `window.api.report.cashBook(company_id, fy_id, from_date, to_date)` | `{ company_id, fy_id, from_date?, to_date? }` | `{ success, ledger_name, opening_balance, rows[], closing_balance }` | Ledger statement for the company's `Cash`-type ledger. |
| `report:bankBook` | `window.api.report.bankBook(company_id, fy_id, ledger_id, from_date, to_date)` | `{ company_id, fy_id, ledger_id, from_date?, to_date? }` | `{ success, ledger_name, opening_balance, rows[], closing_balance }` | Ledger statement for a specified bank ledger. |
| `report:daybook` | `window.api.report.daybook(company_id, fy_id, from_date, to_date)` | `{ company_id, fy_id, from_date?, to_date? }` | `{ success, vouchers[] }` | All non-cancelled vouchers, fully expanded, for a company + FY. |

## Notes & behavior

- **Trial balance**: `balance > 0` is shown as debit, `balance < 0` as credit (abs). Zero-balance ledgers are filtered out.
- **Balance sheet / P&L**: ledgers are bucketed by their group's `nature` column (`Assets`, `Liabilities`, `Income`, `Expenses`). Only `is_active = 1` ledgers participate, and only non-cancelled vouchers (`is_cancelled = 0`) contribute entries.
- **Running balance**: seeded from `ledgers.opening_balance`; `Dr` adds, `Cr` subtracts.
- **cashBook** internally resolves the single `ledger_type = 'Cash'` ledger (`LIMIT 1`) then delegates to `ledgerReport`. Returns `{ success: false, error: 'Cash ledger not found' }` if none exists.
- **bankBook** is a thin pass-through to `ledgerReport` for the supplied `ledger_id`.
- **daybook** delegates to `voucherService.getDaybook` then expands each voucher via `voucherService.getById`; the voucher object shape is owned by the voucher module.

## Warnings

- No typo'd channels were found in this module. All seven channels follow the `report:<camelCaseAction>` convention consistently.
- This module has **no schema file** (`report.js` does not exist) and creates **no tables**. The `docs/db/modules/report.sql` / `.md` files document the (foreign, read-only) tables it depends on, not tables it owns.
