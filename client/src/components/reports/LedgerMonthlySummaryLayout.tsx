import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';

interface MonthRow {
  month: string;
  debit: number;
  credit: number;
  closingDr: number;
  closingCr: number;
}

interface LedgerMonthlyResponse {
  success: boolean;
  ledger_name: string;
  openingDr: number;
  openingCr: number;
  rows: MonthRow[];
  closingDr: number;
  closingCr: number;
  error?: string;
}

const fmt = (val: number) =>
  val === 0
    ? ''
    : new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);

const fmtTotal = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

export default function LedgerMonthlySummaryLayout() {
  const navigate = useNavigate();
  const { ledgerId } = useParams<{ ledgerId: string }>();
  const { selectedCompany, activeFY } = useCompany();

  const [data, setData] = React.useState<LedgerMonthlyResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Keyboard navigation focus index (0-11 for 12 months)
  const [focusedIndex, setFocusedIndex] = React.useState<number>(0);

  React.useEffect(() => {
    if (!ledgerId || !selectedCompany?.company_id || !activeFY?.fy_id) return;
    setLoading(true);
    setError(null);

    const callApi = (window as any).api?.report?.ledgerMonthlySummary;
    if (!callApi) {
      // Mock data fallback matching Moly Jain screenshots!
      setTimeout(() => {
        const id = Number(ledgerId);
        let mockRes: LedgerMonthlyResponse;
        const MONTHS = [
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
          'January',
          'February',
          'March',
        ];

        if (id === 1) {
          // General Reserve
          mockRes = {
            success: true,
            ledger_name: 'General Reserve',
            openingDr: 0,
            openingCr: 10000,
            rows: MONTHS.map((m) => ({
              month: m,
              debit: 0,
              credit: m === 'April' ? 10000 : 0,
              closingDr: 0,
              closingCr: 10000,
            })),
            closingDr: 0,
            closingCr: 10000,
          };
        } else if (id === 2) {
          // Owner's Capital Account
          mockRes = {
            success: true,
            ledger_name: "Owner's Capital Account",
            openingDr: 0,
            openingCr: 500000,
            rows: MONTHS.map((m) => ({
              month: m,
              debit: 0,
              credit: m === 'April' ? 500000 : 0,
              closingDr: 0,
              closingCr: 500000,
            })),
            closingDr: 0,
            closingCr: 500000,
          };
        } else {
          mockRes = {
            success: true,
            ledger_name: `Ledger Summary (ID: ${ledgerId})`,
            openingDr: 0,
            openingCr: 25000,
            rows: MONTHS.map((m) => ({
              month: m,
              debit: m === 'April' ? 5000 : 0,
              credit: m === 'May' ? 10000 : 0,
              closingDr: 0,
              closingCr: 30000,
            })),
            closingDr: 0,
            closingCr: 30000,
          };
        }
        setData(mockRes);
        setFocusedIndex(0);
        setLoading(false);
      }, 100);
      return;
    }

    callApi(selectedCompany.company_id, activeFY.fy_id, Number(ledgerId))
      .then((res: LedgerMonthlyResponse) => {
        if (res.success) {
          setData(res);
          setFocusedIndex(0);
        } else {
          setError(res.error || 'Failed to load ledger summary');
        }
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [ledgerId, selectedCompany?.company_id, activeFY?.fy_id]);

  const handleMonthClick = React.useCallback(
    (row: MonthRow) => {
      navigate(
        `/reports/accounts/ledger?ledger_id=${ledgerId}&month=${encodeURIComponent(row.month)}`,
      );
    },
    [ledgerId, navigate],
  );

  React.useEffect(() => {
    if (!data?.rows.length) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(data.rows.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeRow = data.rows[focusedIndex];
        if (activeRow) {
          handleMonthClick(activeRow);
        }
      } else if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, focusedIndex, handleMonthClick, navigate]);

  // Compute values for SVG Monthly Bar Chart
  const chartHeight = 120;
  const chartWidth = 540;
  const padding = 20;

  const chartData = React.useMemo(() => {
    if (!data?.rows) return [];
    // Max volume in transactions or closing balances to scale chart
    const maxVal = Math.max(
      ...data.rows.map((r) => Math.max(r.debit, r.credit, r.closingDr, r.closingCr)),
      1000, // safeguard divide by 0
    );

    return data.rows.map((r, idx) => {
      const x = padding + idx * ((chartWidth - padding * 2) / 12) + 12;
      // Heights relative to maxVal
      const debitHeight = (r.debit / maxVal) * (chartHeight - padding * 2);
      const creditHeight = (r.credit / maxVal) * (chartHeight - padding * 2);
      const closingHeight =
        (Math.max(r.closingDr, r.closingCr) / maxVal) * (chartHeight - padding * 2);

      return {
        month: r.month.substring(0, 3),
        x,
        debitHeight,
        creditHeight,
        closingHeight,
        balanceType: r.closingCr > 0 ? 'Cr' : 'Dr',
      };
    });
  }, [data, chartWidth, chartHeight]);

  const periodLabel = activeFY ? `For ${activeFY.start_date}` : '';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        Loading Ledger Monthly Summary...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs px-8 text-center">
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        No data available.
      </div>
    );
  }

  // Calculate totals of transactions
  const totalDebitTxn = data.rows.reduce((sum, r) => sum + r.debit, 0);
  const totalCreditTxn = data.rows.reduce((sum, r) => sum + r.credit, 0);

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black select-none">
            <tr>
              <th className="px-4 py-2 text-left font-bold" rowSpan={3}>
                Particulars
              </th>
              <th
                className="px-4 py-0.5 text-center font-bold border-b border-gray-200"
                colSpan={3}
              >
                {data.ledger_name} / {selectedCompany?.name || 'No Company'}
              </th>
            </tr>
            <tr>
              <th className="px-4 py-0.5 text-center font-normal italic text-black" colSpan={3}>
                {periodLabel}
              </th>
            </tr>
            <tr>
              <th
                className="px-4 py-0.5 text-center font-bold border-r border-gray-200"
                colSpan={2}
              >
                <div className="border-b border-gray-200 pb-0.5 mb-0.5">Transactions</div>
                <div className="flex w-full">
                  <span className="w-28 text-right pr-4 border-r border-gray-200">Debit</span>
                  <span className="w-28 text-right pr-4">Credit</span>
                </div>
              </th>
              <th className="w-32 text-right px-4 py-1.5 font-bold self-end pb-1.5">
                Closing Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Opening Balance Row */}
            <tr className="border-b border-gray-200 font-semibold select-none text-black">
              <td className="px-4 py-1.5 text-left italic">Opening Balance</td>
              <td className="text-right" colSpan={2}>
                <div className="flex w-full justify-end font-mono">
                  <span className="w-28 border-r border-gray-200 pr-4" />
                  <span className="w-28 pr-4" />
                </div>
              </td>
              <td className="w-32 text-right px-4 py-1.5 whitespace-nowrap">
                {data.openingDr !== 0 ? `${fmt(data.openingDr)} Dr` : ''}
                {data.openingCr !== 0 ? `${fmt(data.openingCr)} Cr` : ''}
              </td>
            </tr>

            {/* Monthly Rows */}
            {data.rows.map((row, idx) => {
              const isFocused = idx === focusedIndex;
              return (
                <tr
                  key={row.month}
                  className={`border-b border-gray-200 cursor-pointer select-none transition-colors ${
                    isFocused
                      ? 'bg-black/[0.06] text-black font-bold'
                      : 'hover:bg-black/[0.03] text-black'
                  }`}
                  onClick={() => setFocusedIndex(idx)}
                  onDoubleClick={() => handleMonthClick(row)}
                >
                  <td className="px-4 py-1.5 text-left">{row.month}</td>
                  <td className="text-right" colSpan={2}>
                    <div className="flex w-full justify-end font-mono">
                      <span className="w-28 text-right pr-4 border-r border-gray-200">
                        {row.debit !== 0 ? fmt(row.debit) : ''}
                      </span>
                      <span className="w-28 text-right pr-4">
                        {row.credit !== 0 ? fmt(row.credit) : ''}
                      </span>
                    </div>
                  </td>
                  <td className="w-32 text-right px-4 py-1.5 whitespace-nowrap">
                    {row.closingDr !== 0 ? `${fmt(row.closingDr)} Dr` : ''}
                    {row.closingCr !== 0 ? `${fmt(row.closingCr)} Cr` : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Grand Total Bar */}
      <div className="border-t border-gray-200 bg-white px-4 py-1.5 flex justify-between font-mono text-[11px] font-bold text-black select-none">
        <span className="flex-1">Grand Total</span>
        <div className="flex justify-end">
          <span className="w-28 text-right pr-4 border-r border-gray-200">
            {totalDebitTxn !== 0 ? fmtTotal(totalDebitTxn) : ''}
          </span>
          <span className="w-28 text-right pr-4">
            {totalCreditTxn !== 0 ? fmtTotal(totalCreditTxn) : ''}
          </span>
        </div>
        <span className="w-32 text-right px-4 whitespace-nowrap">
          {data.closingDr !== 0 ? `${fmtTotal(data.closingDr)} Dr` : ''}
          {data.closingCr !== 0 ? `${fmtTotal(data.closingCr)} Cr` : ''}
        </span>
      </div>

      {/* TallyPrime Retro Monthly Bar Chart */}
      <div className="border-t border-gray-200 bg-white p-3 flex flex-col items-center justify-center select-none shrink-0 h-44">
        <svg height={chartHeight} width={chartWidth} className="font-mono text-[9px] text-black">
          {/* Grid lines */}
          <line
            x1={padding}
            y1={padding}
            x2={chartWidth - padding}
            y2={padding}
            stroke="#f4f4f5"
            strokeWidth={1}
          />
          <line
            x1={padding}
            y1={chartHeight / 2}
            x2={chartWidth - padding}
            y2={chartHeight / 2}
            stroke="#f4f4f5"
            strokeWidth={1}
          />
          <line
            x1={padding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke="#d4d4d8"
            strokeWidth={1.5}
          />

          {/* Month Bars */}
          {chartData.map((d, idx) => {
            const barWidth = 14;
            return (
              <g key={d.month}>
                {/* Closing Balance Column (Gray/blue) */}
                <rect
                  x={d.x - barWidth / 2}
                  y={chartHeight - padding - d.closingHeight}
                  width={barWidth}
                  height={d.closingHeight}
                  fill={idx === focusedIndex ? '#e4e4e7' : '#d4d4d8'}
                  stroke={idx === focusedIndex ? '#d4d4d8' : '#a1a1aa'}
                  strokeWidth={1}
                />

                {/* Transaction Credit indicator (small red/dark line on top) */}
                {d.creditHeight > 0 && (
                  <rect
                    x={d.x - barWidth / 2}
                    y={chartHeight - padding - d.closingHeight - 3}
                    width={barWidth}
                    height={3}
                    fill="#71717a"
                  />
                )}

                {/* X axis labels */}
                <text
                  x={d.x}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  className={`text-[8px] ${idx === focusedIndex ? 'font-bold text-black' : 'text-black'}`}
                >
                  {d.month}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="text-[9px] text-black mt-1 flex gap-4">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 bg-white border border-gray-200" />
            Closing Balance
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-1 bg-black" />
            Transactions
          </span>
        </div>
      </div>
    </div>
  );
}
