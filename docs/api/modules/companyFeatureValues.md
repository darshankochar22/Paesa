# companyFeatureValues — API reference

Backend module: `server/companyFeatureValues/`
IPC namespace: `companyFeatureValues` (same as module name)
Renderer surface: `window.api.companyFeatureValues.*` (see `preload.js` lines 213-217)

This module stores per-company feature toggles / setting values keyed by
`feature_item_id`. Each feature item (defined in the `featureItem` module) can carry a
boolean flag, free text, a number, a date, and an `is_enabled` flag for a given company.

All service methods return an in-band envelope: `{ success: true, ... }` on success or
`{ success: false, error }` on failure. The IPC call itself still resolves — callers must
inspect `success`.

## Channels

| Channel | window.api binding | Params (payload) | Returns | Summary |
|---|---|---|---|---|
| `companyFeatureValues:get` | `window.api.companyFeatureValues.get(company_id)` | bare scalar `company_id` (number) | `{ success:true, values:[CompanyFeatureValueJoined] }` or `{ success:false, error:"No feature values found" }` | All feature values for a company, joined with `feature_items` (`feature_key`, `feature_name`, `feature_group_id`). |
| `companyFeatureValues:getByGroup` | `window.api.companyFeatureValues.getByGroup(company_id, group_id)` | `{ company_id, group_id }` | `{ success:true, values:[CompanyFeatureValueJoined] }` (array may be empty) | Feature values for a company filtered to one feature group. Joins `feature_items` (`feature_key`, `feature_name`). |
| `companyFeatureValues:update` | `window.api.companyFeatureValues.update(data)` | `data = { company_id, feature_item_id, value_boolean?, value_text?, value_number?, value_date?, is_enabled? }` | `{ success:true, value:CompanyFeatureValue }` or `{ success:false, error:"Feature value not found" }` | Update one feature value; omitted/null fields fall back to current row values; sets `updated_at`. |
| `companyFeatureValues:updateBulk` | `window.api.companyFeatureValues.updateBulk(company_id, values)` | `{ company_id, values:[{ feature_item_id, value_boolean?, value_text?, value_number?, value_date?, is_enabled? }] }` | `{ success:true, updated:[CompanyFeatureValue] }` | Update many feature values for a company; entries whose row does not exist are silently skipped. |

## Notes & caveats

- The controller for `get` and the preload binding pass `company_id` as a **bare scalar**,
  not wrapped in an object. The OpenAPI `requestBody` models it as `{ company_id }` for
  documentation clarity, but on the wire it is the raw number.
- `getByGroup`: the renderer/controller key is **`group_id`**, while the service parameter
  is named `feature_group_id` and the SQL filters on `fi.feature_group_id`. They are the
  same value; the name simply changes across the boundary.
- `value_boolean` and `is_enabled` are SQLite `INTEGER` 0/1 flags (Postgres: `BOOLEAN`).
- Partial-update semantics use the `??` (nullish-coalescing) operator: passing `null` or
  omitting a field preserves the current stored value; you cannot null a column back out
  via this path.
- `updateBulk` does **not** report which entries were skipped — only existing rows appear
  in `updated`.

## Seeding (not an IPC channel)

`companyFeatureValuesService.seedCompanyFeatureValues(company_id)` inserts 19 default rows
(`feature_item_id` 1..19) for a new company. It is invoked internally (e.g. on company
creation) and is **not** exposed over IPC.

## No typos found

No misspelled channel names were found for this module. All four channels follow the
`companyFeatureValues:<action>` convention consistently across `server/index.js`,
the controller, and `preload.js`.
