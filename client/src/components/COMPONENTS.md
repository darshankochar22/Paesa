# Shared Component Catalog — single source of truth

The common-component map for the whole frontend. Built from a full scan of
`pages/master/**`, `pages/transactions/**`, `pages/reports/**`. **Reuse what's
here before writing anything new.** Build new components only where this file
marks 🔨.

**Status legend**
- ✅ **exists — reuse as-is** (already widely used; do not duplicate)
- ⭐ **exists locally — promote** (good component living in a feature folder; lift to `@/components/ui`)
- 🧩 **exists — consolidate** (duplicate/legacy pair; merge into one)
- 🔨 **build** (no shared version yet)
- ✔️ **done this session** (already created under `@/components/ui`)

All components: **sharp corners, zinc grayscale only (no hue), mono for tabular
data**. Style tokens live in [`ui/tokens.ts`](ui/tokens.ts); formatters in
[`@/lib/format`](../lib/format.ts). Never copy-paste these per screen.

---

## 1. Layout & shell

| Component | Status | Location | Used by / replaces |
|---|---|---|---|
| `PageTitleBar` | ✅ | `ui/PageTitleBar.tsx` | ~60 master/txn pages — dark zinc-900 title bar |
| `RightActionPanel` | ✅ | `ui/RightActionPanel.tsx` | ~55 masters — Tally action sidebar (Accept/Quit/…) |
| `MasterFormFooter` | ✅ | `ui/MasterFormFooter.tsx` | master Create/Alter footers |
| `FullScreenPanel` | ✔️ | `ui/FullScreenPanel.tsx` | **the** full-screen report/voucher shell; supersedes hand-rolled `h-screen` shells in StockSummary/Godown/… and `tally-ui/TallyReportLayout` |
| `ReportHeader` | ✔️ | `ui/ReportHeader.tsx` | title + company + period + close; split out of `TallyReportLayout` |
| `FilterBar` | ✔️ | `ui/FilterBar.tsx` | period/filter/action strip above any register |
| `PageToolbar` | ✔️ | `ui/PageToolbar.tsx` | titled card toolbar (shim left at `blocks/PageToolbar`) |
| `TallyReportLayout` | 🧩 | `tally-ui/TallyReportLayout.tsx` | 12 importers + `ReportRunner`; keep, later re-express over `FullScreenPanel` |
| `ReportRightPanel` | ✅ | `reports/ReportRightPanel.tsx` | report action sidebar (coupled to ReportRunner) |
| `PageFooterBar` | ⭐ | `transactions/ui/PageFooterBar.tsx` | list-page footer (count + back) → promote to `ui/ListFooterBar` |

## 2. Tables & registers

| Component | Status | Location | Notes |
|---|---|---|---|
| `DataTable` | ✅ ✔️ | `ui/DataTable.tsx` | extended: `variant="list"` (zebra masters) + `variant="report"` (mono, keyboard nav, totals via `row.isTotal`, group rows, expandable `subItems`). **The target for the 27 hand-rolled report `<table>`s.** |
| `DataTableCard` | ✔️ | `ui/DataTableCard.tsx` | card-wrapped sticky-header table (shim at `blocks/DataTableCard`) |
| `ReportTable` | 🧩 | `reports/ReportTable.tsx` | live native-table used by `ReportRunner`; **color leaks** (green `#2e7d32`, yellow `#ffcc00`). Re-theme to tokens now; fold into `DataTable variant="report"` when `ReportRunner` migrates (last). |
| `TwoColumnReport` | ✔️ | `ui/TwoColumnReport.tsx` | Balance Sheet / P&L L-R panels (`BalanceSheetLayout`, `ProfitLossLayout` duplicate this) |
| `InventoryParticularsTable` | ⭐ | `transactions/components/InventoryParticularsTable.tsx` | item/qty/rate grid, 8+ vouchers — keep local (voucher-specific) |
| `VoucherDoubleEntryTable` / `ParticularsTable` | 🧩 | `transactions/components/` | near-duplicate Dr/Cr grids → keep one |
| `TableHeader` / `RowDeleteButton` | ✔️ | `ui/TableHeader.tsx`, `ui/RowDeleteButton.tsx` | the repeated 12-col grid header + hover ✕ delete (≈15 + 10 copies) |

## 3. Form primitives

| Component | Status | Location | Notes |
|---|---|---|---|
| `FormRow` | ✅ | `ui/FormRow.tsx` | ~50 uses (label : field). **Consolidate** the inline `Row` in `cost-centre/`, `group/` into this. |
| `Button` | ✔️ | `ui/Button.tsx` | local, sharp; variants primary/secondary/ghost/danger; replaces shadcn button |
| `Input` | ✔️ | `ui/Input.tsx` | local; `variant="box"` (forms) / `"underline"` (inline voucher cells) |
| `Select` | ✔️ | `ui/Select.tsx` | local native select; takes `options` or children |
| `Checkbox` | ✔️ | `ui/Checkbox.tsx` | local sharp checkbox |
| `SearchInput` | ✅ | `ui/SearchInput.tsx` | COA/list search box |
| `LedgerField` / `AccountSection` | 🧩 ⭐ | `transactions/components/` | label+input+balance line; **retire `FieldRow`**, standardize on `AccountSection`; promotable |

## 4. Overlays & popups

