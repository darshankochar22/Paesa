# balanceSheetReport — IPC API Reference

Backend module: `server/balanceSheetReport/`
- `balanceSheetReport.js` — schema init (tables `balance_sheet_reports`, `balance_sheet_views`)
- `balanceSheetReportService.js` — logic / SQL
- `balanceSheetReportController.js` — IPC handlers

IPC channels are registered in `server/index.js` (lines 301–304) under the namespace
`balanceSheetReport`.

> **WARNING — no renderer binding.** None of these channels are exposed in `preload.js`.
> There is **no** `window.api.balanceSheetReport.*` object. The only `balanceSheet` entry in
> preload (`window.api.report.balanceSheet`) maps to the unrelated channel `report:balanceSheet`
> in a different module. As shipped, these handlers are unreachable from the renderer via the
> contextBridge `window.api`. The bindings listed below are the expected-by-convention names,
> which do not currently exist.

## Channels

| Channel | window.api binding | Params (IPC arg 2) | Returns | Summary |
|---|---|---|---|---|
| `balanceSheetReport:create` | `window.api.balanceSheetReport.create` *(not exposed)* | `data` object: report header fields (`company_id` required) + optional `rows[]` of view rows | `{ success: true, report }` (header row, no rows) or `{ success: false, error }` | Insert a report header and any supplied view rows; returns the saved header. |
| `balanceSheetReport:getAll` | `window.api.balanceSheetReport.getAll` *(not exposed)* | bare `company_id` (integer) | `{ success: true, reports: BalanceSheetReport[] }` or `{ success: false, error }` | List a company's report headers, newest first (`ORDER BY created_at DESC`). |
| `balanceSheetReport:getById` | `window.api.balanceSheetReport.getById` *(not exposed)* | bare `id` = `report_id` (integer) | `{ success: true, report: { ...header, assets: [], liabilities: [] } }` or `{ success: false, error }` | Fetch one report header plus its view rows split by `side` into assets/liabilities. |
| `balanceSheetReport:delete` | `window.api.balanceSheetReport.delete` *(not exposed)* | bare `id` = `report_id` (integer) | `{ success: true }` or `{ success: false, error }` (e.g. `'Report not found'`) | Delete a report by id; cascades to `balance_sheet_views`. |

## Notes on payload shapes

- **create** destructures a single `data` object in the service. Header columns map 1:1 to
  `balance_sheet_reports`. Boolean-ish fields accept booleans/numbers and are coerced to `0/1`.
  Some defaults are applied with `??` (e.g. `show_vertical_balance_sheet`, `profit_or_loss_as_liability`,
  `include_closing_stock`, `show_profit` default to `1`), others with a ternary (`? 1 : 0`).
  `report_date` defaults to today (`YYYY-MM-DD`). An optional `rows[]` array seeds
  `balance_sheet_views`; each row needs at least `group_name`. `display_order` defaults to the
  1-based array index.
- **getAll**, **getById**, **delete** each take a bare scalar as IPC arg 2 (not an object).
- Every service method returns an envelope: `{ success: true, ... }` on success or
  `{ success: false, error }` on a caught error or not-found. The service never throws.

## Return shape details

- `create` returns only the header row (`SELECT * FROM balance_sheet_reports WHERE report_id = ?`),
  not the inserted view rows.
- `getById` returns the header plus `assets` and `liabilities` arrays built by filtering
  `balance_sheet_views` rows on `side === 'Assets'` / `side === 'Liabilities'` (rows ordered by
  `display_order ASC`). Note: rows with any other `side` value would appear in neither array.

See `balanceSheetReport.yaml` for the full OpenAPI 3.1 contract and component schemas.
