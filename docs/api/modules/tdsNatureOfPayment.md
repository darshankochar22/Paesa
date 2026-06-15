# tdsNatureOfPayment — API Reference

Backend module: **tdsNatureOfPayment**
IPC namespace: **tdsNatureOfPayment** (matches module name; no typos)
Renderer binding root: `window.api.tdsNatureOfPayment.*`
Controller: `server/tdsNatureOfPayment/tdsNatureOfPaymentController.js`
Service: `server/tdsNatureOfPayment/tdsNatureOfPaymentService.js`
Schema init: `server/tdsNatureOfPayment/tdsNatureOfPayment.js`

This module manages **TDS (Tax Deducted at Source) Nature of Payment** master records, scoped per company. Deletes are soft (set `is_active = 0`).

## Channels

| Channel | window.api binding | Params (arg 2) | Returns | Summary |
|---|---|---|---|---|
| `tdsNatureOfPayment:create`  | `window.api.tdsNatureOfPayment.create(data)`       | `data` object: `{ company_id, name, section?, payment_code?, remittance_code?, rate_individual_with_pan?, rate_other_with_pan?, is_zero_rated?, threshold_limit? }` | `{ success: true, tdsNatureOfPayment: row }` or `{ success: false, error }` | Create a record for a company. Rejects if an active record with the same (case-insensitive) name already exists. Forces `is_predefined=0`, `is_active=1`. |
| `tdsNatureOfPayment:getAll`  | `window.api.tdsNatureOfPayment.getAll(company_id)` | bare `company_id` (integer) | `{ success: true, tdsNatureOfPaymentList: row[] }` or `{ success: false, error }` | List all active records for a company. |
| `tdsNatureOfPayment:getById` | `window.api.tdsNatureOfPayment.getById(id)`        | bare `id` = `tds_id` (integer) | `{ success: true, tdsNatureOfPayment: row }` or `{ success: false, error }` (not found) | Fetch one record by primary key. |
| `tdsNatureOfPayment:update`  | `window.api.tdsNatureOfPayment.update(data)`       | `data` object: `{ tds_id, name?, section?, payment_code?, remittance_code?, rate_individual_with_pan?, rate_other_with_pan?, is_zero_rated?, threshold_limit? }` | `{ success: true, tdsNatureOfPayment: row }` or `{ success: false, error }` (not found) | Update a record; unspecified fields retain current values. `company_id`, `is_predefined`, `is_active`, `created_at` are NOT updatable here. |
| `tdsNatureOfPayment:delete`  | `window.api.tdsNatureOfPayment.delete(id)`         | bare `id` = `tds_id` (integer) | `{ success: true }` or `{ success: false, error }` (not found) | Soft-delete (sets `is_active = 0`). |

## Notes & behavior

- **Return convention:** Every service method returns a plain object `{ success: boolean, ... }`. Failures are *resolved*, not thrown — there is no separate HTTP-style error channel at the application level. The OpenAPI `4XX`/`5XX` responses model only unexpected transport/runtime failures.
- **Bare-value handlers:** `getAll`, `getById`, and `delete` receive their argument directly as IPC arg 2 (`event, company_id` / `event, id`), not wrapped in an object. The OpenAPI fragment models these as single-property objects (`company_id` / `id`) for tooling clarity.
- **Duplicate check (create):** `WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`. Soft-deleted rows do not block re-creation.
- **Boolean-like fields:** `is_zero_rated`, `is_predefined`, `is_active` are stored as INTEGER `0/1` in SQLite and returned as `0`/`1` over IPC.
- **Rate / threshold fields:** `rate_individual_with_pan`, `rate_other_with_pan`, `threshold_limit` are REAL in SQLite. `threshold_limit` is a monetary value — see the Postgres schema (`NUMERIC`, never floating point).
- **Validation messages:** `"TDS Nature of Payment already exists"` (create dup) and `"TDS Nature of Payment not found"` (getById/update/delete miss).