| Component | Status | Location | Notes |
|---|---|---|---|
| `Modal` | ✔️ | `ui/Modal.tsx` | local dialog (backdrop + Esc). Standardize the 4 divergent sub-form modals (Bank/GST/Interest) onto this. |
| `ConfirmModal` | ✔️ | `ui/ConfirmModal.tsx` | the "Accept? Y/N" prompt repeated in ~70% of Create/Alter |
| allocation popups | ✅ | `transactions/components/popups/*` | bill-wise, cost-centre, bank, denomination — keep (specialized) |
| `ReportCommandPalette` / `ReportContextDialog` / `SaveViewDialog` / `CompareColumnDialog` | ✅ | `reports/` | report modals — keep |
| `LedgerPanel` | 🧩 ⭐ | `transactions/components/LedgerPanel.tsx` | modern keyboard ledger picker; **replaces** legacy `LedgerListPanel` |

## 5. Feedback & status

| Component | Status | Location | Notes |
|---|---|---|---|
| `AlertBanner` | ✅ | `ui/AlertBanner.tsx` | **use this** for the inline red/green error/success banners hand-written across ~95% of masters (currently raw `bg-red-50`/`bg-green-50`) |
| `StatusBadge` | ✅ | `ui/StatusBadge.tsx` | PREDEFINED/DEFAULT status chips |
| `Badge` | ✔️ | `ui/Badge.tsx` | generic chip (solid/outline/muted) — gray only |
| `VoucherTypeBadge` | ⭐ | `transactions/ui/VoucherTypeBadge.tsx` | promotable to `Badge` usage |
| `BalanceIndicator` | ⭐ | `transactions/components/BalanceIndicator.tsx` | Dr/Cr balanced/diff indicator — keep local |
| `EmptyState` | ✔️ | `ui/EmptyState.tsx` | empty/loading placeholder (shim at `blocks/EmptyState`) |
| `StatCard` / `StatGrid` | ✔️ | `ui/StatCard.tsx`, `ui/StatGrid.tsx` | dense label:value tiles (shims at `blocks/`) |

## 6. Shared hooks (build)

| Hook | Status | Replaces |
|---|---|---|
| `useMasterShortcuts` | ✅ | `hooks/useMasterShortcuts.ts` — Esc/Alt+A/Alt+C/Alt+D already centralized; **use this**, don't hand-roll keydown |
| `useFormField(initial)` | ✔️ | `hooks/useFormField.ts` — the `setField = key => e => setForm(...)` pattern in ~50 masters |
| `useMasterForm` | 🔨 | form + validation + submit wrapper for the Create/Alter triad (compose `useFormField` + `useMasterShortcuts` + `validators`) |
| voucher hooks | ✅ | `transactions/hooks/*` (useVoucherForm etc.) — keep |

## 7. lib & constants (keep data/arrays out of components)

| File | Status | Holds |
|---|---|---|
| `lib/format.ts` | ✔️ | `fmt`, `fmtQty`, `fmtAbs`, `fmtINR`, `currency`, `fmtDate` — **kills ~80 inline redefs** across reports/vouchers |
| `ui/tokens.ts` | ✔️ | className tokens for the whole look (table header/row/totals/focus, panel header, type scale) |
| `lib/validators.ts` | ✔️ | `required`, `decimal`, `maxLen`, `pan`, `gstin`, `email`, `validate()` (≈100 inline checks) |
| `constants/masterOptions.ts` | ✔️ | `YES_NO`, `NATURES`, `ALLOC_METHODS`, `VALUATION_METHODS`, `DR_CR`, `toOptions()` |
| `constants/states.ts` | ✅ | Indian states |
| feature `constants.ts` | 🔨 | per-screen column defs / option arrays colocated next to the page |

## 8. Strict-gray cleanup (token migration targets)

Replace with `ui/tokens.ts` values — no hue anywhere:

| Leak | Count | → token |
|---|---|---|
| `bg-[#ffcc00]` focus highlight | ~45 files | `TABLE_ROW_FOCUSED` (`bg-zinc-200`) |
| `bg-[#e5eff5]` panel/header bg | ~144 files | `PANEL_HEADER` (`bg-zinc-100`) |
| green `#2e7d32` / `#1b5e20` (ReportTable, bottom bar) | few | `bg-zinc-900` / borders `zinc-300` |
| `bg-yellow-50` (AccountSection) | 1 | `bg-zinc-100` |
| `text-red-*` (errors/diff), `text-teal-600`/`text-blue-600` (bill/cost badges) | ~64 | `text-zinc-*` weight/size (no hue) |
| `--destructive` red in `index.css` | 1 | neutral oklch gray |

---

## Build order (next)

1. **constants/hooks/validators** — `constants/masterOptions.ts`, `lib/validators.ts`, `useKeyboardShortcuts`, `useFormField`, `ConfirmModal`. (unblocks master de-dup)
2. **Consolidate dup pairs** — `FieldRow`→`AccountSection`, `LedgerListPanel`→`LedgerPanel`, inline `Row`→`FormRow`.
3. **Report tables** — migrate hand-rolled `<table>`s → `DataTable variant="report"`; re-theme `ReportTable`; build `TwoColumnReport`.
4. **Theme sweep** — apply section 8 token migration; flip `index.css --destructive`.
5. **Per-area screen sweep** — masters → transactions → reports, composing only from this catalog.
