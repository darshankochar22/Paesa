/** Typed route path constants — prevents string typos in navigate() calls. */

export const ROUTES = {
  HOME: "/",

  // Company
  COMPANY: "/company",
  COMPANY_CREATE: "/company/create",
  COMPANY_ALTER: "/company/alter",

  // Master hubs
  MASTER_CREATE: "/master/create",
  MASTER_ALTER: "/master/alter",
  MASTER_COA: "/master/coa",
  MASTER_FINANCIAL_YEARS: "/master/financial-years",

  // Transactions
  VOUCHERS: "/transactions/vouchers",
  VOUCHER_LIST: "/transactions/voucher-list",
  VOUCHER_VIEW: (id: string | number) => `/transactions/voucher/${id}`,
  DAYBOOK: "/transactions/daybook",

  // Utilities
  BANKING: "/utilities/banking",
  COPILOT: "/utilities/copilot",

  // Report top-level menus
  REPORTS_DISPLAY_MORE: "/reports/display-more",
  REPORTS_ACCOUNT_BOOKS: "/reports/account-books",
  REPORTS_STATEMENTS_OF_ACCOUNTS: "/reports/statements-of-accounts",
  REPORTS_INVENTORY_BOOKS: "/reports/inventory-books",
  REPORTS_STATEMENTS_OF_INVENTORY: "/reports/statements-of-inventory",
  REPORTS_EXCEPTION: "/reports/exception",
  REPORTS_PAYROLL: "/reports/payroll-hr",
  REPORTS_JOB_WORK: "/reports/job-work",

  // Accounts reports
  REPORTS_LEDGER: "/reports/accounts/ledger",
  REPORTS_GROUP_SUMMARY: "/reports/accounts/group-summary",
  REPORTS_SALES_REGISTER: "/reports/accounts/sales-register",
  REPORTS_PURCHASE_REGISTER: "/reports/accounts/purchase-register",
  REPORTS_JOURNAL_REGISTER: "/reports/accounts/journal-register",
  REPORTS_PROFIT_LOSS: "/reports/accounts/profit-loss",
  REPORTS_BALANCE_SHEET: "/reports/accounts/balance-sheet",
  REPORTS_CASH_FLOW: "/reports/accounts/cash-flow",
  REPORTS_FUNDS_FLOW: "/reports/accounts/funds-flow",
  REPORTS_RATIO_ANALYSIS: "/reports/accounts/ratio-analysis",
  REPORTS_OUTSTANDINGS_RECEIVABLE: "/reports/accounts/outstandings-receivable",
  REPORTS_OUTSTANDINGS_PAYABLE: "/reports/accounts/outstandings-payable",
  REPORTS_COST_CENTRE_SUMMARY: "/reports/accounts/cost-centre-summary",
  REPORTS_COST_CATEGORY_SUMMARY: "/reports/accounts/cost-category-summary",
  REPORTS_STATISTICS: "/reports/accounts/statistics",
  REPORTS_CASH_BANK: "/reports/accounts/cash-bank",

  // Inventory reports
  REPORTS_STOCK_SUMMARY: "/reports/inventory/stock-summary",
  REPORTS_STOCK_ITEM: "/reports/inventory/stock-item",
  REPORTS_STOCK_GROUP: "/reports/inventory/stock-group",
  REPORTS_STOCK_CATEGORY: "/reports/inventory/stock-category",
  REPORTS_GODOWN: "/reports/inventory/godown",
  REPORTS_GODOWN_SUMMARY: "/reports/inventory/godown-summary",
  REPORTS_STOCK_QUERY: "/reports/inventory/stock-query",
  REPORTS_MOVEMENT_ANALYSIS: "/reports/inventory/movement-analysis",
  REPORTS_AGEING_ANALYSIS: "/reports/inventory/ageing-analysis",
  REPORTS_REORDER_STATUS: "/reports/inventory/reorder-status",

  // GST
  MASTER_GST_TRACK: "/master/statutory/gst/track-activities",
  MASTER_GSTR1: "/master/statutory/gstr1",
  MASTER_GSTR3B: "/master/statutory/gstr3b",
  MASTER_GSTR2A_RECON: "/master/statutory/gstr2a/reconciliation",
  MASTER_GSTR2B_RECON: "/master/statutory/gstr2b/reconciliation",

  // Dynamic
  REPORT: (category: string, slug: string) => `/reports/${category}/${slug}`,
  LEDGER_MONTHLY_SUMMARY: (ledgerId: string | number) => `/reports/accounts/ledger-summary/${ledgerId}`,
  GROUP_SUMMARY_DETAIL: (groupId: string | number) => `/reports/accounts/group-summary/${groupId}`,
} as const;
