# tallyFeatures — API Reference

Backend module: **tallyFeatures**
Namespace: `tallyFeatures` (channel prefix before `:`)
Renderer binding: `window.api.tallyFeatures.<method>`
Controller: `server/tallyFeatures/tallyFeaturesController.js`
Service: `server/tallyFeatures/tallyFeaturesService.js`
Schema init: `server/tallyFeatures/tallyFeatures.js`

This module manages Tally-style "F11" company feature flags — one row per company in the
`tally_features` table. All channels operate on a single company identified by `company_id`.

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `tallyFeatures:get` | `window.api.tallyFeatures.get(company_id)` | `company_id` (integer, bare value) | `{ success: true, features: <row> }` or `{ success: false, error: "Features not found" }` | Fetch the feature-flags row for a company. |
| `tallyFeatures:update` | `window.api.tallyFeatures.update(data)` | `data` object: `{ company_id, ...19 optional flags }` | `{ success: true, features: <refreshed row> }` or `{ success: false, error }` | Update feature flags; omitted flags keep their current value (`?? current`). |
| `tallyFeatures:reset` | `window.api.tallyFeatures.reset(company_id)` | `company_id` (integer, bare value) | `{ success: true, features: <refreshed row> }` or `{ success: false, error }` | Reset all flags to seed defaults. |

## Notes

- **No typo'd channels** were found for this module. All three channels (`get`, `update`, `reset`) are spelled consistently across `index.js`, the controller, and `preload.js`.
- `get` and `reset` accept a **bare scalar** `company_id` as the IPC payload (not an object). `update` accepts a **data object** that must include `company_id`.
- Each flag is stored as SQLite INTEGER `0`/`1` and is returned as `0`/`1`. The `update` handler uses `data.<flag> ?? current.<flag>`, so passing `undefined`/omitting a flag preserves the existing value, but passing `0` is honored (it is not nullish).
- Failure cases return `success: false` with an `error` string rather than throwing; a missing row yields `"Features not found"`, and a thrown DB error yields its `err.message`. The OpenAPI `Error { error, message }` schema documents the generic transport-level error envelope.

## Feature flags (19)

`maintain_accounts`, `enable_bill_wise_entry`, `enable_cost_centres`, `maintain_inventory`,
`integrate_accounts_with_inventory`, `enable_multiple_price_levels`, `enable_batches`,
`maintain_expiry_date_for_batches`, `use_discount_column_in_invoices`,
`use_separate_actual_billed_qty`, `enable_gst`, `set_alter_company_gst_details`,
`enable_tds`, `enable_tcs`, `enable_browser_access_for_reports`,
`enable_tally_net_services`, `enable_payment_request_qr`, `enable_multiple_addresses`,
`mark_modified_vouchers`.

Defaults: `maintain_accounts`, `maintain_inventory`, `integrate_accounts_with_inventory` default to `1`; all others default to `0`.
