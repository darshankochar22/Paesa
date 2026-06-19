# Multi-Mode Report System Plan for India

## Goal

Build a report system that can replace TallyPrime for Indian SMBs and then beat it. The winning approach is not more standalone report pages. It is one report engine that can render the same trusted data in multiple modes:

- Tally-style keyboard reports for accountants.
- Owner dashboards for business users.
- CA/audit workpapers for compliance.
- GST/e-invoice filing views.
- Exception queues for daily action.
- AI answers over the same report definitions.

## Source Inputs

Authoritative references checked:

- TallyPrime report UX: https://help.tallysolutions.com/working-with-reports/
- GST e-invoice AATO thresholds: https://einvoice1.gst.gov.in/Others/EinvEnabled
- GSTR-1 official FAQ: https://tutorial.gst.gov.in/userguide/returns/GSTR_1.htm
- GSTR-3B official FAQ: https://tutorial.gst.gov.in/userguide/returns/GSTR3B.htm
- ICAI audit trail implementation guide: https://eirc-icai.org/uploads/background_materials/Revised%202024_Implementation%20Guide%20on%20Reporting%20of%20Audit%20Trail%20%281%29_1712114860.pdf

Gemini CLI note:

- `gemini` is installed at `/opt/homebrew/bin/gemini`.
- Current Gemini CLI auth is blocked by `IneligibleTierError: This client is no longer supported for Gemini Code Assist for individuals`.
- Retry Gemini research after authentication/client migration is fixed. Until then, use official Tally, GST, MCA/ICAI, and codebase evidence as source of truth.

## Current Codebase State

Backend report APIs exist and are useful:

- `server/report/reportService.js`
- `server/report/outstandingReportService.js`
- `server/report/cashFlowReportService.js`
- `server/report/fundsFlowReportService.js`
- `server/report/stockSummaryReportService.js`
- `server/report/ratioAnalysisReportService.js`
- IPC channels in `server/index.js` and `preload.js`.

Frontend report pages are not yet real:

- All 52 files under `client/src/pages/reports/**` currently render `ReportStub`.
- `client/src/components/tally-ui/TallyReportLayout.tsx` exists but is only a thin shell.
- GST return pages under `client/src/pages/master/statutory/gst-return/` are the main real report UI exception.

Compliance foundation exists but needs wider coverage:

- `server/auditTrail/auditTrailService.js` implements a hash-chained audit log.
- Voucher create/update/cancel/delete are logged transactionally.
- Group and ledger writes are logged best-effort.
- Audit coverage must expand to every book-affecting write path before this can be sold as compliance-grade.

AI foundation exists:

- `server/ai/tools.js` already exposes a small report-oriented tool layer.
- This is a good base for natural-language reporting if the same report engine powers UI, exports, and AI.

## Product Principle

Do not make reports as isolated screens.

Create a declarative report runtime:

```ts
type ReportDefinition = {
  id: string;
  title: string;
  category: "accounts" | "inventory" | "gst" | "payroll" | "exception" | "audit";
  source: string;
  defaultView: string;
  dimensions: Dimension[];
  measures: Measure[];
  filters: Filter[];
  views: ReportView[];
  drilldowns: Drilldown[];
  basisOptions: BasisOption[];
  exceptionLinks: ExceptionLink[];
  exportProfiles: ExportProfile[];
};
```

Every report should support the same primitives:

- Period/date context.
- Company context.
- View mode.
- Basis of values.
- Drill-down.
- Expand/collapse.
- Filters.
- Saved views.
- Comparison columns.
- Export/print/share.
- AI query mapping.

## Required Modes

### 1. Tally Mode

Purpose: win existing Tally users.

Must support:

- Gateway-style report categories.
- Global report search like Go To.
- Keyboard-first operation.
- Dense tabular layout.
- F2 date/period.
- F3 company.
- F4 context.
- Ctrl+B Basis of Values.
- Ctrl+H Change View / related reports.
- Ctrl+J Exception Reports.
- Ctrl+L Save View.
- Enter drill-down.
- Shift+Enter line expand.
- Alt+F5 detailed view.
- Alt+C or Alt+N comparison column.
- Bottom shortcut bar.
- Right action panel.

