# Godown Module — API Reference

Backend module: `server/godown/`
- `godown.js` — schema init (`godowns` table)
- `godownService.js` — logic / SQL
- `godownController.js` — IPC handlers

Transport: Electron IPC (`ipcMain.handle`). The renderer calls
`window.api.godown.<method>` (see `preload.js`), which invokes the channel.

All service methods return a `{ success: boolean, ... }` envelope. On error they
return `{ success: false, error: <message> }` (the `error` is the caught
`err.message`, never a thrown exception across IPC).

## Channels

| Channel | window.api binding | Params (arg passed to binding) | Returns | Summary |
|---|---|---|---|---|
| `godown:create` | `window.api.godown.create(data)` | `data`: `{ company_id, name, alias?, parent_godown_id?, address?, city?, state?, pincode?, allow_storage_of_materials? }` | `{ success, godown }` or `{ success:false, error }` | Create a godown. Rejects duplicate active name in the company. Server forces `is_main_location=0`, `is_active=1`, `is_predefined=0`; sets `is_primary=0` when a parent is given else `1`. |
| `godown:getAll` | `window.api.godown.getAll(company_id)` | `company_id` (bare integer) | `{ success, godowns: Godown[] }` or `{ success:false, error }` | List all active godowns for the company. |
| `godown:getById` | `window.api.godown.getById(id)` | `id` (bare integer = `godown_id`) | `{ success, godown }` or `{ success:false, error }` | Fetch one godown by id. `success:false, error:'Godown not found'` when missing. |
| `godown:update` | `window.api.godown.update(data)` | `data`: `{ godown_id, name?, alias?, parent_godown_id?, address?, city?, state?, pincode?, allow_storage_of_materials? }` | `{ success, godown }` or `{ success:false, error }` | Update a godown. Blocks predefined (Main Location) edits and duplicate active names. Omitted fields keep current values. |
| `godown:delete` | `window.api.godown.delete(id)` | `id` (bare integer = `godown_id`) | `{ success:true }` or `{ success:false, error }` | Soft-delete (sets `is_active=0`). Blocks predefined godowns and godowns with active sub-godowns. |
| `godown:getTree` | `window.api.godown.getTree(company_id)` | `company_id` (bare integer) | `{ success, tree: GodownNode[] }` or `{ success:false, error }` | Active godowns for the company as a nested tree (`children` nested under `parent_godown_id`; roots have `parent_godown_id = null`). |

## Notes

- Boolean-ish columns (`is_primary`, `is_main_location`, `allow_storage_of_materials`,
  `is_active`, `is_predefined`) are returned as SQLite integers `0`/`1`.
- `getAll` and `getTree` only return rows where `is_active = 1`.
- `getById` does **not** filter on `is_active`, so it can return a soft-deleted row.
- Validation strings returned verbatim by the service:
  `'Godown already exists'`, `'Godown not found'`, `'Cannot edit Main Location'`,
  `'Godown name already exists'`, `'Cannot delete Main Location'`,
  `'Cannot delete Godown with sub-godowns'`.
- `seedDefaultGodowns(company_id)` exists in the service (creates the predefined
  "Main Location" godown) but is **not** wired to any IPC channel — it is called
  internally during company setup, not exposed to the renderer.

No typo channels were found in this module.
