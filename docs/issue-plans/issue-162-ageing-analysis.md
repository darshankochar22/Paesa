# Issue #162 — Statements of Inventory · Ageing Analysis

Re-verification of Stock Ageing Analysis (originally #120). Report + full drill chain into the shared
Stock Item Monthly Summary → Vouchers → Voucher chain.

## 1. Entry point
- **Menu (Tally):** Statements of Inventory → STOCK → **Ageing Analysis** (img-1).
- **App route:** `/reports/statements-of-inventory/ageing-analysis` → `AgeingAnalysis.tsx`.

## 2. Drill chain (7 screenshots)

**A — Select Stock Group popup (img-2).** "Name of Group" + "List of Stock Groups" (Primary + all
stock groups). Shared `SelectionPopup`.

**B — Stock Ageing Analysis report (img-3, img-4).** Title "Stock Ageing Analysis"; header
`Items Under: <group>` / `as at 2-Mar-27`; sub `All Batches (Aged by Date of Purchase)` /
`Valued based on actual purchase`. Columns:
`Particulars | Expiry Date | Total **Quantity** | (< 45 days)(Qty, Value) | 45 to 90 days(Qty, Value)
| 90 to 180 days(Qty, Value) | (> 180 days)(Qty, Value) | Negative Stock **Quantity**`.
- **Total** and **Negative Stock** are **Quantity-only** columns (no Value sub-column).
- On-hand stock aged FIFO by purchase date; oversold nets into Negative (unvalued).
- **Grand Total** sums only the four band **Value** columns (quantities span mixed units → blank).

**C — Stock Item Monthly Summary (img-5).** Drill an item → 12-month Inwards/Outwards/Closing
summary + bar chart + Grand Total (shared `StockItemMonthlyTable`; never skip monthly).

**D — Stock Item Vouchers (img-6).** Drill a month → per-voucher register (Date | Particulars |
Vch Type | Vch No. | Inwards | Outwards | Closing).

**E — Voucher (img-7).** Enter on a voucher row → Accounting Voucher Alteration
(`/transactions/voucher/:id`).

## 3. Status / fix
- **Drill chain** (Select Group → Ageing → Monthly Summary → Vouchers → Voucher) was **already
  fully wired** in `AgeingAnalysis.tsx` and matches the screenshots — no change needed.
- **Backend** `ageingAnalysis.js` — correct: bands default `[45, 90, 180]`, returns `as_at`,
  FIFO ageing, Negative unvalued. Verified on a live-DB copy (bands `[45,90,180]`, 4 buckets + neg).
- **Fix — `StockAgeingTable.tsx`:** the Total and Negative Stock columns rendered a Value sub-column
  they shouldn't. Made both **Quantity-only** (via a `qtyOnly` group flag driving header/body/footer),
  and the Grand Total now blanks quantity cells and sums only band Values — matching Tally.
- Strict B&W; `tsc -b` clean.

## 4. Verification checklist
- [ ] Menu → Ageing Analysis opens Select Stock Group popup.
- [ ] Report columns: Particulars | Expiry Date | Total (Qty only) | 4 bands (Qty+Value) | Negative (Qty only).
- [ ] Grand Total sums band Values only.
- [ ] Drill item → Stock Item Monthly Summary → month → Stock Item Vouchers → voucher opens.
- [ ] `tsc`/build clean.