Initial reports:

- Day Book.
- Ledger.
- Cash Book.
- Bank Book.
- Trial Balance.
- Balance Sheet.
- Profit and Loss.
- Bills Receivable.
- Bills Payable.
- Stock Summary.
- Ratio Analysis.

### 2. Owner Mode

Purpose: help business owners act without accounting jargon.

Default dashboard tiles:

- Cash and bank position.
- Receivables ageing.
- Payables due this week.
- GST payable/ITC summary.
- Sales trend.
- Gross margin trend.
- Top customers.
- Top suppliers.
- Low stock and stock-out risk.
- Slow moving stock.
- Pending e-invoices.
- Pending GST actions.

Rules:

- Use plain language.
- Show "what changed", "why", and "what to do".
- Every tile must drill down to the same report engine.

### 3. CA/Audit Mode

Purpose: make CAs trust the system and reduce audit work.

Must support:

- Edit log summary.
- Voucher history.
- Deleted/cancelled voucher register.
- Optional and post-dated voucher reports.
- Negative cash/stock/ledger reports.
- Ledger scrutiny.
- Suspicious round-number journals.
- Off-hours edits.
- Duplicate invoice numbers.
- Missing narration.
- Missing GSTIN / invalid GSTIN.
- GST rate mismatch.
- HSN/SAC mismatch.
- Confirmation of accounts.
- Exportable audit workpapers.
- Audit trail chain verification report.

Hard requirement for India:

- Every company using accounting software for books of account needs audit trail/edit log support from FY 2023-24 onward.
- The audit trail must cover each change in books of account, show date/time, remain operational throughout the year, and not be disableable/tamperable.
- Current hash chain is a good start, but coverage must be expanded and tested.

### 4. GST Compliance Mode

Purpose: dominate Indian compliance workflows.

Must support:

- GSTR-1.
- GSTR-3B.
- GSTR-2B reconciliation.
- GSTR-2A reconciliation if maintained.
- IMS inward supplies.
- Challan reconciliation.
- HSN/SAC summary.
- Nil/exempt/non-GST classification.
- Reverse charge.
- Credit/debit note handling.
- E-invoice IRN status.
- E-invoice cancellation status.
- GST filing activity calendar.
- JSON/export formats for GST offline tool or ASP/GSP integration.

Important compliance facts:

- Official e-invoice threshold list shows mandatory e-invoicing for Rs 5 crore to Rs 10 crore AATO from 01-08-2023, with less than Rs 5 crore optional.
- GSTR-1 requires invoice-level outward supply details, credit/debit notes, exports, advances, amendments, nil/exempt/non-GST supplies, and HSN/SAC summary.
- GSTR-3B is required for normal and casual taxpayers, with monthly and quarterly due date rules.

Current risk:

- `server/gst/reconciliationService.js` uses simulated reconciliation statuses based on voucher id modulo arithmetic.
- Replace with imported GST portal/offline JSON, e-invoice data, or GSP data before calling it real reconciliation.

### 5. Exception Mode

Purpose: turn reports into daily action queues.

Queues:

- Overdue receivables.
- Overdue payables.
- Negative stock.
- Negative ledger.
- Negative cash.
- Post-dated vouchers.
- Optional vouchers.
- Pending documents.
- Pending e-invoices.
- Failed IRN generation.
- Unreconciled bank entries.
- GST validation errors.
- Audit trail integrity failure.

Each exception should support:

- Owner.
- Severity.
- Amount impact.
- Due date.
- Suggested action.
- Drill-down to voucher/master.
- Export/share.

### 6. AI Mode

Purpose: beat Tally, not just match it.

Examples:

- "Show customers overdue more than 90 days."
- "Why did cash reduce this month?"
- "Which GST invoices need correction before filing GSTR-1?"
- "Find abnormal journal entries this quarter."
- "Draft reminder letters for top 10 overdue customers."

