# Issue #163 — Statements of Inventory · Job Work Analysis

**Status: verified already correct — no code change needed.**

## 1. Entry point
- **Menu (Tally):** Statements of Inventory → STOCK → **Job Work Analysis** (img-1).
- **App route:** `/reports/statements-of-inventory/job-work-analysis` → `JobWorkAnalysis.tsx`.

## 2. What the 3 screenshots show
The demo company has **no Jobs/Projects**, so the screenshots only cover entry → selection → create;
the report itself is never reached.

**A — Select Job / Project popup (img-2).** Title "Select Job / Project"; field "Job / Project";
list "List of Jobs/Projects" — **empty** here, showing only the **Create** affordance.

**B — Create → Cost Centre Creation (img-3).** Choosing Create opens "Cost Centre Creation
(Secondary)" (Category / Name / (alias) / Under: Primary) — i.e. a Job/Project is a Cost Centre.

## 3. Verification of current implementation
`JobWorkAnalysis.tsx` already matches exactly:
- `SelectionPopup` with `title="Select Job / Project"`, `fieldLabel="Job / Project"`,
  `listLabel="List of Jobs/Projects"`, `emptyText="No Jobs/Projects found. Use Create to add one."`.
- Jobs are loaded from `window.api.costCentre.getAll` (Jobs/Projects = Cost Centres).
- `onCreate` → `/master/create/cost-centre` → `CostCentreCreate` (matches img-3).
- Report level (when a Job/Project exists) renders `MovementAnalysisTable`
  (Consumption / Production) via `window.api.report.jobWorkAnalysis` → `inventory/jobWorkAnalysis.js`.

Dependency wiring confirmed present: create route (`masterRoutes.tsx:186`), `costCentre.getAll`
(`preload.js:63`), `report.jobWorkAnalysis` (`preload.js:245` → handler → `reportController`).

## 4. Note
The report screen's exact Tally column layout is **not** shown in these screenshots (no Job/Project in
the demo data). If a later screenshot set includes a populated Job Work Analysis report, revisit the
`MovementAnalysisTable` labels/columns then. As of #163 the covered flow (menu → select → create)
matches Tally.
