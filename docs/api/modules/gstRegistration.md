# gstRegistration — IPC API Reference

Backend module: `server/gstRegistration/`
Namespace (channel prefix): `gstRegistration`
Renderer binding root: `window.api.gstRegistration`

All handlers are registered in `server/index.js` (lines 182–186) and delegate to
`gstRegistrationController`, which calls `gstRegistrationService`. Every service method returns a
result **envelope** of the form `{ success: boolean, ... }` instead of throwing — failures
(validation, not-found, SQLite errors) come back as `{ success: false, error }`.

> No channel typos were found in this module. All five channels are clean.

## Channels

| Channel | window.api binding | Params (IPC arg 2) | Returns | Summary |
|---|---|---|---|---|
| `gstRegistration:create` | `window.api.gstRegistration.create(data)` | `data` object (see Create input) | `{ success: true, gstRegistration: row }` or `{ success: false, error }` | Create a GST registration; validates GSTIN, rejects duplicate active (company_id, gstin). |
| `gstRegistration:getAll` | `window.api.gstRegistration.getAll(company_id)` | bare scalar `company_id` (integer) | `{ success: true, gstRegistrations: row[] }` or `{ success: false, error }` | List all GST registrations for a company (includes inactive rows). |
| `gstRegistration:getById` | `window.api.gstRegistration.getById(id)` | bare scalar `id` (= gst_id) | `{ success: true, gstRegistration: row }` or `{ success: false, error }` | Fetch a single registration by gst_id. |
| `gstRegistration:update` | `window.api.gstRegistration.update(data)` | `data` object incl. `gst_id` (see Update input) | `{ success: true, gstRegistration: row }` or `{ success: false, error }` | Update a registration by gst_id with partial field merge. |
| `gstRegistration:delete` | `window.api.gstRegistration.delete(id)` | bare scalar `id` (= gst_id) | `{ success: true }` or `{ success: false, error }` | Soft-delete (sets `is_active = 0`). |

## Create input (`data`)

Required: `company_id`. Optional: `registration_type` (def 'Regular'), `registration_status`
(def 'Active'), `assessee_of_other_territory` (bool→0/1), `periodicity_of_gstr1` (def 'Monthly'),
`gstin` (validated when present), `gst_username`, `mode_of_filing` (def 'Online'),
`e_invoice_details`, `e_invoice_application` (bool→0/1), `e_way_bill_applicable` (bool→0/1),
`e_way_bill_applicable_from`, `applicable_for_intrastat` (bool→0/1), `legal_name`, `trade_name`,
`state_id`, `registration_date`, `effective_from`, `address_type` (def 'Primary'),
`goods_dispatched_from` (def 'Primary'), `e_invoice_applicable_from`, `e_invoice_bill_from_place`,
`composition_tax_rate`, `composition_tax_calc_basis`. `is_active` is forced to 1 on insert.

## Update input (`data`)

Required: `gst_id`. `company_id` is **not** updatable. Omitted non-boolean fields fall back to the
current stored value (`?? current.<field>`). The four boolean flags
(`assessee_of_other_territory`, `e_invoice_application`, `e_way_bill_applicable`,
`applicable_for_intrastat`) are always re-derived from the payload (omitted ⇒ stored as 0).
`updated_at` is refreshed to `datetime('now')`.

## Validation & error strings

- GSTIN regex: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` (checked only when `gstin` is provided).
- `"Invalid GSTIN format"` — gstin present and fails regex (create + update).
- `"GSTIN already registered"` — an active row with the same `company_id` + `gstin` exists (create).
- `"GST Registration not found"` — no row for the given gst_id (getById, update, delete).
- Any raw SQLite error message is returned as `error` inside `{ success: false }`.

## Notes

- Boolean-like INTEGER columns are stored 0/1 in SQLite; see the DB docs for the Postgres BOOLEAN mapping.
- `state_id` is declared `TEXT` in the source schema despite its `_id` suffix — it is **not** a numeric FK.
- See `docs/db/modules/gstRegistration.sql` and `docs/db/modules/gstRegistration.md` for the table contract.
