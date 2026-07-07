/** Report types that render a dedicated layout component — not the generic ReportTable. */
export const LAYOUT_ONLY_REPORTS = new Set([
  "balance-sheet",
  "stock-summary",
  "profit-loss",
  "trial-balance",
  "group-summary",
  "ledger-summary",
  "ledger",
  "ratio-analysis",
  "cash-book",
  "bank-book",
  "cash-bank",
  "group-vouchers",
  "voucher-clarification",
  "outstandings-receivable",
  "outstandings-payable",
  "ledger-outstandings",
  "group-outstandings",
  "outstandings-ledger",
  "outstandings-group",
  "interest-receivable",
  "interest-payable",
  "interest-calculation-ledger-wise",
  "interest-calculation-group-wise",
  "cost-category-summary",
  "cost-centre-summary",
  "cost-centre-break-up",
  "cost-centre-ledger",
  "cost-centre-wise-p-and-l",
  "stock-item",
  "stock-query",
  "contra-register",
  "payment-register",
  "receipt-register",
  "sales-register",
  "purchase-register",
  "credit-note-register",
  "debit-note-register",
  "journal-register",
  "memorandum-register",
  "statistics",
  "pay-slip",
  "pay-sheet",
  "attendance-sheet",
  "payment-advice",
  "employees-without-email",
  "payroll-statement",
  "employee-pay-head-breakup",
  "pay-head-employee-breakup",
]);

/** Numeric columns that should display as currency (INR). */
export const CURRENCY_FIELDS = new Set([
  "balance", "debit", "credit", "amount", "total", "value",
  "opening_balance", "closing_balance", "opening_value", "closing_value",
  "inwards_value", "outwards_value", "taxable_value", "invoice_value",
  "gross", "deductions", "net", "current_period", "previous_period", "variance",
  "total_debit", "total_credit", "net_balance", "total_amount", "total_debt",
  "equity", "working_capital", "total_allocated", "actual", "budget",
  "inflow", "outflow", "in_value", "out_value", "net_value",
  "emp_contrib", "employer_contrib", "gratuity", "total_payout",
  "totalAssets", "totalLiabilities", "totalIncome", "totalExpenses", "netProfit",
  "totalSources", "totalApplications", "totalInflow", "totalOutflow", "netCashFlow",
  "closing_qty", "opening_qty", "inwards_qty", "outwards_qty",
  "reorder_level", "reorder_qty", "shortage",
  "fifo_value", "avg_rate", "closing_rate",
]);

/** Date columns for display formatting. */
export const DATE_FIELDS = new Set([
  "date", "bill_date", "due_date", "from_date", "to_date", "as_on_date",
  "voucher_date", "reconciled_date", "bank_date",
  "last_inward_date", "first_bill_date", "last_bill_date",
  "created_at", "updated_at", "timestamp",
]);

/** Numeric (non-currency) columns for right-alignment. */
export const NUMBER_FIELDS = new Set([
  "count", "voucher_count", "employees_count", "item_count", "ledger_count",
  "cost_centre_count", "transaction_count", "bill_count",
  "present", "absent", "leave", "overdue_days",
  "days30", "days60", "daysOver", "days_since_inward", "years", "invoice_count",
  "totalClosingQty", "totalClosingValue",
  "total_debit", "total_credit", "net",
  "in_qty", "out_qty", "closing_qty", "opening_qty",
  "inwards_qty", "outwards_qty", "quantity", "total_qty",
]);

/** ID/internal fields that should never appear as columns. */
export const SKIP_FIELDS = new Set([
  "id", "isHeader", "isTotal", "is_header", "is_total",
  "group_id", "ledger_id", "item_id", "cc_id", "sg_id", "godown_id",
  "employee_id", "entry_id", "voucher_id", "bill_id", "structure_id",
  "pay_head_id", "batch_id", "reconciliation_id", "irn_id", "log_id",
  "tds_id", "tcs_id", "gst_id", "fy_id", "company_id",
]);

/** Keyword suffixes that indicate a currency field (used for fallback detection). */
export const CURRENCY_KEYWORDS = [
  "amount", "value", "balance", "debit", "credit", "total",
  "variance", "price", "cost", "profit", "payout", "contrib",
  "gratuity", "inflow", "outflow", "rate", "capital", "equity", "debt",
] as const;

/** Keyword suffixes that indicate a count/quantity field (fallback detection). */
export const NUMBER_KEYWORDS = [
  "count", "qty", "quantity", "days", "years", "present", "absent", "leave",
] as const;
