# stockItem module — IPC API reference

Backend module: `server/stockItem/`
- `stockItem.js` — schema init (tables `stock_items`, `stock_item_opening_allocations`)
- `stockItemService.js` — logic / SQL
- `stockItemController.js` — IPC handlers

Channels are registered in `server/index.js` as `ipcMain.handle('stockItem:<action>', stockItemController.<fn>)`.
The renderer accesses them through the preload bridge at `window.api.stockItem.<method>`
(each preload method calls `invoke('stockItem:<action>', payload)`).

Namespace: `stockItem` (same as module name). No typo'd channels were found in this module.

## Conventions

- These are Electron IPC channels, not HTTP endpoints. The OpenAPI fragment models each as a
  `POST /stockItem/<action>` purely as a documentation convention.
- The service **never throws across IPC**. On validation failure or a caught exception it
  returns `{ success: false, error: <string> }`. Success shapes always include `success: true`.
- Boolean inputs (`track_batches`, `track_expiry`, `track_date_of_manufacturing`,
  `enable_cost_tracking`, `has_bom`) are coerced to `1`/`0` before storage. Returned rows
  expose them as `0`/`1` integers.
- `opening_value` (item) and `amount` (allocation) are **computed server-side**
  (`opening_quantity * opening_rate`, `quantity * rate`); any client-supplied value is ignored.

## Channels

| Channel | window.api binding | Params (payload) | Returns | Summary |
|---|---|---|---|---|
| `stockItem:create` | `window.api.stockItem.create(data)` | `data` object: `StockItemCreateInput` (`company_id` + `name` required; many optional fields; optional `allocations[]`) | `{ success: true, item }` where `item` is the stock_items row + `allocations[]`; or `{ success: false, error }` | Create a stock item; rejects duplicate name per company; inserts opening allocations. |
| `stockItem:getAll` | `window.api.stockItem.getAll(company_id)` | bare `company_id` (integer) | `{ success: true, stockItems: [...] }` (active items, ordered by name) or `{ success: false, error }` | List all active stock items for a company. |
| `stockItem:getById` | `window.api.stockItem.getById(id)` | bare `id` (item_id, integer) | `{ success: true, item }` (row + `allocations[]`) or `{ success: false, error }` (e.g. "Stock Item not found") | Get one stock item by id, including opening allocations. Does **not** filter on `is_active`. |
| `stockItem:update` | `window.api.stockItem.update(data)` | `data` object: `StockItemUpdateInput` (`item_id` required; other fields optional, omitted = keep current) | `{ success: true, item }` (updated row + `allocations[]`) or `{ success: false, error }` | Update a stock item; recomputes `opening_value`; if `allocations` provided, deletes & replaces them. |
| `stockItem:delete` | `window.api.stockItem.delete(id)` | bare `id` (item_id, integer) | `{ success: true }` or `{ success: false, error }` | Soft-delete: sets `is_active = 0`. Row and allocations are retained. |
| `stockItem:getByGroup` | `window.api.stockItem.getByGroup({ company_id, group_id })` | `{ company_id, group_id }` | `{ success: true, stockItems: [...] }` or `{ success: false, error }` | List active items for a company filtered by stock group. |
| `stockItem:getByCategory` | `window.api.stockItem.getByCategory({ company_id, category_id })` | `{ company_id, category_id }` | `{ success: true, stockItems: [...] }` or `{ success: false, error }` | List active items for a company filtered by stock category. |
| `stockItem:getStockBalances` | `window.api.stockItem.getStockBalances(company_id)` | bare `company_id` (integer) | `{ success: true, balances }` where `balances` is `{ [item_id]: number }` or `{ success: false, error }` | Compute current quantity balance per item from opening qty + voucher movements, overridden by latest physical stock count. |

## Notes & caveats

- **`getById` ignores `is_active`** — a soft-deleted item can still be fetched by id.
- **`update` allocations are destructive** — passing `allocations` (including `[]`) deletes all
  existing `stock_item_opening_allocations` rows for the item and re-inserts the provided set.
  Omitting `allocations` entirely leaves them untouched.
- **`getStockBalances` reads cross-module tables** (`voucher_stock_entries`, `vouchers`,
  `physical_stock_entry_lines`, `physical_stock_entries`). Those tables are owned by other
  modules and are not documented here.
- **Inconsistent date column in `getStockBalances`**: the post-physical-stock movement query
  filters on `v.date > ?`, while the main `vouchers` table is generally keyed by
  `voucher_date`. If `vouchers` has no `date` column this sub-query would error; it is wrapped
  in a `try/catch` that silently falls back to voucher-only balances. (Documented as observed.)
