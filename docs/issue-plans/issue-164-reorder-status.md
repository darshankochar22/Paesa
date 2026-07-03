# Issue #164 — Statements of Inventory · Reorder Status

Previously a **stub** (`<ReportRunner/>` generic table). Rebuilt end-to-end from the 18 screenshots.

## 1. Entry point
- **Menu (Tally):** Statements of Inventory → STOCK → **Reorder Status** (img-1).
- **App route:** `/reports/statements-of-inventory/reorder-status` → `ReorderStatus.tsx`.

## 2. Drill chain (18 screenshots)

**A — Submenu (img-2, img-11).** "Reorder Status" heading → **Stock Groups** / **StoCk Category** / Quit.

**B — Select master (img-3 group, img-12 category).** Stock Groups → Select Stock Group popup
(List of Stock Groups, Primary + groups). Stock Category → Select Stock Category popup (List of Stock
Categories). Shared `SelectionPopup`.

**C — Reorder Status report (img-4/5 group, img-13 category).** Title "Stock Group/Category Reorder
Status"; header `Items Under: <name>` / `(all items)` / `as at <date>`. Columns:
`Name of Item | Closing Stock | Purc Orders Pending | Sale Orders Due | Nett Available |
Re-order Level | Short fall | Min Reorder Qty | Order to be Placed`.
- **Nett Available** = Closing + Purc Orders Pending − Sale Orders Due
  (img-4: Fan closing 67 Pc + PO pending 2 Pc = nett 69 Pc; Paracetamol 9 Box + 8 Box = 17 Box).
- Purc Orders Pending = Purchase Order − Receipt Note; Sale Orders Due = Sales Order − Delivery Note.
- Re-order Level / Short fall / Min Reorder Qty / Order to be Placed are blank when no reorder level
  is set (as in the demo). Short fall = max(0, Re-order Level − Nett), **only when a level is set**.
- Right panel: F4 Stock Group/Category, F8 Reorder Only, …

**D — Drill (img-6/7/8/9/10 group, img-14/15/16/17/18 category).** Enter on an item →
**Item Movement Analysis** (Suppliers/Buyers) → party → **Item Voucher Analysis** (Purchases/Sales,
9 cols, voucher sub-line) → Enter → voucher. Reuses the shared #157/#158 components + `aggregateParties`.

## 3. Fix applied
- **Backend** `server/report/inventory/reorderStatus.js` (new) — `reorderStatus(company, fy,
  scope_type, scope_id)` scoped to a Stock Group / Stock Category / Primary(all), returning structured
  fields (closing_qty, po_pending, so_due, nett_available, reorder_level, shortfall, min_reorder_qty,
  to_order). Wired `reportController.reorderStatusScoped` → `report:reorderStatusScoped` →
  `preload` (`window.api.report.reorderStatusScoped`). The old flat `reorderStatus` (for ReportRunner)
  is kept. Verified on a live-DB copy (Primary=all 13 items; PO pending/SO due; group & category scoping).
- **Frontend** `ReorderStatus.tsx` (was a stub) — full flow: submenu (Stock Groups / Stock Category)
  → `SelectionPopup` → 9-column reorder table → drill item → `ItemMovementAnalysis` →
  `ItemVoucherAnalysis` → voucher. Keyboard nav throughout; strict B&W.
- `tsc -b` clean; backend syntax OK.

## 4. Verification checklist
- [ ] Menu → Reorder Status shows Stock Groups / Stock Category submenu.
- [ ] Each opens the correct Select popup, then the 9-column report headed "Stock Group/Category Reorder Status".
- [ ] Nett Available = Closing + Purc Orders Pending − Sale Orders Due; reorder columns blank when unset.
- [ ] Drill item → Item Movement Analysis → party → Item Voucher Analysis → voucher opens.
- [ ] `tsc`/build clean.
