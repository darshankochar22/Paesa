# salaryStructure module — API reference

Backend module: `server/salaryStructure/`
IPC namespace: `salaryStructure` (same as module name)
Renderer binding: `window.api.salaryStructure.<method>` (from `preload.js`)

All handlers are registered in `server/index.js` via
`ipcMain.handle('salaryStructure:<action>', salaryStructureController.<fn>)`.
The service wraps results in a `{ success, ... }` envelope and, on caught
errors, returns `{ success: false, error }` instead of throwing.

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `salaryStructure:create` | `window.api.salaryStructure.create(data)` | `{ company_id, employee_id, effective_from, pay_head_id, amount?, calculation_mode? }` | `{ success: true, structure }` or `{ success: false, error }` | Create one salary-structure line; rejects a duplicate active row for same company/employee/effective_from/pay_head_id. |
| `salaryStructure:createBulk` | `window.api.salaryStructure.createBulk(company_id, employee_id, effective_from, entries)` | `{ company_id, employee_id, effective_from, entries: [{ pay_head_id, amount?, calculation_mode? }] }` | `{ success: true, structures: [...] }` or `{ success: false, error }` | Insert multiple pay-head lines for one employee/date in a loop. |
| `salaryStructure:getAll` | `window.api.salaryStructure.getAll(company_id)` | `company_id` (bare scalar) | `{ success: true, salaryStructures: [...] }` or `{ success: false, error }` | List all active rows for a company. |
| `salaryStructure:getById` | `window.api.salaryStructure.getById(id)` | `id` (bare scalar) | `{ success: true, structure }` or `{ success: false, error: 'Salary Structure not found' }` | Fetch one row by structure_id. |
| `salaryStructure:getByEmployee` | `window.api.salaryStructure.getByEmployee(company_id, employee_id)` | `{ company_id, employee_id }` | `{ success: true, salaryStructures: [{ effective_from, pay_heads: [...] }] }` or `{ success: false, error }` | List an employee's active rows grouped by effective date, newest first. |
| `salaryStructure:update` | `window.api.salaryStructure.update(data)` | `{ structure_id, amount?, calculation_mode? }` | `{ success: true, structure }` or `{ success: false, error: 'Salary Structure not found' }` | Update amount and/or calculation_mode; omitted fields keep current values. |
| `salaryStructure:delete` | `window.api.salaryStructure.delete(id)` | `id` (bare scalar) | `{ success: true }` or `{ success: false, error: 'Salary Structure not found' }` | Soft delete (sets `is_active = 0`). |

## Notes

- `getAll`, `getById`, and `delete` take a **bare scalar** as the 2nd IPC arg
  (not an object). In the OpenAPI fragment these are modeled as `{ company_id }`
  and `{ id }` for clarity.
- `create` enforces uniqueness in application code via a pre-check SELECT on
  `(company_id, employee_id, effective_from, pay_head_id, is_active = 1)` and
  returns `{ success: false, error: 'Salary structure already exists for this date' }`
  on conflict. There is **no** matching UNIQUE constraint in the table DDL.
- `createBulk` does **not** run the duplicate pre-check that `create` does.
- `delete` is a soft delete; `getByEmployee`/`getAll`/`create`'s duplicate check
  all filter on `is_active = 1`.
- No channel typos were found in this module; the namespace matches the module
  name exactly.
