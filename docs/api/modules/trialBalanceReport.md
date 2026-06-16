# Module: trialBalanceReport

Backend module for saving, listing, fetching, and deleting Trial Balance reports
(report header + detail rows) in the Electron + SQLite accounting app.

- Controller: `server/trialBalanceReport/trialBalanceReportController.js`
- Service:    `server/trialBalanceReport/trialBalanceReportService.js`
- Schema:     `server/trialBalanceReport/trialBalanceReport.js`
- Registered in: `server/index.js` (lines 296-299)

## Channels

| IPC channel                    | window.api binding | Params (2nd IPC arg)                                            | Returns                                                                 | Summary |
|--------------------------------|--------------------|----------------------------------------------------------------|------------------------------------------------------------------------|---------|
| `trialBalanceReport:create`    | **none** (not exposed in preload.js) | `data` object: `{ company_id, company_name?, report_date?, period_start?, period_end?, show_closing_balance?, show_debit_credit?, show_groups?, show_grand_total?, detailed_mode?, rows?[] }` | `{ success: true, report }` (inserted header row) or `{ success: false, error }` | Insert a report header + its detail rows. |
| `trialBalanceReport:getAll`    | **none** (not exposed in preload.js) | bare scalar `company_id`                                        | `{ success: true, reports: [...] }` or `{ success: false, error }`      | List all report headers for a company, newest first. |
| `trialBalanceReport:getById`   | **none** (not exposed in preload.js) | bare scalar `id` (report_id)                                   | `{ success: true, report: { ...header, rows: [...] } }`, `{ success:false, error:'Report not found' }`, or `{ success:false, error }` | Fetch one header + its rows (ordered by display_order). |
| `trialBalanceReport:delete`    | **none** (not exposed in preload.js) | bare scalar `id` (report_id)                                   | `{ success: true }`, `{ success:false, error:'Report not found' }`, or `{ success:false, error }` | Delete a report by id (cascades to rows). |

## Warnings

1. **No renderer binding.** None of the four `trialBalanceReport:*` channels are
   exposed in `preload.js`. The renderer cannot reach these handlers via
   `window.api`. (The `window.api.report.trialBalance(...)` entry that exists in
   preload.js maps to channel `report:trialBalance` and belongs to the separate
   `report` module — it is unrelated to this module.) Either the preload bindings
   are missing or these handlers are dead/unused IPC endpoints.

2. **Errors are not thrown.** The service wraps every operation in try/catch and
   returns `{ success: false, error }` with a normal (200) transport status instead
   of rejecting. Callers must inspect `success`, not catch exceptions. The OpenAPI
   `5XX` responses are documented for completeness but in practice failures arrive
   as `ServiceFailure` over a 200.

3. **`getById` / `delete` "not found"** returns `success: false` with
   `error: 'Report not found'` rather than a distinct 404.

4. No channel typos were found in this module's registrations.
