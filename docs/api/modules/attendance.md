# Attendance module — API reference

Backend module: `server/attendance/`
- `attendance.js` — schema init (tables `attendance_vouchers`, `attendance_voucher_entries`)
- `attendanceService.js` — logic / SQL
- `attendanceController.js` — IPC handlers

IPC channels are registered in `server/index.js` and exposed to the renderer in
`preload.js` under `window.api.attendance.*`. Transport is Electron IPC
(`ipcRenderer.invoke`), not HTTP.

## Channels

| Channel | window.api binding | Params (renderer arg) | Returns | Summary |
|---|---|---|---|---|
| `attendance:create` | `window.api.attendance.create(data)` | `data: { company_id, voucher_number?, date, narration?, entries?: [{ employee_id?, attendance_type_id?, value? }] }` | `{ success: true, attendance_voucher_id, voucher_number }` or `{ success: false, error }` | Insert a voucher + its entries in one transaction (BEGIN/COMMIT/ROLLBACK). Auto-generates `voucher_number` (`ATT-NNNNN`) if not supplied. |
| `attendance:getAll` | `window.api.attendance.getAll(company_id)` | `company_id` (bare integer) | `{ success: true, vouchers: AttendanceVoucher[] }` or `{ success: false, error }` | List all vouchers for a company, `ORDER BY date DESC, attendance_voucher_id DESC`. No entries included. |
| `attendance:getById` | `window.api.attendance.getById(id)` | `id` (bare integer) | `{ success: true, voucher: AttendanceVoucher & { entries: EntryRow[] } }`, or `{ success: false, error: 'Voucher not found' }` | Fetch one voucher plus its entries joined to `employees` (name, code) and `attendance_types` (name). |
| `attendance:delete` | `window.api.attendance.delete(id)` | `id` (bare integer) | `{ success: true }` or `{ success: false, error }` | Delete a voucher by id. DB-level `ON DELETE CASCADE` removes its entries. |
| `attendance:getNextNumber` | `window.api.attendance.getNextNumber(company_id)` | `company_id` (bare integer) — preload wraps it as `{ company_id }` | `{ success: true, nextNumber, voucher_number }` or `{ success: false, error }` | Compute the next `ATT-NNNNN` voucher number for the company. |

### EntryRow (from `getById`)
`entry_id, attendance_voucher_id, employee_id, attendance_type_id, value,
employee_name, employee_number (= employees.employee_code), attendance_type_name`.

## Notes and warnings

- **Argument-shape asymmetry.** `getAll`, `getById`, `delete` controllers take a
  bare scalar (`(event, company_id)` / `(event, id)`). Only `getNextNumber`
  destructures an object: `(event, { company_id })`. The preload for
  `getNextNumber` accepts a scalar and wraps it (`invoke('attendance:getNextNumber', { company_id })`),
  so all five renderer calls take a scalar. The OpenAPI request bodies model each
  scalar as a single-property object (`company_id` or `id`).
- **No update channel.** `attendance.js` defines `updated_at`, but there is no
  `attendance:update` handler; the column is set only at insert time (DEFAULT) and
  never refreshed by this module.
- **Error model.** The service never throws to the IPC layer for expected errors;
  it returns `{ success: false, error }`. The OpenAPI `Error { error, message }`
  schema and 4XX/5XX responses cover unexpected IPC/transport-level failures.
- **`value` coercion.** Entry `value` is stored via `Number(entry.value) || 0`,
  so non-numeric input becomes `0`.
- No typo'd channels were found in this module.
