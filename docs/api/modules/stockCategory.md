# stockCategory module — API reference

Backend module: `server/stockCategory/`
- `stockCategory.js` — schema init (`stock_categories` table).
- `stockCategoryService.js` — logic / SQL.
- `stockCategoryController.js` — IPC handlers.

Namespace: `stockCategory` (matches the module name; no typo channels were found).
All channels are registered in `server/index.js` and exposed in `preload.js` under `window.api.stockCategory`.

Every handler returns an envelope `{ success: boolean, ... }` and never throws — errors come back as `{ success: false, error }` with HTTP 200 semantics.

## Channels

| Channel | window.api binding | Params (2nd IPC arg) | Returns | Summary |
|---|---|---|---|---|
| `stockCategory:create` | `window.api.stockCategory.create(data)` | `{ company_id, name, alias?, description?, parent_category_id? }` | `{ success: true, category }` or `{ success: false, error }` | Inserts a category; rejects duplicate active name within the company (`is_active=1` forced on insert). |
| `stockCategory:getAll` | `window.api.stockCategory.getAll(company_id)` | bare scalar `company_id` | `{ success: true, stockCategories: [...] }` or `{ success: false, error }` | Lists all active (`is_active=1`) categories for a company. |
| `stockCategory:getById` | `window.api.stockCategory.getById(id)` | bare scalar `id` (sc_id) | `{ success: true, category }` or `{ success: false, error: 'Stock Category not found' }` | Fetches one category by `sc_id`. |
| `stockCategory:update` | `window.api.stockCategory.update(data)` | `{ sc_id, name?, alias?, description?, parent_category_id? }` | `{ success: true, category }` or `{ success: false, error }` | Partial update keyed by `sc_id` (omitted fields keep current value via `?? current`); rejects rename to an existing active name. Bumps `updated_at`. |
| `stockCategory:delete` | `window.api.stockCategory.delete(id)` | bare scalar `id` (sc_id) | `{ success: true }` or `{ success: false, error }` | Soft-delete: sets `is_active = 0`. Blocked if active subcategories exist (`Cannot delete category with subcategories`). |

## Notes

- **Soft delete**: `delete` does NOT remove the row; it sets `is_active = 0`. `getAll` and the duplicate-name checks only consider `is_active = 1` rows.
- **Duplicate detection** is case-insensitive (`LOWER(name)`) and scoped per `company_id`.
- **`update` cannot change `company_id`** — duplicate checks use the existing row's `company_id`.
- **Bare-scalar args**: `getAll`, `getById`, and `delete` receive a single value (not an object) as the second IPC argument. In the OpenAPI fragment these are modeled as single-property objects (`company_id` / `id`) for schema validity.
- **Commented-out future check**: `delete` contains a commented `stock_items.category_id` in-use guard that is not yet active.
- **No typo channels** were found for this module.
