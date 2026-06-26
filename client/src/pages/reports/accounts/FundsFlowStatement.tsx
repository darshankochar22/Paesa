import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../../context/CompanyContext";
import { TallyReportLayout } from "../../../components/tally-ui/TallyReportLayout";
import { RightActionPanel } from "../../../components/ui";
import { cn } from "@/lib/utils";

interface MonthData {
  name: string;
  startDate: string;
  endDate: string;
  opening: number;
  closing: number;
  netChange: number;
}

interface SourceAppItem {
  particulars: string;
  amount: number;
  // Present for line items that map to a real ledger (e.g. "Stock (Increase)").
  // Absent for derived rows like "Funds from Operations" / "Funds Lost in
  // Operations", which drill into the P&L instead.
  ledger_id?: number;
}

interface DetailData {
  sources: SourceAppItem[];
  applications: SourceAppItem[];
  totalSources: number;
  totalApplications: number;
  netWorkingCapitalChange: number;
  isNetIncrease: boolean;
  // WC footer
  currentAssetsOpening: number;
  currentAssetsClosing: number;
  currentLiabOpening: number;
  currentLiabClosing: number;
}

interface GroupRow {
  group_id: number;
  name: string;
  parent_group_id: number | null;
  nature: string | null;
}

interface LedgerRow {
  ledger_id: number;
  name: string;
  group_id: number;
  opening_balance: number;
  nature: string | null;
}

