# eInvoice Module — API Reference

GST e-Invoice (NIC IRP) integration for the Electron + SQLite accounting/ERP app.
Handles IRP authentication, GSTIN master lookup, IRN generation/fetch/cancel, and
persistence of generated records and per-company IRP credentials.

- **Backend module:** `server/eInvoice/`
  - `eInvoice.js` — schema init (`einvoice_credentials`, `einvoice_records`)
  - `eInvoiceService.js` — IRP HTTPS calls + SQL
  - `eInvoiceController.js` — IPC handlers
- **Registered in:** `server/index.js` (lines 322–330)
- **IPC namespace:** `eInvoice` (matches the module name — no abbreviation)

> **WARNING — preload gap:** These channels are registered with `ipcMain.handle`
> in `server/index.js` but are **not** exposed in `preload.js`. There is currently
> **no `window.api.eInvoice.*` binding**. The `window.api` column below shows the
> *intended/conventional* binding, not one that exists today. Renderer code cannot
> reach these handlers until preload exposes them.

> **WARNING — error shape:** The service layer returns in-band failures as
> `{ success: false, error: "..." }` (it resolves, it does not throw). This differs
> from the shared transport `Error` schema `{ error, message }` used for
> host/IPC-level failures in the OpenAPI fragment.

> **Note:** No channel names contain typos. The path/HTTP-method shown in the
> OpenAPI fragment is a rendering convention; at runtime these are Electron IPC
> invocations.

## Channels

| Channel | window.api binding (intended) | Params (payload) | Returns | Summary |
|---|---|---|---|---|
| `eInvoice:authenticate` | `window.api.eInvoice.authenticate` | `{ company_id }` | `{ success:true, token }` or `{ success:false, error }` | Authenticate to IRP using the company's stored credentials; caches AuthToken in memory. |
| `eInvoice:getGSTINDetails` | `window.api.eInvoice.getGSTINDetails` | `{ gstin, company_id }` | `{ success:true, data }` or `{ success:false, error }` | Fetch GSTIN master details from the IRP. |
| `eInvoice:generateIRN` | `window.api.eInvoice.generateIRN` | `{ company_id, voucher_id?, invoice_payload }` | `{ success:true, data }` or `{ success:false, error }` | Generate an IRN from the IRP invoice payload and insert a record (status `GENERATED`). |
| `eInvoice:getIRNDetails` | `window.api.eInvoice.getIRNDetails` | `{ irn, company_id }` | `{ success:true, data }` or `{ success:false, error }` | Fetch details of an existing IRN from the IRP. |
| `eInvoice:cancelIRN` | `window.api.eInvoice.cancelIRN` | `{ irn, cancel_reason, cancel_remarks, company_id }` | `{ success:true, data }` or `{ success:false, error }` | Cancel an IRN on the IRP and mark the local record `CANCELLED`. |
| `eInvoice:saveCredentials` | `window.api.eInvoice.saveCredentials` | `{ company_id, client_id, client_secret, username, password, app_key, is_sandbox? }` | `{ success:true }` or `{ success:false, error }` | Upsert (insert or update) the company's IRP credentials, keyed by `company_id`. |
| `eInvoice:getCredentials` | `window.api.eInvoice.getCredentials` | `{ company_id }` | `{ success:true, credentials }` or `{ success:false, error:'No credentials found' }` | Fetch the company's stored IRP credentials row. |
| `eInvoice:getRecords` | `window.api.eInvoice.getRecords` | `{ company_id }` | `{ success:true, records:[] }` or `{ success:false, error }` | List all e-Invoice records for a company, newest first (`created_at DESC`). |
| `eInvoice:getRecordByIRN` | `window.api.eInvoice.getRecordByIRN` | `{ irn }` | `{ success:true, record }` or `{ success:false, error:'Record not found' }` | Fetch a single e-Invoice record by IRN. |

## Notes on payload derivation

- `authenticate`, `getCredentials`, `getRecords` destructure `{ company_id }` from arg 2.
- `getGSTINDetails` destructures `{ gstin, company_id }`.
- `generateIRN` destructures `{ company_id, voucher_id, invoice_payload }`. The service
  reads `invoice_payload.DocDtls.No` (invoice_number), `invoice_payload.DocDtls.Dt`
  (invoice_date), and `invoice_payload.BuyerDtls.Gstin` (buyer_gstin) for persistence.
- `getIRNDetails` destructures `{ irn, company_id }`.
- `cancelIRN` destructures `{ irn, cancel_reason, cancel_remarks, company_id }`.
- `saveCredentials` receives the whole `data` object (no destructuring in the controller);
  the service reads `company_id, client_id, client_secret, username, password, app_key,
  is_sandbox` (defaulting `is_sandbox` to 1).
- `getRecordByIRN` destructures `{ irn }`.

## Credential precondition

`authenticate`, `getGSTINDetails`, `generateIRN`, `getIRNDetails`, and `cancelIRN`
first call `getCredentials(company_id)`. If no credentials exist, the controller
short-circuits and returns the failure `{ success:false, error:'No credentials found' }`
before any IRP call.
