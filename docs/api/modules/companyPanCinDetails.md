# companyPanCinDetails — API reference

Backend module: `server/companyPanCinDetails/`
Renderer namespace: `window.api.companyPanCinDetails`

Stores a single PAN (Permanent Account Number) and CIN (Corporate Identification
Number) per company, keyed one-to-one on `company_id`.

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `companyPanCinDetails:get` | `window.api.companyPanCinDetails.get(company_id)` | bare scalar `company_id` (integer) | `{ success:true, exists:true, data:{ pan, cin } }` when found; `{ success:true, exists:false, data:null }` when not found; `{ success:false, error }` on exception | Fetch the PAN/CIN details for one company. Only `pan` and `cin` are projected (each defaulted to `''` when stored null). |
| `companyPanCinDetails:save` | `window.api.companyPanCinDetails.save(data)` | object `{ company_id, pan?, cin? }` | `{ success:true }` on success; `{ success:false, error }` when `company_id` missing or on exception | Upsert: inserts a new row or updates `pan`, `cin`, and `updated_at` of the existing row. `pan`/`cin` coerced to `null` when falsy. |

## Notes

- Both handlers resolve normally even on failure; errors are returned **in-band** as
  `{ success: false, error }` rather than thrown. There is no separate HTTP-style status.
- `get` takes a **bare** `company_id` value as the second IPC argument (not wrapped in an
  object). `save` takes a single `data` object.
- `get` does not return `company_id`, `created_at`, or `updated_at` — only `pan` and `cin`.

## Source

- Schema init: `server/companyPanCinDetails/companyPanCinDetails.js`
- Service / SQL: `server/companyPanCinDetails/companyPanCinDetailsService.js`
- IPC controller: `server/companyPanCinDetails/companyPanCinDetailsController.js`
- Channel registration: `server/index.js` (lines 350–351)
- Preload binding: `preload.js` (lines 304–306)
