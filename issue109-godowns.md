# Issue #109 — Inventory Books: Godowns / Excise Units
## Complete Implementation Reference (from 36 screenshots)

> Source: GitHub issue `darshankochar22/MVP#109` — "Inventory Books - Godowns and Excise details".
> 7 images in the issue body (the report skeleton) + 29 images in the comments
> (the producer → report lifecycle). All 36 analysed one by one below.
> This file documents **structure and flow only** — not colours/skin (theme rules live in `UI.md`).

---

## 0. What "Godowns / Excise Units" is

A **Godown** (warehouse / storage location, a.k.a. *Excise Unit* when flagged for excise) is a
physical place where stock is held. One stock item's balance is **split across godowns** — both
its **opening balance** (allocated per godown at item creation) and every inward/outward voucher
line (each stock line is pinned to a godown). So stock can be reported **per godown**, not just
per item.

The Godowns / Excise Units report is the *viewer* for that data: pick a godown → see the items it
holds → drill an item to its 12-month movement → drill a month to the vouchers → drill a voucher
to the full Accounting Voucher Alteration.

"**Excise Units**" = the same godowns, when a godown is flagged as an *Excise Tax unit* in its
master (img s29). The report screen is identical; the flag only lives on the godown master.

Two halves to understand:
- **Producer side (masters + vouchers)** — how per-godown stock comes into existence
  (comment imgs 01–09, s29). Opening balances are allocated to godowns via the
  "Allocations of: <item> for: <qty>" popup (Godown | Quantity | Rate | per | Amount); voucher
  stock lines carry a `godown_id`.
- **Consumer side (the report itself)** — Gateway → Inventory Books → Godowns / Excise Units
  (body imgs + s10–s28). This is the deliverable for issue #109.

---

## 1. Entry Point & Navigation Flow

```
Gateway of Tally
  → Display More Reports
    → Inventory Books
      → Godowns / Excise Units            ← ENTRY POINT FOR THIS ISSUE
          ↓
      [Select Godown dialog — "Name of Godown"]            (Level 1)
          ↓ pick godown from "List of Godowns"
            (Primary · Burari · Main Location · Sant Nagar · Create)
      Godown Summary                                        (Level 2 — items in that godown)
          │   Particulars | Closing Balance (Quantity | Rate | Value) ; Grand Total
          │
          └─ Enter on an item row
                 ↓
             Godown Monthly Summary                         (Level 3 — per item, per godown)
                 │   Opening Balance + 12 months
                 │   Inwards (Qty|Value) · Outwards (Qty|Value) · Closing Balance (Qty|Value)
                 │   + bar chart at the bottom
                 │
                 └─ Enter on a month row
                        ↓
                    Godown Vouchers                         (Level 4)
                        │   Date | Particulars | Vch Type | Vch No.
                        │   Inwards | Outwards | Closing (running)
                        │   (Opening Balance is the first row)
                        │
                        └─ Enter on a voucher row
                               ↓
                           Accounting Voucher Alteration (full voucher, read/alter)
```

The Inventory Books submenu (s10) contains, in order:
- **SUMMARY:** Stock Item · Batch · **Godowns / Excise Units** · Stock Group Summary · Stock Category Summary
- **REGISTERS:** Stock Transfer Journal Register · Physical Stock Register
- Quit

"Godowns / Excise Units" is the third item under SUMMARY.

---

## 2. The four-layer drill chain (the core of this report)

| Layer | Screen | Rows are | Enter drills to |
|-------|--------|----------|-----------------|
| 1 | **Select Godown** — "Name of Godown" | godowns of the company | sets godown, opens Godown Summary |
| 2 | **Godown Summary** | items held in that godown (Closing Qty/Rate/Value) | Godown Monthly Summary |
| 3 | **Godown Monthly Summary** | Opening Balance + 12 months (In/Out/Closing) | Godown Vouchers |
| 4 | **Godown Vouchers** | each voucher affecting godown+item (+ Opening Balance row) | Accounting Voucher Alteration |

---

## 3. Per-image breakdown (all 36)

### Part A — The report skeleton (issue body, 7 images)

The body images establish the canonical chain:
**Gateway → Inventory Books → Godowns / Excise Units → Select Godown (List of Godowns:
Primary, Main Location) → Godown Summary (items, Closing Balance Qty|Rate|Value, Grand Total)
→ (Enter item) Godown Monthly Summary (Opening + monthly In/Out/Closing + bar chart)
→ (Enter month) Godown Vouchers (Date|Particulars|Vch Type|Vch No.|Inwards|Outwards|Closing)
→ (Enter voucher) Accounting Voucher Alteration.** Items are listed directly under each godown.

