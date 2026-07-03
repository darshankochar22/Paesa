# Issue #160 — Statements of Inventory · Movement Analysis → Ledger Analysis

Ledger-scoped twin of #159 (Group Analysis). Entered per **single ledger** instead of a ledger group;
no Item Movement Analysis step.

## 1. Entry point
- **Menu (Tally):** Statements of Inventory → Movement Analysis → **Ledger Analysis** (img-1).
- **App route:** `/reports/inventory/ledger-analysis` → `LedgerAnalysis.tsx`.

## 2. Drill chain (6 screenshots)

**A — Select Ledger popup (img-2).** "Name of Ledger" typeahead + "List of Ledgers" (all ledgers:
ABC Customers, ABC Electronics, Aman Electronics, … XYZ Suppliers). Shared `SelectionPopup`.

**B — Ledger Analysis report (img-3, ABC Customers).** Title "Ledger Analysis"; right header: ledger
name (italic) / company / period. Columns: Particulars | **Purchases**(Quantity, *Eff. Rate*, Value) |
**Sales**(Quantity, *Eff. Rate*, Value). One row per stock item transacted with that ledger. Grand
Total (img-3: Purchases `7 Pc … 7,000.00`; Sales `7,74,360.00`).

**C — Item Voucher Analysis (img-4, Apple under ABC Customers).** Title "Item Voucher Analysis";
header `Stock Item: X` + **`Under Ledger: <ledger>`** (no Inwards/Outwards prefix — both families can
appear). Same 9 columns; rows sectioned by family (`Sales` here: two ABC Customers rows → Total
`206 nos … 2,90,460.00`); focused row expands the italic voucher sub-line; Total row. Footer:
Enter: Alter · A/2/I.

**D — Voucher.** Enter opens the voucher (`/transactions/voucher/:id`).

## 3. Fix applied
Reuses the #159 machinery — `partyItemVouchers` core already supported a single-ledger filter.
- **Backend** `groupAnalysis.js` — new `ledgerItemVouchers(company, fy, ledger_id, item_id)` (thin
  wrapper over `partyItemVouchers` with `l.ledger_id = ?`). Wired through `reportController` →
  `report:ledgerItemVouchers` → `preload` (`window.api.report.ledgerItemVouchers`). Verified on a
  live-DB copy (returned the ledger-scoped Sales voucher with `voucher_id`).
- **`ItemVoucherAnalysis.tsx`** — header now renders plain **"Under Ledger: X"** when `ledgerName` is
  given without a `direction` (the Ledger Analysis case), keeping the "Inwards/Outwards Under Ledger"
  form for the #158 single-direction drill.
- **`LedgerAnalysis.tsx`** — drill now calls `ledgerItemVouchers` (was `stockItemVouchers` = all item
  vouchers), sorts Purchases-then-Sales, and passes `ledgerName` + `unit` + the Alter/Add/Duplicate/
  Insert footer.
- Strict B&W; `tsc -b` clean; backend syntax OK.

## 4. Verification checklist
- [ ] Menu → Ledger Analysis opens Select Ledger popup (all ledgers).
- [ ] Report: Particulars | Purchases | Sales + Grand Total.
- [ ] Drill item → Item Voucher Analysis header "Under Ledger: <ledger>", only that ledger's vouchers.
- [ ] Purchases/Sales sections; returns negative; Enter opens the voucher.
- [ ] `tsc`/build clean.
