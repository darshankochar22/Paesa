# Voucher Module — IPC API Reference

Backend module: `server/voucher/`
- `voucher.js` — SQLite schema init (13 tables)
- `voucherService.js` — business logic / SQL
- `voucherController.js` — IPC handler wrappers

IPC namespace: **`voucher`** (matches the module name; no namespace remap).
Handlers registered in `server/index.js` lines 139–151. Renderer bindings in `preload.js` lines 108–121 under `window.api.voucher`.

All handlers resolve (never reject). Service methods return `{ success: true, ... }` on success or `{ success: false, error }` on failure (validation or caught exception). Booleans are stored as `0/1` INTEGER in SQLite.

## Channels

| Channel | window.api binding | Params (IPC payload) | Returns | Summary |
|---|---|---|---|---|
| `voucher:create` | `window.api.voucher.create(data)` | `data` object (see VoucherCreateInput) | `{ success, voucher }` (vouchers row) or `{ success:false, error }` | Insert a voucher + all sub-records in a transaction; runs Dr/Cr balance check, GST tax engine (Sales/Purchase/CN/DN), auto voucher number, e-invoice auto-trigger, and ledger balance recompute. |
| `voucher:getAll` | `window.api.voucher.getAll(company_id, fy_id)` | `{ company_id, fy_id }` | `{ success, vouchers: VoucherListRow[] }` | List non-cancelled vouchers for company+fy with debit/credit/inwards/outwards totals, newest first. |
| `voucher:getById` | `window.api.voucher.getById(id)` | bare `id` (voucher_id scalar) | `{ success, voucher: VoucherDetail }` or not-found error | Fully hydrated voucher: entries, stock (+batches), bills, bank, cost centres, cash denominations, receipt/party/dispatch/credit-note/debit-note details, payroll entries. |
| `voucher:update` | `window.api.voucher.update(data)` | `data` object (must include `voucher_id`) | `{ success, voucher }` (vouchers row) or error | Update header; replace entries/bills/receipt/party/dispatch/payroll when supplied; rejects cancelled vouchers and unbalanced Dr/Cr. |
| `voucher:delete` | `window.api.voucher.delete(id)` | bare `id` (voucher_id scalar) | `{ success }` or error | Hard-delete voucher (cascades to sub-tables); recompute affected ledger closing balances. |
| `voucher:cancel` | `window.api.voucher.cancel(id)` | bare `id` (voucher_id scalar) | `{ success }` or error | Soft-cancel (`is_cancelled = 1`); recompute affected ledger balances. |
| `voucher:getDaybook` | `window.api.voucher.getDaybook(company_id, fy_id, from_date, to_date)` | `{ company_id, fy_id, from_date, to_date }` | `{ success, vouchers: VoucherListRow[] }` | Non-cancelled vouchers in `[from,to]` (defaults to today) with totals, oldest first. |
| `voucher:getByType` | `window.api.voucher.getByType(company_id, fy_id, type)` | `{ company_id, fy_id, voucher_type }` | `{ success, vouchers: VoucherListRow[] }` | Non-cancelled vouchers of a given type with totals. Renderer param `type` is sent as `voucher_type`. |
| `voucher:getByLedger` | `window.api.voucher.getByLedger(company_id, fy_id, ledgerId)` | `{ company_id, fy_id, ledger_id }` | `{ success, vouchers: Voucher[] }` | Distinct non-cancelled vouchers containing an entry for a ledger. Renderer param `ledgerId` is sent as `ledger_id`. |
| `voucher:getNextNumber` | `window.api.voucher.getNextNumber(company_id, fy_id, type)` | `{ company_id, fy_id, voucher_type }` | `{ success, nextNumber, voucher_number }` | Compute next auto voucher number (e.g. `SAL-00012`). Renderer param `type` is sent as `voucher_type`. |
| `voucher:getLedgerBalance` | `window.api.voucher.getLedgerBalance(ledger_id, company_id, fy_id)` | `{ ledger_id, company_id, fy_id }` | `{ success, balance, rawBalance }` or not-found | Running ledger balance from opening + posted Dr/Cr; returns formatted `"<amt> Dr/Cr"` label and signed raw value. |
| `voucher:searchLedgers` | `window.api.voucher.searchLedgers(company_id, searchTerm)` | `{ company_id, searchTerm }` | `{ success, ledgers: Ledger[] }` | Active ledgers matching name/alias (case-insensitive LIKE), max 50. Ledger row shape owned by ledger module. |
| `voucher:getPendingBills` | `window.api.voucher.getPendingBills(ledger_id, company_id, fy_id)` | `{ ledger_id, company_id, fy_id }` | `{ success, pendingBills, defaultCreditPeriod, checkCreditDays }` | Pending `New Ref`/`Advance` bill references with positive aggregated balance, plus ledger credit terms. |

## Notes & warnings

- **No typo'd channels** were found in this module; all 13 channels are clean.
- **Param name remaps (preload → IPC):** `getByType` renderer arg `type` → IPC `voucher_type`; `getByLedger` renderer arg `ledgerId` → IPC `ledger_id`; `getNextNumber` renderer arg `type` → IPC `voucher_type`. The `voucher_type` form is what the service/controller read.
- **Bare scalar payloads:** `getById`, `delete`, `cancel` receive the raw `voucher_id` value as IPC arg 2 (not wrapped in an object). Documented as `{ id }` in OpenAPI for clarity only.
- **Cross-module side effects in `create`:** invokes `gst/gstTaxEngine` (computeVoucherTaxLines / saveVoucherTaxLines) for Sales/Purchase/Credit Note/Debit Note, and `eInvoice/eInvoiceService` (IRN auto-generation) for Sales invoices with party GSTIN and total ≥ 50,000. These are fire-and-forget / non-blocking and out of scope for this module's tables.
- **Money is never floating-point in Postgres** — see the DB contract; SQLite stores these as `REAL`, which the Postgres DDL maps to `NUMERIC`.
- `getById` augments each stock entry with a `batches` array and exposes single-row detail sub-records (`bank_details`, `receipt_details`, `party_details`, `dispatch_details`, `credit_note_details`, `debit_note_details`) as the first row or `null`.
