# Payroll Reports — Implementation Plan

Issues: #125, #126, #127, #128, #129, #131

## Audit Findings (as of 2026-06-29)

### What's DONE (no action needed)

- All 8 payroll report backend services in `server/report/payrollReportService.js`
- All IPC handlers registered in `server/ipc/registerReportHandlers.js` (lines 105-113)
- All preload.js bridges wired (lines 253-261)
- All 8 layout components exist in `client/src/components/reports/`:
  - `MultiPaySlipLayout.tsx` — #125 Pay Slip (complex SelectionPopup → All → Detail drill)
  - `PaySheetLayout.tsx` — #126 Pay Sheet
  - `AttendanceSheetLayout.tsx` — #127 Attendance Sheet
  - `PaymentAdviceLayout.tsx` — #128 Payment Advice
  - `EmployeesWithoutEmailLayout.tsx` — #129 Employees Without Email
  - `PayrollStatementLayout.tsx` — #131 Payroll Statement
  - `EmployeePayHeadBreakupLayout.tsx` — #131 Employee Pay Head Breakup
  - `PayHeadEmployeeBreakupLayout.tsx` — #131 Pay Head Employee Breakup

### What's MISSING

1. Routes in `client/src/routes/reportRoutes.tsx` — none of the `/reports/payroll-hr/*` sub-routes exist; they fall to the ReportRunner catch-all
2. `PageTitleBar` in 7 simpler layouts (MultiPaySlipLayout has its own select UI header)

## Issue-by-Issue Plan

### #125 — Pay Slip

- **Route to add:** `/reports/payroll-hr/pay-slip` → `<MultiPaySlipLayout />`
- **Layout:** Already complete with SelectionPopup → Multi Pay Slip table → Individual slip drill
- **PageTitleBar:** MultiPaySlipLayout has its own header in select step; add PageTitleBar to "all" and "detail" steps
- **Status after fix:** Route wired; layout self-contained

### #126 — Pay Sheet

- **Route to add:** `/reports/payroll-hr/pay-sheet` → `<PaySheetLayout />`
- **Layout:** Complete; needs `PageTitleBar` with title "Pay Sheet"
- **Columns:** Particulars | Total Earnings | Total Deductions | Net Amount | Grand Total

### #127 — Attendance Sheet

- **Route to add:** `/reports/payroll-hr/attendance-sheet` → `<AttendanceSheetLayout />`
- **Layout:** Complete; needs `PageTitleBar` with title "Attendance Sheet"
- **Columns:** Particulars | Present | Absent | Leave | Total Days

### #128 — Payment Advice

- **Route to add:** `/reports/payroll-hr/payment-advice` → `<PaymentAdviceLayout />`
- **Layout:** Complete; needs `PageTitleBar` with title "Payment Advice"
- **Columns:** Sl.No | Name | Account No. | Bank Name | IFSC Code | Amount

### #129 — Employees Without Email IDs

- **Route to add:** `/reports/payroll-hr/employees-without-email` → `<EmployeesWithoutEmailLayout />`
- **Layout:** Complete; needs `PageTitleBar` with title "Employees Without E-mail IDs"
- **Columns:** Name | Employee Code | Designation | Department

### #131 — Payroll Statements + Pay Head Breakups

Three routes needed:

- `/reports/payroll-hr/payroll-statement` → `<PayrollStatementLayout />`
- `/reports/payroll-hr/employee-pay-head-breakup` → `<EmployeePayHeadBreakupLayout />`
- `/reports/payroll-hr/pay-head-employee-breakup` → `<PayHeadEmployeeBreakupLayout />`
- All three layouts: complete; need `PageTitleBar`

## Execution Order

1. **#125 Pay Slip** — add route only (layout self-contained)
2. **#126 Pay Sheet** — add PageTitleBar + route
3. **#127 Attendance Sheet** — add PageTitleBar + route
4. **#128 Payment Advice** — add PageTitleBar + route
5. **#129 Employees Without Email** — add PageTitleBar + route
6. **#131** (3 reports) — add PageTitleBar to each + add 3 routes

## Status — DONE (one at a time, each tested + committed separately)

- [x] #125 Pay Slip — route wired; backend already tested (3 tests). Commit 64963b4
- [x] #126 Pay Sheet — route + PageTitleBar + 2 backend tests. Commit 1edf719
- [x] #127 Attendance Sheet — route + PageTitleBar + 2 backend tests. Commit b88c0fd
- [x] #128 Payment Advice — route + PageTitleBar + 1 backend test. Commit 62713b3
- [x] #129 Employees Without Email — route + PageTitleBar + 2 backend tests. Commit 1d4148f
- [x] #131 Statement + 2 Breakups — routes + PageTitleBar + 3 backend tests. Commit 2266fdb

All 13 payrollReports.test.js tests pass; full payroll suite 67/67 green. Pushed to main.

### Test gotcha (cost a failing run)

`createTestCompany` seeds DEFAULT pay heads (Basic Salary, House Rent Allowance,
Provident Fund, …) AND default attendance types (Present, Absent, Paid Leave, …).
`payHeadService.create` / `attendanceTypeService.create` reject duplicate names.
→ In tests, always use unique "Test … NNN" pay head names, and LOOK UP seeded
attendance type IDs via getAll rather than re-creating them.

## Remaining (user action)

- Verify each report in the Electron app, then close #125–#131 on GitHub.
  (Agent was blocked from auto-closing — issues stay open for user to confirm.)
