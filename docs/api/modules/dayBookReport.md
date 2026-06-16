# dayBookReport — API reference

Backend module: `server/dayBookReport/`
- `dayBookReport.js` — table schema init (`day_book_reports`, `day_book_entries`, `day_book_entry_lines`)
- `dayBookReportService.js` — SQL / logic
- `dayBookReportController.js` — IPC handlers
- Registered in `server/index.js` (lines 311-314)

## WARNING — channels not exposed in preload

The four `dayBookReport:*` channels are registered with `ipcMain.handle(...)` in the
main process but are **not** exposed through `contextBridge` in `preload.js`. There is
no `window.api.dayBookReport` object. As wired today the renderer cannot reach these
channels via `window.api`. The `window.api` bindings below are the **expected** bindings
(if exposed), not actual ones.

The unrelated `report:daybook` channel (module `report`) exists and is exposed as
`window.api.report.daybook(...)` — do not confuse it with this module.

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `dayBookReport:create` | `window.api.dayBookReport.create(data)` — NOT exposed | `data` object: report header fields + optional `entries[]` (each with optional `lines[]`). Requires `company_id`. | `{ success: true, report: <day_book_reports row> }` or `{ success: false, error }` | Create a Day Book report plus its nested entries and entry lines. |
| `dayBookReport:getAll` | `window.api.dayBookReport.getAll(company_id)` — NOT exposed | bare scalar `company_id` | `{ success: true, reports: [<day_book_reports rows>] }` (newest first) or `{ success: false, error }` | List all reports for a company, ordered by `created_at DESC`. |
| `dayBookReport:getById` | `window.api.dayBookReport.getById(id)` — NOT exposed | bare scalar `id` (report_id) | `{ success: true, report: {...header, entries: [{...entry, lines: [...]}], totalDebit, totalCredit} }`; or `{ success: false, error: 'Report not found' }` | Fetch one report with entries, lines, and computed debit/credit totals. |
| `dayBookReport:delete` | `window.api.dayBookReport.delete(id)` — NOT exposed | bare scalar `id` (report_id) | `{ success: true }`; or `{ success: false, error: 'Report not found' }` | Delete a report (cascades to entries and lines). |

## Notes

- Controller passes the raw 2nd IPC arg through to the service. `create` receives an
  object; `getAll`, `getById`, `delete` receive bare scalars.
- Boolean-like inputs (`show_*`, `is_*`, `*_enabled`, `exception_reports_enabled`,
  `filter_enabled`) are stored as `0`/`1` integers. `show_details` and `is_drillable`
  default to `1` via the `?? 1` operator; the rest default to `0` via the ternary.
- Errors are caught in the service and returned as `{ success: false, error: <message> }`
  rather than thrown, so IPC always resolves.
- `totalDebit` / `totalCredit` in `getById` are computed in JS by summing each entry's
  `debit_amount` / `credit_amount` (entry level only — not line level).
