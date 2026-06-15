# GST Module — IPC API Reference

Backend module: `server/gst/`
Renderer namespace: `window.api.gst` (preload.js)
Channels registered in `server/index.js` lines 206–211.

Files:
- `gst.js` — schema init (tables `gst_hsn_rates`, `gst_voucher_tax_lines`, `gstr1_exports`; plus migrations on `stock_groups`).
- `gstController.js` — IPC handlers.
- `gstr1Service.js` — GSTR-1 generation/retrieval logic.
- `gstTaxEngine.js` — tax computation engine (state codes, rate resolution, voucher tax lines).

## Channels

| Channel | window.api binding | Params (IPC arg 2) | Returns | Summary |
|---|---|---|---|---|
| `gst:computeTax` | `window.api.gst.computeTax(payload)` | `{ company_id*, date, party_ledger_id, place_of_supply, voucher_type, stock_entries[], entries[] }` | `{ success, is_inter_state(0/1), party_gstin, party_state, total_cgst, total_sgst, total_igst, total_cess, stock_entries[], entries[], taxLinesBreakdown[] }` (or `{ success:false, error }`) | Compute CGST/SGST/IGST/CESS for a voucher and return rebalanced double-entry lines. Does not persist. |
| `gst:generateGSTR1` | `window.api.gst.generateGSTR1(data)` | `{ company_id*, fy_id*, return_period* }` (`MMYYYY`) | `{ success, export_id, payload(GSTR1Payload), errors[] }` (or `{ success:false, error }`) | Generate GSTR-1 sections (B2B/B2CL/B2CS/CDNR/HSN) for a period and persist a Draft snapshot in `gstr1_exports`. |
| `gst:getGSTR1` | `window.api.gst.getGSTR1(data)` | `{ company_id*, fy_id*, return_period* }` | `{ success, export_id, status, filed_date, payload, errors[] }` — or, when no snapshot exists, the full `generateGSTR1` result. | Fetch latest GSTR-1 snapshot for the period; auto-generates if none exists. |
| `gst:getHSNRates` | `window.api.gst.getHSNRates(cid)` | bare scalar `company_id` (NOT an object) | `{ success, hsnRates: GstHsnRate[] }` (or `{ success:false, error }`) | List all HSN/SAC GST rate overrides for a company. |
| `gst:upsertHSNRate` | `window.api.gst.upsertHSNRate(data)` | `{ rate_id?, company_id*, hsn_code*, effective_from*, effective_to, taxability, gst_rate, cgst_rate, sgst_rate, igst_rate, cess_rate, type_of_supply }` | `{ success }` or `{ success:false, error }` | Insert (no rate_id) or update (with rate_id) an HSN rate row. |
| `gst:deleteHSNRate` | `window.api.gst.deleteHSNRate(data)` | `{ rate_id*, company_id* }` | `{ success }` or `{ success:false, error }` | Delete an HSN rate row scoped by rate_id + company_id. |

`*` = required.

## Notes / Warnings

- **Bare-scalar argument:** `gst:getHSNRates` is invoked as `getHSNRates(cid)` and the handler signature is `(event, company_id)` — the second IPC argument is a raw integer, not a wrapped object. The OpenAPI fragment models it as `CompanyIdScalarRequest` with a single `company_id` property for clarity.
- **Error convention:** Handlers generally do not throw; they catch and return `{ success: false, error: <message> }`. The shared `Error { error, message }` schema documents the conventional 4xx/5xx envelope, but at runtime errors arrive in the 200 body as `success:false`.
- **`gst:generateGSTR1` has side effects:** it deletes the existing `Draft` row for the period and inserts a fresh one. `gst:getGSTR1` may transparently invoke generation (and thus the same side effects) when no snapshot exists.
- **No typos** were found in this module's channel names. All six channels use the `gst:` namespace matching the module name.
- Only `gst:upsertHSNRate` and `gst:deleteHSNRate` directly mutate this module's own tables via the controller. `gst:computeTax` reads many cross-module tables (gst_registrations, ledgers, stock_items, stock_groups, ledger_statutory_details, groups) and may *create* a Duties & Taxes ledger + statutory detail row via `resolveOrCreateTaxLedger`.
- `saveVoucherTaxLines` (writes `gst_voucher_tax_lines`) is exported by `gstTaxEngine.js` but is **not** wired to any `gst:` IPC channel — it is invoked from elsewhere (e.g. the voucher module). Listed here only for table provenance.
