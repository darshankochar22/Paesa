# employeeCategory module — API reference

Backend module: `server/employeeCategory/`
IPC namespace: `employeeCategory` (matches the module name — no typos found).
Renderer binding: `window.api.employeeCategory.<method>` (preload.js).

Controllers simply forward to `employeeCategoryService`. Service methods return a result
envelope (`{ success, ... }`) rather than throwing; business-rule failures come back as
`{ success: false, error }` inside a normal (200) response.

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `employeeCategory:create` | `window.api.employeeCategory.create(data)` | `{ company_id, name, alias?, allocate_revenue?, allocate_non_revenue? }` | `{ success: true, category }` or `{ success: false, error }` (duplicate active name) | Create a new non-predefined employee category. Always `is_active=1`, `is_predefined=0`. |
| `employeeCategory:getAll` | `window.api.employeeCategory.getAll(company_id)` | bare `company_id` (integer) | `{ success: true, employeeCategories: [...] }` | List all active (`is_active=1`) categories for a company. |
| `employeeCategory:getById` | `window.api.employeeCategory.getById(id)` | bare `id` (integer = `employee_category_id`) | `{ success: true, category }` or `{ success: false, error }` (not found) | Fetch one category by id. |
| `employeeCategory:update` | `window.api.employeeCategory.update(data)` | `{ employee_category_id, name?, alias?, allocate_revenue?, allocate_non_revenue? }` | `{ success: true, category }` or `{ success: false, error }` (not found / predefined) | Update a non-predefined category; omitted fields keep current values; refreshes `updated_at`. |
| `employeeCategory:delete` | `window.api.employeeCategory.delete(id)` | bare `id` (integer = `employee_category_id`) | `{ success: true }` or `{ success: false, error }` | Soft-delete (`is_active=0`). Blocked if predefined, or referenced by active employee_groups/employees. |

## Notes

- **Flag coercion.** `allocate_revenue` / `allocate_non_revenue` accept JS truthy values and are stored as `0`/`1`. `is_active` and `is_predefined` are also 0/1 integers in SQLite.
- **Bare-scalar handlers.** `getAll`, `getById`, and `delete` receive a single scalar argument (not an object). The OpenAPI fragment models these request bodies as integer scalars.
- **Duplicate guard.** `create` rejects when an active category with the same case-insensitive `name` already exists for the company.
- **Predefined protection.** Rows with `is_predefined=1` (e.g. the seeded "Primary Employee Category") cannot be updated or deleted.
- **Cross-module reads on delete.** `delete` consults `employee_groups` and `employees` (other modules) before deactivating.
- **Seeding.** `seedDefaultEmployeeCategory(company_id)` is exported by the service (not exposed over IPC) and inserts the predefined "Primary Employee Category".
