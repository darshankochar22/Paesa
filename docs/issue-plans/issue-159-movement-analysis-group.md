# Issue #159 — Statements of Inventory · Movement Analysis → Group Analysis

Sibling of #157/#158, entered per **ledger (accounting) group**. Unlike Stock Group/Item Analysis,
it has **no** Item Movement Analysis step — the item drills straight to Item Voucher Analysis scoped
to the group.

## 1. Entry point
- **Menu (Tally):** Statements of Inventory → Movement Analysis → **Group Analysis** (img-1).
- **App route:** `/reports/inventory/group-analysis` → `GroupAnalysis.tsx`.

## 2. Drill chain (10 screenshots)

**A — Select Group popup (img-2, img-6).** "Name of Group" typeahead + "List of Groups" =
**accounting/ledger groups** (Bank Accounts, Bank OCC A/c, Bank OD A/c, Branch/Divisions,
Cash-in-Hand, Sundry Creditors, Sundry Debtors). Reuses shared `SelectionPopup`.

**B — Group Analysis report (img-3 Bank Accounts, img-7 Sundry Creditors).** Title "Group Analysis";
right header: group name (italic) / company / period. Columns: Particulars | **Purchases**(Quantity,
*Eff. Rate*, Value) | **Sales**(Quantity, *Eff. Rate*, Value). One row per stock item transacted with
any ledger under the group. Grand Total (img-7: Purchases `17,61,670.00`; Sales `46 nos … 10,16,200.00`).
Negatives parenthesised.

**C — Item Voucher Analysis (img-4/5 Paracetamol under Bank Accounts; img-8 Lenovo Laptop under Sundry
Creditors).** Title "Item Voucher Analysis"; header `Stock Item: X` + **`Under Group: <group>`**;
period right. Same 9 columns as #157/#158. Rows sectioned by voucher-type family: `Purchases`
and/or `Sales`. A Credit Note (sales return) shows under **Sales** as a **negative** line
(img-4/5: Capital Ac `(-)4 Box … (-)4,200.00`, sub-line `2-Mar-27 Credit Note 5`). Focused row expands
the italic voucher sub-line; Total row closes it. Footer: Enter: Alter · A/2/I.

**D — Voucher.** Enter on a voucher row opens it (`/transactions/voucher/:id`).

## 3. Fix applied
- **Backend** `server/report/inventory/groupAnalysis.js` — new `groupItemVouchers(company, fy,
  group_id, item_id)` (+ shared `partyItemVouchers` core). Returns one row per voucher whose
  accounting entries reference a ledger in the group, with `particulars` = that party ledger, legs by
  goods direction, `addl_cost`, and `voucher_id`. Verified against a live-DB copy.
  Wired through `reportController` → `report:groupItemVouchers` handler → `preload` (`window.api.report.groupItemVouchers`).
- **`ItemVoucherAnalysis.tsx`** — now sections **per-row by voucher-type family** (renders both
  Purchases and Sales sections when present), projects each row net of its opposite leg (returns show
  negative inside their family), and supports a **`groupName`** header (`Under Group: X`) in addition
  to the `ledgerName` header used by #157/#158. Back-compatible: single-direction callers render one
  section exactly as before.
- **`GroupAnalysis.tsx`** — drill now calls `groupItemVouchers` (group-scoped, was `stockItemVouchers`
  = all item vouchers), sorts rows Purchases-then-Sales, and passes `groupName` + `unit` + the
  Alter/Add/Duplicate/Insert footer.
- Strict B&W; `tsc -b` clean; backend syntax OK.

## 4. Verification checklist
- [ ] Menu → Group Analysis opens Select Group popup (ledger groups).
- [ ] Report shows Particulars | Purchases(Qty,Eff.Rate,Value) | Sales(...) + Grand Total.
- [ ] Drill item → Item Voucher Analysis header "Under Group: <group>", only vouchers with a party in
      that group.
- [ ] Both Purchases and Sales sections render when the item has both; returns show negative.
- [ ] Enter opens the voucher.
- [ ] `tsc`/build clean.