export default function FundsFlowStatement() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  // Mode: "monthly" | "detail"
  const [viewMode, setViewMode] = useState<"monthly" | "detail">("monthly");
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);

  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [focusedIndex, setFocusedIndex] = useState(0);
  // Top-level group_id for "Current Assets" / "Current Liabilities", resolved
  // from the group list we already fetch for the WC computation, so the
  // reconciliation footer rows can drill into Group Summary.
  const [caGroupId, setCaGroupId] = useState<number | null>(null);
  const [clGroupId, setClGroupId] = useState<number | null>(null);

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  // Generate month ranges for the FY
  const monthRanges = useMemo(() => {
    if (!activeFY?.start_date) return [];
    const startYear = new Date(activeFY.start_date).getFullYear();
    const years = [
      startYear, startYear, startYear, startYear, startYear, startYear,
      startYear, startYear, startYear, startYear + 1, startYear + 1, startYear + 1
    ];
    const months = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
    const monthNames = [
      "April", "May", "June", "July", "August", "September",
      "October", "November", "December", "January", "February", "March"
    ];
    return months.map((m, idx) => {
      const yr = years[idx];
      const startDate = `${yr}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(yr, m, 0).getDate();
      const endDate = `${yr}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { name: monthNames[idx], startDate, endDate };
    });
  }, [activeFY]);

  // Helper: is a group "Current Assets" or "Current Liabilities" by name?
  const isCurrentGroup = useCallback((groupId: number, groupMap: Map<number, GroupRow>, targetName: string): boolean => {
    let current = groupMap.get(groupId);
    while (current) {
      if (current.name === targetName) return true;
      if (current.parent_group_id) {
        current = groupMap.get(current.parent_group_id);
      } else {
        break;
      }
    }
    return false;
  }, []);

  // Load Monthly Summary
  const loadMonthlySummary = useCallback(async () => {
    if (!companyId || !fyId || monthRanges.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [ledgerRes, groupRes] = await Promise.all([
        window.api.ledger.getAll(companyId),
        window.api.group.getAll(companyId)
      ]);

      const groupsData: GroupRow[] = groupRes.success ? groupRes.groups || [] : [];
      const ledgersData: LedgerRow[] = ledgerRes.success ? ledgerRes.ledgers || [] : [];

      const groupMap = new Map<number, GroupRow>();
      groupsData.forEach((g) => groupMap.set(g.group_id, g));

      // Calculate initial working capital from opening balances
      let currentAssetOpening = 0;
      let currentLiabOpening = 0;
      ledgersData.forEach((l) => {
        const isCA = isCurrentGroup(l.group_id, groupMap, "Current Assets");
        const isCL = isCurrentGroup(l.group_id, groupMap, "Current Liabilities");
        if (isCA) currentAssetOpening += l.opening_balance || 0;
        if (isCL) currentLiabOpening += l.opening_balance || 0;
      });
      const initialWC = currentAssetOpening - currentLiabOpening;

      const changes = await Promise.all(
        monthRanges.map(async (m) => {
          const res = await window.api.report.fundsFlow(companyId, fyId, m.startDate, m.endDate);
          return {
            name: m.name,
            startDate: m.startDate,
            endDate: m.endDate,
            netChange: res.success ? res.netWorkingCapitalChange || 0 : 0
          };
        })
      );

      let currentOpening = initialWC;
      const data: MonthData[] = changes.map((c) => {
        const closing = currentOpening + c.netChange;
        const row = {
          name: c.name,
          startDate: c.startDate,
          endDate: c.endDate,
          opening: currentOpening,
          closing,
          netChange: c.netChange
        };
        currentOpening = closing;
        return row;
      });

      setMonthlyData(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, monthRanges, isCurrentGroup]);

  // Load Detailed Month Flow
  const loadMonthDetails = useCallback(async (month: MonthData) => {
    if (!companyId || !fyId) return;
    setLoading(true);
    setError(null);
    try {
      const [res, ledgerRes, groupRes] = await Promise.all([
        window.api.report.fundsFlow(companyId, fyId, month.startDate, month.endDate),
        window.api.ledger.getAll(companyId),
        window.api.group.getAll(companyId)
      ]);

      if (!res.success) {
        setError(res.error || "Failed to load details");
        setDetailData(null);
        return;
      }

      // Compute WC components for footer
      const groupsData: GroupRow[] = groupRes.success ? groupRes.groups || [] : [];
      const ledgersData: LedgerRow[] = ledgerRes.success ? ledgerRes.ledgers || [] : [];
      const groupMap = new Map<number, GroupRow>();
      groupsData.forEach((g) => groupMap.set(g.group_id, g));
      const caGroup = groupsData.find((g) => g.name === "Current Assets");
      const clGroup = groupsData.find((g) => g.name === "Current Liabilities");
      setCaGroupId(caGroup ? caGroup.group_id : null);
      setClGroupId(clGroup ? clGroup.group_id : null);

      let currentAssetsOpening = 0;
      let currentLiabOpening = 0;
      ledgersData.forEach((l) => {
        const isCA = isCurrentGroup(l.group_id, groupMap, "Current Assets");
        const isCL = isCurrentGroup(l.group_id, groupMap, "Current Liabilities");
        if (isCA) currentAssetsOpening += l.opening_balance || 0;
        if (isCL) currentLiabOpening += l.opening_balance || 0;
      });

      const currentAssetsClosing = currentAssetsOpening + (res.netWorkingCapitalChange > 0 ? res.netWorkingCapitalChange : 0);
      const currentLiabClosing  = currentLiabOpening  + (res.netWorkingCapitalChange < 0 ? Math.abs(res.netWorkingCapitalChange) : 0);

      setDetailData({
        sources: res.sources || [],
        applications: res.applications || [],
        totalSources: res.totalSources || 0,
        totalApplications: res.totalApplications || 0,
        netWorkingCapitalChange: res.netWorkingCapitalChange || 0,
        isNetIncrease: res.isNetIncrease,
        currentAssetsOpening,
        currentAssetsClosing,
        currentLiabOpening,
        currentLiabClosing,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, isCurrentGroup]);

  useEffect(() => {
    if (viewMode === "monthly") {
      loadMonthlySummary();
    } else if (selectedMonth) {
      loadMonthDetails(selectedMonth);
    }
  }, [viewMode, selectedMonth, loadMonthlySummary, loadMonthDetails]);

  // Totals for monthly summary footer
  const { totalOpening, totalClosing, totalNetChange } = useMemo(() => {
    if (monthlyData.length === 0) return { totalOpening: 0, totalClosing: 0, totalNetChange: 0 };
    return {
      totalOpening: monthlyData[0].opening,
      totalClosing: monthlyData[monthlyData.length - 1].closing,
      totalNetChange: monthlyData.reduce((s, m) => s + m.netChange, 0)
    };
  }, [monthlyData]);

  const handleRowAction = useCallback((index: number) => {
    if (viewMode === "monthly") {
      const month = monthlyData[index];
      if (month) {
        setSelectedMonth(month);
        setViewMode("detail");
        setFocusedIndex(0);
      }
    }
  }, [viewMode, monthlyData]);

  // Drill from a Sources/Applications line item into whatever backs it:
  // a real ledger when ledger_id is present, otherwise the P&L for the
  // derived "Funds from/Lost in Operations" rows.
  const handleLineDrilldown = useCallback((item: SourceAppItem) => {
    if (item.ledger_id) {
      navigate(`/reports/accounts/ledger-summary/${item.ledger_id}`);
      return;
    }
    if (!selectedMonth) return;
    navigate(`/reports/accounts/profit-loss?from_date=${selectedMonth.startDate}&to_date=${selectedMonth.endDate}`);
  }, [navigate, selectedMonth]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      const maxRows = viewMode === "monthly" ? monthlyData.length : 0;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, maxRows - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleRowAction(focusedIndex);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (viewMode === "detail") {
          setViewMode("monthly");
          setSelectedMonth(null);
          setFocusedIndex(0);
        } else {
          navigate(-1);
        }
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [viewMode, monthlyData, focusedIndex, handleRowAction, navigate]);

  const fmt = (val: number | null) => {
    if (val === null || val === undefined) return "";
    if (val === 0) return "0.00";
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(val));
  };

  // ─── Bar Chart (monthly view) ────────────────────────────────────────────
  const barChart = useMemo(() => {
    if (viewMode !== "monthly" || monthlyData.length === 0) return null;

    const width = 800;
    const height = 150;
    const paddingLeft = 64;
    const paddingRight = 20;
    const paddingTop = 12;
    const paddingBottom = 28;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    const values = monthlyData.map((m) => m.netChange);
    const maxAbs = Math.max(...values.map(Math.abs), 1000);

    const zeroY = paddingTop + chartH / 2; // zero line in the middle
    const segW = chartW / 12;
    const barW = segW * 0.55;

    const monthLabels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

    const bars = values.map((val, idx) => {
      const cx = paddingLeft + idx * segW + segW / 2;
      const barH = (Math.abs(val) / maxAbs) * (chartH / 2);
      const isPos = val >= 0;
      const rectY = isPos ? zeroY - barH : zeroY;
      return (
        <g key={idx}>
          <rect
            x={cx - barW / 2}
            y={rectY}
            width={barW}
            height={barH}
            fill={isPos ? "#52525b" : "#71717a"}
            opacity={0.85}
          />
          <text
            x={cx}
            y={height - 6}
            textAnchor="middle"
            className="fill-zinc-500 font-mono text-[9px]"
            style={{ fontSize: 9 }}
          >
            {monthLabels[idx]}
          </text>
        </g>
      );
    });

    // Y axis tick labels
    const yTicks = [-maxAbs, -maxAbs / 2, 0, maxAbs / 2, maxAbs].map((v, i) => {
      const y = paddingTop + chartH - (((v + maxAbs) / (2 * maxAbs)) * chartH);
      return (
        <g key={i}>
          <line x1={paddingLeft - 4} y1={y} x2={paddingLeft} y2={y} stroke="#d4d4d8" />
          <text x={paddingLeft - 6} y={y + 3} textAnchor="end" style={{ fontSize: 8 }} className="fill-zinc-400 font-mono">
            {v === 0 ? "0" : v > 0 ? `+${(v / 1000).toFixed(0)}k` : `${(v / 1000).toFixed(0)}k`}
          </text>
        </g>
      );
    });

    return (
      <div className="bg-zinc-50 border-t border-zinc-200 shrink-0 px-2 pb-1">
        <div className="text-[10px] font-bold text-zinc-500 mt-1 mb-0.5 font-mono uppercase tracking-wider pl-12 flex gap-4">
          <span>Working Capital — Monthly Funds Flow</span>
          <span className="flex items-center gap-1 normal-case font-normal text-zinc-400">
            <span className="inline-block w-3 h-2 bg-[#52525b] opacity-85 rounded-sm"></span> Increase
            <span className="inline-block w-3 h-2 bg-[#71717a] opacity-85 rounded-sm ml-2"></span> Decrease
          </span>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-h-[150px]">
          {/* Y-axis */}
          <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#d4d4d8" strokeWidth={1} />
          {/* Zero line */}
          <line x1={paddingLeft} y1={zeroY} x2={width - paddingRight} y2={zeroY} stroke="#a1a1aa" strokeWidth={1} strokeDasharray="3 2" />
          {yTicks}
          {bars}
        </svg>
      </div>
    );
  }, [viewMode, monthlyData]);

  // ─── Right panel actions ────────────────────────────────────────────────
  const rightPanelActions = [
    {
      key: "F2",
      label: "Period",
      onClick: () => {}
    },
    {
      key: "F6",
      label: "Monthly",
      onClick: () => {
        setViewMode("monthly");
        setSelectedMonth(null);
        setFocusedIndex(0);
      }
    },
    {
      key: "B",
      label: "Basis of Values",
      onClick: () => {}
    },
    {
      key: "H",
      label: "Change View",
      onClick: () => {}
    },
    {
      key: "L",
      label: "Save View",
      onClick: () => {}
    },
    {
      key: "C",
      label: "New Column",
      onClick: () => {}
    },
    {
      key: "A",
      label: "Alter Column",
      onClick: () => {}
    },
    {
      key: "N",
      label: "Auto Column",
      onClick: () => {}
    },
    {
      key: "Esc",
      label: "Quit",
      onClick: () => {
        if (viewMode === "detail") {
          setViewMode("monthly");
          setSelectedMonth(null);
          setFocusedIndex(0);
        } else {
          navigate(-1);
        }
      }
    },
  ];

  // ─── Period label ────────────────────────────────────────────────────────
  const fyLabel = activeFY?.start_date && activeFY?.end_date
    ? `${new Date(activeFY.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })} to ${new Date(activeFY.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}`
    : "";

  const detailPeriodLabel = selectedMonth
    ? `${new Date(selectedMonth.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })} to ${new Date(selectedMonth.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}`
    : "";

  const companyName = selectedCompany?.name || "No Company";

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <TallyReportLayout
      title={viewMode === "detail" ? "Funds Flow Summary" : "Funds Flow"}
      companyName={companyName}
      leftSubtitle={viewMode === "detail" ? (
        <button
          onClick={() => {
            setViewMode("monthly");
            setSelectedMonth(null);
            setFocusedIndex(0);
          }}
          className="text-cyan-600 hover:underline font-bold text-[10px] uppercase mb-1"
        >
          ◀ Back to Monthly Summary
        </button>
      ) : null}
      rightSubtitle={fyLabel}
    >
      <div className="flex-1 flex h-full min-h-0">
        <div className="flex-grow flex flex-col min-h-0 bg-white">
          {error && (
            <div className="bg-zinc-100 text-zinc-800 text-[11px] p-2 border-b border-zinc-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex-grow flex items-center justify-center italic text-zinc-500 py-10 font-mono text-[11px]">
              Loading Funds Flow data...
            </div>
          ) : viewMode === "monthly" ? (
            /* ──────────────── MONTHLY SUMMARY VIEW ──────────────── */
            <>
              <div className="flex-grow overflow-auto min-h-0">
                <table className="w-full border-collapse font-mono text-[11px] select-none text-zinc-800">
                  <thead className="sticky top-0 bg-[#18181b] text-white z-10">
                    <tr className="border-b border-[#18181b]">
                      <th className="px-3 py-1.5 text-left font-bold w-[40%]">Particulars</th>
                      <th colSpan={2} className="px-3 py-1 text-center font-bold border-l border-[#18181b] border-b border-[#18181b]">
                        Working Capital
                      </th>
                      <th className="px-3 py-1 text-right font-bold w-[20%] border-l border-[#18181b]">Funds Flow</th>
                    </tr>
                    <tr>
                      <th></th>
                      <th className="px-3 py-1 text-right font-bold w-[20%] border-l border-[#18181b]">Opening</th>
                      <th className="px-3 py-1 text-right font-bold w-[20%] border-l border-[#18181b]">Closing</th>
                      <th className="px-3 py-1 text-right font-bold w-[20%] border-l border-[#18181b]">Nett Flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((row, idx) => {
                      const isFocused = idx === focusedIndex;
                      const isNeg = row.netChange < 0;
                      return (
                        <tr
                          key={row.name}
                          onClick={() => setFocusedIndex(idx)}
                          onDoubleClick={() => handleRowAction(idx)}
                          className={cn(
                            "border-b border-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer",
                            isFocused ? "bg-[#d4d4d8] text-zinc-900 font-bold" : ""
                          )}
                        >
                          <td className="px-3 py-1.5 text-left border-r border-zinc-100 font-semibold">
                            {row.name}
                          </td>
                          <td className="px-3 py-1.5 text-right border-r border-zinc-100 text-zinc-700">
                            {fmt(row.opening)}
                          </td>
                          <td className="px-3 py-1.5 text-right border-r border-zinc-100 text-zinc-700">
                            {fmt(row.closing)}
                          </td>
                          <td className={cn(
                            "px-3 py-1.5 text-right font-semibold",
                            !isFocused && (isNeg ? "text-zinc-700" : row.netChange > 0 ? "text-zinc-700" : "text-zinc-400")
                          )}>
                            {row.netChange !== 0 ? (
                              <span>
                                {isNeg ? <span className="text-xs mr-0.5">(-)&nbsp;</span> : ""}
                                {fmt(row.netChange)}
                              </span>
                            ) : ""}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Grand Total */}
                    <tr className="border-t-2 border-b-2 border-zinc-800 bg-zinc-50 font-bold text-zinc-900 sticky bottom-0">
                      <td className="px-3 py-2 text-left uppercase font-mono tracking-wide">Grand Total</td>
                      <td className="px-3 py-2 text-right border-r border-zinc-300">{fmt(totalOpening)}</td>
                      <td className="px-3 py-2 text-right border-r border-zinc-300">{fmt(totalClosing)}</td>
                      <td className={cn(
                        "px-3 py-2 text-right",
                        totalNetChange < 0 ? "text-zinc-800" : totalNetChange > 0 ? "text-zinc-700" : ""
                      )}>
                        {totalNetChange !== 0 ? (
                          <>
                            {totalNetChange < 0 ? <span className="text-xs mr-0.5">(-)&nbsp;</span> : ""}
                            {fmt(totalNetChange)}
                          </>
                        ) : "0.00"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {barChart}
            </>
          ) : (
            /* ──────────────── DETAIL / T-FORMAT VIEW ──────────────── */
            detailData && (
              <div className="flex-grow overflow-auto min-h-0 flex flex-col">
                {/* Company name + period sub-header */}
                <div className="flex border-b border-zinc-300 bg-white sticky top-0 z-10 font-mono text-[11px]">
                  <div className="flex-1 px-3 py-1.5 border-r border-zinc-300">
                    <span className="font-bold text-zinc-900">Sources</span>
                    <span className="ml-3 text-zinc-500">{companyName}</span>
                    <span className="ml-2 text-zinc-400 text-[10px]">{detailPeriodLabel}</span>
                  </div>
                  <div className="flex-1 px-3 py-1.5">
                    <span className="font-bold text-zinc-900">Applications</span>
                    <span className="ml-3 text-zinc-500">{companyName}</span>
                    <span className="ml-2 text-zinc-400 text-[10px]">{detailPeriodLabel}</span>
                  </div>
                </div>

                {/* Two-column T-format body */}
                <div className="flex flex-grow min-h-0">
                  {/* Sources column */}
                  <div className="flex-1 border-r border-zinc-300 flex flex-col">
                    <table className="w-full border-collapse font-mono text-[11px] text-zinc-800">
                      <thead className="bg-[#18181b] text-white">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-bold">Particulars</th>
                          <th className="px-3 py-1.5 text-right font-bold w-32">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.sources.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="px-3 py-4 text-zinc-400 italic text-center">No sources</td>
                          </tr>
                        ) : (
                          detailData.sources.map((s, idx) => (
                            <tr
                              key={idx}
                              onClick={() => handleLineDrilldown(s)}
                              title={s.ledger_id ? `View ledger: ${s.particulars}` : "View Profit & Loss for this period"}
                              className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors"
                            >
                              <td className="px-3 py-1.5 pl-5">{s.particulars}</td>
                              <td className="px-3 py-1.5 text-right text-zinc-700">{fmt(s.amount)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-zinc-700 bg-zinc-100 font-bold text-zinc-900">
                          <td className="px-3 py-2 uppercase tracking-wide">Total</td>
                          <td className="px-3 py-2 text-right">{fmt(detailData.totalSources)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Applications column */}
                  <div className="flex-1 flex flex-col">
                    <table className="w-full border-collapse font-mono text-[11px] text-zinc-800">
                      <thead className="bg-[#18181b] text-white">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-bold">Particulars</th>
                          <th className="px-3 py-1.5 text-right font-bold w-32">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.applications.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="px-3 py-4 text-zinc-400 italic text-center">No applications</td>
                          </tr>
                        ) : (
                          detailData.applications.map((a, idx) => (
                            <tr
                              key={idx}
                              onClick={() => handleLineDrilldown(a)}
                              title={a.ledger_id ? `View ledger: ${a.particulars}` : "View Profit & Loss for this period"}
                              className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors"
                            >
                              <td className="px-3 py-1.5 pl-5">{a.particulars}</td>
                              <td className="px-3 py-1.5 text-right text-zinc-700">{fmt(a.amount)}</td>
                            </tr>
                          ))
                        )}
                        {/* Nett Loss shown as Application header if isNetIncrease=false */}
                        {!detailData.isNetIncrease && detailData.netWorkingCapitalChange < 0 && (
                          <tr
                            onClick={() => selectedMonth && navigate(`/reports/accounts/profit-loss?from_date=${selectedMonth.startDate}&to_date=${selectedMonth.endDate}`)}
                            title="View Profit & Loss for this period"
                            className="border-b border-zinc-200 bg-[#d4d4d8]/20 cursor-pointer hover:bg-[#d4d4d8]/35 transition-colors"
                          >
                            <td className="px-3 py-1.5 pl-5 font-semibold text-zinc-800">Nett Loss</td>
                            <td className="px-3 py-1.5 text-right font-semibold">{fmt(Math.abs(detailData.netWorkingCapitalChange))}</td>
                          </tr>
                        )}
                        {/* Net increase in working capital shown on applications side */}
                        {detailData.isNetIncrease && detailData.netWorkingCapitalChange > 0 && (
                          <tr className="border-b border-zinc-200 bg-[#d4d4d8]/20">
                            <td className="px-3 py-1.5 pl-5 font-semibold text-zinc-800">Net Increase in Working Capital</td>
                            <td className="px-3 py-1.5 text-right font-semibold text-zinc-700">{fmt(detailData.netWorkingCapitalChange)}</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-zinc-700 bg-zinc-100 font-bold text-zinc-900">
                          <td className="px-3 py-2 uppercase tracking-wide">Total</td>
                          <td className="px-3 py-2 text-right">{fmt(detailData.totalApplications)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Working Capital footer — matching img3 bottom rows */}
                <div className="border-t-2 border-zinc-400 bg-zinc-50 shrink-0">
                  <table className="w-full border-collapse font-mono text-[11px] text-zinc-800">
                    <thead>
                      <tr className="bg-zinc-200 text-zinc-700 text-[10px] uppercase">
                        <th className="px-3 py-1 text-left w-[40%]">Particulars</th>
                        <th className="px-3 py-1 text-right w-[20%] border-l border-zinc-300">Opening Balance</th>
                        <th className="px-3 py-1 text-right w-[20%] border-l border-zinc-300">Closing Balance</th>
                        <th className="px-3 py-1 text-right w-[20%] border-l border-zinc-300">Wkg Cap Increase</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        onClick={() => caGroupId && navigate(`/reports/accounts/group-summary/${caGroupId}`)}
                        title={caGroupId ? "View Current Assets group" : undefined}
                        className={cn(
                          "border-b border-zinc-200 transition-colors",
                          caGroupId && "cursor-pointer hover:bg-zinc-100"
                        )}
                      >
                        <td className="px-3 py-1.5">Current Assets</td>
                        <td className="px-3 py-1.5 text-right text-zinc-600">
                          {fmt(detailData.currentAssetsOpening)} Dr
                        </td>
                        <td className="px-3 py-1.5 text-right text-zinc-600">
                          {fmt(detailData.currentAssetsClosing)} Dr
                        </td>
                        <td className="px-3 py-1.5 text-right text-zinc-700 font-semibold">
                          {detailData.currentAssetsClosing - detailData.currentAssetsOpening !== 0
                            ? fmt(detailData.currentAssetsClosing - detailData.currentAssetsOpening)
                            : ""}
                        </td>
                      </tr>
                      <tr
                        onClick={() => clGroupId && navigate(`/reports/accounts/group-summary/${clGroupId}`)}
                        title={clGroupId ? "View Current Liabilities group" : undefined}
                        className={cn(
                          "border-b border-zinc-200 transition-colors",
                          clGroupId && "cursor-pointer hover:bg-zinc-100"
                        )}
                      >
                        <td className="px-3 py-1.5">Current Liabilities</td>
                        <td className="px-3 py-1.5 text-right text-zinc-600">
                          {fmt(detailData.currentLiabOpening)} Cr
                        </td>
                        <td className="px-3 py-1.5 text-right text-zinc-600">
                          {fmt(detailData.currentLiabClosing)} Cr
                        </td>
                        <td className="px-3 py-1.5 text-right text-zinc-700 font-semibold">
                          {detailData.currentLiabClosing - detailData.currentLiabOpening !== 0
                            ? `(-) ${fmt(detailData.currentLiabClosing - detailData.currentLiabOpening)}`
                            : ""}
                        </td>
                      </tr>
                      <tr className="font-bold text-zinc-900 bg-zinc-100 border-t border-zinc-400">
                        <td className="px-3 py-1.5">Working Capital</td>
                        <td className="px-3 py-1.5 text-right">
                          {fmt(detailData.currentAssetsOpening - detailData.currentLiabOpening)} Dr
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {fmt(detailData.currentAssetsClosing - detailData.currentLiabClosing)} Dr
                        </td>
                        <td className={cn(
                          "px-3 py-1.5 text-right",
                          detailData.netWorkingCapitalChange < 0 ? "text-zinc-800" : "text-zinc-700"
                        )}>
                          {detailData.netWorkingCapitalChange < 0
                            ? `(-) ${fmt(Math.abs(detailData.netWorkingCapitalChange))}`
                            : fmt(detailData.netWorkingCapitalChange)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>

        <RightActionPanel actions={rightPanelActions} />
      </div>
    </TallyReportLayout>
  );
}