Implementation rule:

- AI must call the same report definitions and report services used by the UI.
- AI should never query raw tables independently for financial answers.
- Writes remain proposals only, as already designed in `server/ai/tools.js`.

## Report Engine Architecture

### Backend

Add a report registry:

- `server/report/reportRegistry.js`
- `server/report/reportRuntime.js`
- `server/report/definitions/*.js`

The runtime should expose:

- `report:list`
- `report:run`
- `report:getDefinition`
- `report:getSavedViews`
- `report:saveView`
- `report:deleteSavedView`
- `report:export`

`report:run` input:

```json
{
  "report_id": "bills_receivable",
  "company_id": 1,
  "fy_id": 1,
  "context": {
    "from_date": "2026-04-01",
    "to_date": "2026-04-30",
    "as_on_date": "2026-04-30",
    "view": "party_bill_ageing",
    "basis": {
      "include_optional": false,
      "include_post_dated": false,
      "valuation_method": "weighted_average"
    },
    "filters": {},
    "columns": []
  }
}
```

`report:run` output:

```json
{
  "success": true,
  "meta": {
    "report_id": "bills_receivable",
    "title": "Bills Receivable",
    "period_label": "As on 30-Apr-2026",
    "currency": "INR"
  },
  "columns": [],
  "rows": [],
  "totals": {},
  "drilldowns": [],
  "exceptions": [],
  "export_profiles": []
}
```

### Frontend

Build one reusable report shell:

- `client/src/pages/reports/ReportRunner.tsx`
- `client/src/components/reports/ReportTable.tsx`
- `client/src/components/reports/ReportRightPanel.tsx`
- `client/src/components/reports/ReportBottomBar.tsx`
- `client/src/components/reports/ReportCommandPalette.tsx`
- `client/src/components/reports/ReportContextDialog.tsx`
- `client/src/components/reports/SaveViewDialog.tsx`
- `client/src/components/reports/CompareColumnDialog.tsx`

Then replace stub pages with route wrappers:

```tsx
export default function TrialBalance() {
  return <ReportRunner reportId="trial_balance" />;
}
```

## Correctness Work Before Scale

### 1. Bill-wise Outstanding

Current issue:

- `outstandingReportService` only sums `New Ref` and `Advance`.
- It does not fully net `Agst Ref`, partial payments, credit/debit notes, or adjustment references.

Required:

- Full bill allocation ledger:
  - New Ref.
  - Agst Ref.
  - Advance.
  - On Account.
  - Cr/Dr note adjustments.
- Bill-level running balance.
- Ageing by due date and by bill date.
- Party group rollup.
- Reminder letter export.

### 2. Stock Valuation

Current issue:

- `stockSummaryReportService` computes closing value as opening value plus inward amount minus outward amount.
- That is not enough for FIFO, weighted average, standard cost, or realistic COGS.

Required:

- Valuation methods:
  - FIFO.
  - Weighted average.
  - Last purchase.
  - Standard cost.
- Godown-wise valuation.
- Batch/expiry valuation.
- Negative stock treatment.
- Closing stock value into Balance Sheet and P&L.

### 3. Ratio Analysis

Current issue:

- `ratioAnalysisReportService` uses stock item opening value as inventory approximation.

Required:

- Use stock valuation engine closing value.
- Use proper current asset/current liability group tree.
- Add trend mode and comparison columns.

### 4. GST Reconciliation

Current issue:

- Reconciliation status is simulated.

Required:

- Import GST portal/offline JSON/Excel.
- Match by GSTIN, invoice number, date, taxable value, tax values, IRN.
- Statuses:
  - Matched.
  - Value mismatch.
  - Date mismatch.
  - Missing in books.
  - Missing in portal.
  - Duplicate.
  - Probable match.
- Action queue for fixes.

### 5. Audit Trail

Current issue:

- Voucher logging is strong.
- Master/write-path coverage is incomplete.

