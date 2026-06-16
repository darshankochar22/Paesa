# stockGroup — API reference

Backend module: `server/stockGroup/`
- `stockGroup.js` — schema init (`stock_groups` table)
- `stockGroupService.js` — logic / SQL
- `stockGroupController.js` — IPC handlers

Transport is Electron IPC. The renderer calls `window.api.stockGroup.<method>`
(preload.js), which forwards to `ipcMain.handle('stockGroup:<action>', ...)`
(server/index.js).

Namespace: `stockGroup` (same as the module name).

## Channels

| Channel | window.api binding | Params (arg 2) | Returns | Summary |
|---|---|---|---|---|
| `stockGroup:create` | `window.api.stockGroup.create(data)` | `data: { company_id, name, alias?, parent_group_id?, should_quantities_be_added?, hsn_sac_code?, hsn_sac_description?, gst_rate?, cgst_rate?, sgst_rate?, taxability_type?, statutory_details? }` | `{ success: true, group }` or `{ success: false, error }` | Insert a stock group. Rejects when an active group with the same (case-insensitive) name already exists for the company. Forces is_primary=0, is_active=1, is_predefined=0. |
| `stockGroup:getAll` | `window.api.stockGroup.getAll(company_id)` | `company_id` (bare integer) | `{ success: true, stockGroups: StockGroup[] }` or `{ success: false, error }` | List all active stock groups for a company. |
| `stockGroup:getById` | `window.api.stockGroup.getById(id)` | `id` (bare integer = sg_id) | `{ success: true, group }` or `{ success: false, error }` | Fetch one stock group by primary key. |
| `stockGroup:update` | `window.api.stockGroup.update(data)` | `data: { sg_id, ...editable fields }` | `{ success: true, group }` or `{ success: false, error }` | Update editable fields. Omitted fields keep their stored value. Blocked for predefined groups. |
| `stockGroup:delete` | `window.api.stockGroup.delete(id)` | `id` (bare integer = sg_id) | `{ success: true }` or `{ success: false, error }` | Soft-delete (sets is_active=0). Blocked for predefined groups and groups with active subgroups. |
| `stockGroup:getTree` | `window.api.stockGroup.getTree(company_id)` | `company_id` (bare integer) | `{ success: true, tree: StockGroupTreeNode[] }` or `{ success: false, error }` | Active groups for a company assembled into a nested parent/child tree (each node gains a `children` array). |

Notes:
- No channel typos were found in this module; namespace matches the module name.
- `create`, `getById`, and `update` return the row under the key `group`. `getAll`
  returns rows under `stockGroups`; `getTree` returns rows under `tree`.
- All service methods catch errors and return `{ success: false, error: err.message }`
  rather than throwing, so IPC rejections are unusual.
- The service also exports `seedDefaultStockGroups(company_id)` (seeds "Primary" and
  "All Items"), but it is not wired to any IPC channel and is therefore not part of this API.

## Row shape (`StockGroup`)

See `stock_groups` in `docs/db/modules/stockGroup.md`. Boolean-like columns
(`should_quantities_be_added`, `is_primary`, `is_active`, `is_predefined`) are
stored as SQLite 0/1 integers.
