# companyTcsDetails — API reference

Backend module: `server/companyTcsDetails/`
Controller: `companyTcsDetailsController` (registered in `server/index.js`)
Renderer namespace: `window.api.companyTcsDetails`

Stores one TCS (Tax Collected at Source) profile **per company**, keyed 1:1 on
`company_id` (which is both the primary key and a foreign key to `companies`).

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---------|--------------------|--------|---------|---------|
| `companyTcsDetails:get` | `window.api.companyTcsDetails.get(company_id)` | bare `company_id` (integer) | `{ success: true, exists: true, data: {...} }` if found; `{ success: true, exists: false, data: null }` if not; `{ success: false, error }` on failure | Fetch the TCS details row for a company, mapped to camelCase with 0/1 flags as booleans. |
| `companyTcsDetails:save` | `window.api.companyTcsDetails.save(data)` | object — `company_id` (required) + optional TCS fields | `{ success: true }`; `{ success: false, error }` if `company_id` missing or on failure | Upsert (INSERT or UPDATE) the company's TCS details; bumps `updated_at` on update. |

## Notes & warnings

- **No typos found** in this module's channel strings. (For context, an adjacent
  namespace `companyTdsDetails` exists in preload.js, line 298 — that is a *different*
  module, not a typo of this one.)
- **Bare scalar payload for `get`**: the preload calls
  `invoke('companyTcsDetails:get', company_id)` with a raw id, not an object. The
  OpenAPI `requestBody` models it as a single `company_id` property for clarity.
- **In-band errors**: both service methods catch exceptions and return
  `{ success: false, error }` with an IPC-level success (no throw). `save` also returns
  this shape with `error: "Company ID is required"` when `company_id` is falsy.
- **Boolean conversion**: `setAlterPersonResponsible` and `ignoreItExemption` are stored
  as INTEGER `1`/`0`. `get` converts back with `=== 1`; `save` writes `value ? 1 : 0`.
- **Field coercion on save**: empty/falsy strings become `NULL`; `collectorType`
  defaults to `'Company'` when falsy.
- `save` does **not** echo the saved row back; only `{ success: true }`.

## Source map

- Schema/init: `server/companyTcsDetails/companyTcsDetails.js`
- Logic/SQL: `server/companyTcsDetails/companyTcsDetailsService.js`
- IPC handlers: `server/companyTcsDetails/companyTcsDetailsController.js`
- Registration: `server/index.js` lines 347–348
- Preload bindings: `preload.js` lines 300–303
