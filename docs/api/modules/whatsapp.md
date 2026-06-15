# WhatsApp Module — API Reference

Backend module: `whatsapp` (`server/whatsapp/`). Integrates the Meta WhatsApp
Cloud API (Graph `v19.0`, host `graph.facebook.com`) for sending invoices,
payment reminders, statements, and free-form text, plus config storage and
send logs.

- Schema init: `server/whatsapp/whatsapp.js`
- Logic / SQL: `server/whatsapp/whatsappService.js`
- IPC handlers: `server/whatsapp/whatsappController.js`
- Channel registration: `server/index.js` (lines 332–339)

> **WARNING — no renderer binding.** These channels are registered with
> `ipcMain.handle('whatsapp:*', ...)` in `server/index.js`, but `preload.js`
> does **not** expose a `whatsapp` key on `window.api`. The `window.api`
> bindings in the table below are the **expected** shape only; the renderer
> cannot currently invoke these channels through the contextBridge. Either add
> a `whatsapp` block to `preload.js` or invoke `ipcRenderer.invoke('whatsapp:...')`
> directly.

> **Note — IPC error convention.** Service failures are returned in-band as
> `{ success: false, error }` with a successful IPC resolution (not thrown).
> The OpenAPI `4XX`/`5XX` `Error` responses model unexpected transport-level
> failures only.

## Channels

| Channel | window.api binding (expected) | Params | Returns | Summary |
|---|---|---|---|---|
| `whatsapp:saveConfig` | `window.api.whatsapp.saveConfig` | `{ company_id, phone_number_id, waba_id, access_token }` | `{ success, error? }` | Upsert the company's WhatsApp Cloud API config (by `company_id`). |
| `whatsapp:getConfig` | `window.api.whatsapp.getConfig` | `{ company_id }` | `{ success:true, config }` or `{ success:false, error }` | Get the active config row for a company. |
| `whatsapp:sendInvoice` | `window.api.whatsapp.sendInvoice` | `{ company_id, voucher_id, to_phone, invoice_data{ party_name?, voucher_number, date, total_amount } }` | `{ success, wamid? , error? }` | Send invoice via `invoice_share` template; writes a log row. |
| `whatsapp:sendPaymentReminder` | `window.api.whatsapp.sendPaymentReminder` | `{ company_id, to_phone, reminder_data{ party_name, outstanding_amount, due_date? } }` | `{ success, wamid?, error? }` | Send reminder via `payment_reminder` template; writes a log row. |
| `whatsapp:sendStatement` | `window.api.whatsapp.sendStatement` | `{ company_id, to_phone, statement_data{ party_name, from_date, to_date, closing_balance } }` | `{ success, wamid?, error? }` | Send statement via `account_statement` template; writes a log row. |
| `whatsapp:sendText` | `window.api.whatsapp.sendText` | `{ company_id, to_phone, message }` | `{ success, wamid?, error? }` | Send a free-form text message; writes a log row. |
| `whatsapp:getLogs` | `window.api.whatsapp.getLogs` | `{ company_id, limit? (default 50) }` | `{ success:true, logs:[…] }` or `{ success:false, error }` | List recent send logs (`sent_at DESC`). |
| `whatsapp:verifyWebhook` | `window.api.whatsapp.verifyWebhook` | `{ mode, token, challenge, verify_token }` | `{ success:true, challenge }` or `{ success:false, error }` | Verify Meta webhook handshake (`mode === 'subscribe' && token === verify_token`). |

## Behavior notes

- **Phone normalization** (`normalizePhone`): strips spaces/dashes/parens; a
  leading `0` becomes `91`; bare 10-digit numbers get `91` prefixed; a leading
  `+` is removed. India-centric defaults.
- **Send flow**: every `send*` method first calls `getConfig`. If the company
  has no active config it returns that failure (`{ success:false, error:'WhatsApp not configured' }`).
  Otherwise it POSTs to `/{version}/{phone_number_id}/messages` with the bearer
  `access_token`. Success requires HTTP 200 **and** a returned `messages[0].id`
  (`wamid`).
- **Logging**: every send attempt writes a `whatsapp_logs` row with status
  `SENT` or `FAILED`; log-write errors are swallowed.
- **Currency formatting**: template amounts are interpolated as `₹<value>` from
  the raw payload value (no server-side rounding).

## Tables

See `docs/db/modules/whatsapp.sql` and `docs/db/modules/whatsapp.md`:
`whatsapp_config`, `whatsapp_templates`, `whatsapp_logs`.

> `whatsapp_templates` is created by the schema init but is **not** read or
> written by any channel in this module (no SQL references it in
> `whatsappService.js`).
