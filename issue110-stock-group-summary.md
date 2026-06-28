# Issue #110 — Inventory Books: Stock Group Summary
## Complete Implementation Reference (from 30 screenshots)

> Source: GitHub issue `darshankochar22/MVP#110` — "Inventory Books - Stock Group Summary".
> 13 images in the issue body (the report skeleton) + 17 images in the comments
> (the producer → report lifecycle). All 30 analysed one by one below.
> This file documents **structure and flow only** — not colours/skin (theme rules live in `UI.md`).

---

## 0. What "Stock Group Summary" is

A **Stock Group** is a classification bucket for stock items (e.g. "Ceiling Fan" group holds the
item "Fan"). The Stock Group Summary report lets you pick a group and see the closing stock of the
items inside it, then drill an item down to its month-by-month movement, then to the vouchers, then
to the full voucher.

It is the **Stock Item report (#107) scoped by group**: the drill chain below the group level is
identical to #107 (Stock Item Monthly Summary → Stock Item Vouchers → Voucher Alteration), reusing
the same backend (`stockItemMonthly`, `stockItemVouchers`) and the same closing-balance maths.

Two halves:
- **Producer side (masters + vouchers)** — items belong to groups; vouchers move them
  (comment imgs — purchase/sales voucher alterations). Context only.
- **Consumer side (the report)** — Gateway → Inventory Books → Stock Group Summary (body imgs).
  This is the deliverable for issue #110.

---

## 1. Entry Point & Navigation Flow

```
Gateway of Tally
  → Display More Reports
    → Inventory Books
      → Stock Group Summary               ← ENTRY POINT FOR THIS ISSUE
          ↓
      [Select Stock Group dialog — "Name of Group"]        (Level 1)
          ↓ pick group from "List of Stock Groups"
            (Primary · Ceiling Fan · Choclates · Choco · Dairy Milk · Fruits · Icecream ·
             Main · Mannu · MicroComputers · Molla · Mouli · Peter England · Rolla · Wireless Mouse · Create)
      Stock Group Summary                                  (Level 2 — items in that group)
          │   Particulars | Closing Balance (Quantity | Rate | Value) ; Grand Total
          │
          └─ Enter on an item row
                 ↓
             Stock Item Monthly Summary                    (Level 3 — per item)
                 │   Opening Balance + 12 months
                 │   Inwards (Qty|Value) · Outwards (Qty|Value) · Closing Balance (Qty|Value)
                 │   + bar chart at the bottom
                 │
                 └─ Enter on a month row
                        ↓
                    Stock Item Vouchers                    (Level 4)
                        │   Date | Particulars | Vch Type | Vch No. | Inwards | Outwards | Closing
                        │   (Opening Balance is the first row)
                        │
                        └─ Enter on a voucher row
                               ↓
                           Accounting Voucher Alteration (full voucher, read/alter)
```

The Inventory Books submenu (body_08) contains, in order:
- **SUMMARY:** Stock Item · Batch · Godowns / Excise Units · **Stock Group Summary** · Stock Category Summary
- **REGISTERS:** Stock Transfer Journal Register · Physical Stock Register
- Quit

"Stock Group Summary" is the fourth item under SUMMARY.

---

## 2. The four-layer drill chain (the core of this report)

| Layer | Screen | Rows are | Enter drills to |
|-------|--------|----------|-----------------|
| 1 | **Select Stock Group** — "Name of Group" | groups of the company | sets group, opens Stock Group Summary |
| 2 | **Stock Group Summary** | items in that group (Closing Qty/Rate/Value) | Stock Item Monthly Summary |
| 3 | **Stock Item Monthly Summary** | Opening Balance + 12 months (In/Out/Closing) | Stock Item Vouchers |
| 4 | **Stock Item Vouchers** | each voucher affecting the item (+ Opening Balance row) | Accounting Voucher Alteration |

Layers 3–4 are **identical to issue #107** (Stock Item) and reuse the same services.

---

## 3. Per-image breakdown (all 30)

### Part A — The report skeleton (issue body, 13 images)

**body_01 — Select Stock Group dialog**
"Select Stock Group" centered dialog. Field **Name of Group**; right panel **"List of Stock Groups"**
(Primary, Ceiling Fan, Choclates, Choco, Dairy Milk, Fruits, Icecream, Main, Mannu, MicroComputers,
Molla, Mouli, Peter England, Rolla, Wireless Mouse, **Create**).

**body_03 — Stock Group Summary for "Ceiling Fan"**
Header right block: `Ceiling Fan` / company / period · **Closing Balance** (Quantity | Rate | Value).
Row (item): `Fan · 20 Pc · 1,000.00 · 20,000.00`. **Grand Total 20 Pc / 20,000.00**. Right rail:
F4 Stock Group, F5 Stock Item-wise, F6 Monthly, F7 Show Profit, F8 Valuation, Basis of Values, Change View.

**body_02 / body_06 — Stock Item Monthly Summary for "Fan"**
Header `Fan` / period. Columns **Inwards (Qty|Value) · Outwards (Qty|Value) · Closing Balance (Qty|Value)**.
Rows = **Opening Balance** + April…March. April: `Inwards 50 Pc / 50,000 · Outwards 30 Pc / 60,000 ·
Closing 20 Pc / 20,000`; later months carry the 20 Pc closing. **Bar chart** at the bottom (red/blue
inward/outward bars for April — rendered grayscale in our clone). **Grand Total** row.

**body_04 / body_05 — Stock Item Vouchers for "Fan"**
Header `Stock Item: Fan`, period `1-Mar-27 to 31-Mar-27`. Columns **Date | Particulars | Vch Type |
Vch No. | Inwards (Qty|Value) | Outwards (Qty|Value) | Closing (Qty|Value)**. First row =
`1-Mar-27 · Opening Balance · Inwards 20 Pc / 20,000 · Closing 20 Pc / 20,000`. Totals row.

**body_08 — Gateway → Inventory Books → Stock Group Summary menu**
SUMMARY list with **Stock Group Summary** highlighted (fourth under SUMMARY).

*(body_07, 09–13 repeat the same four screens at different drill points — no new structure.)*

### Part B — Consumer side: top-level (Primary) all-groups view

**img_10 — Stock Group Summary when "Primary" (the root) is picked**
No specific group in the header (just company + period). Particulars = **group-level rows**
(Ceiling Fan, Choco, Fruits, Icecream, Main, MicroComputers, Peter England, Wireless Mouse) **plus
ungrouped items** (GoodDay, Kj, Mobile, Paracetamol), each Closing Qty|Rate|Value (Kj negative
`(-)8,20,000.00`). **Grand Total 10,60,390.00**. *(Selecting the root/Primary shows a per-group
breakdown; drilling a group row → that group's items. Documented as an enhancement — see §5.)*

### Part C — Producer side (comment imgs)

**img_01 / img_15 (and others) — Accounting Voucher Alteration**
Standard Sales / Purchase voucher alterations (e.g. Purchase No. 11 Mohan, Paracetamol 20 Box /
15,000; Sales No. 12 Kamal, Paracetamol 15 Box / 15,750). These are the drill-target vouchers and
the source of the inwards/outwards numbers — context for the report, not new report structure.

---

## 4. Data model — how each number is derived

**Layer 1 (Select Stock Group):** all active stock groups for the company
(`stock_groups` where `is_active=1`).

**Layer 2 (Stock Group Summary):** `stockGroupItems(company_id, fy_id, group_id)` — for each active
item whose `group_id = group`:
- **Closing Qty** = opening_quantity + Σ inwards_qty − Σ outwards_qty (godown-agnostic).
- **Closing Value** = opening_value + Σ inwards_value − Σ outwards_value.
- **Rate** = closing_value / closing_qty (0 if qty 0).
- Inwards/Outwards from `voucher_stock_entries` split by INWARD/OUTWARD voucher types, excluding
  cancelled / optional / post-dated. **Grand Total** = column sums.

**Layer 3 (Stock Item Monthly Summary):** `stockItemMonthly` — running balance seeded from the item
opening; 12 month rows of In/Out and cumulative Closing; returns `opening_qty/opening_value`.
A leading **Opening Balance** row + a **bar chart** of monthly closing qty (shared `StockBarChart`).

**Layer 4 (Stock Item Vouchers):** `stockItemVouchers` — one row per voucher touching the item within
the period, preceded by an **Opening Balance** row (`voucher_id: null`); Inwards/Outwards by voucher
type; running cumulative Closing. Totals row.

**Drill (Layer 4 → voucher):** Enter opens the full Accounting Voucher Alteration for that
`voucher_id` (`/transactions/voucher/:id`). The Opening Balance row has no voucher → not drillable.

---

## 5a. IMPLEMENTED (this change) ✅

The full chain already existed and is correct (closing balances include opening); this change brings
the monthly view to parity with the screenshots. Covered by `server/tests/stockGroupReport.test.js`.

**Report UI** (`client/src/pages/reports/inventory/StockGroupSummary.tsx`):
- Level-3 monthly now renders the shared **`StockBarChart`** (monthly closing qty) + a leading
  **Opening Balance** row (from `stockItemMonthly`'s `opening_qty/opening_value`) — matching
  body_02 / body_06 / img_17.

**Already present (verified):** Select Stock Group → Stock Group Summary → Stock Item Monthly Summary
→ Stock Item Vouchers → Voucher Alteration 4-level component (`StockGroupSummary.tsx`); backend
`stockGroupItems` (closing includes opening) + reused `stockItemMonthly` / `stockItemVouchers`
(#107); menu entry (`InventoryBooks.tsx` → `/reports/inventory/stock-group-summary`); route
(`routes.tsx`). Level-4 already renders the Opening Balance row (`voucher_id: null`).

> Not done (out of scope, low risk): the **"Primary/root → per-group breakdown"** view (img_10) and
> sub-group hierarchy. The body spec drills a specific group → items → monthly → vouchers → voucher,
> which works end-to-end. (Mirrors the same out-of-scope decision taken for the godown Primary view
> in #109.)

---

## 6. One-line summary
Stock Group Summary = **Group → Stock Group Summary (items, Closing Qty/Rate/Value) → Stock Item
Monthly Summary (Opening + 12 months + chart) → Stock Item Vouchers (running Closing) → Voucher
Alteration**. It is #107 scoped by group; the chain already existed, the fix is the **monthly bar
chart + Opening Balance row** to match the screenshots.
