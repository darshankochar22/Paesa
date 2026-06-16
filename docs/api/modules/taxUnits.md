# taxUnits Module — IPC API Reference

Backend module: `server/taxUnits/`
- `taxUnit.js` — schema init (`tax_units` table)
- `taxUnitServices.js` — business logic / SQL
- `taxUnitController.js` — IPC handler functions

IPC namespace: **`taxUnits`** (matches the module name).
Renderer binding root: **`window.api.taxUnits`** (from `preload.js`).

> Note: source filenames are singular (`taxUnit*.js`) while the IPC namespace,
> the renderer binding, and the table name use the plural `taxUnits` / `tax_units`.

## Channels

| Channel | window.api binding | Params (IPC arg 2) | Returns | Summary |
|---|---|---|---|---|
| `taxUnits:create` | `window.api.taxUnits.create(data)` | `data` object — see TaxUnitCreateInput (`company_id`, `name` required) | `{ success: true, taxUnit }` or `{ success: false, error }` | Create a tax unit; rejects a duplicate active name (case-insensitive) within the same company. |
| `taxUnits:getAll` | `window.api.taxUnits.getAll(company_id)` | bare scalar `company_id` (integer) | `{ success: true, taxUnits: [...] }` or `{ success: false, error }` | List all active (`is_active = 1`) tax units for a company. |
| `taxUnits:getById` | `window.api.taxUnits.getById(id)` | bare scalar `tax_unit_id` (integer) | `{ success: true, taxUnit }` or `{ success: false, error }` | Fetch a single tax unit by primary key. |
| `taxUnits:update` | `window.api.taxUnits.update(data)` | `data` object — `tax_unit_id` required; other fields optional (partial update) | `{ success: true, taxUnit }` or `{ success: false, error }` | Partial update; omitted fields keep current values. `company_id` / `is_active` not updatable here. |
| `taxUnits:delete` | `window.api.taxUnits.delete(id)` | bare scalar `tax_unit_id` (integer) | `{ success: true }` or `{ success: false, error }` | Soft-delete: sets `is_active = 0` (no physical delete). |

## Behavior notes

- **Result envelopes**: every service method returns a `{ success: boolean, ... }`
  object. There is no thrown error to the renderer — caught exceptions are
  returned as `{ success: false, error: err.message }`.
- **Boolean coercion**: `set_alter_excise_details`, `set_alter_excise_tariff`,
  and `set_alter_rule11_book` are coerced via `value ? 1 : 0` before storage and
  surfaced back as `0`/`1` integers.
- **Defaults on create**: `registered_for` -> `"Excise"`, `registration_type`
  -> `"Importer"`, `sort_order` -> `0`, `is_active` is forced to `1`.
- **Duplicate check** (create): `SELECT ... WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`.
- **Update partiality**: each updatable field uses
  `data.<field> !== undefined ? data.<field> : existingRow.<field>`.

## Channel typo audit

No typos found. All five channels follow `taxUnits:<action>` and map 1:1 to the
controller functions and the `window.api.taxUnits.*` bindings.
