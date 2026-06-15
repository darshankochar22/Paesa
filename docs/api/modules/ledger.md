# Ledger Module — API Reference

Backend module: **ledger** (`server/ledger/`)
Controller: `ledgerController` (registered in `server/index.js`)
Renderer namespace: `window.api.ledger.*` (exposed in `preload.js`)

Transport is Electron IPC: `ipcMain.handle('ledger:<action>', ledgerController.<fn>)`.
Every service method returns a `{ success, ... }` envelope; thrown errors are
caught and returned as `{ success: false, error }` (the operation still resolves
"successfully" over IPC).

## Channels

| Channel | window.api binding | Params (payload) | Returns | Summary |
|---|---|---|---|---|
| `ledger:create` | `window.api.ledger.create(data)` | Ledger object: `company_id` (req), `name` (req), plus all ledger fields, optional `bank_details`, optional `statutory_details` | `{ success: true, ledger }` or `{ success: false, error }` | Create a ledger (+ optional bank/statutory rows). Rejects a duplicate active name within the same company. `is_active=1`, `is_predefined=0` forced server-side. |
| `ledger:getAll` | `window.api.ledger.getAll(company_id)` | Bare scalar `company_id` | `{ success: true, ledgers: [ ...Ledger + group_name ] }` | List all active ledgers for a company, LEFT JOINed with `groups` to add `group_name`. |
| `ledger:getById` | `window.api.ledger.getById(id)` | Bare scalar `id` (ledger_id) | `{ success: true, ledger: { ...Ledger, bank_details, statutory_details } }` or `{ success: false, error }` | Fetch one ledger with nested bank and statutory sub-records (each `null` if absent). |
| `ledger:update` | `window.api.ledger.update(data)` | Ledger object incl. `ledger_id` (req) | `{ success: true, ledger }` or `{ success: false, error }` | Update a ledger; deletes+reinserts bank/statutory rows when supplied. Blocks predefined ledgers and missing rows. |
| `ledger:delete` | `window.api.ledger.delete(id)` | Bare scalar `id` (ledger_id) | `{ success: true }` or `{ success: false, error }` | Soft-delete (sets `is_active = 0`). Blocks predefined ledgers and missing rows. |
| `ledger:getByGroup` | `window.api.ledger.getByGroup(company_id, groupId)` | `{ company_id, group_id }` (binding maps 2nd arg → `group_id`) | `{ success: true, ledgers: [...] }` | List active ledgers for a company filtered by group. |

## Notes & warnings

- **No typo channels** were found for this module; all six channels are clean and the namespace (`ledger`) matches the module name.
- **Scalar payloads:** `getAll`, `getById`, and `delete` handlers receive a bare value as IPC arg 2 (not an object). In the OpenAPI fragment these are modelled as a single-property object (`company_id` / `id`) for schema validity.
- **Coercion quirk:** in `create`/`update`, `check_credit_days` is read from the boolean-style input but written to the integer column as `0/1` (it is coerced like a flag, not stored as a day count). Documented verbatim from source.
- **Failure-as-success:** validation failures ("Ledger already exists", "Ledger not found", "Cannot edit/delete predefined ledgers") and caught exceptions return `{ success: false, error }` with the IPC call resolving normally. There is no real 4xx/5xx over IPC — those responses are included only for HTTP-style rendering/merging.
- **Returned `ledger` rows** carry raw SQLite values: 0/1 integers for boolean-ish columns and ISO-8601 strings for `created_at`/`updated_at`.

## Related (other modules, not documented here)

`report:ledgerReport`, `voucher:getByLedger`, `voucher:getLedgerBalance`,
`voucher:getPendingBills`, `banking:getStatement`, etc. reference ledgers but
belong to the `report` / `voucher` / `banking` modules.
