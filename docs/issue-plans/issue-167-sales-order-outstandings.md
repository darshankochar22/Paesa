# Issue #167 — Statements of Inventory · Sales Order Outstandings → Stock Group

Analysed all 6 screenshots (s167_1..6). The report was already implemented by the shared
`OrderOutstanding.tsx` (mode="sales", drives #167–#177); this issue verified it end-to-end and
aligned the report header to Tally.

## 1. Entry point
- **Menu (Tally):** Statements of Inventory → STOCK OUTSTANDINGS → **Sales Order Outstandings** (img-1).
- **App route:** `/reports/statements-of-inventory/sales-order-outstandings` → `<OrderOutstanding mode="sales" />`.

## 2. Drill chain (6 screenshots)
- **img-1** — menu, "Sales Order Outstandings" highlighted.
- **img-2** — dimension sub-menu: **Stock Group** / Stock Category / Stock Item / Group / Ledger /
  All Orders / Quit. (#167 is the Stock Group path.)
- **img-3 / img-5** — **Select Stock Group** popup (List of Stock Groups: Primary + groups). Shared
  `SelectionPopup`. img-5 picks "Peter England".
- **img-4** (Primary = All Stock Groups) / **img-6** (Peter England) — **Sales Order Stock Group
  Outstandings** report:
  - Title bar `Sales Order Stock Group Outstandings`.
  - Right-aligned header block: `<scope>` (All Stock Groups / group name) · `Moly Jain` (company) ·
    `1-Apr-26 to 2-Mar-27` · `Sales Orders Outstanding` · `Pending Orders`.
  - Columns: **Particulars | Quantity | Rate | Value** (under Pending Orders); **Grand Total** row.
  - Both demo screenshots are empty (the sample company has no pending Sales Orders).

## 3. State / fix applied
- **Backend** `advancedInventoryReportService.orderOutstanding(company, fy, 'sales', dimension, selection_id)`
  — already correct and wired (`report:orderOutstanding` → `reportController` → `preload`). For
  `stock-group` it recursively includes the chosen group and all descendant groups; Primary → null →
  All Stock Groups. Balance qty = Sales Order qty − matched Delivery Note qty; Value = balance × rate;
  zero-balance lines dropped. Drill row → order lines (outstanding / over-delivered sections) → voucher.
- **Frontend** `OrderOutstanding.tsx` — refined the shared report `InfoBand` to Tally's right-aligned
  stacked block (scope · company · period · "<Sales> Orders Outstanding" · "Pending Orders") with
  "Particulars" at the far left; removed the now-redundant "Pending Orders" span row from the table
  head (columns are Quantity | Rate | Value). Applies to both sales and purchase (mode-aware).
- `tsc -b --noEmit` clean.

## 4. Verification checklist
- [ ] Menu → Sales Order Outstandings shows the 6-item dimension sub-menu.
- [ ] Stock Group → Select Stock Group popup → "Sales Order Stock Group Outstandings" report.
- [ ] Header block shows scope/company/period/"Sales Orders Outstanding"/"Pending Orders"; columns
      Particulars | Quantity | Rate | Value; Grand Total row.
- [ ] With pending SOs: item rows populate; Enter drills to order lines; Enter opens the order voucher.
