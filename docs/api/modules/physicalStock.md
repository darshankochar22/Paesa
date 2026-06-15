# physicalStock — API reference

Backend module: `server/physicalStock/`
- `physicalStock.js` — SQLite schema init (`physical_stock_entries`, `physical_stock_entry_lines`)
- `physicalStockService.js` — SQL / business logic
- `physicalStockController.js` — IPC handlers

Transport: Electron IPC. Renderer calls `window.api.physicalStock.<method>` (preload.js),
which `invoke`s the channel handled by `ipcMain.handle` in `server/index.js`.

Namespace: `physicalStock` (same as the module name).

## Channels

| Channel | window.api binding | Params (IPC arg 2) | Returns (success shape) | Summary |
|---|---|---|---|---|
| `physicalStock:create` | `window.api.physicalStock.create(data)` | object `{ company_id, voucher_no?, voucher_date, reference_no?, narration?, is_optional?, is_post_dated?, lines?[] }` | `{ success: true, physical_stock_entry_id, voucher_no }` | Create a stocktake voucher header + lines (transactional). |
| `physicalStock:getAll` | `window.api.physicalStock.getAll(company_id)` | bare `company_id` (integer) | `{ success: true, entries: PhysicalStockEntryRow[] }` | List voucher headers for a company, newest first. |
| `physicalStock:getById` | `window.api.physicalStock.getById(id)` | bare `id` (integer) | `{ success: true, entry: { ...header, lines: [...] } }` | One voucher with its lines (item/godown names joined). |
| `physicalStock:delete` | `window.api.physicalStock.delete(id)` | bare `id` (integer) | `{ success: true }` | Delete a voucher; lines cascade. |
| `physicalStock:getNextNumber` | `window.api.physicalStock.getNextNumber(company_id)` | object `{ company_id }` | `{ success: true, nextNumber, voucher_number }` | Compute next `PST-NNNNN` voucher number. |

On any caught error every method returns `{ success: false, error }` instead of throwing.
`getById` returns `{ success: false, error: 'Entry not found' }` when the id does not exist.

## Payload notes

- **create**: `amount` per line is NOT accepted from the client — the service computes
  `amount = quantity * rate` server-side. `voucher_no` is optional; if falsy the service
  auto-generates the next `PST-NNNNN`. `is_optional` / `is_post_dated` are sent as booleans
  and persisted as `0/1`.
- **getAll / getById / delete**: the controller passes the IPC arg through directly — the
  payload is a **bare scalar**, not an object. The preload binding signatures confirm this
  (`getAll(company_id)`, `getById(id)`, `delete(id)`).
- **getNextNumber**: the only read that takes an **object** — controller destructures
  `{ company_id }`; preload wraps the scalar as `{ company_id }` before invoking.

## Warnings

- **Inconsistent payload conventions**: `getNextNumber` expects `{ company_id }` while
  `getAll` expects a bare `company_id`. Callers must pass the right shape per method.
- **Broken join in `getById`**: the lines query joins
  `LEFT JOIN stock_items i ON i.stock_item_id = l.stock_item_id`, but `stock_items`' primary
  key column is `item_id` (there is no `stock_item_id` column on `stock_items`). As written,
  `item_name` will always resolve to NULL. The FK column on the line table is
  `stock_item_id` and it references `stock_items(item_id)` per the schema. The join should be
  `ON i.item_id = l.stock_item_id`.
- No explicit `update` channel exists; editing a voucher is not supported by this module.
