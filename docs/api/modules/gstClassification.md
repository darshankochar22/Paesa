# gstClassification module — API reference

Backend module: `server/gstClassification/`
Namespace (IPC prefix): `gstClassification`
Renderer binding: `window.api.gstClassification.<method>`

This module manages GST tax classifications (rate profiles: IGST/CGST/SGST/CESS,
taxability, reverse-charge, ITC eligibility) scoped to a company. It owns a
single table, `gst_classifications`.

## Source files

| File | Role |
| --- | --- |
| `server/gstClassification/gstClassification.js` | Schema init (`gst_classifications` table + idempotent ADD COLUMN migrations) |
| `server/gstClassification/gstClassificationService.js` | Logic / SQL (create, getAll, getById, update, delete, seedDefaultGSTClassifications) |
| `server/gstClassification/gstClassificationController.js` | IPC handlers (thin wrappers over the service) |
| `server/index.js` (lines 188–192) | `ipcMain.handle` channel registration |
| `preload.js` (lines 163–168) | `window.api.gstClassification.*` exposure |

## Channels

| Channel | window.api binding | Params (arg 2) | Returns | Summary |
| --- | --- | --- | --- | --- |
| `gstClassification:create` | `window.api.gstClassification.create(data)` | `data` object — requires `company_id`, `name`; optional rate/flag fields + `slab_rows` | `{ success: true, classification }` or `{ success: false, error }` (duplicate name -> `'GST Classification already exists'`) | Create a GST classification for a company. |
| `gstClassification:getAll` | `window.api.gstClassification.getAll(company_id)` | bare `company_id` (integer) | `{ success: true, gstClassifications: [...] }` or `{ success: false, error }` | List all active classifications for a company. |
| `gstClassification:getById` | `window.api.gstClassification.getById(id)` | bare `id` = `gc_id` (integer) | `{ success: true, classification }` or `{ success: false, error }` (not found) | Fetch one classification by id. |
| `gstClassification:update` | `window.api.gstClassification.update(data)` | `data` object — requires `gc_id`; other fields optional (fall back to stored values) | `{ success: true, classification }` or `{ success: false, error }` (not found / predefined) | Update a non-predefined classification. |
| `gstClassification:delete` | `window.api.gstClassification.delete(id)` | bare `id` = `gc_id` (integer) | `{ success: true }` or `{ success: false, error }` (not found / predefined) | Soft-delete (`is_active = 0`). |

## Notes & behaviors

- All handlers are async and resolve to an application-level envelope with a
  `success` boolean. Failures are returned as `{ success: false, error }` with
  HTTP-style 200 semantics (no exception propagates to the renderer); only an
  unexpected throw inside `db.execute` surfaces as a caught error message.
- `getAll`, `getById`, `delete` receive a **bare scalar** as IPC arg 2 (not an
  object). The OpenAPI fragment models these as a single-property request body
  (`company_id` / `id`) for clarity.
- On every read, `gst_rate_details` (a JSON string) is parsed into a derived
  `slab_rows` field; invalid/empty JSON yields `slab_rows: undefined`.
- `create` forces `is_predefined = 0`, `is_active = 1`. The `gst_rate` and
  `valuation_type` columns exist in the table but are **not** written by
  `create`/`update`.
- Predefined rows (`is_predefined = 1`, created by the internal
  `seedDefaultGSTClassifications` helper) cannot be updated or deleted.
- `seedDefaultGSTClassifications(company_id)` is exported from the service but is
  **not** wired to any IPC channel; it is invoked internally (e.g. at company
  setup) and is intentionally not exposed via `window.api`.

## Channel inventory verification

No typos or namespace renames were found. The IPC namespace (`gstClassification`)
matches the module name exactly, and all five controller methods
(`create`, `getAll`, `getById`, `update`, `delete`) are registered and exposed.
