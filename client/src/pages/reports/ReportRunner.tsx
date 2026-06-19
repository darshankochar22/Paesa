import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { TallyReportLayout } from "@/components/tally-ui/TallyReportLayout";
import { ReportTable, type ReportColumn, type ComparisonColumn } from "@/components/reports/ReportTable";
import { ReportRightPanel } from "@/components/reports/ReportRightPanel";
import { ReportBottomBar } from "@/components/reports/ReportBottomBar";
import { ReportContextDialog, type ReportContextConfig } from "@/components/reports/ReportContextDialog";
import { SaveViewDialog } from "@/components/reports/SaveViewDialog";
import { CompareColumnDialog } from "@/components/reports/CompareColumnDialog";
import { ReportCommandPalette } from "@/components/reports/ReportCommandPalette";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/shadcn/dialog";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";

interface ReportConfig {
  title: string;
  apiMethod?: string;
  reportId?: string;
  columns: ReportColumn[];
}

const REPORT_DEFINITIONS: Record<string, ReportConfig> = {
  "cash-book": {
    title: "Cash Book",
    apiMethod: "cashBook",
    columns: [
      { header: "Date", field: "date", type: "date" },
      { header: "Voucher Type", field: "voucher_type" },
      { header: "Voucher No", field: "voucher_number" },
      { header: "Particulars / Narration", field: "narration" },
      { header: "Debit (Dr)", field: "debit", type: "currency", align: "right" },
      { header: "Credit (Cr)", field: "credit", type: "currency", align: "right" },
      { header: "Balance", field: "balance", type: "currency", align: "right" },
    ],
    
  },
  "bank-book": {
    title: "Bank Book",
    apiMethod: "bankBook",
    columns: [
      { header: "Date", field: "date", type: "date" },
      { header: "Voucher Type", field: "voucher_type" },
      { header: "Voucher No", field: "voucher_number" },
      { header: "Particulars / Narration", field: "narration" },
      { header: "Debit (Dr)", field: "debit", type: "currency", align: "right" },
      { header: "Credit (Cr)", field: "credit", type: "currency", align: "right" },
      { header: "Balance", field: "balance", type: "currency", align: "right" },
    ],
    
  },
  "ledger": {
    title: "Ledger Vouchers",
    apiMethod: "ledgerReport",
    columns: [
      { header: "Date", field: "date", type: "date" },
      { header: "Voucher Type", field: "voucher_type" },
      { header: "Voucher No", field: "voucher_number" },
      { header: "Debit (Dr)", field: "debit", type: "currency", align: "right" },
      { header: "Credit (Cr)", field: "credit", type: "currency", align: "right" },
      { header: "Balance", field: "balance", type: "currency", align: "right" },
    ],
    
  },
  "group-summary": {
    title: "Group Summary",
    apiMethod: "groupSummary",
    columns: [
      { header: "Particulars", field: "group_name" },
      { header: "Debit (Dr)", field: "debit", type: "currency", align: "right" },
      { header: "Credit (Cr)", field: "credit", type: "currency", align: "right" },
    ],
    
  },
  "sales-register": {
    title: "Sales Register",
    columns: [
      { header: "Month", field: "month" },
      { header: "Transactions Count", field: "count", type: "number", align: "center" },
      { header: "Value", field: "value", type: "currency", align: "right" },
    ],
    
  },
  "purchase-register": {
    title: "Purchase Register",
    columns: [
      { header: "Month", field: "month" },
      { header: "Transactions Count", field: "count", type: "number", align: "center" },
      { header: "Value", field: "value", type: "currency", align: "right" },
    ],
    
  },
  "journal-register": {
    title: "Journal Register",
    columns: [
      { header: "Date", field: "date", type: "date" },
      { header: "Particulars", field: "particulars" },
      { header: "Vch No", field: "voucher_number" },
      { header: "Debit", field: "debit", type: "currency", align: "right" },
      { header: "Credit", field: "credit", type: "currency", align: "right" },
    ],
    
  },
  "debit-note-register": {
    title: "Debit Note Register",
    columns: [
      { header: "Date", field: "date", type: "date" },
      { header: "Supplier Name", field: "particulars" },
      { header: "Vch No", field: "voucher_number" },
      { header: "Amount", field: "amount", type: "currency", align: "right" },
    ],
    
  },
  "credit-note-register": {
    title: "Credit Note Register",
    columns: [
      { header: "Date", field: "date", type: "date" },
      { header: "Customer Name", field: "particulars" },
      { header: "Vch No", field: "voucher_number" },
      { header: "Amount", field: "amount", type: "currency", align: "right" },
    ],
    
  },
  "trial-balance": {
    title: "Trial Balance",
    apiMethod: "trialBalance",
    columns: [
      { header: "Particulars", field: "ledger_name" },
      { header: "Debit (Dr)", field: "debit", type: "currency", align: "right" },
      { header: "Credit (Cr)", field: "credit", type: "currency", align: "right" },
    ],
    
  },
  "profit-loss": {
    title: "Profit & Loss A/c",
    apiMethod: "profitLoss",
    columns: [
      { header: "Particulars", field: "ledger_name" },
      { header: "Amount", field: "balance", type: "currency", align: "right" },
    ],
    
  },
  "balance-sheet": {
    title: "Balance Sheet",
    apiMethod: "balanceSheet",
    columns: [
      { header: "Particulars", field: "ledger_name" },
      { header: "Amount", field: "balance", type: "currency", align: "right" },
    ],
    
  },
  "cash-flow": {
    title: "Cash Flow Statement",
    apiMethod: "cashFlow",
    columns: [
      { header: "Particulars", field: "ledger_name" },
      { header: "Inflow (Receipts)", field: "inflow", type: "currency", align: "right" },
      { header: "Outflow (Payments)", field: "outflow", type: "currency", align: "right" },
      { header: "Net Flow", field: "net", type: "currency", align: "right" },
    ],
    
  },
  "funds-flow": {
    title: "Funds Flow Statement",
    apiMethod: "fundsFlow",
    columns: [
      { header: "Particulars", field: "particulars" },
      { header: "Amount", field: "amount", type: "currency", align: "right" },
    ],
    
  },
  "ratio-analysis": {
    title: "Ratio Analysis",
    apiMethod: "ratioAnalysis",
    columns: [
      { header: "Ratio / Metric", field: "label" },
      { header: "Value", field: "displayValue", align: "right" },
    ],
    
  },
  "stock-summary": {
    title: "Stock Summary",
    apiMethod: "stockSummary",
    columns: [
      { header: "Stock Item", field: "item_name" },
      { header: "Opening Qty", field: "opening_qty", align: "center" },
      { header: "Opening Value", field: "opening_value", type: "currency", align: "right" },
      { header: "Inward Qty", field: "inwards_qty", align: "center" },
      { header: "Inward Value", field: "inwards_value", type: "currency", align: "right" },
      { header: "Outward Qty", field: "outwards_qty", align: "center" },
      { header: "Outward Value", field: "outwards_value", type: "currency", align: "right" },
      { header: "Closing Qty", field: "closing_qty", align: "center" },
      { header: "Closing Value", field: "closing_value", type: "currency", align: "right" },
    ],
    
  },
  "outstandings-receivable": {
    title: "Bills Receivable",
    apiMethod: "billsReceivable",
    columns: [
      { header: "Date", field: "date", type: "date" },
      { header: "Ref No", field: "ref_no" },
      { header: "Party Name", field: "party_name" },
      { header: "Pending Amount", field: "pending_amount", type: "currency", align: "right" },
      { header: "Overdue Days", field: "overdue_days", type: "number", align: "center" },
    ],
    
  },
  "outstandings-payable": {
    title: "Bills Payable",
    apiMethod: "billsPayable",
    columns: [
      { header: "Date", field: "date", type: "date" },
      { header: "Ref No", field: "ref_no" },
      { header: "Party Name", field: "party_name" },
      { header: "Pending Amount", field: "pending_amount", type: "currency", align: "right" },
      { header: "Overdue Days", field: "overdue_days", type: "number", align: "center" },
    ],
    
  },
  "interest-calculations": {
    title: "Interest Calculations",
    columns: [
      { header: "Particulars", field: "party_name" },
      { header: "Principal Amount", field: "principal", type: "currency", align: "right" },
      { header: "Rate", field: "rate" },
      { header: "Interest Amount", field: "interest", type: "currency", align: "right" },
    ],
    
  },
  "cost-centre-summary": {
    title: "Cost Centre Summary",
    apiMethod: "costCentreReport",
    columns: [
      { header: "Cost Centre Name", field: "centre_name" },
      { header: "Debit", field: "debit", type: "currency", align: "right" },
      { header: "Credit", field: "credit", type: "currency", align: "right" },
    ],
    
  },
  "cost-category-summary": {
    title: "Cost Category Summary",
    apiMethod: "costCategorySummary",
    columns: [
      { header: "Cost Category / Centre", field: "category_name" },
      { header: "Debit", field: "debit", type: "currency", align: "right" },
      { header: "Credit", field: "credit", type: "currency", align: "right" },
    ],
    
  },
  "statistics": {
    title: "Statistics",
    apiMethod: "statistics",
    columns: [
      { header: "Type of Register / Vouchers", field: "vch_type" },
      { header: "Total Count", field: "count", type: "number", align: "center" },
    ],
    
  },
  // Inventory
  "stock-item": {
    title: "Stock Item Summary",
    apiMethod: "stockItemSummary",
    columns: [
      { header: "Stock Item", field: "item_name" },
      { header: "Group", field: "group_name" },
      { header: "Inward Qty", field: "in_qty", type: "number", align: "center" },
      { header: "Outward Qty", field: "out_qty", type: "number", align: "center" },
      { header: "Closing Balance", field: "closing_balance", align: "right" },
    ],
    
  },
  "stock-group": {
    title: "Stock Group Summary",
    apiMethod: "stockGroupSummary",
    columns: [
      { header: "Group Name", field: "group_name" },
      { header: "Closing Value", field: "value", type: "currency", align: "right" },
    ],
    
  },
  "stock-category": {
    title: "Stock Category Summary",
    apiMethod: "stockCategorySummary",
    columns: [
      { header: "Category", field: "category_name" },
      { header: "Quantity", field: "qty", align: "center" },
      { header: "Value", field: "value", type: "currency", align: "right" },
    ],
    
  },
  "godown": {
    title: "Godown / Location Report",
    apiMethod: "godownSummary",
    columns: [
      { header: "Location Name", field: "godown_name" },
      { header: "Item Stored", field: "item_count", type: "number", align: "center" },
      { header: "Value", field: "value", type: "currency", align: "right" },
    ],
  },
  "batch-vouchers": {
    title: "Batch Vouchers Report",
    columns: [
      { header: "Batch Name", field: "batch_name" },
      { header: "Expiry Date", field: "expiry", type: "date" },
      { header: "Qty Inward", field: "in_qty", type: "number", align: "center" },
      { header: "Qty Outward", field: "out_qty", type: "number", align: "center" },
    ],
    
  },
  "movement-analysis": {
    title: "Movement Analysis",
    apiMethod: "movementAnalysis",
    columns: [
      { header: "Stock Item / Group", field: "name" },
      { header: "Inward Qty", field: "in_qty", type: "number", align: "center" },
      { header: "Outward Qty", field: "out_qty", type: "number", align: "center" },
    ],
  },
  "sales-order-book": {
    title: "Sales Order Book",
    columns: [
      { header: "Date", field: "date", type: "date" },
      { header: "Order Ref No", field: "ref_no" },
      { header: "Customer", field: "party_name" },
      { header: "Order Value", field: "value", type: "currency", align: "right" },
    ],
    
  },
  "purchase-order-book": {
    title: "Purchase Order Book",
    columns: [
      { header: "Date", field: "date", type: "date" },
      { header: "Order Ref No", field: "ref_no" },
      { header: "Supplier", field: "party_name" },
      { header: "Order Value", field: "value", type: "currency", align: "right" },
    ],
    
  },
  "ageing-analysis": {
    title: "Stock Ageing Analysis",
    apiMethod: "stockAgeing",
    columns: [
      { header: "Stock Item", field: "item_name" },
      { header: "Value", field: "value", type: "currency", align: "right" },
      { header: "0-30 Days", field: "days30", type: "currency", align: "right" },
      { header: "31-60 Days", field: "days60", type: "currency", align: "right" },
      { header: ">60 Days", field: "daysOver", type: "currency", align: "right" },
    ],
  },
  "sales-order-outstanding": {
    title: "Sales Order Outstandings",
    apiMethod: "orderOutstandingSales",
    columns: [
      { header: "Order Date", field: "date", type: "date" },
      { header: "Ref No", field: "ref_no" },
      { header: "Customer Name", field: "party_name" },
      { header: "Outstanding Qty", field: "qty", align: "center" },
      { header: "Amount Outstanding", field: "amount", type: "currency", align: "right" },
    ],
  },
  "purchase-order-outstanding": {
    title: "Purchase Order Outstandings",
    apiMethod: "orderOutstandingPurchase",
    columns: [
      { header: "Order Date", field: "date", type: "date" },
      { header: "Ref No", field: "ref_no" },
      { header: "Supplier Name", field: "party_name" },
      { header: "Outstanding Qty", field: "qty", align: "center" },
      { header: "Amount Outstanding", field: "amount", type: "currency", align: "right" },
    ],
  },
  "work-order-outstanding": {
    title: "Work Order Outstandings",
    columns: [
      { header: "Date", field: "date", type: "date" },
      { header: "Job Work Order", field: "ref_no" },
      { header: "Client Name", field: "party_name" },
      { header: "Status", field: "status" },
    ],
    
  },
  "stock-query": {
    title: "Stock Query",
    columns: [
      { header: "Item Detail", field: "field" },
      { header: "Value / Status", field: "value" },
    ],
    
  },
  "reorder-status": {
    title: "Reorder Status",
    apiMethod: "reorderStatus",
    columns: [
      { header: "Stock Item", field: "item_name" },
      { header: "Closing Stock", field: "closing", align: "center" },
      { header: "Reorder Level", field: "level", align: "center" },
      { header: "Shortage", field: "shortage", align: "center" },
    ],
  },
  "job-work": {
    title: "Job Work Reports",
    columns: [
      { header: "Job / Order", field: "job_name" },
      { header: "Raw Material Issued", field: "issued" },
      { header: "Finished Goods Received", field: "received" },
    ],
    
  },
  "cost-centre": {
    title: "Cost Centre Breakup",
    apiMethod: "costCentreReport",
    columns: [
      { header: "Cost Centre", field: "cost_centre" },
      { header: "Income", field: "income", type: "currency", align: "right" },
      { header: "Expense", field: "expense", type: "currency", align: "right" },
      { header: "Net Variance", field: "variance", type: "currency", align: "right" },
    ],
  },
  "budget-variance": {
    title: "Budget Variance Analysis",
    apiMethod: "budgetVsActual",
    columns: [
      { header: "Ledger", field: "ledger_name" },
      { header: "Budgeted", field: "budget", type: "currency", align: "right" },
      { header: "Actual", field: "actual", type: "currency", align: "right" },
      { header: "Variance", field: "variance", type: "currency", align: "right" },
    ],
  },
  // Exception
  "overdue-receivables": {
    apiMethod: "billsReceivable",
    title: "Overdue Receivables",
    columns: [
      { header: "Party Name", field: "party_name" },
      { header: "Ref No", field: "ref_no" },
      { header: "Overdue Amount", field: "amount", type: "currency", align: "right" },
      { header: "Due Date", field: "due_date", type: "date" },
    ],
    
  },
  "overdue-payables": {
    apiMethod: "billsPayable",
    title: "Overdue Payables",
    columns: [
      { header: "Party Name", field: "party_name" },
      { header: "Ref No", field: "ref_no" },
      { header: "Overdue Amount", field: "amount", type: "currency", align: "right" },
      { header: "Due Date", field: "due_date", type: "date" },
    ],
    
  },
  "pending-documents": {
    title: "Pending Documents",
    columns: [
      { header: "Document Type", field: "doc_type" },
      { header: "Pending Ref", field: "ref_no" },
      { header: "Particulars", field: "particulars" },
    ],
    
  },
  "negative-stock": {
    apiMethod: "run",
    reportId: "negative_stock",
    title: "Negative Stock Items",
    columns: [
      { header: "Stock Item", field: "item_name" },
      { header: "Group", field: "group" },
      { header: "Negative Quantity", field: "qty", align: "center" },
    ],
    
  },
  "negative-ledger": {
    apiMethod: "run",
    reportId: "negative_ledger",
    title: "Negative Ledger Balances",
    columns: [
      { header: "Ledger Name", field: "ledger_name" },
      { header: "Group", field: "group" },
      { header: "Balance", field: "balance", type: "currency", align: "right" },
    ],
    
  },
  "analysis-verification": {
    title: "Analysis & Verification exception",
    columns: [
      { header: "Entity", field: "entity" },
      { header: "Observation / Exception", field: "observation" },
    ],
    
  },
  "edit-log": {
    apiMethod: "run",
    reportId: "audit_trail_verification",
    title: "Audit Trail / Edit Log Summary",
    columns: [
      { header: "Timestamp", field: "timestamp" },
      { header: "Voucher / Master", field: "entity" },
      { header: "Action", field: "action" },
      { header: "User", field: "user" },
    ],
    
  },
  "e-invoice-status": {
    title: "E-Invoice Status Report",
    columns: [
      { header: "Voucher No", field: "voucher_no" },
      { header: "Party Name", field: "party_name" },
      { header: "Amount", field: "amount", type: "currency", align: "right" },
      { header: "IRN Status", field: "irn_status" },
      { header: "E-Way Bill", field: "eway_bill" },
    ],
    
  },
  "filing-calendar": {
    title: "GST Filing Calendar",
    columns: [
      { header: "Return Type", field: "return_type" },
      { header: "Period", field: "period" },
      { header: "Due Date", field: "due_date", type: "date" },
      { header: "Status", field: "status" },
    ],
    
  },
  "confirmation-of-accounts": {
    title: "Confirmation of Accounts",
    columns: [
      { header: "Party Ledger", field: "party_name" },
      { header: "Closing Balance", field: "closing_balance", type: "currency", align: "right" },
      { header: "Confirmation Status", field: "status" },
      { header: "Last Sent On", field: "last_sent" },
    ],
    
  },
  // Payroll
  "payslip": {
    title: "Payslip Report",
    apiMethod: "payslipReport",
    columns: [
      { header: "Employee Name", field: "emp_name" },
      { header: "Gross Salary", field: "gross", type: "currency", align: "right" },
      { header: "Deductions", field: "deductions", type: "currency", align: "right" },
      { header: "Net Paid", field: "net", type: "currency", align: "right" },
    ],
    
  },
  "salary-statement": {
    title: "Salary Statement",
    apiMethod: "salaryStatement",
    columns: [
      { header: "Employee Code / Name", field: "emp_name" },
      { header: "Basic Pay", field: "basic", type: "currency", align: "right" },
      { header: "HRA", field: "hra", type: "currency", align: "right" },
      { header: "Net Salary", field: "net", type: "currency", align: "right" },
    ],
    
  },
  "salary-register": {
    title: "Salary Register",
    apiMethod: "salaryRegister",
    columns: [
      { header: "Month", field: "month" },
      { header: "Total Paid Employees", field: "employees_count", type: "number", align: "center" },
      { header: "Total Payout", field: "total_payout", type: "currency", align: "right" },
    ],
    
  },
  "attendance-register": {
    title: "Attendance Register",
    apiMethod: "attendanceReport",
    columns: [
      { header: "Employee Name", field: "emp_name" },
      { header: "Total Present Days", field: "present", type: "number", align: "center" },
      { header: "Absent Days", field: "absent", type: "number", align: "center" },
      { header: "Paid Leave", field: "leave", type: "number", align: "center" },
    ],
    
  },
  "pay-head-breakup": {
    title: "Pay Head Employee Breakup",
    apiMethod: "payHeadBreakup",
    columns: [
      { header: "Employee Name", field: "emp_name" },
      { header: "Basic Pay Amount", field: "amount", type: "currency", align: "right" },
    ],
    
  },
  "pf": {
    title: "Provident Fund (PF) Report",
    apiMethod: "pfReport",
    columns: [
      { header: "Employee Name", field: "emp_name" },
      { header: "PF Number", field: "pf_no" },
      { header: "Employee Contribution", field: "emp_contrib", type: "currency", align: "right" },
      { header: "Employer Contribution", field: "employer_contrib", type: "currency", align: "right" },
    ],
    
  },
  "esi": {
    title: "Employee State Insurance (ESI) Report",
    apiMethod: "esiReport",
    columns: [
      { header: "Employee Name", field: "emp_name" },
      { header: "ESI Number", field: "esi_no" },
      { header: "Employee Contribution", field: "emp_contrib", type: "currency", align: "right" },
      { header: "Employer Contribution", field: "employer_contrib", type: "currency", align: "right" },
    ],
    
  },
  "professional-tax": {
    title: "Professional Tax (PT) Summary",
    apiMethod: "professionalTax",
    columns: [
      { header: "Employee Name", field: "emp_name" },
      { header: "PT Amount Ded.", field: "amount", type: "currency", align: "right" },
    ],
    
  },
  "gratuity": {
    title: "Gratuity Liability Report",
    apiMethod: "gratuity",
    columns: [
      { header: "Employee Name", field: "emp_name" },
      { header: "Years of Service", field: "years", type: "number", align: "center" },
      { header: "Estimated Gratuity Accrued", field: "gratuity", type: "currency", align: "right" },
    ],
    
  },
};

