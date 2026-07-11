import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../../../context/CompanyContext';
import { TallyReportLayout } from '../../../components/tally-ui/TallyReportLayout';
import { useEscape } from '@/hooks/useEscape';
import { RightActionPanel } from '../../../components/ui';
import { cn } from '@/lib/utils';

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
  ledger_id?: number;
}

interface DetailData {
  sources: SourceAppItem[];
  applications: SourceAppItem[];
  totalSources: number;
  totalApplications: number;
  workingCapitalChange: number;
  isNetIncrease: boolean;
  // WC reconciliation footer (all live from the server)
  currentAssetsOpening: number;
  currentAssetsClosing: number;
  currentLiabilitiesOpening: number;
  currentLiabilitiesClosing: number;
  workingCapitalOpening: number;
  workingCapitalClosing: number;
  caGroupId: number | null;
  clGroupId: number | null;
}

export default function FundsFlowStatement() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  // Mode: "monthly" | "detail"
  const [viewMode, setViewMode] = useState<'monthly' | 'detail'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);

  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [focusedIndex, setFocusedIndex] = useState(0);

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  // Generate month ranges for the FY
  const monthRanges = useMemo(() => {
    if (!activeFY?.start_date || !activeFY?.end_date) return [];
    const fyStart = new Date(activeFY.start_date);
    const fyEnd = new Date(activeFY.end_date);
    const ranges: { name: string; startDate: string; endDate: string }[] = [];
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    let cur = new Date(fyStart.getFullYear(), fyStart.getMonth(), 1);
    while (cur <= fyEnd) {
      const yr = cur.getFullYear();
      const mo = cur.getMonth(); // 0-indexed
      const startDate = `${yr}-${String(mo + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(yr, mo + 1, 0).getDate();
      const endDate = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      ranges.push({ name: monthNames[mo], startDate, endDate });
      cur = new Date(yr, mo + 1, 1);
    }
    return ranges;
  }, [activeFY]);

  // Load Monthly Summary — each month's working capital comes straight from the
  // server's funds-flow reconciliation (no client-side WC arithmetic).
  const loadMonthlySummary = useCallback(async () => {
    if (!companyId || !fyId || monthRanges.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data: MonthData[] = await Promise.all(
        monthRanges.map(async (m) => {
          const res = await window.api.report.fundsFlow(companyId, fyId, m.startDate, m.endDate);
          return {
            name: m.name,
            startDate: m.startDate,
            endDate: m.endDate,
            opening: res.success ? res.workingCapitalOpening || 0 : 0,
            closing: res.success ? res.workingCapitalClosing || 0 : 0,
            netChange: res.success ? res.workingCapitalChange || 0 : 0,
          };
        }),
      );
      setMonthlyData(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, monthRanges]);

  // Load Detailed Month Flow — sources/applications + working-capital footer,
  // all computed server-side.
  const loadMonthDetails = useCallback(
    async (month: MonthData) => {
      if (!companyId || !fyId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await window.api.report.fundsFlow(
          companyId,
          fyId,
          month.startDate,
          month.endDate,
        );
        if (!res.success) {
          setError(res.error || 'Failed to load details');
          setDetailData(null);
          return;
        }
        setDetailData({
          sources: res.sources || [],
          applications: res.applications || [],
          totalSources: res.totalSources || 0,
          totalApplications: res.totalApplications || 0,
          workingCapitalChange: res.workingCapitalChange || 0,
          isNetIncrease: res.isNetIncrease,
          currentAssetsOpening: res.currentAssetsOpening || 0,
          currentAssetsClosing: res.currentAssetsClosing || 0,
          currentLiabilitiesOpening: res.currentLiabilitiesOpening || 0,
          currentLiabilitiesClosing: res.currentLiabilitiesClosing || 0,
          workingCapitalOpening: res.workingCapitalOpening || 0,
          workingCapitalClosing: res.workingCapitalClosing || 0,
          caGroupId: res.currentAssetsGroupId ?? null,
          clGroupId: res.currentLiabilitiesGroupId ?? null,
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [companyId, fyId],
  );

  useEffect(() => {
    if (viewMode === 'monthly') {
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
      totalNetChange: monthlyData.reduce((s, m) => s + m.netChange, 0),
    };
  }, [monthlyData]);

  const handleRowAction = useCallback(
    (index: number) => {
      if (viewMode === 'monthly') {
        const month = monthlyData[index];
        if (month) {
          setSelectedMonth(month);
          setViewMode('detail');
          setFocusedIndex(0);
        }
      }
    },
    [viewMode, monthlyData],
  );

  // Drill from a Sources/Applications line item into whatever backs it:
  // a real ledger when ledger_id is present, otherwise the P&L for the
  // derived "Funds from/Lost in Operations" rows.
  const handleLineDrilldown = useCallback(
    (item: SourceAppItem) => {
      if (item.ledger_id) {
        navigate(`/reports/accounts/ledger-summary/${item.ledger_id}`);
        return;
      }
      if (!selectedMonth) return;
      navigate(
        `/reports/accounts/profit-loss?from_date=${selectedMonth.startDate}&to_date=${selectedMonth.endDate}`,
      );
    },
    [navigate, selectedMonth],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      const maxRows =
        viewMode === 'monthly'
          ? monthlyData.length
          : detailData
            ? detailData.sources.length + detailData.applications.length
            : 0;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, maxRows - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleRowAction(focusedIndex);
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [viewMode, monthlyData, focusedIndex, handleRowAction]);

  // Detail view is a drill level on the escape stack: Escape pops back to
  // monthly first; at monthly the TallyReportLayout entry underneath quits.
  useEscape(() => {
    setViewMode('monthly');
    setSelectedMonth(null);
    setFocusedIndex(0);
  }, viewMode === 'detail');

  const fmt = (val: number | null) => {
    if (val === null || val === undefined) return '';
    if (val === 0) return '0.00';
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(val));
  };

  // ─── Bar Chart (monthly view) ────────────────────────────────────────────
  const barChart = useMemo(() => {
    if (viewMode !== 'monthly' || monthlyData.length === 0) return null;

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

    const monthLabels = [
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
      'Jan',
      'Feb',
      'Mar',
    ];

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
            fill={isPos ? '#52525b' : '#71717a'}
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
      const y = paddingTop + chartH - ((v + maxAbs) / (2 * maxAbs)) * chartH;
      return (
        <g key={i}>
          <line x1={paddingLeft - 4} y1={y} x2={paddingLeft} y2={y} stroke="#d4d4d8" />
          <text
            x={paddingLeft - 6}
            y={y + 3}
            textAnchor="end"
            style={{ fontSize: 8 }}
            className="fill-zinc-400 font-mono"
          >
            {v === 0 ? '0' : v > 0 ? `+${(v / 1000).toFixed(0)}k` : `${(v / 1000).toFixed(0)}k`}
          </text>
        </g>
      );
    });

    return (
      <div className="bg-zinc-50 border-t border-zinc-200 shrink-0 px-2 pb-1">
        <div className="text-[10px] font-bold text-zinc-500 mt-1 mb-0.5 font-mono uppercase tracking-wider pl-12 flex gap-4">
          <span>Working Capital — Monthly Funds Flow</span>
          <span className="flex items-center gap-1 normal-case font-normal text-zinc-400">
            <span className="inline-block w-3 h-2 bg-[#52525b] opacity-85 rounded-sm"></span>{' '}
            Increase
            <span className="inline-block w-3 h-2 bg-[#71717a] opacity-85 rounded-sm ml-2"></span>{' '}
            Decrease
          </span>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-h-[150px]">
          {/* Y-axis */}
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={height - paddingBottom}
            stroke="#d4d4d8"
            strokeWidth={1}
          />
          {/* Zero line */}
          <line
            x1={paddingLeft}
            y1={zeroY}
            x2={width - paddingRight}
            y2={zeroY}
            stroke="#a1a1aa"
            strokeWidth={1}
            strokeDasharray="3 2"
          />
          {yTicks}
          {bars}
        </svg>
      </div>
    );
  }, [viewMode, monthlyData]);

  // ─── Right panel actions ────────────────────────────────────────────────
  const rightPanelActions = [
    {
      key: 'F2',
      label: 'Period',
      onClick: () => {},
    },
    {
      key: 'F6',
      label: 'Monthly',
      onClick: () => {
        setViewMode('monthly');
        setSelectedMonth(null);
        setFocusedIndex(0);
      },
    },
    {
      key: 'B',
      label: 'Basis of Values',
      onClick: () => {},
    },
    {
      key: 'H',
      label: 'Change View',
      onClick: () => {},
    },
    {
      key: 'L',
      label: 'Save View',
      onClick: () => {},
    },
    {
      key: 'C',
      label: 'New Column',
      onClick: () => {},
    },
    {
      key: 'A',
      label: 'Alter Column',
      onClick: () => {},
    },
    {
      key: 'N',
      label: 'Auto Column',
      onClick: () => {},
    },
    {
      key: 'Esc',
      label: 'Quit',
      onClick: () => {
        if (viewMode === 'detail') {
          setViewMode('monthly');
          setSelectedMonth(null);
          setFocusedIndex(0);
        } else {
          navigate(-1);
        }
      },
    },
  ];

  // ─── Period label ────────────────────────────────────────────────────────
  const fyLabel =
    activeFY?.start_date && activeFY?.end_date
      ? `${new Date(activeFY.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })} to ${new Date(activeFY.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}`
      : '';

  const detailPeriodLabel = selectedMonth
    ? `${new Date(selectedMonth.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })} to ${new Date(selectedMonth.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}`
    : '';

  const companyName = selectedCompany?.name || 'No Company';

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <TallyReportLayout
      title={viewMode === 'detail' ? 'Funds Flow Summary' : 'Funds Flow'}
      companyName={companyName}
      leftSubtitle={
        viewMode === 'detail' ? (
          <button
            onClick={() => {
              setViewMode('monthly');
              setSelectedMonth(null);
              setFocusedIndex(0);
            }}
            className="text-zinc-700 hover:underline font-bold text-[10px] uppercase mb-1"
          >
            ◀ Back to Monthly Summary
          </button>
        ) : null
      }
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
          ) : viewMode === 'monthly' ? (
            /* ──────────────── MONTHLY SUMMARY VIEW ──────────────── */
            <>
              <div className="flex-grow overflow-auto min-h-0">
                <table className="w-full border-collapse font-mono text-[11px] select-none text-zinc-800">
                  <thead className="sticky top-0 bg-[#18181b] text-white z-10">
                    <tr className="border-b border-[#18181b]">
                      <th className="px-3 py-1.5 text-left font-bold w-[40%]">Particulars</th>
                      <th
                        colSpan={2}
                        className="px-3 py-1 text-center font-bold border-l border-[#18181b] border-b border-[#18181b]"
                      >
                        Working Capital
                      </th>
                      <th className="px-3 py-1 text-right font-bold w-[20%] border-l border-[#18181b]">
                        Funds Flow
                      </th>
                    </tr>
                    <tr>
                      <th></th>
                      <th className="px-3 py-1 text-right font-bold w-[20%] border-l border-[#18181b]">
                        Opening
                      </th>
                      <th className="px-3 py-1 text-right font-bold w-[20%] border-l border-[#18181b]">
                        Closing
                      </th>
                      <th className="px-3 py-1 text-right font-bold w-[20%] border-l border-[#18181b]">
                        Nett Flow
                      </th>
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
                            'border-b border-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer',
                            isFocused ? 'bg-[#d4d4d8] text-zinc-900 font-bold' : '',
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
                          <td
                            className={cn(
                              'px-3 py-1.5 text-right font-semibold',
                              !isFocused &&
                                (isNeg
                                  ? 'text-zinc-700'
                                  : row.netChange > 0
                                    ? 'text-zinc-700'
                                    : 'text-zinc-400'),
                            )}
                          >
                            {row.netChange !== 0 ? (
                              <span>
                                {isNeg ? <span className="text-xs mr-0.5">(-)&nbsp;</span> : ''}
                                {fmt(row.netChange)}
                              </span>
                            ) : (
                              ''
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Grand Total */}
                    <tr className="border-t-2 border-b-2 border-zinc-800 bg-zinc-50 font-bold text-zinc-900 sticky bottom-0">
                      <td className="px-3 py-2 text-left uppercase font-mono tracking-wide">
                        Grand Total
                      </td>
                      <td className="px-3 py-2 text-right border-r border-zinc-300">
                        {fmt(totalOpening)}
                      </td>
                      <td className="px-3 py-2 text-right border-r border-zinc-300">
                        {fmt(totalClosing)}
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2 text-right',
                          totalNetChange < 0
                            ? 'text-zinc-800'
                            : totalNetChange > 0
                              ? 'text-zinc-700'
                              : '',
                        )}
                      >
                        {totalNetChange !== 0 ? (
                          <>
                            {totalNetChange < 0 ? (
                              <span className="text-xs mr-0.5">(-)&nbsp;</span>
                            ) : (
                              ''
                            )}
                            {fmt(totalNetChange)}
                          </>
                        ) : (
                          '0.00'
                        )}
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
                        {detailData.sources.map((s, idx) => (
                          <tr
                            key={idx}
                            onClick={() => handleLineDrilldown(s)}
                            title={
                              s.ledger_id
                                ? `View ledger: ${s.particulars}`
                                : 'View Profit & Loss for this period'
                            }
                            className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors"
                          >
                            <td className="px-3 py-1.5 pl-5">{s.particulars}</td>
                            <td className="px-3 py-1.5 text-right text-zinc-700">
                              {fmt(s.amount)}
                            </td>
                          </tr>
                        ))}
                        {/* Net decrease in working capital is the balancing source. */}
                        {detailData.workingCapitalChange < 0 && (
                          <tr className="border-b border-zinc-200 bg-[#d4d4d8]/20">
                            <td className="px-3 py-1.5 pl-5 font-semibold text-zinc-800">
                              Net Decrease in Working Capital
                            </td>
                            <td className="px-3 py-1.5 text-right font-semibold text-zinc-700">
                              {fmt(Math.abs(detailData.workingCapitalChange))}
                            </td>
                          </tr>
                        )}
                        {detailData.sources.length === 0 &&
                          detailData.workingCapitalChange >= 0 && (
                            <tr>
                              <td
                                colSpan={2}
                                className="px-3 py-4 text-zinc-400 italic text-center"
                              >
                                No sources
                              </td>
                            </tr>
                          )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-zinc-700 bg-zinc-100 font-bold text-zinc-900">
                          <td className="px-3 py-2 uppercase tracking-wide">Total</td>
                          <td className="px-3 py-2 text-right">
                            {fmt(Math.max(detailData.totalSources, detailData.totalApplications))}
                          </td>
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
                        {detailData.applications.map((a, idx) => (
                          <tr
                            key={idx}
                            onClick={() => handleLineDrilldown(a)}
                            title={
                              a.ledger_id
                                ? `View ledger: ${a.particulars}`
                                : 'View Profit & Loss for this period'
                            }
                            className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors"
                          >
                            <td className="px-3 py-1.5 pl-5">{a.particulars}</td>
                            <td className="px-3 py-1.5 text-right text-zinc-700">
                              {fmt(a.amount)}
                            </td>
                          </tr>
                        ))}
                        {/* Net increase in working capital is the balancing application. */}
                        {detailData.workingCapitalChange > 0 && (
                          <tr className="border-b border-zinc-200 bg-[#d4d4d8]/20">
                            <td className="px-3 py-1.5 pl-5 font-semibold text-zinc-800">
                              Net Increase in Working Capital
                            </td>
                            <td className="px-3 py-1.5 text-right font-semibold text-zinc-700">
                              {fmt(detailData.workingCapitalChange)}
                            </td>
                          </tr>
                        )}
                        {detailData.applications.length === 0 &&
                          detailData.workingCapitalChange <= 0 && (
                            <tr>
                              <td
                                colSpan={2}
                                className="px-3 py-4 text-zinc-400 italic text-center"
                              >
                                No applications
                              </td>
                            </tr>
                          )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-zinc-700 bg-zinc-100 font-bold text-zinc-900">
                          <td className="px-3 py-2 uppercase tracking-wide">Total</td>
                          <td className="px-3 py-2 text-right">
                            {fmt(Math.max(detailData.totalSources, detailData.totalApplications))}
                          </td>
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
                        <th className="px-3 py-1 text-right w-[20%] border-l border-zinc-300">
                          Opening Balance
                        </th>
                        <th className="px-3 py-1 text-right w-[20%] border-l border-zinc-300">
                          Closing Balance
                        </th>
                        <th className="px-3 py-1 text-right w-[20%] border-l border-zinc-300">
                          Wkg Cap Increase
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        onClick={() =>
                          detailData.caGroupId &&
                          navigate(`/reports/accounts/group-summary/${detailData.caGroupId}`)
                        }
                        title={detailData.caGroupId ? 'View Current Assets group' : undefined}
                        className={cn(
                          'border-b border-zinc-200 transition-colors',
                          detailData.caGroupId && 'cursor-pointer hover:bg-zinc-100',
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
                            : ''}
                        </td>
                      </tr>
                      <tr
                        onClick={() =>
                          detailData.clGroupId &&
                          navigate(`/reports/accounts/group-summary/${detailData.clGroupId}`)
                        }
                        title={detailData.clGroupId ? 'View Current Liabilities group' : undefined}
                        className={cn(
                          'border-b border-zinc-200 transition-colors',
                          detailData.clGroupId && 'cursor-pointer hover:bg-zinc-100',
                        )}
                      >
                        <td className="px-3 py-1.5">Current Liabilities</td>
                        <td className="px-3 py-1.5 text-right text-zinc-600">
                          {fmt(detailData.currentLiabilitiesOpening)} Cr
                        </td>
                        <td className="px-3 py-1.5 text-right text-zinc-600">
                          {fmt(detailData.currentLiabilitiesClosing)} Cr
                        </td>
                        <td className="px-3 py-1.5 text-right text-zinc-700 font-semibold">
                          {detailData.currentLiabilitiesClosing -
                            detailData.currentLiabilitiesOpening !==
                          0
                            ? `(-) ${fmt(detailData.currentLiabilitiesClosing - detailData.currentLiabilitiesOpening)}`
                            : ''}
                        </td>
                      </tr>
                      <tr className="font-bold text-zinc-900 bg-zinc-100 border-t border-zinc-400">
                        <td className="px-3 py-1.5">Working Capital</td>
                        <td className="px-3 py-1.5 text-right">
                          {fmt(detailData.workingCapitalOpening)} Dr
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {fmt(detailData.workingCapitalClosing)} Dr
                        </td>
                        <td
                          className={cn(
                            'px-3 py-1.5 text-right',
                            detailData.workingCapitalChange < 0 ? 'text-zinc-800' : 'text-zinc-700',
                          )}
                        >
                          {detailData.workingCapitalChange < 0
                            ? `(-) ${fmt(Math.abs(detailData.workingCapitalChange))}`
                            : fmt(detailData.workingCapitalChange)}
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
