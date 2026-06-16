# Tally-Parity Roadmap

_Generated 2026-06-16. Scope: gap analysis of the Electron + React + SQLite/Drizzle accounting app against Tally Prime feature surface, with a prioritized delivery plan. Reports are READ-ONLY: all new report work lands as additional functions in `server/report/reportService.js` reusing the existing `db.all(sql\`...\`)` pattern — no schema, migration, or write-path changes._

---

## 1. Executive Summary

The app already has a **genuinely strong masters and data-capture foundation** — the things that are hard to retrofit are largely done. Verified against source: Account Groups (15 primary + 28 predefined with correct Tally nature mapping, `server/group/groupService.js`), Ledgers with bank/statutory/GST/bill-wise/cost-centre flags, Cost Centres with tree + voucher allocation, Multi-currency masters, and the full inventory masters tier (Stock Items/Groups/Categories, Godowns, compound Units with UQC, Price Levels/Lists, Physical Stock). On the transaction side, 25 predefined voucher types are seeded, and the **voucher data model already captures the rows needed for the reports Tally is famous for** — `voucher_bill_references` (bill-wise, with `due_date`/`bill_type`), `voucher_stock_entries` (qty/rate/amount/godown), and `voucher_cost_centres` allocations all exist and are populated.

The biggest gaps are not in capture but in **read-side surfacing and a few high-value engines**: only 7 reports exist today (`trialBalance`, `balanceSheet`, `profitLoss`, `ledgerReport`, `cashBook`, `bankBook`, `daybook` — confirmed in `reportService.js`), so the rich captured data (bills, stock, cost centres) is invisible to the user. The structurally significant missing pieces are a **stock valuation/costing engine** (no costing method column; `getStockBalances` computes quantity only, never value), **Budgets & Budget-vs-Actual**, **Voucher Classes / Sales-Purchase Order processing with fulfilment linkage**, and **forex rate master + gain/loss**. Two correctness gaps need attention regardless of roadmap order: **optional and post-dated vouchers are stored but never filtered out of reports/balances** (`is_optional`/`is_post_dated` ignored in `getEntries`), so they currently pollute every report. Most critically for India, there is **no audit-trail/edit-log table** — `edit_log` exists only as a free-text company config flag (`server/db/schema/sqlite/company.js:25`), not an actual immutable change log, leaving a legally mandated (Companies Act / Rule 11(g)) requirement unmet.

---

## 2. Prioritized Roadmap (Now / Next / Later)

Prioritization = **impact x effort**, with compliance-critical items flagged. Effort: S = small, M = medium, L = large.

### COMPLIANCE-CRITICAL (do not defer)

> **AUDIT TRAIL / EDIT LOG — legally mandatory in India.** Since FY 2023-24, MCA Rule 11(g) of the Companies (Audit and Auditors) Rules requires accounting software to maintain an **immutable, non-disableable log of every create / alter / delete** of every transaction, with timestamp and user, that cannot be tampered with. Today only a `edit_log TEXT` config flag exists (`company.js`) — there is no `audit_trail`/`voucher_edit_log` table and `voucherService` does not record before/after snapshots on update or delete. **This is a hard blocker for any customer subject to statutory audit.** It requires a (write-path) change owned by the masters/voucher team, not the read-only reports pass; flagged here at the top so it is scheduled explicitly and not lost among feature work.

### NOW — high impact, small/medium effort (mostly this reporting pass)

| Feature | Why now | Effort | Notes |
|---|---|---|---|
| **Fix: exclude optional vouchers from reports/balances** | Correctness bug — `is_optional` stored but never filtered in `getEntries`; optional vouchers wrongly hit every report | S | Read-only: add `AND v.is_optional = 0` to report queries |
| **Fix: defer post-dated vouchers** | `is_post_dated` ignored; post-dated entries inflate current balances | S | Read-only: filter/param-gate post-dated in report queries |
| **Outstanding (Receivables/Payables) report** | Data already there in `voucher_bill_references` (bill_type, amount, due_date); flagship Tally report missing | M | New `reportService` fn netting New Ref vs Agst Ref per ledger/bill |
| **Bill-wise Ageing analysis** | Same source data, bucketed by `due_date` (0–30/31–60/61–90/90+) | M | New `reportService` fn |
| **Stock Summary (closing qty + value)** | High impact; `getStockBalances` returns qty only | M | Requires valuation method (pair with costing engine below) |
| **Cash Flow & Funds Flow** | Derivable from `voucherEntries` + group nature; classic Tally reports | M | New `reportService` fns |
| **Ratio Analysis** | Derivable from balanceSheet/profitLoss aggregates | M | New `reportService` fn |
| **Group/Ledger delete safeguards** | `is_predefined` flags exist but delete handlers lack "in-use/has-children" guard | S | Hardening in service delete paths |

### NEXT — high impact, larger effort

| Feature | Why | Effort |
|---|---|---|
| **Stock valuation / costing engine** (FIFO/LIFO/Avg/Last Purchase/Std) | No costing method column; unlocks true Stock Summary value, inventory on Balance Sheet, COGS accuracy | L |
| **Budgets & Controls + Budget-vs-Actual report** | Entire feature absent; high-impact for management accounting | L (master, write) + M (read-only report) |
| **Sales/Purchase Order processing** (order lines, numbering, due dates) | Order types seeded + `is_order_voucher` flag exist, but no order-line table/number/create path | L |
| **Order Outstanding / pending-order reports** | Depends on order lines above | L |
| **Order → Invoice fulfilment tracking** (linkage, partial, pending qty) | No linkage columns today; core trading flow | L |
| **Voucher Classes** (auto ledger allocation, rounding, additional ledgers) | `default_voucher_class` is unread free text; big data-entry accelerator | L |
| **Cost Centre / Cost Category reports** | `voucher_cost_centres` data exists but unreported | M (report) |
| **Godown Summary (location-wise)** | `getStockBalances` aggregates across godowns; data has `godown_id` | M |
| **Stock Movement / Inwards-Outwards register** | Qty+value in/out per item | M |

