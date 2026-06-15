# Group Module — API Reference

Backend module: **group** (`server/group/`)

- `group.js` — schema init for the `groups` table.
- `groupService.js` — business logic + SQL.
- `groupController.js` — IPC handlers (`groupController.*`).
- Registered in `server/index.js` (lines 82-87) via `ipcMain.handle`.
- Exposed in `preload.js` (lines 43-49) as `window.api.group.*`.

All handlers return a **success envelope** `{ success: true, ... }` or a **failure
envelope** `{ success: false, error }`. There is no HTTP layer — transport is Electron IPC.

## Channels

| Channel | window.api binding | Params (arg 2) | Returns | Summary |
|---|---|---|---|---|
| `group:create` | `window.api.group.create(data)` | `data`: GroupCreateInput object | `{ success: true, group }` or `{ success: false, error }` | Create a user group. Rejects a duplicate active name for the same company ("Group already exists"). Forces `is_predefined=0`, `is_active=1`; derives `group_type` ('Primary'/'User'). |
| `group:getAll` | `window.api.group.getAll(company_id)` | `company_id`: integer (bare scalar) | `{ success: true, groups: Group[] }` or `{ success: false, error }` | List all active groups (`is_active = 1`) for a company. |
| `group:getById` | `window.api.group.getById(id)` | `id`: integer (bare scalar) | `{ success: true, group }` or `{ success: false, error: "Group not found" }` | Fetch a single group by `group_id` (active or not). |
| `group:update` | `window.api.group.update(data)` | `data`: GroupUpdateInput object (requires `group_id`) | `{ success: true, group }` or `{ success: false, error: "Group not found" }` | Update a group. Undefined fields fall back to existing row values; boolean flags coerced to 0/1. Does not update `is_predefined`, `group_type`, `is_active`. |
| `group:delete` | `window.api.group.delete(id)` | `id`: integer (bare scalar) | `{ success: true }` or `{ success: false, error }` | Soft-delete (`is_active = 0`). Refuses predefined groups ("Cannot delete predefined groups") and groups with active subgroups ("Cannot delete group with subgroups"). |
| `group:getTree` | `window.api.group.getTree(company_id)` | `company_id`: integer (bare scalar) | `{ success: true, tree: GroupNode[] }` or `{ success: false, error }` | Active groups for a company arranged as a nested parent/children tree (built in JS from `parent_group_id`). |

## Notes & warnings

- **No channel typos found.** All six channels (`group:create`, `group:getAll`,
  `group:getById`, `group:update`, `group:delete`, `group:getTree`) match cleanly between
  `index.js`, `groupController.js`, and `preload.js`.
- **Boolean flags are stored as 0/1 integers** in SQLite. The renderer may pass booleans;
  the service coerces them with `? 1 : 0`. See the Postgres DDL for the `BOOLEAN` translation.
- **GST rate columns** (`gst_rate`, `cgst_rate`, `sgst_rate`, `igst_rate`) are SQLite `REAL`.
  They are tax percentages, not currency, but are mapped to `NUMERIC` in Postgres to avoid
  floating-point rounding (see DB docs).
- `seedDefaultGroups(company_id)` exists in the service to seed 15 primary + 15 predefined
  groups, but it is **not exposed as an IPC channel** in this module (called internally,
  e.g. during company creation). It is documented here for completeness only.
- The `getById` query does **not** filter on `is_active`, so it can return soft-deleted rows.

## Component shapes

- **Group** — a row of the `groups` table (see `group.yaml` and `../../db/modules/group.md`).
- **GroupNode** — `Group` + a recursive `children: GroupNode[]` array (getTree).
- **GroupCreateInput / GroupUpdateInput** — see `group.yaml`.

Full machine-readable contract: [`group.yaml`](./group.yaml).
