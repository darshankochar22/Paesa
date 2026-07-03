# Issue #165 — Statements of Inventory · Cost Estimation

TallyPrime "**Item Estimates**" report. Analysed all 5 screenshots (s165_1..5).

## 1. Entry point
- **Menu (Tally):** Statements of Inventory → **Cost Estimation** (between Reorder Status and
  Item Cost Analysis) — img-1.
- **App route:** `/reports/statements-of-inventory/cost-estimation` → `CostEstimation.tsx`.

## 2. Drill chain (5 screenshots)
- **img-1** — menu, "Cost Estimation" highlighted.
- **img-2** — **Select Stock Group** popup ("Name of Group" / "List of Stock Groups": Primary + groups).
  Shared `SelectionPopup`.
- **img-3 / img-4 / img-5** — **Item Estimates** report. Header `Items Under: Primary` /
  `BoM Type: Default` / `as at <date>`. Columns: **Particulars | Qty | Cost | Amount**.
  - Parent BoM item bold: `GoodDay  898 nos  0.77/nos  691.46`.
  - img-4 collapsed (parent only); img-5 expanded — indented **italic** component rows:
    `Apple 9 nos 10.00/nos 90.00`, `Banana 89 nos 6.74/nos 599.86`, `Oninon 7 nos`, `Dark Choco 70 nos`.
  - Right panel: F4 Stock Group, **F5 Component-wise**, **F8 All BoM**, B Basis of Values, H Change View, …
  - No voucher drill exists on this report (F5 only expands the BoM breakdown).

## 3. Fixes applied
Report already scaffolded (`CostEstimation.tsx`, `ItemEstimatesTable.tsx`, `costEstimation.js`);
corrected to match the screenshots exactly:

- **Backend** `server/report/inventory/costEstimation.js`:
  - Parent **Qty** is now the closing stock qty (was the sum of component quantities).
  - Parent **Cost** is per-unit = `compTotal / closing_qty` (was `compTotal`, which made the
    per-unit figure ~690 instead of 0.77). Falls back to the item's own opening rate when it has
    no stored components. **Amount** = `closing_qty × cost` (Tally: Qty × Cost).
- **Frontend** `ItemEstimatesTable.tsx`:
  - **Cost** column now renders the `value/unit` suffix (`0.77/nos`, `10.00/nos`) for both the
    parent and component rows.
  - Component rows rendered **italic** (matches Tally).
  - `expanded` set / `onToggleExpand` are now optional controlled props.
- **Frontend** `CostEstimation.tsx`: **Enter / Space** on the selected row toggles the BoM
  component breakdown (F5 Component-wise), in addition to double-click.

## 4. Verification
- Live DB has one `has_bom` item (`Jhola`, no components) → fallback path renders
  `Jhola 2000 Numbers 16.00/Numbers 32000.00`. The GoodDay/BoM demo data is Tally's own.
- `tsc -b --noEmit` clean (exit 0); `node -c costEstimation.js` OK.