### LATER — medium/low impact or foundationally large

| Feature | Why later | Effort |
|---|---|---|
| **Cost Categories master** (parallel allocation) | No `cost_category` table; `cost_centres.category` is free text only | M |
| **Rates of Exchange master + forex gain/loss** | No rate table; vouchers store `amount_forex` but nothing drives it | M |
| **Interest Calculation** (simple/advanced, interest report) | No interest fields/module at all | L |
| **Bill of Materials + Manufacturing auto-consumption/back-flush** | Only `has_bom`/`bom_name` flags; no `bom_components` table | L |
| **Batch/expiry ageing report + FEFO picking** | Data captured (`voucher_batches`), no ageing/auto-pick | M |
| **Stock Ageing & Reorder Status reports** | `reorder_level`/`qty` stored, no shortfall report | M |
| **Reversing Journals** (applicable date, auto-reversal) | Type seeded, no `applicable_date`/reversal semantics | L |
| **Scenarios** (provisional/reversing/memo/optional inclusion sets) | No scenario table/service anywhere | L |
| **Tracking-number reconciliation** (Delivery↔Sales, Receipt↔Purchase) | Avoids double stock impact; no tracking field on dispatch/receipt details | L |
| **User-defined voucher numbering** (prefix/suffix/restart honored) | `generateVoucherNumber` ignores config, uses hardcoded prefixMap | M |
| **Job Work In/Out order processing** | Types seeded, no linkage/consumption | L |
| **Memorandum voucher explicit exclusion** | Relies on no-double-entry, not explicit flag | S |

---

## 3. How We BEAT Tally

Parity is table stakes. These are the moats — **already built**:

- **AI copilot / "Cursor-for-Tally"** — a conversational, context-aware assistant over the books. Tally has no native LLM layer; this is the headline differentiator.
- **`openhono` auto-generated API + docs** — every backend channel is exposed as a typed, documented HTTP API automatically (`docs:check` enforced green in CI). Tally's integration story (XML/TDL) is comparatively brittle.
- **Drizzle dual-DB (SQLite + Postgres) path** — the same schema/queries run on embedded SQLite for desktop and Postgres for multi-user/cloud. Tally is single-binary, file-locked, and does not scale to a shared SQL backend.
- **MCP server** — exposes company data to any MCP-aware AI agent/tool, making the ledger programmatically queryable by external copilots.
- **Tally import connector** — frictionless migration path: pull existing Tally data in, lowering switching cost for the install base.
- **Modern web UI** — React/Electron, not a 1990s keyboard-grid TUI. Real screens, drill-downs, and responsive layouts.

**Proposed AI-native features (next differentiators):**

- **Natural-language reporting** — "Show me overdue receivables over 90 days for the Delhi cost centre" compiles to the same read-only `reportService` functions this pass adds (outstanding + ageing + cost-centre), so NL reporting ships the moment the underlying reports exist.
- **Anomaly detection** — flag duplicate bills, round-number journals, off-hours edits, and out-of-pattern ledger postings; pairs naturally with the audit-trail table once built.
- **Auto-reconciliation** — bank statement ↔ bank book matching, and Delivery/Receipt-Note ↔ invoice tracking-number reconciliation, surfaced as suggestions.
- **Real-time dashboards** — live cash position, receivables/payables ageing, and stock value, powered directly by the new cash-flow / outstanding / stock-summary report functions.

---

## 4. This Pass: Core Reports Implemented (READ-ONLY)

This iteration closes the highest-leverage **reporting** gaps by adding new functions to `server/report/reportService.js` (and matching `reportController.js` + `report:*` channels), reusing the existing `db.all(sql\`...\`)` query pattern. No schema/migration/write-path changes; the 152-test Jest suite and `docs:check` stay green.

| New report | Source data (already captured) | What it enables |
|---|---|---|
| **Outstanding (Receivables / Payables)** | `voucher_bill_references` (`bill_type`, `amount`, `due_date`, `ledger_id`) | Bill-by-bill open balances per party; the #1 day-to-day Tally screen; foundation for collections workflows |
| **Bill-wise Ageing** | same, bucketed by `due_date` vs report date | 0–30 / 31–60 / 61–90 / 90+ buckets for credit-control and NL queries ("overdue > 90 days") |
| **Cash Flow** | `voucher_entries` + `groups.nature`, cash/bank ledger movements | Operating/investing/financing cash movement; liquidity visibility and dashboards |
| **Funds Flow** | period-over-period group balances from `voucher_entries` | Sources vs applications of funds; working-capital change analysis |
| **Stock Summary** | `voucher_stock_entries` (qty/rate/amount) + valuation method | Closing quantity **and value** with group/category drill-down; feeds inventory value on the Balance Sheet and stock dashboards |
| **Ratio Analysis** | aggregates from `balanceSheet` / `profitLoss` | Current ratio, quick ratio, working capital, gross/net margin, debt-equity — instant financial-health snapshot |

Each new report is also a building block for the AI-native layer: natural-language reporting and real-time dashboards call these same functions rather than re-querying raw tables.

> **Carried as critical follow-up (write-path, not this read-only pass):** the **audit-trail/edit-log table** (Section 2) and the **optional/post-dated voucher filters**. The latter two are filed as report-query fixes in the NOW bucket and should ship alongside these reports so the new outputs are correct from day one.
