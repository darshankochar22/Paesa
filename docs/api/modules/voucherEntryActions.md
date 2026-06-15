# Module: voucherEntryActions

IPC contract for the `voucherEntryActions` backend module (Electron + SQLite accounting/ERP app).

- Schema init: `server/voucherEntryActions/voucherEntryActions.js`
- Service / SQL: `server/voucherEntryActions/voucherEntryActionsService.js`
- Controller / IPC: `server/voucherEntryActions/voucherEntryActionsController.js`
- Registration: `server/index.js` (lines 317-320)

**Namespace:** `voucherEntryActions` (the part before `:` in each channel).

## WARNINGS

- **Not exposed in preload.js.** There is no `window.api.voucherEntryActions` binding. The `window.api.*` bindings listed below are the *conventional* bindings that would apply if wired into `preload.js`, but the renderer currently has **no reachable path** to these channels. Only the main process (and any code that calls `ipcRenderer.invoke` directly) can reach them.
- The service exposes a `getByCompany(company_id, { from_date, to_date, action_type, limit })` method with filtering, but **no IPC channel is registered for it** — it is unreachable over IPC and therefore not documented as an operation here.
- No channel typos were found in this module.

## Channels

| Channel | window.api binding (not wired) | Params (IPC arg 2) | Returns | Summary |
|---|---|---|---|---|
| `voucherEntryActions:create` | `window.api.voucherEntryActions.create(data)` | `data` object: `{ company_id*, action_type*, voucher_id?, action_data?, autofill_ledger_id?, autofill_amount?, autofill_narration?, previous_mode?, new_mode?, additional_details?, related_report_type?, related_report_id?, is_optional?, optional_reason?, performed_by?, performed_at? }` | `{ success: true, action: VoucherEntryAction }` or `{ success: false, error }` | Insert an action row and return the freshly inserted row. |
| `voucherEntryActions:getAll` | `window.api.voucherEntryActions.getAll(company_id)` | bare scalar `company_id` | `{ success: true, actions: VoucherEntryAction[] }` or `{ success: false, error }` | All actions for a company, `performed_at DESC`. |
| `voucherEntryActions:getByVoucher` | `window.api.voucherEntryActions.getByVoucher(voucher_id)` | bare scalar `voucher_id` | `{ success: true, actions: VoucherEntryAction[] }` or `{ success: false, error }` | All actions for one voucher, `performed_at ASC`. |
| `voucherEntryActions:delete` | `window.api.voucherEntryActions.delete(id)` | bare scalar `id` (= `action_id`) | `{ success: true }` or `{ success: false, error }` (`'Action not found'` when missing) | Delete one action by `action_id`. |

`*` = required.

## Row shape: VoucherEntryAction

Returned rows mirror the `voucher_entry_actions` table. On read, the service `parseAction()` JSON-parses the `action_data` and `additional_details` TEXT columns back into objects/values. On write (`create`), the same two fields are `JSON.stringify`'d when they are objects, and `is_optional` is coerced to `0`/`1`.

| Field | Type | Notes |
|---|---|---|
| action_id | integer | PK, autoincrement |
| company_id | integer | required |
| voucher_id | integer \| null | |
| action_type | string | required |
| action_data | object/array/string/null | JSON TEXT in DB, parsed on read |
| autofill_ledger_id | integer \| null | |
| autofill_amount | number \| null | money/quantity |
| autofill_narration | string \| null | |
| previous_mode | string \| null | |
| new_mode | string \| null | |
| additional_details | object/array/string/null | JSON TEXT in DB, parsed on read |
| related_report_type | string \| null | |
| related_report_id | integer \| null | |
| is_optional | 0 \| 1 | boolean stored as 0/1 |
| optional_reason | string \| null | |
| performed_by | string \| null | |
| performed_at | string (ISO-8601) | default `datetime('now')` |
| created_at | string (ISO-8601) | default `datetime('now')` |

## Error shape

All handlers catch internally and return `{ success: false, error: string }` rather than throwing. The shared OpenAPI `Error` schema `{ error, message }` is provided for transport-level failures (e.g. an unhandled IPC rejection).
