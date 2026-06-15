# priceLevels module — API reference

Backend module: `server/priceLevels/`
- `priceLevel.js` — schema init (`price_levels` table)
- `priceLevelService.js` — logic / SQL
- `priceLevelController.js` — IPC handlers

IPC namespace: `priceLevels`
Renderer binding: `window.api.priceLevels.<method>` (from `preload.js`)

## Behavior note

Although `price_levels` is a full table (one row per company + level_index),
the service does **not** expose rows to the renderer. Instead:
- `get` and `save` return a **sparse array of name strings** indexed by
  `level_index` (gaps filled with `''`).
- `save` uses a **delete-then-reinsert** strategy for the whole company so the
  list can shrink cleanly.

All operations return `{ success: boolean, data?, error? }` — errors are
returned in-band (the IPC promise resolves), not thrown.

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `priceLevels:get` | `window.api.priceLevels.get(company_id)` | `company_id` (integer, bare arg) | `{ success: true, data: string[] }` — names indexed by `level_index`; `data: []` when none | Get the company's price-level names as an index-ordered array. |
| `priceLevels:save` | `window.api.priceLevels.save(data)` | `{ company_id: integer, levels: string[] }` | `{ success: true, data: string[] }` — re-read saved names; or `{ success: false, error }` on validation failure | Replace all price levels for a company with the supplied array. |
| `priceLevels:delete` | `window.api.priceLevels.delete(company_id)` | `company_id` (integer, bare arg) | `{ success: true }`; or `{ success: false, error }` when none exist | Delete all price levels for a company. |

## Validation (save)

`save` returns `{ success: false, error }` for:
- missing `company_id` -> `"company_id is required."`
- `levels` not an array -> `"levels must be an array."`
- no non-empty trimmed entries -> `"At least one price level name is required."`

`delete` returns `{ success: false, error: "No price levels found for this company." }`
when the company has no rows.

## Warnings

- **No typo'd channels** were found for this module; all three channels are
  spelled consistently (`priceLevels:get|save|delete`).
- **Error shape mismatch.** The shared `Error` schema is `{ error, message }`,
  but this module returns errors as `{ success: false, error }`. Consumers
  should read the `error` field; there is no `message` field.
- **Lossy round-trip.** `get`/`save` discard `price_level_id`, `is_active`,
  `created_at`, and `updated_at` — the renderer only ever sees names. The
  `is_active` column exists in the schema but is never read or written by the
  service (always defaults to 1).
