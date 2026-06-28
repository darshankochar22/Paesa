# Issue #87 — Profit & Loss A/c (implementation spec)

Entry: Gateway → Reports → Accounts → **Profit & Loss A/c**. Route `/reports/accounts/profit-loss`.
Reference: 24 TallyPrime EDU screenshots in the issue (company "Moly Jain", period 1‑Apr‑26 → 2‑Jan‑27). They show the default T‑format report and its full drill chain — there is **no Configure (F12) panel** in the spec, so scope is the report + drill links.

## Architecture (already in place — config-driven report registry)
- `client/src/pages/reports/accounts/ProfitLoss.tsx` → `<ReportRunner />`.
- `ReportRunner` resolves `reportType = "profit-loss"`, which is in `layoutOnlyReports`, so it renders `<ProfitLossLayout />` directly (no generic table).
- `client/src/components/reports/ProfitnLossLayout.tsx` — the real T‑format UI. Calls `window.api.report.profitLoss(...)`.
- IPC `report:profitLoss` → `server/report/reportController.js#profitLoss` → `server/report/services/profitlossService.js#profitLoss`.
- The `server/profitLossReport/*` folder is **saved-report-definition CRUD** (tables `profit_loss_reports` / `profit_loss_views`) and is **not** the live report — leave it untouched.

## Layout (matches gold standard, T‑format two columns)
Both columns headed `Particulars` + company name + period.

LEFT (Debit) — Trading section then P&L section:
- Opening Stock
- Purchase Accounts (group total; expand → ledgers; double‑click → Group Summary)
- Direct Expenses (group total; expandable; drill)
- Gross Profit c/o *(only when gross profit)*
- ── trading subtotal (double underline) ──
- Gross Loss b/f *(only when gross loss)*
- Indirect Expenses (group total; expandable; drill)
- Nett Profit *(only when net profit)*
- **Total** (P&L‑section total) at the very bottom

RIGHT (Credit):
- Sales Accounts (group total; expandable; drill)
- Direct Incomes (group total; expandable; drill)
- Closing Stock
- Gross Loss c/o *(only when gross loss)*
- ── trading subtotal ──
- Gross Profit b/f *(only when gross profit)*
- Indirect Incomes (group total; expandable; drill)
- Nett Loss *(only when net loss)*
- **Total** at the very bottom

### Closing Stock placement — decision
The gold screenshots are a **non‑integrated** company (Integrate Accounts & Inventory = No), so they show Closing Stock on the *debit* side and a (presentation‑only) Gross Loss. Our seeded data is inventory‑integrated; the accounting‑correct canonical TallyPrime layout puts **Closing Stock on the credit side** (it reduces COGS), which is what the existing code does and what yields sensible numbers on our data. We keep the canonical credit‑side placement; every other structural element matches the screenshots.

## Computation (`profitlossService.js`) — 6 buckets
Primary groups are matched by name → bucket: `purchaseAccounts`, `directExpenses`, `indirectExpenses`, `salesAccounts`, `directIncomes`, `indirectIncomes` (each includes its full sub‑tree of child groups + direct ledgers). Ledger balance = signed opening + Σ(Dr−Cr) over non‑cancelled, non‑optional, non‑post‑dated voucher entries.
- Opening Stock = stock value as on (period start − 1 day), or Σ`stock_items.opening_value` when the period starts at FY beginning.
- Closing Stock = `calculateClosingStock(company_id, fy_id, asOn)` valued as on period end.
- Gross Profit = (Sales + Direct Incomes + Closing Stock) − (Opening Stock + Purchases + Direct Expenses).
- Net Profit = Gross Profit + Indirect Incomes − Indirect Expenses.

## Drill chain (from the report)
1. Group rows (Purchase/Sales/Direct/Indirect …) → **Group Summary** `/reports/accounts/group-summary/:groupId` → Ledger Monthly Summary → Ledger Vouchers → Voucher Alteration. *(downstream screens already exist)*
2. Opening Stock / Closing Stock → **Stock Summary** `/reports/inventory/stock-summary` → Stock Group → Stock Item Monthly → Stock Item Vouchers. *(downstream screens already exist)*

Drill = double‑click, or focus + Enter (Tally keyboard parity). Single click toggles inline expand of a group's ledgers.

## Period (F2)
The report must honour the period selected in the right panel (screenshots use a mid‑year range). Wire `fromDate`/`toDate` from `ReportRunner` → `ProfitLossLayout` → API; the period label renders in Tally `d-MMM-yy` form. Defaults to the active FY.

## Changes required (gap closure over existing code)
| Layer | File | Change |
|---|---|---|
| IPC | `preload.js` | `profitLoss(company_id, fy_id, from_date?, to_date?)` |
| Controller | `server/report/reportController.js` | thread `from_date`/`to_date` |
| Service | `server/report/services/profitlossService.js` | date‑filter entries; as‑on‑date opening/closing stock |
| Runner | `client/src/pages/reports/ReportRunner.tsx` | `<ProfitLossLayout fromDate toDate />` |
| Layout | `client/src/components/reports/ProfitnLossLayout.tsx` | accept period props; Tally date label; Opening/Closing‑Stock drill; Enter‑key drill |
| Test | `server/tests/profitLossReport.test.js` | integration test of the service over a seeded trading set |

## Verification (3‑check)
- **DB**: groups carry `nature`; the 6 P&L primaries exist; `voucher_entries`, `stock_items`, valuation engine all present and queried. ✔
- **Backend/IPC**: `report:profitLoss` registered, controller + service return buckets/totals/gross/net. ✔ (extended with period)
- **Frontend**: `ProfitLossLayout` renders T‑format from real API, full‑screen via `TallyReportLayout`, drills groups + stock. ✔ (extended with stock drill + period)
