# financialYear module — API reference

Backend module: `financialYear`
IPC namespace: **`fy`** (note: namespace differs from the module folder name `financialYear`)
Controller: `server/financialYear/financialYearController.js`
Service: `server/financialYear/financialYearService.js`
Schema init: `server/financialYear/financialYear.js`

All channels are registered in `server/index.js` via `ipcMain.handle('fy:<action>', financialYearController.<fn>)` and exposed to the renderer in `preload.js` under `window.api.fy`.

## Channels

| Channel | window.api binding | Params (payload) | Returns | Summary |
|---|---|---|---|---|
| `fy:create` | `window.api.fy.create(data)` | `{ company_id, start_date, end_date? }` (object) | `{ success: true, fy: FinancialYear }` or `{ success: false, error }` | Create a FY. Rejects duplicate (company_id + start_date). `end_date` defaults to start_date + 1 year − 1 day. Always inactive on create. |
| `fy:getAll` | `window.api.fy.getAll(company_id)` | `company_id` (bare scalar) | `{ success: true, financialYears: FinancialYear[] }` or `{ success: false, error }` | List all FYs for a company. |
| `fy:getById` | `window.api.fy.getById(id)` | `id` = fy_id (bare scalar) | `{ success: true, fy: FinancialYear }` or `{ success: false, error }` | Fetch one FY by fy_id. |
| `fy:setActive` | `window.api.fy.setActive(fy_id, company_id)` | `{ fy_id, company_id }` (object — preload wraps the two args) | `{ success: true }` or `{ success: false, error }` | Activate one FY; deactivates all other FYs of the company. Refuses to activate a closed FY. |
| `fy:delete` | `window.api.fy.delete(id)` | `id` = fy_id (bare scalar) | `{ success: true }` or `{ success: false, error }` | Delete a FY by fy_id. Refuses if active or closed. |

## Notes

- **Response envelope:** Every service method returns a `{ success: boolean, ... }` object. Errors are returned in-band (`success: false`, `error: string`) rather than thrown, so the IPC call resolves with HTTP-200-equivalent payloads even on logical failure.
- **Booleans:** `is_active` and `is_closed` are SQLite `INTEGER` columns holding `0`/`1`. Treat `0` as false, `1` as true.
- **Dates:** `start_date`, `end_date`, `closing_date` are date-only ISO strings (`yyyy-mm-dd`). `created_at` is a full ISO datetime string (`datetime('now')`).
- **`setActive` arg shape:** The controller destructures `{ fy_id, company_id }` from its second argument. The preload binding takes two positional args and wraps them into that object before invoking.
- **`seedDefaultFY`:** The service also exports `seedDefaultFY(company_id, financial_year_beginning_from)`, used internally during company creation. It is **not** wired to any IPC channel and is therefore not part of the public API surface.
- No typos were found in this module's channel names.
