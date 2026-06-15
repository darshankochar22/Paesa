# Banking Module — IPC API Reference

Backend module: **banking** (`server/banking/`)

- Schema init: `banking.js` (creates the `reconciliations` table)
- Controller: `bankingController.js` (IPC handlers)
- Service: `bankingService.js` — **see warning below**

Channels are registered in `server/index.js` as
`ipcMain.handle('banking:<action>', bankingController.<fn>)` and exposed to the
renderer in `preload.js` as `window.api.banking.<method>`.

## Channels

| Channel | window.api binding | Params (payload) | Returns | Summary |
|---|---|---|---|---|
| `banking:getUnreconciled` | `window.api.banking.getUnreconciled(company_id, fy_id, ledger_id)` | `{ company_id, fy_id, ledger_id }` | `UnreconciledEntry[]` | List unreconciled voucher entries for a bank ledger. |
| `banking:reconcile` | `window.api.banking.reconcile(data)` | `data` object: `{ entry_id, voucher_id, ledger_id, reconciled_date?, bank_date?, bank_reference? }` (forwarded verbatim) | `Reconciliation` (created row / id) | Mark a voucher entry as reconciled (insert into `reconciliations`). |
| `banking:unreconcile` | `window.api.banking.unreconcile(data)` | Controller expects a **bare `id` scalar** (`reconciliation_id`); preload sends `data` as-is | `MutationResult` | Remove a reconciliation record (undo). |
| `banking:getStatement` | `window.api.banking.getStatement(company_id, fy_id, ledger_id, from_date, to_date)` | `{ company_id, fy_id, ledger_id, from_date, to_date }` | `StatementLine[]` | Bank statement (entries within a date range) for a ledger. |
| `banking:getSummary` | `window.api.banking.getSummary(company_id, fy_id, ledger_id)` | `{ company_id, fy_id, ledger_id }` | `BankingSummary` | Reconciliation/balance summary totals for a ledger. |

## Controller signatures (verbatim from `bankingController.js`)

```js
getUnreconciled: async (event, { company_id, fy_id, ledger_id }) =>
  bankingService.getUnreconciled(company_id, fy_id, ledger_id)
reconcile:       async (event, data) => bankingService.reconcile(data)
unreconcile:     async (event, id)   => bankingService.unreconcile(id)
getStatement:    async (event, { company_id, fy_id, ledger_id, from_date, to_date }) =>
  bankingService.getStatement(company_id, fy_id, ledger_id, from_date, to_date)
getSummary:      async (event, { company_id, fy_id, ledger_id }) =>
  bankingService.getSummary(company_id, fy_id, ledger_id)
```

## Warnings

1. **Service module missing / wrong contents.** `server/banking/bankingService.js`
   is a byte-for-byte duplicate of `server/banking/banking.js`: it exports only
   `{ init }` (the `reconciliations` schema initializer). It does **not** export
   `getUnreconciled`, `reconcile`, `unreconcile`, `getStatement`, or `getSummary`.
   At runtime every banking channel would throw `TypeError: bankingService.<fn> is
   not a function`. All return shapes in this doc and in `banking.yaml` are therefore
   **inferred** from the controller, preload, and the `reconciliations` table — they
   must be confirmed once the real service is restored.

2. **`unreconcile` payload mismatch.** The controller handler is
   `unreconcile: async (event, id)` — it expects a bare scalar id and calls
   `bankingService.unreconcile(id)`. But preload binds it as
   `unreconcile: (data) => invoke('banking:unreconcile', data)`, forwarding whatever
   object the caller passes. To work correctly the renderer must call
   `window.api.banking.unreconcile(<reconciliation_id>)` with the scalar id, not a
   wrapping object.

3. No channel typos were found in this module; all five channels use the
   `banking:` namespace consistently.
