# Issue #156 — Statements of Inventory · Stock Query

## 1. Title & entry point
- **Feature:** Stock Query (single-item snapshot report).
- **Menu path (Tally):** Gateway of Tally → Display More Reports → **Statements of Inventory** → STOCK → **STock Query**.
- **App route:** `/reports/statements-of-inventory/stock-query` → renders `StockQuery.tsx`
  (menu wired in `client/src/pages/menu/reports/StatementsOfInventory.tsx`).
- Same component is also served at `/reports/inventory/stock-query`.

## 2. TallyPrime reference (9 screenshots, flow order)

**Screen A — Statements of Inventory menu (img-1).**
STOCK section: **STock Query**, Movement Analysis, Ageing Analysis, Job Work Analysis, Reorder
Status, COst Estimation, Item Cost Analysis. STOCK OUTSTANDINGS: SaLes/Purchase Order
Outstandings, Sale/PUrchase Bills Pending.

**Screen B — Select Stock Item popup (img-2, img-4).**
- Field "Name of Item" (typeahead).
- List box "List of Stock Items" (alphabetical), with a "Create" affordance.
- Bottom bar: "Quit" / "Accept".

**Screen C — Stock Query report (img-3 empty, img-5 populated for "Computers").**
Two-column header block:
- **Left:** Name · Group · Closing Balance (qty) · Cost price (per unit) · Costing method · Standard cost.
- **Right:** Part No. · Category · Closing value · Standard selling price · Market valuation method.
- Example (Computers): Group `MicroComputers`, Closing Balance `45 nos`, Cost price `30,000.00/nos`,
  Costing method `Avg. Cost`, Standard cost `30,000.00/nos`; Category `Not Applicable`,
  Closing value `13,50,000.00`, Standard selling price `50,000.00/nos`, Market valuation `Avg. Price`.

Four quadrants below the header:
- **Purchases (top-left).** Summary line `Last purchased on : <date>  <party>  <qty> @ <rate>/unit`.
  Columns: Date | Party Name | Quantity | Rate | Disc % | Amount. Last 10, newest first.
- **Sales (top-right).** Summary line `Last sold on : <date>  <party>  <qty> @ <rate>/unit`.
  Same columns. Last 10, newest first.
- **Godown / Batch Details (bottom-left).** Columns: Godown | Batch | Quantity. A **Total** row sums
  quantity (img-5: `Main Location · Primary Batch · 45 nos`, Total `45 nos`).
- **Items of Same Category (bottom-right).** Columns: Item Name | Quantity | Cost | Sale Price.
  Empty when category = Not Applicable.

**Screen D — Voucher drill (img-6, img-7, img-9).**
- `Enter` (or double-click) on a Purchases **or** Sales row opens that voucher (Voucher Display /
  our `VoucherView` at `/transactions/voucher/:id`). img-9 shows the 1-Apr-26 Cash purchase voucher
  (No. 9), img-6/7 the 2-Mar-27 Mouli Sundry Creditors purchase (No. 13).

**Right action panel (reference only, not all required):** F2 Period, F3 Company, F4 Stock Item,
F7 Show Reorders, B Basis of Values, H Change View, J Exception Reports, L Save View.
**Bottom bar:** Enter: Display Vch · Space: Select · R: Remove Line · U: Restore Line · F12: Configure.

## 3. What was wrong (the mess this issue fixes)
1. **Two divergent Stock Query frontends.** The routed one (`StockQuery.tsx`) rendered a *card view*
   that did **not** match Tally: header was a single vertical "Item Properties" list (Stock
   Group/Category/Base Unit/Closing Qty/Closing Value/Last Sale Rate) instead of the two-column
   Name/Group/Closing Balance/Cost price/… | Part No./Category/Closing value/… block.
2. **A second component** `components/reports/StockQueryLayout.tsx` had the correct four-quadrant
   grid but was **dead code** — reachable only via `ReportRunner`'s `stock-query` branch, which no
   registered route hits. It also violated the strict B&W theme (`bg-[#e5eff5]` blue,
   `bg-yellow-200` / `#ffcc00` highlights, `bg-zinc-800` picker).
3. **Category table headers** read "Closing Qty / Closing Value / Last Sale Rate" instead of the
   Tally "Quantity / Cost / Sale Price".
4. **No Godown Total row.** No per-row voucher drill wording; no derived header fields
   (cost price, costing method, standard cost, standard selling price, valuation method).

## 4. Fix applied
- **Backend** `server/report/stockQueryService.js`: `item` now also returns derived header fields —
  `cost_rate` (weighted-avg cost/unit), `costing_method` (`Avg. Cost`), `standard_cost`,
  `part_no`, `std_selling_price` (last sale rate), `market_valuation_method` (`Avg. Price`).
  Godown total is summed on the client from `godownDetails`.
- **Frontend** `client/src/pages/reports/inventory/StockQuery.tsx`: rewritten to the spec-faithful
  four-quadrant grid in **strict black/white/gray** (matches sibling inventory reports' white title
  bar, shared `SelectionPopup` for item pick). Two-column header, Last-on summary lines, Disc %,
  Godown/Batch with Total row, Items of Same Category (Quantity/Cost/Sale Price), and
  `Enter`/double-click drill to the voucher for any purchase/sales row. Keyboard ↑↓ cursor spans
  purchases then sales.
- **Cleanup:** deleted dead `components/reports/StockQueryLayout.tsx`; removed its import and the
  `stock-query` branch in `ReportRunner.tsx`.

## 5. Verification checklist
- [ ] Menu Statements of Inventory → Stock Query opens the item picker (List of Stock Items).
- [ ] Selecting an item shows the two-column header + four quadrants with real data.
- [ ] Strict B&W — no blue/yellow anywhere.
- [ ] Enter / double-click on a Purchases or Sales row opens the correct voucher.
- [ ] Godown/Batch shows a Total row; Items of Same Category headed Quantity/Cost/Sale Price.
- [ ] `tsc`/build clean; no remaining references to `StockQueryLayout`.
