# Employee Module — IPC / API Reference

Backend module: **employee** (`server/employee/`)
- `employee.js` — schema init for the `employees` table.
- `employeeService.js` — SQL logic.
- `employeeController.js` — IPC handlers.
- Registered in `server/index.js` as `ipcMain.handle('employee:<action>', ...)`.
- Exposed to the renderer in `preload.js` as `window.api.employee.<method>`.

All handlers return a `{ success, ... }` envelope and catch their own errors
(they do not throw to the renderer).

## Channels

| Channel | window.api binding | Params (controller-expected) | Returns | Summary |
|---|---|---|---|---|
| `employee:create` | `window.api.employee.create(data)` | `data` object (EmployeeCreateInput); requires `company_id`, `name` | `{ success, employee }` or `{ success:false, error }` | Insert employee; auto-generates `employee_code` (`EMP-NNNNN`) if omitted; rejects duplicate active code. |
| `employee:getAll` | `window.api.employee.getAll(company_id)` | bare `company_id` (integer) | `{ success, employees: Employee[] }` | List active employees for a company. |
| `employee:getById` | `window.api.employee.getById(id)` | bare `id` = `employee_id` (integer) | `{ success, employee }` or `{ success:false, error }` | Fetch one employee by id (active or not). |
| `employee:update` | `window.api.employee.update(data)` | `data` object (EmployeeUpdateInput); requires `employee_id` | `{ success, employee }` or `{ success:false, error }` | Partial update; omitted fields keep current values; rejects duplicate active code. |
| `employee:delete` | `window.api.employee.delete(id)` | bare `id` = `employee_id` (integer) | `{ success }` or `{ success:false, error }` | Soft-delete: sets `is_active=0` and `date_of_leaving` (today, if unset). |
| `employee:getByGroup` | `window.api.employee.getByGroup(company_id, group_id)` | controller expects `{ company_id, employee_group_id }` | `{ success, employees: Employee[] }` | List active employees in a company filtered by group. |

## Warnings

- **Payload key mismatch on `employee:getByGroup`.** `preload.js` binds
  `getByGroup: (company_id, group_id) => invoke('employee:getByGroup', { company_id, group_id })`,
  but `employeeController.getByGroup` destructures `{ company_id, employee_group_id }`.
  The `group_id` key is never read; `employee_group_id` arrives `undefined`, so the
  SQL `employee_group_id = ?` binds to `undefined`/null and the group filter does
  not work as intended when called through `window.api.employee.getByGroup`.
  Calling the channel directly with `{ company_id, employee_group_id }` works.

- **`company_id` and `employee_category_id` are not updatable** via `employee:update`
  (the UPDATE statement omits both columns). `employee_category_id` is added to the
  schema by a migration (`employee.js`) but no handler writes it.

- **Soft delete only.** `employee:delete` never removes the row; it flips
  `is_active` to 0. `getAll`/`getByGroup` filter on `is_active = 1`, so deleted
  employees disappear from lists but remain fetchable via `getById`.

## Notes

- `employee_code` uniqueness is enforced in application logic only (a `SELECT`
  guard), not by a DB constraint, and only among rows where `is_active = 1`.
- `define_salary_details` and `is_active` are 0/1 integer flags (booleans).
- `created_at` / `updated_at` are ISO datetime strings (`datetime('now')`).
- Date-only fields: `date_of_joining`, `date_of_leaving`, `date_of_birth`,
  `date_of_joining_pf`.