### Part B — Producer side: opening-balance godown allocation (comment imgs 01–09)

**img_01–08 — Stock Item opening balance allocated across godowns**
Stock Item Creation/Alteration for an item (e.g. HP M1005). On the **Opening Balance** quantity
field a popup **"Allocations of: <item>  for: <qty>"** opens with columns
**Godown | Quantity | Rate | per | Amount**, and a nested **"List of Godowns"** sub-popup
(Burari · Main Location · Sant Nagar · **Create**). Example (img_09): `Burari · 1 pcs · 18,500.00 ·
pcs · 18,500.00`, footer total `1 pcs / 18,500.00`. **This is the sole source of the opening
balance shown per godown in the report** — it is stored in `stock_item_opening_allocations`
(item_id, godown_id, quantity, rate, amount), NOT in `voucher_stock_entries`.

### Part C — Consumer side: the report with real data (s10–s28)

**s10 — Gateway → Inventory Books → Godowns / Excise Units menu**
SUMMARY list with **Godowns / Excise Units** highlighted (third under SUMMARY).

**s11 / s12 / s17 / s22 / s28 — Select Godown dialog**
Centered "Select Godown" dialog. Field **Name of Godown**; right panel **"List of Godowns"**:
**Primary · Burari · Main Location · Sant Nagar · Create**. (s12 = Burari highlighted,
s17/s22 = Main Location, s28 = Primary.)

**s13 / s24 — Godown Summary for Burari**
Header right block: `Burari` / company / period · **Closing Balance** (Quantity | Rate | Value).
Rows (items): `Hardware 1 pcs / 18,500.00 / 18,500.00`, `Software 1 nos / 45,000.00 / 45,000.00`.
**Grand Total 63,500.00**. *(In TallyPrime these top rows are stock GROUPS that drill to items —
s14 — but the body spec lists items directly; flat item rows are acceptable.)*

**s14 / s25 — Drill a group → item (Burari / Hardware → HP M1005)**
Header `Godown : Burari / Hardware`. Row `HP M1005 · 1 pcs · 18,500.00 · 18,500.00`.

**s15 / s26 — Godown Monthly Summary (Burari / HP M1005)**
Header `Godown : Burari / HP M1005` / period. Columns **Inwards (Qty|Value) · Outwards (Qty|Value)
· Closing Balance (Qty|Value)**. Rows = **Opening Balance** + April…March. Here the entire balance
is the **opening** (1 pcs / 18,500 closing every month, no movement). **Bar chart** at the bottom.
**Grand Total** row.

**s16 / s27 — Godown Vouchers (Burari / HP M1005)**
Header `Stock Item: HP M1005` · `Godown: Burari` · period `1-Mar-27 to 31-Mar-27`. Columns
**Date | Particulars | Vch Type | Vch No. | Inwards (Qty|Value) | Outwards (Qty|Value) |
Closing (Qty|Value)**. Single row: `1-Mar-27 · Opening Balance · — · Inwards 1 pcs / 18,500.00 ·
Closing 1 pcs / 18,500.00`. **The Opening Balance is rendered as the first row** (no real voucher
exists for this item+godown). Totals row at the bottom.

**s18 — Godown Summary for Main Location**
Many rows: Ceiling Fan, Choco, Fruits, Icecream, Main, MicroComputers, Peter England,
Wireless Mouse, GoodDay, Kj, Mobile, Paracetamol — each Closing Qty|Rate|Value (Kj shows a
**negative** value `(-)8,20,000.00`). **Grand Total 10,60,390.00**.

**s19 — Drill Ceiling Fan → item Fan (Main Location)**
Header `Godown : Main Location / Ceiling Fan`. Row `Fan · 20 Pc · 1,000.00 · 20,000.00`.

**s20 — Godown Monthly Summary (Main Location / Fan)**
April: **Inwards 50 Pc / 50,000 · Outwards 30 Pc / 60,000 · Closing 20 Pc / 20,000**; later months
carry the 20 Pc closing. **Bar chart** shows April's inward+outward bars. Grand Total row.

**s21 — Godown Vouchers (Main Location / Fan)**
Header `Stock Item: Fan` · `Godown: Main Location`. Opening Balance row 20 Pc / 20,000.

