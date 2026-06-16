# featureItem module — IPC API reference

Backend module: `server/featureItem/`
- `featureItem.js` — schema init for the `feature_items` table + seed data (`FEATURE_ITEMS`).
- `featureItemService.js` — SQL/logic.
- `featureItemController.js` — IPC handlers.

Renderer namespace: `window.api.featureItem` (preload.js).
IPC namespace: `featureItem` (matches the module name).

All operations are **read-only**. Service methods return a wrapped envelope
`{ success: boolean, ... }` rather than raw rows; on failure they return
`{ success: false, error: <message> }` (note: the failure key is `error`, a
single string — not the shared `{ error, message }` Error schema, which is
documented for transport-level/uncaught failures).

## Channels

| Channel | window.api binding | Params | Returns | Summary |
| --- | --- | --- | --- | --- |
| `featureItem:getAll` | `window.api.featureItem.getAll()` | none | `{ success, featureItems: FeatureItemWithGroup[] }` | All active feature items joined with their feature group, ordered by `feature_group_id` then `display_order`. |
| `featureItem:getById` | `window.api.featureItem.getById(id)` | bare scalar `id` (number) → `feature_items.feature_item_id` | `{ success, item: FeatureItem }` or `{ success: false, error: 'Feature Item not found' }` | Fetch one feature item by primary key. |
| `featureItem:getByGroup` | `window.api.featureItem.getByGroup(group_id)` | bare scalar `group_id` (number) → `feature_items.feature_group_id` | `{ success, featureItems: FeatureItem[] }` | Active feature items in a group, ordered by `display_order`. |

## Notes & warnings

- **No typos** were found in this module's channel strings.
- `getById` and `getByGroup` take a **bare scalar** as the second IPC argument
  (the controller signatures are `(event, id)` and `(event, group_id)`), not an
  object. The OpenAPI fragment wraps them as single-property request bodies for
  schema validity.
- Preload exposes the third channel's argument as `group_id`, while the service
  parameter is named `feature_group_id`. They refer to the same column
  (`feature_items.feature_group_id`).
- `getAll` returns extra joined columns `group_key` and `group_name` from
  `feature_groups` (see `FeatureItemWithGroup`). `getById` and `getByGroup`
  return raw `feature_items` rows (`SELECT *`) without the join.
- Boolean-flag columns (`default_value_boolean`, `is_mandatory`, `is_active`)
  are stored as `0`/`1` integers in SQLite.

## Source references

- `ipcMain.handle` registrations: `server/index.js` lines 261–263.
- Preload bindings: `preload.js` lines 208–212.
