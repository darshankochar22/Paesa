# Company Module — API Reference

Backend module: `server/company/`
- `company.js` — schema init (`companies` table)
- `companyService.js` — business logic / SQL
- `companyController.js` — IPC handlers

IPC namespace: **`company`** (matches the module name).
Renderer binding: **`window.api.company.<method>`** (from `preload.js`).

All operations return a `{ success, ... }` envelope. The bcrypt-hashed
`password` column is **always stripped** from any returned `company` object.

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `company:create` | `window.api.company.create(data)` | `data` object (CompanyCreateInput): `name` (required) plus optional `mailing_name, address1, address2, state, country, pincode, telephone, mobile, fax, email, website, base_currency_symbol, formal_name, financial_year_beginning_from, books_beginning_from, password` | `{ success: true, company }` (no password) or `{ success: false, error }` | Insert company (bcrypt-hash password if given), then seed all default masters for the new `company_id` (groups, ledgers, units, stock groups, godowns, currency, voucher types, GST classifications, employee categories/groups, payroll units, tally features, company creation success, company feature values, attendance types, pay heads, financial year). |
| `company:getAll` | `window.api.company.getAll()` | none | `{ success: true, companies: [...] }` (passwords removed) or `{ success: false, error }` | Return all companies. |
| `company:getById` | `window.api.company.getById(id)` | bare scalar `id` (company_id) | `{ success: true, company }` or `{ success: false, error }` (`"Company not found"`) | Return one company by id. |
| `company:update` | `window.api.company.update(data)` | `data` object (CompanyUpdateInput): `company_id` (required) + any updatable fields; omitted fields keep current value | `{ success: true, company }` (no password) or `{ success: false, error }` | Update a company; re-hash password only if a new one is provided. |
| `company:delete` | `window.api.company.delete(id)` | bare scalar `id` (company_id) | `{ success: true }` or `{ success: false, error }` | Delete a company by id. |
| `company:verifyPassword` | `window.api.company.verifyPassword(data)` | `data` object `{ id, password }` (controller destructures these) | `{ success: true }` on match / no-password-set, or `{ success: false, error }` (`"Wrong password"` / `"Company not found"`) | Compare a plaintext password to the stored bcrypt hash. |

## Notes

- **Scalar vs object payloads:** `getById` and `delete` take a *bare id*
  (`invoke('company:getById', id)`). `create` and `update` take a full data
  object. `verifyPassword` takes an object `{ id, password }` which the
  controller destructures.
- **Password handling:** Passwords are bcrypt-hashed (cost factor 10) on
  create/update. The hash is never returned to the renderer.
- **Side effects on create:** `company:create` triggers a large fan-out of
  `seedDefault*` calls across many other modules. Each is wrapped in its own
  try/catch and logs success/failure independently, so a failed seed does not
  abort company creation.
- **No typos found** in this module's channel names. All six channels follow
  the `company:<action>` convention cleanly.
