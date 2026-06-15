# featureGroup module — IPC / API reference

Backend module: `server/featureGroup/`
- `featureGroup.js` — schema init for the `feature_groups` table + seed rows.
- `featureGroupService.js` — read-only logic/SQL (`getAll`, `getById`).
- `featureGroupController.js` — IPC handlers delegating to the service.

Channels are registered in `server/index.js`:

```
ipcMain.handle('featureGroup:getAll', featureGroupController.getAll);
ipcMain.handle('featureGroup:getById', featureGroupController.getById);
```

Renderer bindings in `preload.js` (namespace `featureGroup`):

```
featureGroup: {
    getAll:  () => invoke('featureGroup:getAll'),
    getById: (id) => invoke('featureGroup:getById', id),
}
```

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `featureGroup:getAll` | `window.api.featureGroup.getAll()` | none | `{ success: true, featureGroups: FeatureGroup[] }` or `{ success: false, error }` | Lists all `is_active = 1` feature groups ordered by `display_order ASC`. |
| `featureGroup:getById` | `window.api.featureGroup.getById(id)` | `id` (bare integer = `feature_group_id`) | `{ success: true, group: FeatureGroup }`, `{ success: false, error: 'Feature Group not found' }`, or `{ success: false, error }` | Fetches one feature group by primary key. |

## FeatureGroup row shape

| Field | Type | Notes |
|---|---|---|
| `feature_group_id` | integer | PK (AUTOINCREMENT). |
| `group_key` | string | NOT NULL UNIQUE, e.g. `accounts`, `inventory`, `gst`, `payroll`, `banking`, `online`. |
| `group_name` | string | NOT NULL, display label. |
| `online_access` | integer (0/1) | 1 = requires online/connected access. Default 0. |
| `display_order` | integer | UI sort order. Default 0. |
| `is_active` | integer (0/1) | Soft-active flag. Default 1; `getAll` filters on this. |

## Notes / warnings

- No write channels exist for this module (read-only). Seed data is inserted at init time via `INSERT OR IGNORE` in `featureGroup.js`.
- The service returns a `{ success, ... }` envelope rather than throwing. There is no `message` field; errors surface as `error: <string>`.
- `getById` takes a **bare** id value (not an object). It returns `success: false` with `error: 'Feature Group not found'` when no row matches — this is a logical not-found, not an HTTP 404.
- No typo'd channels were found for this module.
- `online_access` and `is_active` are stored as integers 0/1 in SQLite; treat them as booleans in consumers.
