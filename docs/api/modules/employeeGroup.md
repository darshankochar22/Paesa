# employeeGroup module — API reference

Backend module: `server/employeeGroup/`
- `employeeGroup.js` — schema init (`employee_groups` table)
- `employeeGroupService.js` — SQL/business logic
- `employeeGroupController.js` — IPC handlers
- Registered in `server/index.js` (lines 219–224); exposed in `preload.js` (lines 263–270).

IPC namespace: `employeeGroup` (matches the module name). Renderer binding: `window.api.employeeGroup.<method>`.

All handlers return a result envelope. The common shapes are:
- `{ success: true, group }` — create / getById / update
- `{ success: true, employeeGroups: [...] }` — getAll
- `{ success: true, tree: [...] }` — getTree
- `{ success: true }` — delete
- `{ success: false, error }` — any handled failure

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `employeeGroup:create` | `window.api.employeeGroup.create(data)` | `{ company_id, name, alias?, parent_group_id? }` | `{ success, group }` or `{ success:false, error }` | Create a non-predefined group; rejects duplicate active name (case-insensitive) per company. |
| `employeeGroup:getAll` | `window.api.employeeGroup.getAll(company_id)` | bare `company_id` (integer) | `{ success, employeeGroups: EmployeeGroup[] }` | List all active groups for a company. |
| `employeeGroup:getById` | `window.api.employeeGroup.getById(id)` | bare `id` (integer) | `{ success, group }` or `{ success:false, error }` | Fetch one group by `employee_group_id`. |
| `employeeGroup:update` | `window.api.employeeGroup.update(data)` | `{ employee_group_id, name?, alias?, parent_group_id? }` | `{ success, group }` or `{ success:false, error }` | Update name/alias/parent; refuses predefined groups. |
| `employeeGroup:delete` | `window.api.employeeGroup.delete(id)` | bare `id` (integer) | `{ success:true }` or `{ success:false, error }` | Soft-delete (is_active=0); refuses predefined, groups with sub-groups, or groups with employees. |
| `employeeGroup:getTree` | `window.api.employeeGroup.getTree(company_id)` | bare `company_id` (integer) | `{ success, tree: EmployeeGroupNode[] }` | Active groups assembled into a nested parent/child tree. |

## Notes & warnings

- **Bare scalar payloads.** `getAll`, `getById`, `delete`, and `getTree` do NOT take an object — the renderer passes the value directly as IPC arg 2 (e.g. `getById(5)`), and the controller forwards it as-is.
- **Property name asymmetry.** Single-row results use the key `group`, but `getAll` returns the list under `employeeGroups` (plural, camelCase), and `getTree` under `tree`. Consumers must use the correct key per call.
- **Soft delete only.** `delete` never removes rows; it sets `is_active = 0`. Active-state filtering (`is_active = 1`) is applied by `getAll`, `getTree`, the create duplicate-check, and the delete child/employee guards.
- **Predefined protection.** Rows with `is_predefined = 1` (seeded defaults: `Primary`, `Management`, `Staff`, `Workers`) cannot be updated or deleted; both return `{ success:false, error }`.
- **employee_category_id** exists on the table (added via `ALTER TABLE` in `employeeGroup.js`) but is not read or written by any service method in this module.
- **No typo'd channels** were found for this module; all six channels are spelled consistently across `index.js` and `preload.js`.
- Errors are returned in-band as `{ success:false, error }`; the OpenAPI 4XX/5XX `Error` schema models only unexpected transport/runtime failures.
