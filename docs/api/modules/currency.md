# Currency Module — IPC API Reference

Backend module: `server/currency/`
- `currency.js` — schema init (`currencies` table)
- `currencyService.js` — logic / SQL
- `currencyController.js` — IPC handlers

Namespace: `currency` (matches the module name). Channels are registered in
`server/index.js` (lines 167–172) and exposed to the renderer in `preload.js`
(lines 139–146) under `window.api.currency.*`.

All operations return an **in-band result envelope** `{ success: boolean, ... }`
rather than throwing. On `success: false` an `error` string is included.

## Channels

| Channel | window.api binding | Params (IPC arg 2) | Returns | Summary |
|---|---|---|---|---|
| `currency:create` | `window.api.currency.create(data)` | `data` object: `{ company_id, name, iso_code, formal_name?, symbol?, decimal_places?, decimal_symbol?, decimal_places_in_words?, suffix_symbol_to_amount?, show_amount_in_millions?, word_representing_amount_after_decimal?, add_space_between_amount_and_symbol? }` | `{ success: true, currency }` or `{ success: false, error }` | Insert a currency for a company; rejects a duplicate active ISO code (case-insensitive). Forces is_active=1, is_default=0, is_predefined=0. |
| `currency:getAll` | `window.api.currency.getAll(company_id)` | bare scalar `company_id` | `{ success: true, currencies: [...] }` or `{ success: false, error }` | List all `is_active = 1` currencies for the company. |
| `currency:getById` | `window.api.currency.getById(id)` | bare scalar `id` (currency_id) | `{ success: true, currency }` or `{ success: false, error }` ("Currency not found") | Fetch one currency by primary key. |
| `currency:update` | `window.api.currency.update(data)` | `data` object incl. `currency_id` (+ any editable fields) | `{ success: true, currency }` or `{ success: false, error }` | Update an editable currency. Blocked when `is_predefined` ("Cannot edit base currency"). Omitted fields keep current values. |
| `currency:delete` | `window.api.currency.delete(id)` | bare scalar `id` (currency_id) | `{ success: true }` or `{ success: false, error }` | Soft-delete (sets `is_active = 0`). Blocked for default ("Cannot delete default currency") and predefined ("Cannot delete base currency"). |
| `currency:setDefault` | `window.api.currency.setDefault(company_id, id)` | `{ company_id, id }` (preload wraps the two positional args into this object) | `{ success: true }` or `{ success: false, error }` | Clears `is_default` on all the company's currencies, then sets it on the chosen currency. |

## Notes

- **No typo'd channels** were found for this module; all six channels are spelled consistently.
- `getAll`, `getById`, `delete` are invoked with a **bare scalar** as IPC arg 2 (not an object). They are documented in the OpenAPI fragment as a single-property object for schema validity.
- `setDefault` is the only channel whose controller destructures an object `{ company_id, id }`. The preload binding has signature `(company_id, id)` and constructs that object before invoking.
- `seedDefaultCurrency(company_id)` exists in the service but is **not** exposed over IPC; it seeds the predefined Indian Rupee (INR) base currency and is called internally (e.g. on company creation).
- Boolean-like fields are stored as SQLite `0/1` integers. See `docs/db/modules/currency.md` for the Postgres mapping.