Required:

- Cover all book-affecting writes:
  - Vouchers.
  - Ledgers.
  - Groups.
  - Stock items.
  - GST registrations.
  - GST classifications.
  - Cost centres.
  - Bank reconciliation changes.
  - E-invoice cancellation.
  - Company settings affecting books.
- Add audit export.
- Add chain verification UI.
- Add tests proving all critical writes emit audit rows.

## Implementation Roadmap

### Phase 1: Make Existing Reports Real

Goal: frontend report screens stop being stubs.

Tasks:

- Create `ReportRunner`.
- Add report registry for existing backend reports.
- Wire:
  - Trial Balance.
  - Balance Sheet.
  - Profit and Loss.
  - Ledger.
  - Cash Book.
  - Bank Book.
  - Day Book.
  - Bills Receivable.
  - Bills Payable.
  - Cash Flow.
  - Funds Flow.
  - Stock Summary.
  - Ratio Analysis.
- Add F2/F3/F4/Ctrl+B/Ctrl+H/Ctrl+J shell behavior.
- Add CSV/XLSX/PDF export.

Success:

- No core accounting report route shows `ReportStub`.
- All report pages use one runtime.

### Phase 2: Tally-Parity UX

Goal: accountants feel at home.

Tasks:

- Global Go To report search.
- Saved views.
- Right button panel.
- Bottom shortcut bar.
- Drill-down stack.
- Expand/collapse.
- Remove/restore lines.
- Add/alter/delete comparison columns.
- Auto-column by month/quarter/year.

Success:

- A Tally user can work reports mostly by keyboard.

### Phase 3: CA-Grade Assurance & India Compliance (Focus of subsequent iterations)
- [x] Real audit trail report UI (display hash verification status).
- [x] GST validation exception report (missing GSTINs, incorrect state codes).
- [x] GSTR-1/GSTR-3B export hardening (JSON generation matching portal schemas).
- [x] Real GSTR-2B/GSTR-1 reconciliation imports.
- [x] E-invoice status report.
- [x] Filing calendar.
- [x] Confirmation of accounts.

Success:

- CA can review books, GST, and audit trail without leaving the app.

### Phase 4: Valuation and Advanced Accounting

Goal: correct inventory and management accounting.

Tasks:

- [x] Stock valuation engine.
- [x] Godown summary.
- [x] Stock ageing.
- [x] Movement analysis.
- [x] Reorder status.
- [x] Cost centre reports.
- [x] Budget vs actual.
- [x] Order outstanding.

Success:

- Stock and profitability reports are trusted for trading/manufacturing users.

### Phase 5: AI-Native Reporting (Completed)
**Goal:** Prove the "Cursor for Tally" value prop.
- [x] Map every `ReportDefinition` to an AI query resource.
- [x] Natural language report creation (e.g., "Show me all sales above 50k").
- [x] Contextual anomaly explanations (e.g., "Why is cash negative?").
- [x] Suggested follow-up actions (drafting reminder letters from receivables).
- [x] GST correction suggestions based on 2B mismatch data.
**Success Criteria:** Users can ask questions in natural language and get drillable, auditable report outputs.

## Non-Negotiables

- Report numbers must reconcile across reports.
- Optional and post-dated vouchers must be basis-controlled and excluded by default.
- Every drill-down must trace to source voucher/master.
- Every export must show company, period, generated time, and basis of values.
- AI answers must cite the report and filters used.
- Audit trail cannot be disableable from UI.
- GST/e-invoice features must not fake portal reconciliation.

## Definition of Done

The report system is ready to challenge Tally in India when:

- Core report pages are real, not stubs.
- Tally keyboard/report navigation is implemented.
- Saved views and comparison columns work.
- GST filing views are exportable and reconcilable.
- Audit trail is complete and verifiable.
- Stock valuation is correct.
- Owners get dashboards from the same report engine.
- CAs get audit/export workflows.
- AI queries call the same report runtime and produce drillable answers.
