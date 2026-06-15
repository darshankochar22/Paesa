# payrollUnit module — API reference

Backend module: `server/payrollUnit/`
- `payrollUnit.js` — schema init (table `payroll_units`)
- `payrollUnitService.js` — logic / SQL
- `payrollUnitController.js` — IPC handlers
- Registered in `server/index.js` (lines 233–237)
- Exposed in `preload.js` as `window.api.payrollUnit.*` (lines 271–276)

A **payroll unit** is a unit of measure used in payroll (Days, Hours, Minutes,
Months, Pieces, ...), scoped per company. Five predefined units are seeded per
company via `seedDefaultPayrollUnits` (not an IPC channel).

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `payrollUnit:create` | `window.api.payrollUnit.create(data)` | `data`: `{ company_id, name, symbol?, formal_name?, unit_type?='Simple', decimal_places?=0, first_unit?, conversion?, second_unit? }` | `{ success: true, unit }` or `{ success: false, error }` | Create a new (non-predefined) payroll unit; rejects duplicate active name per company (case-insensitive). |
| `payrollUnit:getAll` | `window.api.payrollUnit.getAll(company_id)` | bare scalar `company_id` | `{ success: true, payrollUnits: [...] }` or `{ success: false, error }` | List all active (`is_active = 1`) payroll units for a company. |
| `payrollUnit:getById` | `window.api.payrollUnit.getById(id)` | bare scalar `id` (= `payroll_unit_id`) | `{ success: true, unit }` or `{ success: false, error }` (not found) | Fetch a single payroll unit by primary key. |
| `payrollUnit:update` | `window.api.payrollUnit.update(data)` | `data`: `{ payroll_unit_id, name?, symbol?, formal_name?, unit_type?, decimal_places?, first_unit?, conversion?, second_unit? }` | `{ success: true, unit }` or `{ success: false, error }` | Update a non-predefined unit; omitted fields keep current value; refreshes `updated_at`. |
| `payrollUnit:delete` | `window.api.payrollUnit.delete(id)` | bare scalar `id` (= `payroll_unit_id`) | `{ success: true }` or `{ success: false, error }` | **Soft delete** — sets `is_active = 0`; rejects predefined units. |

## Notes & behaviors

- **All operations return IPC status 200.** Errors are returned in-band as
  `{ success: false, error: <string> }`. The service wraps every call in
  try/catch and returns `err.message` on exception.
- **`create`** forces `is_active = 1`, `is_predefined = 0`. Duplicate check is
  `LOWER(name)` among `is_active = 1` rows for the same `company_id`.
- **`update`** and **`delete`** both refuse to act when
  `is_predefined = 1` ("Cannot edit/delete predefined payroll units").
- **`delete` is a soft delete** — the row remains and is simply marked inactive.
  `getById` can still return soft-deleted rows; `getAll` filters them out.
- Controller arg shapes:
  - `create(event, data)` / `update(event, data)` — object payload.
  - `getAll(event, company_id)` — bare scalar.
  - `getById(event, id)` / `delete(event, id)` — bare scalar.

See `payrollUnit.yaml` for the full OpenAPI 3.1 contract and the
`../../db/modules/payrollUnit.sql` / `payrollUnit.md` for the Postgres schema.
