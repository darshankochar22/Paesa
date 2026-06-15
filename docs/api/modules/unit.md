# Unit Module — API Reference

Backend module: `unit` (`server/unit/`)
IPC namespace: `unit`
Renderer binding: `window.api.unit.*` (from `preload.js`)
Controller: `server/unit/unitController.js` -> `server/unit/unitService.js`
Schema init: `server/unit/unit.js` (table `units`)

A unit is either **Simple** or **Compound**. A compound unit is created by promoting
an existing simple unit so it relates two simple units (`first_unit_id`,
`second_unit_id`) via a `conversion_factor`. Seeded defaults (Numbers, Kilograms,
Grams, Litres, Metres, Pieces, Box) are marked `is_predefined = 1` and cannot be
edited or deleted.

## Channels

| Channel | window.api binding | Params (arg 2) | Returns | Summary |
|---|---|---|---|---|
| `unit:create` | `window.api.unit.create(data)` | `data` object: `{ company_id*, name, symbol, formal_name?, decimal_places?, unit_quantity_code?, unit_type?, first_unit_id?, second_unit_id?, conversion_factor? }` | `{ success: true, unit }` or `{ success: false, error }` | Create a simple unit, or promote an existing simple unit into a compound unit. |
| `unit:getAll` | `window.api.unit.getAll(company_id)` | bare `company_id` (number) | `{ success: true, units: [...] }` or `{ success: false, error }` | List active units for a company, with joined first/second unit symbol + formal_name. |
| `unit:getSimpleUnits` | `window.api.unit.getSimpleUnits(company_id)` | bare `company_id` (number) | `{ success: true, units: [...] }` or `{ success: false, error }` | List active `Simple` units for a company, ordered by symbol (no joined columns). |
| `unit:getById` | `window.api.unit.getById(id)` | bare `unit_id` (number) | `{ success: true, unit }` or `{ success: false, error: "Unit not found" }` | Fetch one unit by id, with joined first/second unit columns. |
| `unit:update` | `window.api.unit.update(data)` | `data` object: `{ unit_id*, name?, symbol?, formal_name?, decimal_places?, unit_quantity_code?, unit_type?, first_unit_id?, second_unit_id?, conversion_factor? }` | `{ success: true, unit }` or `{ success: false, error }` | Update an editable unit (predefined rejected); may switch to/from Compound. |
| `unit:delete` | `window.api.unit.delete(id)` | bare `unit_id` (number) | `{ success: true }` or `{ success: false, error }` | Soft-delete a unit (`is_active = 0`); predefined rejected. |

`*` = required.

## Notes

- All channels are registered in `server/index.js` (lines 103-108) and resolve through
  `unitController.<fn>` which simply forwards to `unitService.<fn>`.
- Errors are returned **in-band** as `{ success: false, error }` with HTTP-200-equivalent
  IPC resolution; the service wraps each method in try/catch and returns `err.message`.
- `getAll`, `getById`, and `update` self-join `units` twice (`f`, `s`) to surface
  `first_unit_symbol`, `first_unit_formal_name`, `second_unit_symbol`,
  `second_unit_formal_name`. `getSimpleUnits` does not.
- Validation rules in `create`/`update` for compound units: both unit ids required,
  must differ, `conversion_factor` must be > 0, and neither referenced unit may itself
  be Compound.

## Channel name verification

No typos were found in this module's channel names. Channels (`unit:create`,
`unit:getAll`, `unit:getSimpleUnits`, `unit:getById`, `unit:update`, `unit:delete`)
match exactly between `server/index.js` and `preload.js`, and the namespace `unit`
equals the module name.
