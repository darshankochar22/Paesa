# voucherType module — API reference

Backend module: **voucherType** (`server/voucherType/`)

- Schema init: `voucherType.js` — creates `voucher_types` and `voucher_type_configs`.
- Logic/SQL: `voucherTypeService.js` — also exposes a non-IPC `seedDefaultVoucherTypes(company_id)` that seeds 25 predefined voucher types and their configs.
- IPC handlers: `voucherTypeController.js`.
- Registered in `server/index.js` (lines 174–180) under the `voucherType:` namespace.
- Renderer bindings in `preload.js` (lines 147–154) under `window.api.voucherType`.

All handlers resolve with a `{ success, ... }` envelope. On a caught exception they resolve with `{ success: false, error: <err.message> }` instead of rejecting. The renderer-side binding shape is shown in the `window.api binding` column.

## Channels

| Channel | window.api binding | Params (arg 2) | Returns (success path) | Summary |
|---|---|---|---|---|
| `voucherType:create` | `window.api.voucherType.create(data)` | object — see `VoucherTypeCreateInput` (requires `company_id`, `name`; many bool flags) | `{ success: true, voucherType: <voucher_types row> }` | Create a user-defined voucher type + its config row. Forces `is_predefined=0`, `is_active=1`. Fails if an active same-name (case-insensitive) type exists for the company. |
| `voucherType:getAll` | `window.api.voucherType.getAll(company_id)` | **bare scalar** `company_id` (integer) | `{ success: true, voucherTypes: [<vt row + config-flag subset + parent_name>] }` | List active voucher types for a company, joined with selected config flags and a derived `parent_name`. Ordered `is_predefined DESC, name ASC`. |
| `voucherType:getById` | `window.api.voucherType.getById(id)` | **bare scalar** `vt_id` (integer) | `{ success: true, voucherType: <vt row + full config columns> }` | Fetch one voucher type with its full config joined. Fails with `'Voucher Type not found'` if absent. |
| `voucherType:update` | `window.api.voucherType.update(data)` | object — see `VoucherTypeUpdateInput` (requires `vt_id`) | `{ success: true, voucherType: <updated voucher_types row> }` | Update a user-defined voucher type. Fails for missing row or `'Cannot edit predefined voucher types'`. |
| `voucherType:delete` | `window.api.voucherType.delete(id)` | **bare scalar** `vt_id` (integer) | `{ success: true }` | Soft-delete (`is_active=0`, `updated_at=now`). Fails for missing row or `'Cannot delete predefined voucher types'`. |
| `voucherType:getConfig` | `window.api.voucherType.getConfig(id)` | **bare scalar** `voucher_type_id` (integer) | `{ success: true, config: <voucher_type_configs row> }` | Fetch the config row for a voucher type. Fails with `'Config not found'` if absent. |
| `voucherType:updateConfig` | `window.api.voucherType.updateConfig(data)` | object — see `VoucherTypeConfigUpdateInput` (requires `voucher_type_id`) | `{ success: true, config: <updated voucher_type_configs row> }` | Update the config row. Each field falls back to its stored value (`??`) when omitted. Fails with `'Config not found'` if absent. |

## Failure shape

On a logical failure or a caught error, every handler resolves with:

```json
{ "success": false, "error": "<human-readable message>" }
```

Known logical error strings:
- `A voucher type with this name already exists.` (create)
- `Voucher Type not found` (getById, update, delete)
- `Cannot edit predefined voucher types` (update)
- `Cannot delete predefined voucher types` (delete)
- `Config not found` (getConfig, updateConfig)

## Notes & caveats

- **No typo'd channels** were found in this module — all seven channels are consistently spelled `voucherType:*` (camelCase namespace), matching the preload bindings.
- **Namespace vs. module name:** the namespace equals the module name (`voucherType`); no remap (unlike e.g. financialYear -> fy).
- Three handlers (`getAll`, `getById`, `delete`, `getConfig`) take a **bare scalar** as IPC arg 2, not an object. The OpenAPI `requestBody` for those models the scalar directly.
- **0/1 boolean storage:** all `affects_*`, `is_*`, `allow_*`, `use_*`, `make_*`, `print_*`, `whatsapp_*`, `enable_*`, `track_*`, `set_*` columns are stored as SQLite integers `0`/`1`. Returned rows carry the raw integers; in Postgres these map to `BOOLEAN` (0->false, 1->true).
- **`update` flag coercion quirk:** in `update`, `affects_inventory`/`affects_accounting`/`affects_gst` are always written as `value ? 1 : 0` (no `??` fallback), so omitting them resets those flags to `0`. Other update fields use `?? existing`.
- `seedDefaultVoucherTypes(company_id)` is a service-level helper (not exposed over IPC) that inserts the 25 `PREDEFINED_VOUCHER_TYPES` with `is_predefined=1`.
