# Module: profitLossReport

Backend module for creating, listing, fetching, and deleting **saved Profit & Loss reports**
(report header + its section/group view rows) in the Electron + SQLite accounting app.

- **Source files**
  - `server/profitLossReport/profitLossReport.js` — schema init (tables `profit_loss_reports`, `profit_loss_views`)
  - `server/profitLossReport/profitLossReportService.js` — SQL / business logic
  - `server/profitLossReport/profitLossReportController.js` — IPC handlers
- **Registered in** `server/index.js` (lines 306–309).

## WARNING — preload binding gap

The `profitLossReport:*` channels are registered with `ipcMain.handle(...)` but are **NOT exposed in
`preload.js`**. There is therefore **no `window.api.profitLossReport.*` renderer binding** — the
renderer cannot call these channels through the documented `window.api` surface.

Separately, `preload.js` line 126 exposes:

```js
window.api.report.profitLoss(company_id, fy_id) // => invoke('report:profitLoss', { company_id, fy_id })
```

This `report:profitLoss` channel belongs to a **different "report" module** that computes a live P&L
from vouchers/ledgers. It does **not** read or write the `profit_loss_reports` / `profit_loss_views`
tables documented here, so it is not part of this module.

## Channels

| Channel (IPC) | window.api binding | Params (2nd IPC arg) | Returns | Summary |
|---|---|---|---|---|
| `profitLossReport:create` | _none (not in preload)_ | `data` object — `company_id` (required) + header fields + optional `rows[]` (see ProfitLossReportCreateInput) | `{ success: true, report }` where `report` is the inserted `profit_loss_reports` row (view rows not echoed back) | Create a saved P&L report header plus its section view rows. |
| `profitLossReport:getAll` | _none (not in preload)_ | `company_id` (bare integer) | `{ success: true, reports: ProfitLossReport[] }` ordered by `created_at DESC` | List all saved P&L report headers for a company. |
| `profitLossReport:getById` | _none (not in preload)_ | `id` (bare integer = `report_id`) | `{ success: true, report: {...header, income[], expenses[], grossProfit[], netProfit[]} }`, or `{ success:false, error:'Report not found' }` | Fetch a report header plus its view rows grouped by section. |
| `profitLossReport:delete` | _none (not in preload)_ | `id` (bare integer = `report_id`) | `{ success: true }`, or `{ success:false, error:'Report not found' }` | Delete a saved P&L report (cascades to its view rows). |

### Notes

- **Error handling:** The service wraps every operation in try/catch and resolves with
  `{ success: false, error: <message> }` instead of rejecting. Callers should branch on `success`.
- **Section grouping (getById):** view rows are split by the `section` column into `income`
  (`'Income'`), `expenses` (`'Expense'`), `grossProfit` (`'GrossProfit'`), and `netProfit`
  (`'NetProfit'`); rows with any other section value are dropped from the response.
- **Boolean fields** (`show_*`, `is_*`, `*_enabled`, `compare_with_previous_period`,
  `filter_enabled`) are stored as `0/1` integers in SQLite and should be surfaced as real booleans.
- **Money fields** in `profit_loss_views` (`opening_balance`, `current_period_amount`,
  `closing_balance`) are currency — map to `NUMERIC(18,2)` in Postgres, never floating point.

See `profitLossReport.yaml` for the full OpenAPI 3.1 contract and component schemas.