export function ReportRunner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany, activeFY } = useCompany();

  // Deduce the report type from the pathname, e.g. /reports/accounts/cash-book -> cash-book
  const reportType = React.useMemo(() => {
    const parts = location.pathname.split("/");
    return parts[parts.length - 1];
  }, [location.pathname]);

  const definition = React.useMemo<ReportConfig>(() => {
    return REPORT_DEFINITIONS[reportType] || {
      title: reportType.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      apiMethod: undefined,
      columns: [
        { header: "Particulars", field: "name", align: "left" },
        { header: "Balance / Value", field: "balance", type: "currency", align: "right" }
      ],
    };
  }, [reportType]);

  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Configuration and View State
  const [config, setConfig] = React.useState<ReportContextConfig>({
    basisOfValues: "Accrual",
    showNarration: false,
    showPercentage: false,
    excludeZeroBalances: true,
    detailedFormat: false,
    valuationMethod: "Default",
  });

  const [expandedRows, setExpandedRows] = React.useState<Record<string | number, boolean>>({});
  const [hiddenRowIds, setHiddenRowIds] = React.useState<Set<string | number>>(new Set());
  const [removedLinesHistory, setRemovedLinesHistory] = React.useState<(string | number)[]>([]);
  const [selectedRowIds, setSelectedRowIds] = React.useState<Set<string | number>>(new Set());
  const [comparisonColumns, setComparisonColumns] = React.useState<ComparisonColumn[]>([]);

  const [auditChainStatus] = React.useState<any>(null);
  const companies: any[] = [];

  // Modals
  const [isPeriodOpen, setIsPeriodOpen] = React.useState(false);
  const [isCompanyOpen, setIsCompanyOpen] = React.useState(false);
  const [isContextOpen, setIsContextOpen] = React.useState(false);
  const [isCompareOpen, setIsCompareOpen] = React.useState(false);
  const [isSaveViewOpen, setIsSaveViewOpen] = React.useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = React.useState(false);

  // Dates
  const [fromDate, setFromDate] = React.useState<string>(activeFY?.start_date || "2026-04-01");
  const [toDate, setToDate] = React.useState<string>(activeFY?.end_date || "2027-03-31");

  const loadData = React.useCallback(async () => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      if (definition.apiMethod === "editLogSummary") {
        const res = await window.api.auditTrail.getAll(selectedCompany.company_id, {
          from_date: fromDate,
          to_date: toDate,
          limit: 100
        });
        if (!res.success) throw new Error(res.error);
        const rows = res.logs || [];
        setRows(rows.map((r: any) => ({
          id: r.log_id,
          timestamp: new Date(r.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          entity: `${r.entity_type} ${r.entity_id ? `(#${r.entity_id})` : ""}`,
          action: r.action,
          user: r.user || "System",
        })));
        setLoading(false);
        return;
      }

      if (definition.apiMethod && window.api?.report?.[definition.apiMethod]) {
        let res;
        if (definition.apiMethod === "ledgerReport") {
          res = await window.api.report.ledgerReport(selectedCompany.company_id, activeFY.fy_id, 1, fromDate, toDate);
        } else if (definition.apiMethod === "cashBook" || definition.apiMethod === "daybook" || definition.apiMethod === "bankBook") {
          res = await window.api.report[definition.apiMethod](selectedCompany.company_id, activeFY.fy_id, fromDate, toDate);
        } else if (definition.apiMethod === "cashFlow" || definition.apiMethod === "fundsFlow") {
          res = await window.api.report[definition.apiMethod](selectedCompany.company_id, activeFY.fy_id, fromDate, toDate);
        } else if (definition.apiMethod === "stockSummary") {
          const methodMap: Record<string, string> = { 
            "Default": 'FIFO', 
            "FIFO": 'FIFO', 
            "Average Cost": 'Weighted Average',
            "Weighted Average": 'Weighted Average'
          };
          const valuationMethod = methodMap[config.valuationMethod] || 'FIFO';
          res = await window.api.report.stockSummary(selectedCompany.company_id, activeFY.fy_id, toDate, valuationMethod);
        } else if (["godownSummary", "stockAgeing", "movementAnalysis", "costCentreReport"].includes(definition.apiMethod)) {
          res = await window.api.report[definition.apiMethod](selectedCompany.company_id, activeFY.fy_id, toDate);
        } else if (definition.apiMethod === "orderOutstandingSales") {
          res = await window.api.report.orderOutstanding(selectedCompany.company_id, activeFY.fy_id, "sales");
        } else if (definition.apiMethod === "orderOutstandingPurchase") {
          res = await window.api.report.orderOutstanding(selectedCompany.company_id, activeFY.fy_id, "purchase");
        } else if (definition.apiMethod === "run") {
          res = await window.api.report.run(definition.reportId || reportType.replace(/-/g, '_'), { company_id: selectedCompany.company_id, fy_id: activeFY.fy_id, as_on_date: toDate, from_date: fromDate, to_date: toDate });
        } else {
          res = await window.api.report[definition.apiMethod](selectedCompany.company_id, activeFY.fy_id);
        }

        if (res?.success) {
          let finalRows = [];
          if (Array.isArray(res.rows) && (definition.apiMethod === "billsReceivable" || definition.apiMethod === "billsPayable")) {
            finalRows = res.rows.map((r: any, idx: number) => ({
              id: idx + 1,
              date: r.bill_date,
              ref_no: r.bill,
              party_name: r.party,
              pending_amount: r.balance,
              amount: r.balance,
              due_date: r.due_date,
              overdue_days: r.overdue_days,
            }));
          } else if (Array.isArray(res.rows)) {
            finalRows = res.rows.map((r: any, idx: number) => ({ id: idx + 1, ...r }));
          } else if (res.assets || res.liabilities) {
            const list = [];
            if (res.liabilities) list.push(...res.liabilities.map((l: any, idx: number) => ({ id: `L-${idx}`, ledger_name: l.ledger_name, balance: -Math.abs(l.balance) })));
            if (res.assets) list.push(...res.assets.map((a: any, idx: number) => ({ id: `A-${idx}`, ledger_name: a.ledger_name, balance: Math.abs(a.balance) })));
            finalRows = list;
          } else if (res.income || res.expenses) {
            const list = [];
            if (res.income) list.push(...res.income.map((i: any, idx: number) => ({ id: `I-${idx}`, ledger_name: i.ledger_name, balance: i.balance })));
            if (res.expenses) list.push(...res.expenses.map((e: any, idx: number) => ({ id: `E-${idx}`, ledger_name: e.ledger_name, balance: -e.balance })));
            finalRows = list;
          } else if (Array.isArray(res.vouchers)) {
            finalRows = res.vouchers.map((v: any) => ({
              id: v.voucher_id,
              date: v.date,
              voucher_type: v.voucher_type,
              voucher_number: v.voucher_number,
              narration: v.narration,
              debit: v.amount,
              credit: 0,
            }));
          } else if (definition.apiMethod === "cashFlow" && Array.isArray(res.byCounterLedger)) {
            finalRows = res.byCounterLedger.map((r: any, idx: number) => ({ id: idx + 1, ...r }));
          } else if (definition.apiMethod === "fundsFlow" && Array.isArray(res.sources) && Array.isArray(res.applications)) {
            const list = [];
            list.push({ id: 'src-head', particulars: 'SOURCES OF FUNDS', amount: null, isHeader: true });
            list.push(...res.sources.map((s: any, idx: number) => ({ id: `src-${idx}`, particulars: s.particulars, amount: s.amount })));
            list.push({ id: 'src-total', particulars: 'Total Sources', amount: res.totalSources, isTotal: true });
            list.push({ id: 'app-head', particulars: 'APPLICATIONS OF FUNDS', amount: null, isHeader: true });
            list.push(...res.applications.map((a: any, idx: number) => ({ id: `app-${idx}`, particulars: a.particulars, amount: a.amount })));
            list.push({ id: 'app-total', particulars: 'Total Applications', amount: res.totalApplications, isTotal: true });
            list.push({ id: 'net-wc', particulars: res.isNetIncrease ? 'Net Increase in Working Capital' : 'Net Decrease in Working Capital', amount: Math.abs(res.netWorkingCapitalChange), isTotal: true });
            finalRows = list;
          } else if (definition.apiMethod === "stockSummary" && Array.isArray(res.items)) {
            finalRows = res.items.map((r: any, idx: number) => ({ id: idx + 1, ...r }));
          } else if (definition.apiMethod === "ratioAnalysis" && Array.isArray(res.ratios)) {
            finalRows = res.ratios.map((r: any, idx: number) => {
              let displayValue = String(r.value);
              if (r.value !== null && r.value !== undefined) {
                if (r.unit === '%') {
                  displayValue = `${r.value}%`;
                } else if (r.unit === 'x') {
                  displayValue = `${r.value} x`;
                } else if (r.unit === 'amount') {
                  displayValue = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(r.value);
                }
              } else {
                displayValue = "n/a";
              }
              return { id: idx + 1, label: r.label, displayValue };
            });
          }
          setRows(finalRows);
        } else {
          setError(res?.error || "Failed to load database report.");
          setRows([]);
        }
      } else {
        setError(`Report API method '\${definition.apiMethod}' is missing or not implemented.`);
        setRows([]);
      }
    } catch (err: any) {
      console.error(err);
      setError(`Error accessing database: \${err.message || "Unknown error"}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [definition, selectedCompany, activeFY, fromDate, toDate, config.valuationMethod]);

  React.useEffect(() => {
    loadData();
    setHiddenRowIds(new Set());
    setRemovedLinesHistory([]);
    setComparisonColumns([]);
  }, [loadData, reportType]);

  const handleExportCSV = React.useCallback(() => {
    if (!definition || !rows.length) return;
    const title = definition.title;
    const companyName = selectedCompany?.name || "Unknown Company";
    const basisOfValues = config.basisOfValues || "Accrual";
    const columns = definition.columns;
    
    const metadata = [
      `Report,${title}`,
      `Company,${companyName}`,
      `Period,${fromDate} to ${toDate}`,
      `Basis of Values,${basisOfValues}`,
      `Generated At,${new Date().toLocaleString()}`,
      "", // empty line
    ];

    const headerRow = columns.map(c => `"${c.header}"`).join(",");
    const dataRows = rows.filter(r => !hiddenRowIds.has(r.id)).map(row => {
      return columns.map(c => {
        let val = row[c.field] ?? "";
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(",");
    });

    const csvContent = metadata.join("\n") + "\n" + headerRow + "\n" + dataRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${title.toLowerCase().replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [definition, rows, selectedCompany, config, fromDate, toDate, hiddenRowIds]);

  const handlePrint = React.useCallback(() => {
    window.print();
  }, []);

  // Keyboard shortcut handlers (Tally-parity)
  React.useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Escape checks
      if (e.key === "Escape") {
        return; // Layout will handle going back
      }

      // Check if inputs have focus
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "SELECT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.closest("[role='dialog']"))
      ) {
        return;
      }

      // F2 Date/Period
      if (e.key === "F2") {
        e.preventDefault();
        setIsPeriodOpen(true);
      }
      // F3 Company Selection
      if (e.key === "F3") {
        e.preventDefault();
        setIsCompanyOpen(true);
      }
      // F4 Context Options
      if (e.key === "F4") {
        e.preventDefault();
        setIsContextOpen(true);
      }
      // Ctrl+B Basis of Values
      if (e.key === "b" && e.ctrlKey) {
        e.preventDefault();
        setConfig(prev => ({
          ...prev,
          basisOfValues: prev.basisOfValues === "Accrual" ? "Cash" : "Accrual"
        }));
      }
      // Ctrl+H Change View
      if (e.key === "h" && e.ctrlKey) {
        e.preventDefault();
        setIsPaletteOpen(true);
      }
      // Ctrl+J Exception Reports
      if (e.key === "j" && e.ctrlKey) {
        e.preventDefault();
        navigate("/reports/exception");
      }
      // Ctrl+L Save View
      if (e.key === "l" && e.ctrlKey) {
        e.preventDefault();
        setIsSaveViewOpen(true);
      }
      // Alt+F5 Toggle Detailed
      if (e.key === "F5" && e.altKey) {
        e.preventDefault();
        setConfig(prev => ({ ...prev, detailedFormat: !prev.detailedFormat }));
      }
      // Alt+C Add comparison column
      if (e.key === "c" && e.altKey) {
        e.preventDefault();
        setIsCompareOpen(true);
      }
      // Alt+N Delete comparison column
      if (e.key === "n" && e.altKey) {
        e.preventDefault();
        if (comparisonColumns.length > 0) {
          setComparisonColumns(prev => prev.slice(0, -1));
        }
      }
      // Alt+U Restore Line
      if (e.key === "u" && e.altKey) {
        e.preventDefault();
        handleRestoreLastLine();
      }
      // Alt+E Export
      if (e.key === "e" && e.altKey) {
        e.preventDefault();
        handleExportCSV();
      }
      // Alt+P Print
      if (e.key === "p" && e.altKey) {
        e.preventDefault();
        handlePrint();
      }
      // Alt+A Ask AI
      if (e.key === "a" && e.altKey) {
        e.preventDefault();
        let prompt = `Analyze the ${definition.title} from ${fromDate} to ${toDate}. Explain any anomalies and suggest follow-up actions.`;
        if (reportType === "overdue-receivables" || definition.apiMethod === "billsReceivable") {
          prompt = `Analyze the ${definition.title} from ${fromDate} to ${toDate}. Please draft reminder letters for the overdue accounts and suggest follow-up actions.`;
        }
        navigate("/utilities/copilot", { state: { initialPrompt: prompt } });
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [comparisonColumns, navigate, handleExportCSV, handlePrint]);

  // Removing/Hiding lines
  const handleHideRow = (rowId: string | number) => {
    setHiddenRowIds((prev) => {
      const copy = new Set(prev);
      copy.add(rowId);
      return copy;
    });
    setRemovedLinesHistory((prev) => [...prev, rowId]);
  };

  const handleRestoreLastLine = () => {
    if (removedLinesHistory.length === 0) return;
    const historyCopy = [...removedLinesHistory];
    const restoredId = historyCopy.pop();
    setRemovedLinesHistory(historyCopy);
    if (restoredId !== undefined) {
      setHiddenRowIds((prev) => {
        const copy = new Set(prev);
        copy.delete(restoredId);
        return copy;
      });
    }
  };

  const handleToggleSelectRow = (rowId: string | number) => {
    setSelectedRowIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(rowId)) {
        copy.delete(rowId);
      } else {
        copy.add(rowId);
      }
      return copy;
    });
  };

  const handleToggleExpand = (rowId: string | number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  const handleAddComparisonColumn = (colConfig: {
    companyId: number;
    companyName: string;
    fromDate: string;
    toDate: string;
  }) => {
    const newCol: ComparisonColumn = {
      id: `${colConfig.companyId}-${colConfig.fromDate}-${colConfig.toDate}`,
      companyId: colConfig.companyId,
      companyName: colConfig.companyName,
      fromDate: colConfig.fromDate,
      toDate: colConfig.toDate,
    };
    setComparisonColumns((prev) => [...prev, newCol]);
  };



  // List of all reports for Go To search
  const commandPaletteItems = React.useMemo(() => {
    return Object.entries(REPORT_DEFINITIONS).map(([key, value]) => ({
      title: value.title,
      path: `/reports/accounts/${key}`, // standard mapping logic
      category: "Reports",
      description: `Run and analyze ${value.title}`,
    }));
  }, []);

  const totalText = React.useMemo(() => {
    if (rows.length === 0) return undefined;
    // Compute total sum of number/currency fields if applicable
    const currencyCols = definition.columns.filter((c) => c.type === "currency");
    if (currencyCols.length === 0) return `Total Rows: ${rows.length}`;

    const totals = currencyCols.map((col) => {
      const sum = rows
        .filter((r) => !hiddenRowIds.has(r.id))
        .reduce((acc, r) => acc + (Number(r[col.field]) || 0), 0);
      return `${col.header}: ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(sum)}`;
    });
    return totals.join(" | ");
  }, [rows, definition, hiddenRowIds]);

  return (
    <TallyReportLayout
      title={definition.title}
      companyName={selectedCompany?.name || "No Company Selected"}
      leftSubtitle={
        <div className="flex gap-4 items-center">
          <span>Basis of Values: <span className="font-bold">{config.basisOfValues}</span></span>
          <span>Valuation: <span className="font-bold">{config.valuationMethod}</span></span>
          {reportType === "edit-log" && auditChainStatus && (
            <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${auditChainStatus.intact ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
              {auditChainStatus.intact ? '✔ Chain Intact' : `⚠ Chain Broken at Log #${auditChainStatus.brokenAt}`}
            </span>
          )}
        </div>
      }
      rightSubtitle={
        <span>
          Period: <span className="font-bold">{fromDate}</span> to <span className="font-bold">{toDate}</span>
        </span>
      }
    >
      <div className="flex h-full w-full overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 font-mono text-xs">
            Loading report data...
          </div>
        ) : (
          <ReportTable
            columns={definition.columns}
            rows={rows}
            comparisonColumns={comparisonColumns}
            expandedRows={expandedRows}
            onToggleExpand={handleToggleExpand}
            hiddenRowIds={hiddenRowIds}
            onHideRow={handleHideRow}
            selectedRowIds={selectedRowIds}
            onToggleSelectRow={handleToggleSelectRow}
            primaryKey="id"
            detailedFormat={config.detailedFormat}
            onRowDrillDown={(row) => {
              // Standard Tally Drill-down logic:
              // If we double-click/enter a row, we can drill down.
              if (row.ledger_name) {
                navigate(`/reports/accounts/ledger`);
              }
            }}
          />
        )}

        <ReportRightPanel
          onPeriodSelect={() => setIsPeriodOpen(true)}
          onCompanySelect={() => setIsCompanyOpen(true)}
          onContextSelect={() => setIsContextOpen(true)}
          onBasisOfValues={() =>
            setConfig(prev => ({
              ...prev,
              basisOfValues: prev.basisOfValues === "Accrual" ? "Cash" : "Accrual"
            }))
          }
          onChangeView={() => setIsPaletteOpen(true)}
          onExceptionReports={() => navigate("/reports/exception")}
          onSaveView={() => setIsSaveViewOpen(true)}
          onToggleDetailed={() => setConfig(prev => ({ ...prev, detailedFormat: !prev.detailedFormat }))}
          isDetailed={config.detailedFormat}
          onAddColumn={() => setIsCompareOpen(true)}
          onDeleteColumn={() => {
            if (comparisonColumns.length > 0) {
              setComparisonColumns(prev => prev.slice(0, -1));
            }
          }}
          onRemoveLine={() => {
            // Hide the first selected, or the first row in the list
            const visible = rows.filter((r) => !hiddenRowIds.has(r.id));
            if (visible.length > 0) {
              handleHideRow(visible[0].id);
            }
          }}
          onRestoreLine={handleRestoreLastLine}
          canRestore={removedLinesHistory.length > 0}
          onExportCSV={handleExportCSV}
          onPrint={handlePrint}
          onAskAI={() => {
            let prompt = `Analyze the ${definition.title} from ${fromDate} to ${toDate}. Explain any anomalies and suggest follow-up actions.`;
            if (reportType === "overdue-receivables" || definition.apiMethod === "billsReceivable") {
              prompt = `Analyze the ${definition.title} from ${fromDate} to ${toDate}. Please draft reminder letters for the overdue accounts and suggest follow-up actions.`;
            }
            navigate("/utilities/copilot", { state: { initialPrompt: prompt } });
          }}
        />
      </div>

      <ReportBottomBar
        statusText={error ? "SIMULATED DATA" : "READY"}
        totalText={totalText}
        shortcuts={[
          { key: "F2", label: "Period" },
          { key: "F3", label: "Company" },
          { key: "F4", label: "Config" },
          { key: "Ctrl+B", label: "Basis" },
          { key: "Ctrl+H", label: "GoTo" },
          { key: "Ctrl+L", label: "Save View" },
          { key: "Alt+U", label: "Restore" },
          { key: "Alt+E", label: "Export" },
          { key: "Alt+P", label: "Print" },
        ]}
      />

      {/* F2 Period Modal */}
      <Dialog open={isPeriodOpen} onOpenChange={(open) => !open && setIsPeriodOpen(false)}>
        <DialogContent className="sm:max-w-md bg-white text-zinc-900 border border-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 font-bold">Select Period (F2)</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-700">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs h-9 border-zinc-300 focus:border-emerald-500 focus:ring-emerald-500 text-zinc-900"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-700">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs h-9 border-zinc-300 focus:border-emerald-500 focus:ring-emerald-500 text-zinc-900"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 bg-zinc-50 border-t border-zinc-100 p-3 -mx-4 -mb-4 rounded-b-xl">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPeriodOpen(false)}
              className="text-xs border-zinc-300 hover:bg-zinc-100 text-zinc-700"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                loadData();
                setIsPeriodOpen(false);
              }}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Set Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* F3 Company Modal */}
      <Dialog open={isCompanyOpen} onOpenChange={(open) => !open && setIsCompanyOpen(false)}>
        <DialogContent className="sm:max-w-md bg-white text-zinc-900 border border-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 font-bold">Change Company (F3)</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4">
            {companies.map((comp) => (
              <button
                key={comp.company_id}
                onClick={async () => {
                  if (window.api?.company) {
                    const full = await window.api.company.getById(comp.company_id);
                    if (full.success) {
                      // Note: We normally triggersetSelectedCompany via CompanyContext,
                      // but for localized change, we can switch active.
                      window.location.reload();
                    }
                  }
                  setIsCompanyOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold border rounded hover:bg-zinc-50 ${
                  comp.company_id === selectedCompany?.company_id
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-950 font-bold"
                    : "border-zinc-200 text-zinc-700"
                }`}
              >
                {comp.name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* F4/F12 Context Modal */}
      <ReportContextDialog
        isOpen={isContextOpen}
        onClose={() => setIsContextOpen(false)}
        config={config}
        onSave={(newConfig) => setConfig(newConfig)}
      />

      {/* Ctrl+L Save View Modal */}
      <SaveViewDialog
        isOpen={isSaveViewOpen}
        onClose={() => setIsSaveViewOpen(false)}
        onSave={async (name) => {
          if (window.api?.report?.saveView && selectedCompany?.company_id) {
            const res = await window.api.report.saveView({
              company_id: selectedCompany.company_id,
              name,
              reportId: reportType,
              config,
              fromDate,
              toDate,
            });
            if (res.success) {
              alert(`Saved view "${name}" successfully!`);
            } else {
              alert(`Failed to save view: ${res.error}`);
            }
          } else {
            console.log(`Saved view ${name} with config:`, config, { fromDate, toDate });
          }
        }}
        defaultName={`${definition.title} Custom View`}
      />

      {/* Alt+C Compare Column Modal */}
      <CompareColumnDialog
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        onAdd={handleAddComparisonColumn}
        companies={companies}
        currentCompanyId={selectedCompany?.company_id}
        defaultFromDate={fromDate}
        defaultToDate={toDate}
      />

      {/* Ctrl+H Command Palette */}
      <ReportCommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelect={(path) => navigate(path)}
        items={commandPaletteItems}
      />
    </TallyReportLayout>
  );
}
