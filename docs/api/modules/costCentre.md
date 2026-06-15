# costCentre module — API reference

Backend module: `server/costCentre/`
- `costCentre.js` — schema init (table `cost_centres`)
- `costCentreService.js` — SQL / business logic
- `costCentreController.js` — IPC handler wrappers

IPC channels are registered in `server/index.js` and exposed to the renderer
through `preload.js` as `window.api.costCentre.*`.

## Channels

| Channel | window.api binding | Params (2nd arg) | Returns | Summary |
|---|---|---|---|---|
| `costCentre:create` | `window.api.costCentre.create(data)` | `{ company_id, name, alias?, parent_id? }` | `{ success: true, costCentre }` or `{ success: false, error }` | Create a cost centre; rejects a duplicate active name in the same company. category derived from parent_id. |
| `costCentre:getAll` | `window.api.costCentre.getAll(company_id)` | `company_id` (scalar) | `{ success: true, costCentres: [...] }` or `{ success: false, error }` | List all active cost centres for a company. |
| `costCentre:getById` | `window.api.costCentre.getById(id)` | `id` (scalar, cc_id) | `{ success: true, costCentre }` or `{ success: false, error }` | Fetch one cost centre by cc_id. |
| `costCentre:update` | `window.api.costCentre.update(data)` | `{ cc_id, name?, alias?, parent_id? }` | `{ success: true, costCentre }` or `{ success: false, error }` | Update editable fields. **BROKEN** — see warning. |
| `costCentre:delete` | `window.api.costCentre.delete(id)` | `id` (scalar, cc_id) | `{ success: true }` or `{ success: false, error }` | Soft-delete (is_active=0); refuses if active sub-centres exist. |
| `costCetre:getTree` | `window.api.costCentre.getTree(company_id)` | `company_id` (scalar) | `{ success: true, tree: [...] }` or `{ success: false, error }` | Active cost centres as a parent/child tree. **TYPO channel** — see warning. |

All handlers resolve with a `{ success, ... }` envelope; failures are returned as
resolved values (`{ success: false, error }`), not thrown IPC errors.

## Warnings (source bugs — documented verbatim)

1. **getTree channel typo.** In `server/index.js` line 101 the handler is
   registered as `ipcMain.handle('costCetre:getTree', costCentreController.getTree)`
   — the namespace is spelled **`costCetre`** (missing the "n"). The preload
   binding (`preload.js` line 65) calls `invoke('costCentre:getTree', company_id)`.
   Because the strings differ, `window.api.costCentre.getTree(...)` rejects with
   *"No handler registered for 'costCentre:getTree'"*. The tree feature is
   effectively unreachable until one side is corrected.

2. **update controller is broken.** `costCentreController.update` is:
   ```js
   update: async (event, data) => {
       return await costCentreService.delete(id);   // 'id' is undefined here
   }
   ```
   It ignores its `data` argument, references an undefined variable `id`, and
   calls `delete` instead of `costCentreService.update`. As written it throws a
   ReferenceError. The documented update payload/return reflect the **intended**
   `costCentreService.update` behaviour, not the current handler.

## Derived behaviour notes

- `create` forces `is_active = 1`, `is_predefined = 0`, and sets
  `category = parent_id ? 'Secondary' : 'Primary'`. Duplicate check is
  case-insensitive (`LOWER(name)`) scoped to active rows of the same company.
- `update` falls back to current row values for any field not supplied and
  re-derives `category` from `parent_id`; it stamps `updated_at = datetime('now')`.
- `delete` is a soft delete and blocks when the centre has active children.
- `getTree` builds the hierarchy in JS via `buildTree` (recursive on `parent_id`).
