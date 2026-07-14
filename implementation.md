# F11 Company Features — Implementation Handoff

Status as of this session. Everything below is on `main` (pushed). Use this file to
resume in a new session instead of re-deriving context.

## Goal

Make F11 (Company Features) Yes/No toggles actually control the whole app, TallyPrime-style:
turning a feature off hides its UI/menus/voucher-fields everywhere (non-destructive —
data stays, reappears when turned back on).

## Core architecture (already built — reuse, don't rebuild)

- `client/src/lib/companyFeatures.ts` — `isFeatureEnabled(features, key)` (true unless the
  flag is stored `0`; null/unloaded = enabled to avoid flicker) + `FEATURE_DEPENDENCIES`
  (parent→child map; a child can't read enabled while a parent is off).
- `client/src/lib/taxFeatures.ts` — `isTaxFeatureEnabled(features, tax)` + `GATED_SECTIONS`
  (gst/vat/tds/tcs/excise/serviceTax) + `filterStatutorySectionsByFeature`. Delegates to companyFeatures.
- `features` comes from `useCompany()` (`client/src/context/CompanyContext`), reloaded on the
  `features-reload` window event that the F11 popup dispatches on save/reset.
- F11 popup: `client/src/components/CompanyFeatures.tsx` — enforces dependency tiers
  (parent off cascades children off + greys/locks their toggles).
- Server master menu: `server/master/masterService.js` `getMenu()` gates master items by flag
  (drives BOTH `pages/menu/Create.tsx` and `Alter.tsx`).
- Voucher-type availability: `client/src/constants/voucherTypes.ts` — `VOUCHER_TYPE_FEATURE`
  map + `isVoucherTypeEnabled(features, type)`. Consumed by `OtherVouchersPopup.tsx` and
  `Vouchers.tsx` `switchVoucher`.

Convention when adding a gate: import `isFeatureEnabled` from `@/lib/companyFeatures`, read
`features` from `useCompany()`, wrap the UI in `{isFeatureEnabled(features,'flag') && (...)}`.
Never delete data on toggle-off — hide only.

## DONE (committed to main)

- Foundation + dependency tiers + F11 cascade/lock.
- Accounting (bill-wise, cost centres, interest): ledger fields + ALL THREE voucher allocation
  paths (`useAmountConfirmFlow` Enter path, `useVoucherAcceptFlow` Accept path,
  `useAllocationSaveHandlers` popup-chain).
- GST: ledger GST fields + duty type + `GATED_SECTIONS` + left-panel GST block
  (`LedgerStatutoryLeftPanel`) + per-tax statutory report heads (`StatutoryReports.tsx`).
- Inventory: batches/expiry in allocation flow; stock-item master batch/expiry/cost-tracking
  fields; inventory/price-level masters gated (server menu).
- Payroll: masters section + payroll-statutory master + payroll report head.
- Menu backbone: server `getMenu` + `Gateway.tsx` + Display-More sections.
- Voucher-type availability gating (inventory/job-work/payroll types hide when feature off).
- Added missing "Cost centres are applicable" ledger field (`allow_cost_centres`) in
  Create + Alter (was stored/saved with no UI).
- `StockTransferVoucherBody` now respects `use_separate_actual_billed_qty` +
  `enable_multiple_price_levels` (PO/SO/Receipt/Delivery/Material In-Out).
- **Accounting Invoice mode (Ctrl+H)** for Sales/Purchase/Credit Note/Debit Note; forced when
  `maintain_inventory` off. Files: `AccountingInvoiceBody.tsx`, `SingleEntryParticulars.tsx`,
  `useVoucherMeta.ts` (`invoiceMode`), `useVoucherForm.ts` (`isAccountingInvoice`),
  `useVoucherRowsNew.ts` (totals), `voucherSubmit.ts` (posting), `hydrateVoucherForm.ts`,
  `Vouchers.tsx` (Ctrl+H). Test: `client/src/tests/accountingInvoiceSubmit.test.ts`.
  CONVENTION (critical): only **Purchase** inverts party→Cr; **Sales/Credit Note/Debit Note
  all keep party Dr** (matches item-mode + GST engine). Don't make Debit Note purchase-like.
- **Job Work allocation popup batch/expiry gating** — `JobWorkItemAllocationPopup.tsx` now reads
  `features` via `useCompany()` and gates `isBatch` on `enable_batches`, `trackExpiry` on
  `maintain_expiry_date_for_batches` (trackMfg follows isBatch). tsc clean, 256 tests pass.
- **Theme tidy-up** — `StockTransferVoucherBody.tsx` + `PayrollVoucher.tsx` converted `zinc-*` →
  neutral `gray-*`; the one `hover:text-red-500` delete button → `hover:text-black`. Strict B/W.
- **Discount column independence** — `StockTransferVoucherBody.tsx` now gates the Disc % header +
  cell on `use_discount_column_in_invoices` (`showDisc`), decoupled from `use_separate_actual_billed_qty`;
  Rate-field Enter skips straight to next row when Disc % is hidden.
- **`mark_modified_vouchers` (#2)** — new `is_modified` column on `vouchers` (sqlite+pg schema +
  idempotent ALTER in `voucher.js` init); `voucherUpdate.js` sets `isModified:1` on every edit
  (not on cancel). New `modified-voucher-register` report def + registry key; new
  `ModifiedVouchers.tsx` exception screen + route `/reports/exception/modified-vouchers`;
  `ExceptionReports.tsx` shows the "Modified Vouchers" register item only when F11
  `mark_modified_vouchers` is on (hide-only, non-destructive). Test:
  `server/tests/modifiedVoucherRegister.test.js`. NOT built: Tally's reset/accept-marks clear-flow
  or a Day Book badge (report-only, like Marked Vouchers).
- **`enable_multiple_addresses` (#3)** — new `ledger_addresses` table (sqlite+pg schema + idempotent
  CREATE in `ledger.js` init) holding extra named party addresses; the ledger's own address cols
  stay the primary. `ledgerService` create/update persist `data.addresses[]` (delete-then-insert,
  like bank_details) via shared `toAddressValues`; `getById` returns `addresses[]`. `useLedgerForm`
  hydrates/resets/sends `addresses`; new `MultiAddressPopup.tsx` (strict B/W) opened from a
  F11-gated "Set/Alter multiple addresses" row in `LedgerMailingPanel` (Create + Alter). Types:
  `LedgerAddress`. Test: `server/tests/ledgerAddresses.test.js`. NOT built: voucher-side address
  picker (master-side entry only, this pass).
- **`integrate_accounts_with_inventory` (#4)** — server-only, Tally-correct BOTH-sides gating via
  new `server/report/utils/companyFeatureFlags.js` `isFeatureEnabled(company_id, col)`. ON (default):
  Balance Sheet adds inventory closing stock as a "Closing Stock" Current Asset (group_id -3,
  `isClosingStock`) AND lifts net profit by the same amount (Dr Stock / Cr Trading → stays balanced,
  BS profit matches P&L); P&L trading account keeps integrating opening/closing stock. OFF: both
  drop inventory stock (accounts/inventory separate). Renders via the existing synthetic-asset path
  (like the P&L A/c / Difference lines) — no client change. Test:
  `server/tests/integrateAccountsInventory.test.js` (asserts balanced in both states). NOT changed:
  opening-stock-as-BS-asset (app stores no stock opening balance; out of scope).

## PENDING (pick up here)

### 5. `enable_job_costing` — DEAD FLAG (zero consumers anywhere). Feature not built.

### 6. `enable_cost_tracking` / `enable_payroll_statutory` in vouchers — no distinct voucher UI to gate

(cost-tracking is only on the Stock Item master; payroll statutory has no separate rows in the
Payroll voucher).

### 9. Deferred bigger build: accounting-invoice mode is DONE for Sales/Purchase/CN/DN. No further

work needed unless extending to other trade voucher types.

## Verify commands

```
cd /Users/darshan/Startup/client
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -v LedgerListPanel.test   # must be clean
npx vitest run   # UnitCreate.test.tsx is pre-existing flaky under parallel load; passes isolated
```

Cannot runtime-test the Electron app from the agent; rely on tsc + vitest + manual smoke test.

## Notes / gotchas

- `LedgerListPanel.test.tsx` has a pre-existing unused-import tsc error — ignore it (filter out).
- Commit straight to `main` on "push" (no feature branch). Husky/lint-staged reformats on commit.
- GST default is OFF (0), so gating GST hides its UI until enabled in F11 — intended Tally behavior.
