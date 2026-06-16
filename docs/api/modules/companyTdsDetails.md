# companyTdsDetails — API Reference

Backend module: `server/companyTdsDetails/`
- `companyTdsDetails.js` — schema init (`company_tds_details` table)
- `companyTdsDetailsService.js` — logic / SQL
- `companyTdsDetailsController.js` — IPC handlers

Stores TDS (Tax Deducted at Source) deductor configuration. **1:1 with companies** — `company_id` is the primary key, so there is at most one row per company. `save` performs an upsert (UPDATE if a row exists, else INSERT).

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `companyTdsDetails:get` | `window.api.companyTdsDetails.get(company_id)` | bare scalar `company_id` (integer) | `{ success: true, exists: true, data: TdsDetailsData }` when found; `{ success: true, exists: false, data: null }` when absent; `{ success: false, error }` on exception | Fetch TDS details for a company. Text NULLs coerced to `''`; 0/1 flags returned as booleans. |
| `companyTdsDetails:save` | `window.api.companyTdsDetails.save(data)` | `data` object (`TdsSaveInput`); `company_id` required | `{ success: true }` on success; `{ success: false, error }` on missing company_id or exception | Upsert TDS details for a company. Booleans stored as 0/1; missing text → NULL; `deductorType` defaults to `'Company'`; bumps `updated_at`. |

## `TdsDetailsData` (returned by `get`, camelCase)

| Field | Type | Source column |
|---|---|---|
| `tanRegNumber` | string | `tan_reg_number` |
| `tan` | string | `tan` |
| `deductorType` | string (default `Company`) | `deductor_type` |
| `deductorBranch` | string | `deductor_branch` |
| `setAlterPersonResponsible` | boolean | `set_alter_person_responsible` (=== 1) |
| `personResponsibleName` | string | `person_responsible_name` |
| `personResponsibleDesignation` | string | `person_responsible_designation` |
| `personResponsiblePan` | string | `person_responsible_pan` |
| `personResponsiblePhone` | string | `person_responsible_phone` |
| `personResponsibleEmail` | string | `person_responsible_email` |
| `ignoreItExemption` | boolean | `ignore_it_exemption` (=== 1) |
| `activateTdsForItems` | boolean | `activate_tds_for_items` (=== 1) |

## `TdsSaveInput` (payload for `save`, camelCase)

Same camelCase fields as above **plus** the required `company_id` (integer). Booleans are persisted as 0/1; absent text fields are persisted as NULL.

## Notes

- The renderer `invoke` wrapper passes the single argument straight through, so `get` is called with a bare `company_id` and `save` with a single `data` object.
- All errors are returned inside a `{ success: false, error }` envelope in the 200 body; the service catches its own exceptions and does not throw across the IPC boundary.
- No typos were found in this module's channel names.
- `created_at` / `updated_at` are written by the DB (`datetime('now')`) and are **not** part of the camelCase projection returned by `get`.
