# attendanceType module — API reference

Backend module: `server/attendanceType/`
- `attendanceType.js` — schema init (table `attendance_types`)
- `attendanceTypeService.js` — SQL logic + `seedDefaultAttendanceTypes`
- `attendanceTypeController.js` — IPC handlers

Transport: **Electron IPC** (`ipcMain.handle`), not HTTP. Channels are registered in
`server/index.js` and exposed to the renderer in `preload.js` under
`window.api.attendanceType.*`.

Namespace = `attendanceType` (same as module name).

## Channels

| Channel | window.api binding | Params (2nd IPC arg) | Returns | Summary |
|---|---|---|---|---|
| `attendanceType:create` | `window.api.attendanceType.create(data)` | `data` object: `{ company_id*, name*, alias?, type?, unit_id?, period?, carry_forward?, encashment?, max_days? }` | `{ success: true, attendanceType: AttendanceType }` or `{ success: false, error }` | Create an attendance type. Rejects a duplicate active name (case-insensitive) for the same company. Always inserts with `is_active=1`, `is_predefined=0`. |
| `attendanceType:getAll` | `window.api.attendanceType.getAll(company_id)` | bare scalar `company_id` (integer) | `{ success: true, attendanceTypes: AttendanceType[] }` or `{ success: false, error }` | List all **active** (`is_active = 1`) attendance types for a company. |
| `attendanceType:getById` | `window.api.attendanceType.getById(id)` | bare scalar `id` (integer = `attendance_type_id`) | `{ success: true, attendanceType: AttendanceType }` or `{ success: false, error: 'Attendance Type not found' }` | Fetch one row by id (returns inactive rows too — no `is_active` filter). |
| `attendanceType:update` | `window.api.attendanceType.update(data)` | `data` object: `{ attendance_type_id*, name?, alias?, type?, unit_id?, period?, carry_forward?, encashment?, max_days? }` | `{ success: true, attendanceType: AttendanceType }` or `{ success: false, error }` | Update a row. Rejects if not found or if `is_predefined` is truthy. Omitted fields keep their current value. Sets `updated_at`. |
| `attendanceType:delete` | `window.api.attendanceType.delete(id)` | bare scalar `id` (integer = `attendance_type_id`) | `{ success: true }` or `{ success: false, error }` | **Soft delete**: sets `is_active = 0`. Rejects if not found or `is_predefined`. |

`*` = required.

## Result envelopes

All handlers return a plain object (never throw across IPC — errors are caught and
returned as `{ success: false, error: <message> }`).

- `AttendanceType` row shape: see `attendance_types` table in
  [`docs/db/modules/attendanceType.md`](../../db/modules/attendanceType.md).
- `carry_forward`, `encashment`, `is_active`, `is_predefined` are SQLite integer 0/1 booleans.
- `created_at` / `updated_at` are ISO-8601 datetime strings (`datetime('now')`).

## Notes / warnings

- **Schema migration no-op (not a typo but worth flagging):** `attendanceType.js` runs a
  best-effort `ALTER TABLE attendance_types ADD COLUMN <col> TEXT` loop for
  `['alias', 'period', 'carry_forward', 'encashment', 'max_days']`. These columns already
  exist in the `CREATE TABLE` (and `carry_forward`/`encashment`/`max_days` are declared as
  INTEGER/REAL, not TEXT), so every iteration fails and is swallowed by `try/catch`. The
  intent is to back-fill columns on pre-existing databases; on a fresh DB it is a no-op.
- `seedDefaultAttendanceTypes(company_id)` exists in the service but is **not** wired to an
  IPC channel (called internally during company setup). It inserts 6 predefined rows
  (Present, Absent, Half Day, Paid Leave, Unpaid Leave, Overtime) with `is_predefined = 1`.
- Predefined rows (`is_predefined = 1`) cannot be updated or deleted.
