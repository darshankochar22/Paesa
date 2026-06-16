# Module: tcsNatureOfGoods

TCS (Tax Collected at Source) Nature of Goods master records.

- Namespace: `tcsNatureOfGoods` (matches the module name; no typos found in channel names)
- Controller: `server/tcsNatureOfGoods/tcsNatureOfGoodsController.js`
- Service: `server/tcsNatureOfGoods/tcsNatureOfGoodsService.js`
- Schema init: `server/tcsNatureOfGoods/tcsNatureOfGoods.js`
- Table: `tcs_nature_of_goods`

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `tcsNatureOfGoods:create` | `window.api.tcsNatureOfGoods.create(data)` | `data`: `{ company_id, name, section?, payment_code?, rate_individual_with_pan?, rate_individual_without_pan?, rate_other_with_pan?, rate_other_without_pan?, is_own_status?, tax_on_receipt_or_realization?, threshold_level?, is_zero_rated? }` | `{ success: true, tcsNatureOfGoods: Row }` or `{ success: false, error }` (duplicate active name) | Create a record; rejects a duplicate active name within the same company (case-insensitive). `is_predefined` is forced to 0 and `is_active` to 1. |
| `tcsNatureOfGoods:getAll` | `window.api.tcsNatureOfGoods.getAll(company_id)` | bare `company_id` (integer) | `{ success: true, tcsNatureOfGoodsList: Row[] }` or `{ success: false, error }` | List all active records for a company (`is_active = 1`). |
| `tcsNatureOfGoods:getById` | `window.api.tcsNatureOfGoods.getById(id)` | bare `id` = `tcs_id` (integer) | `{ success: true, tcsNatureOfGoods: Row }` or `{ success: false, error }` (not found) | Fetch a single record by primary key. |
| `tcsNatureOfGoods:update` | `window.api.tcsNatureOfGoods.update(data)` | `data`: `{ tcs_id, ...same editable fields as create }` | `{ success: true, tcsNatureOfGoods: Row }` or `{ success: false, error }` (not found) | Partial update; omitted fields keep their stored value. `company_id`, `is_predefined`, `is_active` are not updatable here. Sets `updated_at`. |
| `tcsNatureOfGoods:delete` | `window.api.tcsNatureOfGoods.delete(id)` | bare `id` = `tcs_id` (integer) | `{ success: true }` or `{ success: false, error }` (not found) | Soft-delete: sets `is_active = 0`. No physical row removal. |

## Row shape (`tcs_nature_of_goods`)

`tcs_id`, `company_id`, `name`, `section`, `payment_code`, `rate_individual_with_pan`, `rate_individual_without_pan`, `rate_other_with_pan`, `rate_other_without_pan`, `is_own_status`, `tax_on_receipt_or_realization`, `threshold_level`, `is_zero_rated`, `is_predefined`, `is_active`, `created_at`, `updated_at`.

## Notes

- All operations return a `{ success: boolean, ... }` envelope rather than throwing; caught exceptions become `{ success: false, error: err.message }`.
- The `is_*` columns are SQLite integers used as 0/1 booleans.
- Rate and `threshold_level` columns are stored as SQLite `REAL` but represent monetary/percentage values — see the DB docs for the precise NUMERIC mapping (never floating point).