**s23 — Godown Summary when "Primary" (the root) is picked**
No specific godown in the header (just company + period). Particulars = **godown names**:
`Burari 63,500.00`, `Main Location 10,60,390.00`, `Sant Nagar 20 pcs / 200.00 / 4,000.00`.
**Grand Total 20 pcs / 11,27,890.00**. *(Selecting the root/Primary godown shows a per-godown
breakdown; drilling a godown row → that godown's items. Documented as an enhancement — see §5.)*

**s29 — Godown Creation (Secondary)**
Master form: **Name**, **(alias)**, **Under: ♦ Primary**, **Excise Tax unit: ♦ Not Applicable**.
The **Excise Tax unit** field is the "**Excise Units**" half of the report title.

---

## 4. Data model — how each number is derived

**Layer 1 (Select Godown):** all active godowns for the company (`godowns` where `is_active=1`).

**Layer 2 (Godown Summary):** for the chosen `godown_id`, per item:
- **Opening** = Σ `stock_item_opening_allocations` (qty, amount) for (item, godown).
- **Inwards − Outwards** = Σ `voucher_stock_entries.quantity|amount` where `vse.godown_id = godown`,
  split by `INWARD_TYPES` / `OUTWARD_TYPES`, excluding cancelled / optional / post-dated.
- **Closing Qty** = opening_qty + inwards_qty − outwards_qty; **Closing Value** likewise.
- **Rate** = closing_value / closing_qty (0 if qty 0). Drop rows where closing is 0/0.
- **Grand Total** = column sums.

**Layer 3 (Godown Monthly Summary):** 12 month rows + a leading **Opening Balance** row.
Opening = the opening allocation for (item, godown). Each month aggregates that month's
godown-scoped voucher lines into In/Out; **Closing** is the running cumulative starting from the
opening. A **bar chart** of monthly closing qty sits at the bottom (shared `StockBarChart`).

**Layer 4 (Godown Vouchers):** one row per voucher touching (godown, item) within the period,
**preceded by an Opening Balance row** (the opening allocation, shown as Inwards). Inwards/Outwards
by voucher type; **Closing** is the running cumulative (starting from opening). Totals row sums the
columns. Excludes cancelled / optional / post-dated.

**Drill (Layer 4 → voucher):** Enter opens the full Accounting Voucher Alteration for that
`voucher_id` (route `/transactions/voucher/:id`). The Opening Balance row has no voucher → not drillable.

**Excise:** `godowns.excise_tax_unit` (text, default "Not Applicable") set from the master form (s29).

---

## 5a. IMPLEMENTED (this change) ✅

Most of the chain already existed; this change makes it **correct against the screenshots** and
adds the excise field. Covered by `server/tests/godownReport.test.js`.

**Report services** (`server/report/stockSummaryReportService.js`) — now incorporate
`stock_item_opening_allocations` (previously ignored, so Burari showed nothing):
- `godownItems` — closing = **opening allocation** + inwards − outwards (per item, per godown).
- `godownItemMonthly` — adds an **Opening Balance** row; running closing starts from the opening.
- `godownVouchers` — prepends an **Opening Balance** row; running closing starts from the opening.

**Report UI** (`client/src/pages/reports/inventory/GodownSummary.tsx`):
- Level-3 monthly now renders the shared **`StockBarChart`** (monthly closing qty) + an
  **Opening Balance** row; Level-4 vouchers render the Opening Balance row.

**Godown master — Excise Unit** (the "/ Excise Units" half):
- Schema: `excise_tax_unit TEXT DEFAULT 'Not Applicable'` (sqlite + pg + runtime ALTER in
  `server/godown/godown.js`).
- `godownService.create/update` read/write it; `GodownCreate.tsx` exposes the field (s29).

**Already present (verified):** Select Godown → Summary → Monthly → Vouchers → Voucher Alteration
4-level component (`GodownSummary.tsx`), wired through `report.godownItems / godownItemMonthly /
godownVouchers` (`reportController.js`, `server/index.js`, `preload.js`), menu entry
(`InventoryBooks.tsx` → `/reports/inventory/godown-summary`), route (`routes.tsx`), and the
opening-balance godown-allocation popup on the stock-item master.

> Not done (out of scope, low risk): the **"Primary/root → per-godown breakdown"** view (s23) and the
> **stock-group hierarchy** inside Godown Summary (s13/s14 group→item drill). The body spec lists
> items directly per godown; the per-godown drill, monthly, vouchers and voucher drill all work
> end-to-end with correct opening balances.

---

## 6. One-line summary
Godowns / Excise Units = **Godown → Godown Summary (items, Closing Qty/Rate/Value) → Godown Monthly
Summary (Opening + 12 months In/Out/Closing + chart) → Godown Vouchers (running Closing) → Voucher
Alteration**. The 4-level chain existed; the fix is **incorporating per-godown opening allocations**
(so balances are correct) plus the **monthly chart** and the **Excise Tax unit** master field.
