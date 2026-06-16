# companyCreationSuccess — IPC API Reference

Backend module: `server/companyCreationSuccess/`

This module tracks the onboarding / "company created successfully" UI state and
feature-setup flags for a company. State lives in the `company_creation_success`
table (one row per company, seeded at company creation via
`seedCompanyCreationSuccess`).

- **Controller:** `server/companyCreationSuccess/companyCreationSuccessController.js`
- **Service:** `server/companyCreationSuccess/companyCreationSuccessService.js`
- **Schema init:** `server/companyCreationSuccess/companyCreationSuccess.js`
- **IPC registration:** `server/index.js` (lines 255–256)
- **Renderer binding:** `preload.js` (lines 200–202), exposed as `window.api.companyCreationSuccess.*`

The IPC namespace (`companyCreationSuccess`) matches the module name. No typo'd
channels were found in this module.

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `companyCreationSuccess:get` | `window.api.companyCreationSuccess.get(company_id)` | `company_id` (integer, bare scalar) | `{ success: true, record }` on hit; `{ success: false, error }` if not found | Fetch the creation-success / onboarding flag record for a company. |
| `companyCreationSuccess:update` | `window.api.companyCreationSuccess.update(data)` | `data` object: `{ company_id, created_successfully?, success_screen_shown?, show_more_features?, show_all_features?, default_features_loaded?, feature_setup_completed? }` | `{ success: true, record }` with the refreshed row; `{ success: false, error }` if not found | Update onboarding feature flags for a company and return the updated row. |

## Notes

- **Return envelope.** Both operations return an in-band envelope object, never throw across IPC. Errors surface as `{ success: false, error: <message> }` (either `"Record not found"` or a caught `err.message`).
- **Partial update semantics.** In `update`, every flag uses `data.<flag> ?? current.<flag>`, so omitting a flag (or passing `null`/`undefined`) preserves the stored value. Only `company_id` is required.
- **Flag encoding.** All flag columns are SQLite INTEGER 0/1 booleans. `record.*` values come back as `0` or `1`. In the Postgres contract these map to `BOOLEAN`.
- **No create/delete channels.** Row creation is internal (`seedCompanyCreationSuccess`, called from the company-creation flow) and not exposed over IPC. There is no delete channel in this module; rows are removed via `ON DELETE CASCADE` when the parent company is deleted.
- **`updated_at`** is set to `datetime('now')` on every `update`.
