# Issue #158 — Statements of Inventory · Movement Analysis → Stock Item Analysis

Sibling of #157. Same Movement Analysis pattern, entered per **stock item** instead of stock group,
so it skips the group/item table and opens straight into Item Movement Analysis.

## 1. Entry point
- **Menu (Tally):** Gateway → Display More Reports → Statements of Inventory → Movement Analysis →
  **Stock Item Analysis** (img-1).
- **App route:** `/reports/inventory/stock-item-analysis` → `StockItemAnalysis.tsx`
  (wired in `MovementAnalysisMenu.tsx`).

## 2. Drill chain (9 screenshots)

**A — Select Stock Item popup (img-2, img-3).** "Name of Item" typeahead + "List of Stock Items"
(alphabetical) + Create. Reuses shared `SelectionPopup`.

**B — Item Movement Analysis (img-4, img-7).** Title "Item Movement Analysis"; right header block:
item name (italic) / company / period / **"Movement Values"**. Columns: Particulars | Quantity |
*Basic Rate* | *Effective Rate* | Value. Sections `Movement Inward:` → `Suppliers:` (e.g. Cash
100 nos @ 30,000; Mouli Sundry Creditors 2 nos) + subtotal `102 nos … 30,60,000.00`;
`Movement Outward:` → `Buyers:` (Bharat Suppliers, Cash, Lella Interprise, Mouli Sundry Debtors,
Raha Traders) + subtotal `59 nos 1,26,271.19 74,50,000.00`.

**C — Item Voucher Analysis (img-5/6 inward Cash, img-8/9 outward Mouli Sundry Debtors).**
Title "Item Voucher Analysis"; header `Stock Item: X` + `Inwards/Outwards Under Ledger: <party>`;
period right. Columns: Date | Particulars | Actual Qty | Billed Qty | *Basic Rate* | Basic Value |
*Addl. Cost* | Total Value | *Eff. Rate*. Section label `Purchases`/`Sales`; one row per voucher
(img-8 shows two Sales rows for Mouli Sundry Debtors → Total 4 nos); the focused row expands an
italic voucher sub-line (`1-Apr-26 Purchase 9`, `2-Mar-27 Sales 19`); a Total row closes it.
Footer: Enter: Alter · A: Add Vch · 2: Duplicate Vch · I: Insert Vch.

**D — Voucher.** Enter on a voucher row opens it (`/transactions/voucher/:id`).

## 3. Fix applied
Reuses the components + backend already built for #157 — no new backend needed (rows already carry
`addl_cost`, `voucher_type`, party, in/out qty & value, `voucher_id`).
- **`movementAggregate.ts`** (new shared helper) — `rowFamily` (voucher-type-family classification so
  Debit/Credit-Note returns net inside the correct party group) + `aggregateParties`. #157's
  `StockGroupAnalysis` refactored to import it (removed its local copies).
- **`StockItemAnalysis.tsx`** (rewritten) — chain is now Select Item → **Item Movement Analysis**
  (`ItemMovementAnalysis`) → **Item Voucher Analysis** (`ItemVoucherAnalysis`, filtered by
  ledger + direction) → voucher. Previously it drilled the item straight to a (wrong-layout) voucher
  list, skipping the movement screen.
- Strict B&W; `tsc -b` clean.

## 4. Verification checklist
- [ ] Menu → Stock Item Analysis opens Select Stock Item popup.
- [ ] Selecting an item shows Item Movement Analysis (Suppliers/Buyers, 4 numeric columns, subtotals).
- [ ] Enter on a supplier → Item Voucher Analysis "Inwards Under Ledger" / Purchases; on a buyer →
      "Outwards Under Ledger" / Sales.
- [ ] Voucher sub-line on the focused row; correct Total; Enter opens the voucher.
- [ ] `tsc`/build clean.
