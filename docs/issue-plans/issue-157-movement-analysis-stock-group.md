# Issue #157 — Statements of Inventory · Movement Analysis → Stock Group Analysis

> Re-verification of the Movement Analysis drill chain (originally #114–#119). The user reports the
> existing screens do **not** match Tally. This doc is the authoritative layout spec from the 15
> screenshots, covering the full end-to-end chain down to the voucher.

## 1. Entry point
- **Menu path (Tally):** Gateway → Display More Reports → Statements of Inventory → **Movement Analysis**.
- Movement Analysis submenu (img-1): **Stock Group Analysis**, StoCk Category Analysis, Stock Item
  Analysis, Group Analysis, Ledger Analysis, Transfer Analysis, Quit.
- This issue = **Stock Group Analysis**. The other five share the same table/drill pattern with a
  different selection master (Category, Item, Ledger group, Ledger, Godown/transfer).

## 2. Drill chain (screenshot by screenshot)

### Screen A — Select Stock Group popup (img-2, img-11)
- Title "Select Stock Group", field "Name of Group" (typeahead), list "List of Stock Groups"
  (Primary, Anita, Apple, Ceiling Fan, … Wireless Mouse) with a "Create" affordance.
- Bottom bar: Quit / Accept. (Reuse shared `SelectionPopup`.)

### Screen B — Stock Group Analysis report (img-3 = Primary/all, img-4 = Apple, img-12 = Peter England)
- **Title bar:** "Stock Group Analysis" (left), company "Moly Jain" (center).
- **Right header block:** selected group name (italic, e.g. `Apple`) / company `Moly Jain` /
  period `1-Apr-26 to 2-Mar-27`.
- **Column groups:** `Particulars` (left, spaced caps) | **Inward** (Quantity, *Eff. Rate*, Value) |
  **Outward** (Quantity, *Eff. Rate*, Value). "Eff. Rate" is italic. Numbers right-aligned; quantity
  carries its unit (`10 nos`, `97 Pc`, `140 P`). Negatives parenthesised: `(-)48 Pcs`, `(-)600.00`.
- **Rows:** one per stock item (or child group) in the selected group. For the "Primary" root the
  rows are all top-level items/groups (img-3). For a leaf group (Apple → img-4) a single item row
  `Iphone 13 Pro Max`. For Peter England (img-12): `Pant`, `Shirt`.
- **Grand Total** (bottom, left-labelled "Grand Total"): sums only the **Value** columns
  (img-3: Inward `59,16,040.00`, Outward `97,71,355.00`; img-12: Inward `16,490.00` with qty
  `10 Pc` & eff.rate `1,649.00`, Outward `9,095.00` qty `5 Pc` eff.rate `1,819.00`).
- **Right action panel:** F2 Period, F3 Company, F4 Stock Group, **F5 Stock Item-wise**, B Basis of
  Values, H Change View, J Exception Reports, L Save View, C New Column, A Alter Column,
  D Delete Column, N Auto Column.
- **Bottom bar:** Space: Select, R: Remove Line, U: Restore Line, F12: Configure.
- **Row drill (Enter/dbl-click):** → Item Movement Analysis (Screen C) for that item.

### Screen C — Item Movement Analysis (img-5, img-8, img-13)
- **Title bar:** "Item Movement Analysis".
- **Right header block:** item name (italic) / company / period / **"Movement Values"**.
- **Columns:** `Particulars` | Quantity | *Basic Rate* | *Effective Rate* | Value.
- **Body — two labelled sections:**
  - `Movement Inward:` → `Suppliers:` sub-label → one row per supplier party
    (e.g. `Mouli Sundry Creditors  10 nos  90,000.00  90,000.00  9,00,000.00`), then a **subtotal**
    row (blank rate, summed qty/value).
  - `Movement Outward:` → `Buyers:` sub-label → one row per buyer party
    (`Mohan Corp. 1 nos …`, `Mouli Sundry Debtors 2 nos …`), then a subtotal row.
- **Row drill (Enter):** on a supplier/buyer → Item Voucher Analysis (Screen D) for that
  item+ledger, direction = inward (Purchases) or outward (Sales).

### Screen D — Item Voucher Analysis (img-6/7 inward, img-9/10 outward, img-14/15)
- **Title bar:** "Item Voucher Analysis".
- **Left header:** `Stock Item: <name>` and `Inwards Under Ledger : <party>` (or
  `Outwards Under Ledger : <party>`). **Right header:** period `1-Apr-26 to 2-Mar-27`.
- **Columns:** Date | Particulars | Actual Qty | Billed Qty | *Basic Rate* | Basic Value |
  *Addl. Cost* | Total Value | *Eff. Rate*.
- **Body:** a section label `Purchases` (inward) or `Sales` (outward); then one row per voucher-party
  (`2-Mar-27  Mouli Sundry Creditors  10 nos  10 nos  90,000.00/nos  9,00,000.00  9,00,000.00  90,000.00/nos`).
  Selecting/expanding a row reveals a **voucher sub-line** in italics (`2-Mar-27  Purchase  14`,
  `2-Mar-27  Sales  22`, `2-Apr-26  Purchase  4`). A **Total** row closes the table.
  Negatives parenthesised (img-14/15: a `2-Jun-26 Vmart (-)5 Pc … (-)9,995.00` return line).
- **Bottom bar:** **Enter: Alter**, A: Add Vch, 2: Duplicate Vch, I: Insert Vch, Space: Select,
  R: Remove Line, U: Restore Line, F12: Configure.
- **Row drill (Enter):** on a voucher row → open that voucher (our `VoucherView`
  `/transactions/voucher/:id`, alter mode). **This is the end of the chain — voucher must open.**

## 3. Data / backend notes
- Inward = purchase-family (Purchase, Debit Note/returns net) per shared `services/stockMovement.js`
  classification; Outward = sales-family. **Never** value outward at sale revenue for closing — but
  here Inward/Outward *Value* columns ARE the transacted amounts (purchase cost in, sale value out),
  matching Tally's Movement Analysis (this report shows movement value, not closing valuation).
- **Eff. Rate** = Value ÷ Quantity for the row (effective per-unit incl. additional cost).
- **Basic Rate** vs **Eff. Rate**: Basic = line rate; Eff. = (Basic Value + Addl. Cost) ÷ Qty.
- Item Voucher Analysis rows MUST carry `voucher_id` so Enter can navigate to the voucher.
- Party classification: Suppliers = ledgers under Sundry Creditors on inward vouchers; Buyers =
  Sundry Debtors on outward vouchers (fall back to voucher `party_name`).

## 4. Status / gaps

**Audit of prior implementation (what was wrong):**
- The drill chain **skipped the whole Item Movement Analysis (Suppliers/Buyers) screen** — items table
  drilled straight to a voucher list.
- The voucher-level screen (`ItemVoucherAnalysis.tsx`) rendered a generic Stock-Item-Vouchers register
  (Vch Type / Vch No. / Closing) instead of Tally's 9-column Item Voucher Analysis.
- No ledger header, no Purchases/Sales section label, no voucher sub-line, wrong Total.

**Fixed (Stock Group Analysis only, per agreed scope):**
- **Backend** `stockSummaryReportService.js` — voucher register rows now carry `addl_cost`
  (Addl. Cost), threaded from `voucher_stock_entries.additional_amount`. Additive; verified against a
  copy of the live DB (rows expose `addl_cost` + `voucher_type` + party + in/out qty/value + `voucher_id`).
- **`ItemMovementAnalysis.tsx`** (new shared component) — Movement Inward/Suppliers + Movement
  Outward/Buyers, columns Particulars | Quantity | Basic Rate | Effective Rate | Value, per-section
  subtotals, keyboard-driven selection.
- **`ItemVoucherAnalysis.tsx`** (rebuilt) — 9-column Tally layout (Date | Particulars | Actual Qty |
  Billed Qty | Basic Rate | Basic Value | Addl. Cost | Total Value | Eff. Rate), "Inwards/Outwards
  Under Ledger" header, Purchases/Sales section, italic voucher sub-line on the focused row, Total row,
  Enter/Add/Duplicate/Insert footer. Back-compatible props so sibling reports still build.
- **`StockGroupAnalysis.tsx`** — chain is now Select → (Primary) Groups → Items → **Item Movement
  Analysis** → **Item Voucher Analysis** → voucher. Returns net inside the correct party group via
  voucher-type family (Debit Note → supplier's Purchases as negative; Credit Note → buyer's Sales).
- Strict B&W throughout (zinc grays only). `tsc -b` clean.

**Known limitation:** the other 5 sub-reports (Category/Item/Group/Ledger/Transfer) were intentionally
left on their existing (simpler) chain per scope; they benefit from the rebuilt `ItemVoucherAnalysis`
layout but do not yet route through the Item Movement Analysis step.

## 5. Verification checklist
- [ ] Menu Movement Analysis → Stock Group Analysis opens Select Stock Group popup.
- [ ] Report shows Particulars | Inward(Qty, Eff.Rate, Value) | Outward(Qty, Eff.Rate, Value) + Grand Total (values only).
- [ ] Strict B&W — no blue/yellow.
- [ ] Row → Item Movement Analysis (Suppliers/Buyers, Movement Values columns, subtotals).
- [ ] Party row → Item Voucher Analysis (Purchases/Sales, voucher sub-lines, Total, correct 9 columns).
- [ ] Enter on a voucher row opens the real voucher.
- [ ] Same chain works for the other 5 sub-reports (Category/Item/Group/Ledger/Transfer) via their master.
- [ ] `tsc`/build clean.
