# Issue #161 — Statements of Inventory · Movement Analysis → Transfer Analysis

Last Movement Analysis sub-report. Unlike Group/Ledger, the selection master is a **voucher type**
(Stock Journal), and both the report and the drilled Item Voucher Analysis use **Goods In
(Production)** / **Goods Out (Consumption)** sections (by stock-journal source/destination leg),
not Purchases/Sales.

## 1. Entry point
- **Menu (Tally):** Statements of Inventory → Movement Analysis → **Transfer Analysis** (img-1).
- **App route:** `/reports/inventory/transfer-analysis` → `TransferAnalysis.tsx`.

## 2. Drill chain (6 screenshots)

**A — Select Voucher Type popup (img-2).** "Name of Voucher" + "List of Voucher Types" = **Stock
Journal** (Stock-Journal-class types). Shared `SelectionPopup`.

**B — Transfer Analysis report (img-3).** Title "Transfer Analysis"; right header: voucher type
(italic) / company / period. Columns: Particulars | **Goods In (Production)**(Quantity, *Eff. Rate*,
Value) | **Goods Out (Consumption)**(Quantity, *Eff. Rate*, Value). One row per item transferred.
Grand Total (img-3: `1,55,500.00` | `1,56,400.00`).

**C — Item Voucher Analysis (img-4/5/6, Cream under Stock Journal).** Title "Item Voucher Analysis";
header `Stock Item: X` + **`Under Transfer: <voucher type>`**; period right. Same 9 columns; rows in
two **leg** sections: `Goods In (Production)` (is_source = 0) and `Goods Out (Consumption)`
(is_source = 1), each with its own Total. Focused row expands the italic voucher sub-line
(`2-Mar-27 Stock Journal 2`). Footer: Enter: Alter · A/2/I.

**D — Voucher.** Enter opens the Stock Journal voucher (`/transactions/voucher/:id`).

## 3. Fix applied
The report table already existed; the **drill chain was missing** (the report row had no `onActivate`,
no vouchers level).
- **Backend** `transferAnalysis.js` — new `transferItemVouchers(company, fy, voucher_type, item_id)`:
  one row per (voucher, leg), grouped by `is_source` (0 → Goods In inward, 1 → Goods Out outward),
  with `addl_cost` + `voucher_id`; ordered Goods In then Goods Out. Wired through `reportController`
  → `report:transferItemVouchers` → `preload` (`window.api.report.transferItemVouchers`). Verified on
  a live-DB copy.
- **`ItemVoucherAnalysis.tsx`** — generalised sectioning: new `sectionMode` (`"family"` default, or
  `"leg"` = section by which leg carries the qty), `sectionLabels` (default Purchases/Sales; here
  Goods In/Out), and a `transferName` header (`Under Transfer: X`). Existing callers unchanged
  (defaults preserve #156–#160 behaviour).
- **`TransferAnalysis.tsx`** — added the vouchers drill level: report row → `transferItemVouchers`
  → `ItemVoucherAnalysis` (leg mode, Goods In/Out labels) → voucher; keyboard nav + Alter/Add/
  Duplicate/Insert footer.
- Strict B&W; `tsc -b` clean; backend syntax OK.

## 4. Verification checklist
- [ ] Menu → Transfer Analysis opens Select Voucher Type popup (Stock Journal).
- [ ] Report: Particulars | Goods In (Production) | Goods Out (Consumption) + Grand Total.
- [ ] Drill item → Item Voucher Analysis header "Under Transfer: Stock Journal", Goods In / Goods Out
      sections with per-section rows + Total.
- [ ] Focused row shows voucher sub-line; Enter opens the Stock Journal voucher.
- [ ] `tsc`/build clean.

---

**Movement Analysis submenu is now complete end-to-end** across all six sub-reports (#157 Stock Group,
#158 Stock Item, #159 Group, #160 Ledger, #161 Transfer, plus Stock Category which shares the #157
chain).
