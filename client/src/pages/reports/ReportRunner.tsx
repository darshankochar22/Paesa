import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { TallyReportLayout } from "@/components/tally-ui/TallyReportLayout";
import { ReportTable, type ComparisonColumn } from "@/components/reports/ReportTable";
import { ReportRightPanel } from "@/components/reports/ReportRightPanel";
import { ReportContextDialog, type ReportContextConfig } from "@/components/reports/ReportContextDialog";
import { SaveViewDialog } from "@/components/reports/SaveViewDialog";
import { CompareColumnDialog } from "@/components/reports/CompareColumnDialog";
import { ReportCommandPalette } from "@/components/reports/ReportCommandPalette";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/shadcn/dialog";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { REPORT_DEFINITIONS, REPORT_CATEGORIES, type ReportConfig } from "./reportDefinitions";
import { BalanceSheetLayout } from "@/components/reports/BalanceSheetLayout";
import { StockSummaryLayout } from "@/components/reports/StockSummaryLayout";
import { TrialBalanceLayout } from "@/components/reports/TrialBalanceLayout";
import { ProfitLossLayout } from "@/components/reports/ProfitnLossLayout";

export function ReportRunner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany, activeFY } = useCompany();

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

  const isRegister = [
    "sales-register",
    "purchase-register",
    "journal-register",
    "debit-note-register",
    "credit-note-register"
  ].includes(reportType);

  const [focusedIndex, setFocusedIndex] = React.useState<number>(0);

  // Reset focused index when reportType changes
  React.useEffect(() => {
    setFocusedIndex(0);
  }, [reportType]);

  const handleRegisterRowDrilldown = React.useCallback((row: any) => {
    if (!row) return;
    const voucherTypeMap: Record<string, string> = {
      "sales-register": "Sales",
      "purchase-register": "Purchase",
      "journal-register": "Journal",
      "debit-note-register": "Debit Note",
      "credit-note-register": "Credit Note"
    };
    const vchType = voucherTypeMap[reportType];
    navigate(`/transactions/voucher-list?type=${vchType}&month=${row.month}`);
  }, [reportType, navigate]);

  React.useEffect(() => {
    if (!isRegister || loading || rows.length === 0) return;

    const handleRegisterKeys = (e: KeyboardEvent) => {
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

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex(prev => Math.min(rows.length - 1, prev + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const activeRow = rows[focusedIndex];
        if (activeRow) {
          handleRegisterRowDrilldown(activeRow);
        }
      }
    };

    window.addEventListener("keydown", handleRegisterKeys);
    return () => window.removeEventListener("keydown", handleRegisterKeys);
  }, [isRegister, loading, rows, focusedIndex, handleRegisterRowDrilldown]);

  const formatCurrency = (val: any) => {
    const num = Number(val);
    if (isNaN(num) || num === 0) return "";
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatNumber = (val: any) => {
    const num = Number(val);
    if (isNaN(num) || num === 0) return "";
    return num.toLocaleString("en-IN");
  };

  const renderRegisterChart = () => {
    const chartHeight = 140;
    const padding = { top: 15, right: 20, bottom: 20, left: 55 };
    const width = 800;
    
    const maxVal = Math.max(...rows.map(r => r.value || 0), 10);
    const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;
    const barWidth = Math.floor(plotWidth / 12) - 10;
    
    return (
      <div className="p-3 bg-zinc-50 border-t border-zinc-200 select-none">
        <div className="w-full max-w-4xl mx-auto h-[160px] bg-white border border-zinc-300 rounded shadow-sm p-1.5 flex flex-col justify-between">
          <div className="text-[9px] font-bold text-zinc-600 px-1 border-b border-zinc-100 pb-0.5 font-mono">
            {reportType === "purchase-register" ? "Purchase Transaction Value Trend (Monthly)" : "Sales Transaction Value Trend (Monthly)"}
          </div>
          <div className="flex-1 min-h-0 relative mt-1">
            <svg viewBox={`0 0 ${width} ${chartHeight}`} className="w-full h-full font-mono text-[9px]">
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = padding.top + plotHeight * (1 - ratio);
                const gridVal = maxVal * ratio;
                return (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="#f3f3f3"
                      strokeWidth={1}
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3}
                      textAnchor="end"
                      fill="#71717a"
                    >
                      {gridVal >= 10000000 
                        ? `₹${(gridVal / 10000000).toFixed(1)}Cr` 
                        : gridVal >= 100000 
                          ? `₹${(gridVal / 100000).toFixed(1)}L` 
                          : gridVal >= 1000 
                            ? `₹${(gridVal / 1000).toFixed(0)}k` 
                            : `₹${gridVal.toFixed(0)}`}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {rows.map((row, idx) => {
                const val = row.value || 0;
                const h = (val / maxVal) * plotHeight;
                const x = padding.left + idx * (plotWidth / 12) + (plotWidth / 12 - barWidth) / 2;
                const y = padding.top + plotHeight - h;
                
                return (
                  <g key={row.month} className="group">
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={h}
                      fill={reportType === "purchase-register" ? "#006699" : "#0088cc"}
                      className="hover:opacity-85 transition-opacity"
                    />
                    <title>{`${row.month}: ₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}</title>
                  </g>
                );
              })}

              {/* X Axis Labels */}
              {months.map((m, idx) => {
                const x = padding.left + idx * (plotWidth / 12) + (plotWidth / 12) / 2;
                return (
                  <text
                    key={m}
                    x={x}
                    y={chartHeight - 5}
                    textAnchor="middle"
                    fill="#3f3f46"
                    className="font-semibold"
                  >
                    {m}
                  </text>
                );
              })}
              
              {/* X Axis Line */}
              <line
                x1={padding.left}
                y1={padding.top + plotHeight}
                x2={width - padding.right}
                y2={padding.top + plotHeight}
                stroke="#d4d4d8"
                strokeWidth={1}
              />
            </svg>
          </div>
        </div>
      </div>
    );
  };



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

  const getRegisterVoucherTypeTitle = () => {
    const voucherTypeMap: Record<string, string> = {
      "sales-register": "Sales",
      "purchase-register": "Purchase",
      "journal-register": "Journal",
      "debit-note-register": "Debit Note",
      "credit-note-register": "Credit Note"
    };
    return voucherTypeMap[reportType] || "";
  };

  const periodText = React.useMemo(() => {
    if (!fromDate) return "";
    const dateObj = new Date(fromDate);
    if (isNaN(dateObj.getTime())) return "";
    const day = dateObj.getDate();
    const month = dateObj.toLocaleString("en-US", { month: "short" });
    const year = dateObj.getFullYear();
    return `For ${day}-${month}-${year.toString().slice(-2)}`;
  }, [fromDate]);

  const renderRegisterTable = () => {
    if (rows.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-zinc-400 italic font-mono text-[11px]">
          No records found.
        </div>
      );
    }

    const isJournalOrNote = ["journal-register", "debit-note-register", "credit-note-register"].includes(reportType);
    const voucherTypeTitle = getRegisterVoucherTypeTitle();
    const companyNameText = selectedCompany?.name || "Moly Jain";

    // Compute Totals
    let totalVouchersSum = 0;
    let totalCancelledSum = 0;
    let totalDebitSum = 0;
    let totalCreditSum = 0;
    let finalClosingBalance = 0;

    rows.forEach(r => {
      totalVouchersSum += Number(r.total_vouchers) || 0;
      totalCancelledSum += Number(r.cancelled) || 0;
      totalDebitSum += Number(r.debit) || 0;
      totalCreditSum += Number(r.credit) || 0;
    });

    if (rows.length > 0) {
      finalClosingBalance = Number(rows[rows.length - 1].closing_balance) || 0;
    }

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white border-b border-zinc-200">
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse font-mono text-[11px] select-none text-zinc-850">
            <thead className="sticky top-0 bg-[#e5eff5] text-zinc-900 border-b border-zinc-300 z-10">
              {isJournalOrNote ? (
                <>
                  <tr className="bg-[#e5eff5]">
                    <th rowSpan={5} className="border-b border-r border-zinc-300 px-3 py-1.5 text-left font-bold w-[50%] align-bottom">
                      Particulars
                    </th>
                    <th colSpan={2} className="px-3 py-0.5 text-right font-normal italic">
                      {voucherTypeTitle}
                    </th>
                  </tr>
                  <tr className="bg-[#e5eff5]">
                    <th colSpan={2} className="px-3 py-0.5 text-right font-bold text-zinc-800">
                      {companyNameText}
                    </th>
                  </tr>
                  <tr className="bg-[#e5eff5]">
                    <th colSpan={2} className="px-3 py-0.5 text-right font-normal text-zinc-700">
                      {periodText}
                    </th>
                  </tr>
                  <tr className="bg-[#e5eff5] border-t border-zinc-200">
                    <th colSpan={2} className="px-3 py-1 text-center font-bold border-b border-zinc-200">
                      Transactions
                    </th>
                  </tr>
                  <tr className="bg-[#e5eff5] border-b border-zinc-300">
                    <th className="border-r border-zinc-300 px-3 py-1 text-right font-bold w-[25%]">
                      Total Vouchers
                    </th>
                    <th className="px-3 py-1 text-right font-bold w-[25%]">
                      (cancelled )
                    </th>
                  </tr>
                </>
              ) : (
                <>
                  <tr className="bg-[#e5eff5]">
                    <th rowSpan={5} className="border-b border-r border-zinc-300 px-3 py-1.5 text-left font-bold w-[40%] align-bottom">
                      Particulars
                    </th>
                    <th colSpan={3} className="px-3 py-0.5 text-right font-normal italic">
                      {voucherTypeTitle}
                    </th>
                  </tr>
                  <tr className="bg-[#e5eff5]">
                    <th colSpan={3} className="px-3 py-0.5 text-right font-bold text-zinc-800">
                      {companyNameText}
                    </th>
                  </tr>
                  <tr className="bg-[#e5eff5]">
                    <th colSpan={3} className="px-3 py-0.5 text-right font-normal text-zinc-700">
                      {periodText}
                    </th>
                  </tr>
                  <tr className="bg-[#e5eff5] border-t border-zinc-200">
                    <th colSpan={2} className="px-3 py-1 text-center font-bold border-r border-zinc-300 border-b border-zinc-200">
                      Transactions
                    </th>
                    <th className="px-3 py-1 text-right font-bold">
                      Closing
                    </th>
                  </tr>
                  <tr className="bg-[#e5eff5] border-b border-zinc-300">
                    <th className="border-r border-zinc-300 px-3 py-1 text-right font-bold w-[15%]">
                      Debit
                    </th>
                    <th className="border-r border-zinc-300 px-3 py-1 text-right font-bold w-[15%]">
                      Credit
                    </th>
                    <th className="px-3 py-1 text-right font-bold w-[30%]">
                      Balance
                    </th>
                  </tr>
                </>
              )}
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isFocused = idx === focusedIndex;
                return (
                  <tr
                    key={row.month}
                    onClick={() => setFocusedIndex(idx)}
                    onDoubleClick={() => handleRegisterRowDrilldown(row)}
                    className={`border-b border-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer ${
                      isFocused ? "bg-[#ffcc33] text-zinc-950 font-bold" : "text-zinc-800"
                    }`}
                  >
                    <td className="border-r border-zinc-155 px-3 py-1.5 text-left">{row.month}</td>
                    {isJournalOrNote ? (
                      <>
                        <td className="border-r border-zinc-155 px-3 py-1.5 text-right font-mono">
                          {formatNumber(row.total_vouchers)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-zinc-500">
                          {row.cancelled > 0 ? `(${row.cancelled} )` : ""}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border-r border-zinc-155 px-3 py-1.5 text-right font-mono">
                          {formatCurrency(row.debit)}
                        </td>
                        <td className="border-r border-zinc-155 px-3 py-1.5 text-right font-mono">
                          {formatCurrency(row.credit)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {formatCurrency(row.closing_balance)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              
              {/* Grand Total Row */}
              <tr className="border-t-2 border-b-2 border-zinc-300 bg-zinc-50 font-bold text-zinc-900">
                <td className="border-r border-zinc-300 px-3 py-2 text-left">Grand Total</td>
                {isJournalOrNote ? (
                  <>
                    <td className="border-r border-zinc-300 px-3 py-2 text-right font-mono">
                      {totalVouchersSum > 0 ? totalVouchersSum : ""}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-500">
                      {totalCancelledSum > 0 ? `(${totalCancelledSum} )` : ""}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border-r border-zinc-300 px-3 py-2 text-right font-mono">
                      {totalDebitSum > 0 ? formatCurrency(totalDebitSum) : ""}
                    </td>
                    <td className="border-r border-zinc-300 px-3 py-2 text-right font-mono">
                      {totalCreditSum > 0 ? formatCurrency(totalCreditSum) : ""}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatCurrency(finalClosingBalance)}
                    </td>
                  </>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Chart Section */}
        {!isJournalOrNote && renderRegisterChart()}
      </div>
    );
  };

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
          const queryParams = new URLSearchParams(location.search);
          const ledgerIdParam = queryParams.get("ledger_id") || (location.state as any)?.ledger_id;
          const ledgerId = ledgerIdParam ? Number(ledgerIdParam) : 1;
          res = await window.api.report.ledgerReport(selectedCompany.company_id, activeFY.fy_id, ledgerId, fromDate, toDate);
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
            const list: any[] = [];
            if (res.liabilities && res.liabilities.length > 0) {
              list.push({ id: 'L-header', particulars: 'LIABILITIES', current_period: null, previous_period: null, variance: null, drill: '', isHeader: true });
              list.push(...res.liabilities.map((l: any, idx: number) => ({
                id: `L-${idx}`,
                particulars: l.ledger_name,
                current_period: Math.abs(l.balance),
                previous_period: 0,
                variance: Math.abs(l.balance),
                drill: '→',
              })));
              list.push({ id: 'L-total', particulars: 'Total Liabilities', current_period: res.totalLiabilities, previous_period: 0, variance: res.totalLiabilities, drill: '', isTotal: true });
            }
            if (res.assets && res.assets.length > 0) {
              list.push({ id: 'A-header', particulars: 'ASSETS', current_period: null, previous_period: null, variance: null, drill: '', isHeader: true });
              list.push(...res.assets.map((a: any, idx: number) => ({
                id: `A-${idx}`,
                particulars: a.ledger_name,
                current_period: Math.abs(a.balance),
                previous_period: 0,
                variance: Math.abs(a.balance),
                drill: '→',
              })));
              list.push({ id: 'A-total', particulars: 'Total Assets', current_period: res.totalAssets, previous_period: 0, variance: res.totalAssets, drill: '', isTotal: true });
            }
            finalRows = list;
          } else if (res.income || res.expenses) {
            const list: any[] = [];
            if (res.income && res.income.length > 0) {
              list.push({ id: 'I-header', particulars: 'INCOME', current_period: null, previous_period: null, variance: null, drill: '', isHeader: true });
              list.push(...res.income.map((i: any, idx: number) => ({
                id: `I-${idx}`,
                particulars: i.ledger_name,
                current_period: i.balance,
                previous_period: 0,
                variance: i.balance,
                drill: '→',
              })));
              list.push({ id: 'I-total', particulars: 'Total Income', current_period: res.totalIncome, previous_period: 0, variance: res.totalIncome, drill: '', isTotal: true });
            }
            if (res.expenses && res.expenses.length > 0) {
              list.push({ id: 'E-header', particulars: 'EXPENSES', current_period: null, previous_period: null, variance: null, drill: '', isHeader: true });
              list.push(...res.expenses.map((e: any, idx: number) => ({
                id: `E-${idx}`,
                particulars: e.ledger_name,
                current_period: e.balance,
                previous_period: 0,
                variance: e.balance,
                drill: '→',
              })));
              list.push({ id: 'E-total', particulars: 'Total Expenses', current_period: res.totalExpenses, previous_period: 0, variance: res.totalExpenses, drill: '', isTotal: true });
            }
            if (res.netProfit !== undefined) {
              list.push({ id: 'NP', particulars: res.isProfit ? 'Net Profit' : 'Net Loss', current_period: Math.abs(res.netProfit), previous_period: 0, variance: Math.abs(res.netProfit), drill: '', isTotal: true });
            }
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
        const val = row[c.field] ?? "";
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


  const handleHideRow = (rowId: string | number) => {
    setHiddenRowIds((prev) => {
      const copy = new Set(prev);
      copy.add(rowId);
      return copy;
    });
    setRemovedLinesHistory((prev) => [...prev, rowId]);
  };

  const handleRestoreLastLine = React.useCallback(() => {
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
  }, [removedLinesHistory]);

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

  React.useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {

      if (e.key === "Escape") {
        return; 
      }


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


      if (e.key === "F2") {
        e.preventDefault();
        setIsPeriodOpen(true);
      }

      if (e.key === "F3") {
        e.preventDefault();
        setIsCompanyOpen(true);
      }

      if (e.key === "F4") {
        e.preventDefault();
        setIsContextOpen(true);
      }

      if (e.key === "b" && e.ctrlKey) {
        e.preventDefault();
        setConfig(prev => ({
          ...prev,
          basisOfValues: prev.basisOfValues === "Accrual" ? "Cash" : "Accrual"
        }));
      }

      if (e.key === "h" && e.ctrlKey) {
        e.preventDefault();
        setIsPaletteOpen(true);
      }

      if (e.key === "j" && e.ctrlKey) {
        e.preventDefault();
        navigate("/reports/exception");
      }

      if (e.key === "l" && e.ctrlKey) {
        e.preventDefault();
        setIsSaveViewOpen(true);
      }

      if (e.key === "F5" && e.altKey) {
        e.preventDefault();
        setConfig(prev => ({ ...prev, detailedFormat: !prev.detailedFormat }));
      }

      if (e.key === "c" && e.altKey) {
        e.preventDefault();
        setIsCompareOpen(true);
      }

      if (e.key === "n" && e.altKey) {
        e.preventDefault();
        if (comparisonColumns.length > 0) {
          setComparisonColumns(prev => prev.slice(0, -1));
        }
      }

      if (e.key === "u" && e.altKey) {
        e.preventDefault();
        handleRestoreLastLine();
      }

      if (e.key === "e" && e.altKey) {
        e.preventDefault();
        handleExportCSV();
      }

      if (e.key === "p" && e.altKey) {
        e.preventDefault();
        handlePrint();
      }

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
  }, [comparisonColumns, navigate, handleExportCSV, handlePrint, handleRestoreLastLine, definition, fromDate, toDate, reportType]);


  const commandPaletteItems = React.useMemo(() => {
    const slugToCategory: Record<string, string> = {};
    for (const [cat, reports] of Object.entries(REPORT_CATEGORIES)) {
      for (const r of reports) {
        slugToCategory[r.slug] = cat;
      }
    }
    return Object.entries(REPORT_DEFINITIONS).map(([key, value]) => ({
      title: value.title,
      path: `/reports/accounts/${key}`,
      category: slugToCategory[key] || "Reports",
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

  const tableColumns = React.useMemo(() => {
    if (!rows.length) return definition.columns;
    const firstRow = rows.find((r: any) => !r.isHeader && !r.isTotal) || rows[0];
    const dataFields = Object.keys(firstRow).filter(k => k !== 'id' && k !== 'isHeader' && k !== 'isTotal');
    const definedFields = definition.columns.map(c => c.field);
    const matchCount = definedFields.filter(f => dataFields.includes(f)).length;
    if (matchCount >= Math.max(1, Math.floor(definedFields.length / 2))) return definition.columns;

    const CURRENCY_FIELDS = new Set(['balance','debit','credit','amount','total','value','opening_balance','closing_balance','opening_value','closing_value','inwards_value','outwards_value','taxable_value','invoice_value','gross','deductions','net','current_period','previous_period','variance','total_debit','total_credit','net_balance','total_amount','total_debt','equity','working_capital','total_allocated','actual','budget','inflow','outflow','in_value','out_value','net_value','emp_contrib','employer_contrib','gratuity','total_payout','totalAssets','totalLiabilities','totalIncome','totalExpenses','netProfit','totalSources','totalApplications','totalInflow','totalOutflow','netCashFlow','closing_qty','opening_qty','inwards_qty','outwards_qty','reorder_level','reorder_qty','shortage','fifo_value','avg_rate','closing_rate']);
    const DATE_FIELDS = new Set(['date','bill_date','due_date','from_date','to_date','as_on_date','voucher_date','reconciled_date','bank_date','last_inward_date','first_bill_date','last_bill_date','created_at','updated_at','timestamp']);
    const NUMBER_FIELDS = new Set(['count','voucher_count','employees_count','item_count','ledger_count','cost_centre_count','transaction_count','bill_count','present','absent','leave','overdue_days','days30','days60','daysOver','days_since_inward','years','invoice_count','totalClosingQty','totalClosingValue','total_debit','total_credit','net','in_qty','out_qty','closing_qty','opening_qty','inwards_qty','outwards_qty','quantity','total_qty']);
    const SKIP_FIELDS = new Set(['id','isHeader','isTotal','is_header','is_total','group_id','ledger_id','item_id','cc_id','sg_id','godown_id','employee_id','entry_id','voucher_id','bill_id','structure_id','pay_head_id','batch_id','reconciliation_id','irn_id','log_id','tds_id','tcs_id','gst_id','fy_id','company_id']);
    return dataFields
      .filter(f => !SKIP_FIELDS.has(f))
      .map(f => {
        const header = f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const isCurrency = CURRENCY_FIELDS.has(f) || f.includes('amount') || f.includes('value') || f.includes('balance') || f.includes('debit') || f.includes('credit') || f.includes('total') || f.includes('variance') || f.includes('price') || f.includes('cost') || f.includes('profit') || f.includes('payout') || f.includes('contrib') || f.includes('gratuity') || f.includes('inflow') || f.includes('outflow') || f.includes('rate') || f.includes('capital') || f.includes('equity') || f.includes('debt');
        const isDate = DATE_FIELDS.has(f);
        const isNumber = NUMBER_FIELDS.has(f) || f.includes('count') || f.includes('qty') || f.includes('quantity') || f.includes('days') || f.includes('years') || f.includes('present') || f.includes('absent') || f.includes('leave');
        const align = (isCurrency || isNumber) ? 'right' as const : 'left' as const;
        const type = isDate ? 'date' as const : isCurrency ? 'currency' as const : isNumber ? 'number' as const : undefined;
        return { header, field: f, type, align };
      });
  }, [rows, definition.columns]);

  return (
    <TallyReportLayout
      title={definition.title}
      companyName={selectedCompany?.name || "No Company Selected"}
      leftSubtitle={isRegister ? undefined : (
        <div className="flex gap-4 items-center">
          <span>Basis of Values: <span className="font-bold">{config.basisOfValues}</span></span>
          <span>Valuation: <span className="font-bold">{config.valuationMethod}</span></span>
          {reportType === "edit-log" && auditChainStatus && (
            <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${auditChainStatus.intact ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
              {auditChainStatus.intact ? '✔ Chain Intact' : `⚠ Chain Broken at Log #${auditChainStatus.brokenAt}`}
            </span>
          )}
        </div>
      )}
      rightSubtitle={isRegister ? undefined : (
        <span>
          Period: <span className="font-bold">{fromDate}</span> to <span className="font-bold">{toDate}</span>
        </span>
      )}
    >
      <div className="flex h-full w-full overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 font-mono text-xs">
            Loading report data...
          </div>
        ) : isRegister ? (
          renderRegisterTable()
         ) :reportType === "balance-sheet" ?(
        <BalanceSheetLayout />
         ):reportType === "stock-summary" ?(
        <StockSummaryLayout />
        ):reportType === "profit-loss" ?(
         <ProfitLossLayout />
         ):reportType === "trial-balance" ? (
         <TrialBalanceLayout />
         ) :(
        <ReportTable
            columns={tableColumns}
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