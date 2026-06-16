# priceList Module — IPC API Reference

Backend module: `server/priceList/`
- `priceList.js` — SQLite schema init (`price_lists`, `price_list_lines`)
- `priceListService.js` — SQL / business logic
- `priceListController.js` — IPC handlers

All channels are registered in `server/index.js` and exposed in `preload.js`
under the `priceList` namespace. The IPC namespace (`priceList`) matches the
module name — no aliasing.

Every handler returns an envelope `{ success: boolean, data?, error? }` and
never throws to the renderer (errors are caught and returned).

## Channels

| Channel | window.api binding | Params (2nd IPC arg) | Returns | Summary |
|---|---|---|---|---|
| `priceList:create` | `window.api.priceList.create(data)` | `{ company_id, stock_group?, price_level, applicable_from, lines[] }` | `{ success, data: PriceList+lines }` or `{ success:false, error }` | Insert a price list header and its lines; re-fetches and returns the full record. |
| `priceList:getAll` | `window.api.priceList.getAll(company_id)` | bare scalar `company_id` | `{ success, data: PriceList[] }` (each with `lines`) | List active price lists for a company, newest `applicable_from` first. |
| `priceList:getById` | `window.api.priceList.getById(id)` | bare scalar `id` (price_list_id) | `{ success, data: PriceList+lines }` or `{ success:false, error:'Price list not found.' }` | Fetch one active price list with its lines. |
| `priceList:update` | `window.api.priceList.update(data)` | `{ id, company_id?, stock_group?, price_level, applicable_from, lines[] }` | `{ success, data: PriceList+lines }` or `{ success:false, error }` | Update header; delete + re-insert all lines (clean replace). |
| `priceList:delete` | `window.api.priceList.delete(id)` | bare scalar `id` (price_list_id) | `{ success: true }` or `{ success:false, error:'Price list not found.' }` | Soft delete (`is_active = 0`); lines retained. |

## Notes

- No typo'd or misnamed channels exist in this module — all five channels are
  clean.
- `create`, `getAll`, `getById`, `update`, `delete` all share the same envelope
  convention.
- **Bare scalar arguments:** `getAll`, `getById`, and `delete` are invoked with
  a single primitive (the `company_id` or `id`), not an object. The OpenAPI
  fragment models these as a one-property object purely for documentation; the
  wire payload is the scalar itself.
- **`create` does not accept `sort_order`** — the server assigns it from the
  line array index.
- **`update` ignores `company_id`** — it is destructured but the UPDATE SQL only
  touches `stock_group`, `price_level`, `applicable_from`, `updated_at`. The
  header key for update is `id`, which maps to `price_lists.price_list_id`.
- **Validation (returned as `success:false`, not thrown):**
  - `create`: requires `company_id`, `price_level`, `applicable_from`, and a
    non-empty `lines` array.
  - `update`: requires `id`, `price_level`, `applicable_from`, and a non-empty
    `lines` array, plus the record must exist and be active.
- `delete` is a **soft delete** — the row is hidden from `getAll`/`getById`
  (which filter `is_active = 1`) but not physically removed.

## Line item shape (`lines[]`)

| Field | Type | Default | Notes |
|---|---|---|---|
| `item_id` | integer \| null | null | FK to `stock_items.item_id`; null if not item-bound |
| `particulars` | string | — | Required (NOT NULL in storage) |
| `qty_from` | number | 0 | Quantity slab lower bound |
| `qty_less_than` | number | 0 | Quantity slab upper bound (exclusive) |
| `rate` | number | 0 | Rate / price for the slab |
| `disc_percent` | number | 0 | Discount percentage |
| `sort_order` | integer | (server) | Assigned from array index; not client-supplied |
