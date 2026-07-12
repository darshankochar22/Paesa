import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';

interface MonthRow {
  month_name: string;
  inflow: number;
  outflow: number;
  nett_flow: number;
}

interface SummaryItem {
  group_id: number;
  group_name: string;
  balance: number;
}

interface CashFlowData {
  months: MonthRow[];
  grandTotal: { inflow: number; outflow: number; nett_flow: number };
  summary: { inflows: SummaryItem[]; outflows: SummaryItem[] };
  monthlySummary: Record<string, { inflows: SummaryItem[]; outflows: SummaryItem[] }>;
  openingBalance: number;
  closingBalance: number;
}

const fmt = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(val));

const fmtSigned = (val: number) => {
  const abs = fmt(val);
  if (val < 0) return `(${abs})`;
  return abs;
};

function CashFlowGraph({ data }: { data: MonthRow[] }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.inflow, d.outflow)), 1000);

  return (
    <div className="border-t border-gray-200 p-3 bg-white select-none mt-auto">
      <div className="flex h-24 items-end gap-4 border-b border-gray-200 pb-1 font-mono text-[9px]">
        {data.map((m) => {
          const inflowHeight = (m.inflow / maxVal) * 80;
          const outflowHeight = (m.outflow / maxVal) * 80;

          return (
            <div key={m.month_name} className="flex flex-col items-center flex-1 min-w-[35px]">
              <div className="w-full flex justify-center items-end gap-0.5 h-20">
                {m.inflow > 0 && (
                  <div
                    style={{ height: `${Math.max(inflowHeight, 2)}%` }}
                    className="w-2.5 bg-black"
                  />
                )}
                {m.outflow > 0 && (
                  <div
                    style={{ height: `${Math.max(outflowHeight, 2)}%` }}
                    className="w-2.5 bg-black"
                  />
                )}
              </div>
              <span className="mt-1 text-black text-[9px] font-sans">
                {m.month_name.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CashFlowStatement() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();

  const [reportData, setReportData] = React.useState<CashFlowData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [currentView, setCurrentView] = React.useState<'monthly' | 'summary'>('monthly');
  const [selectedMonth, setSelectedMonth] = React.useState<string | null>(null);
  const [focusedKey, setFocusedKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // Call matches preload.js exactly (passing parameters wrapped as an object payload)
    (window as any).api.report
      .cashFlow(selectedCompany.company_id, activeFY.fy_id, activeFY.start_date, activeFY.end_date)
      .then((res: any) => {
        if (res?.success) {
          setReportData(res);
        } else {
          setError(res?.error || 'Failed to load cash flow statement.');
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedCompany, activeFY]);

  if (loading)
    return <div className="p-6 text-xs font-mono text-black">Loading Cash Flow Data...</div>;
  if (error) return <div className="p-6 text-xs font-mono text-black">{error}</div>;
  if (!reportData)
    return <div className="p-6 text-xs font-mono text-black">No entries available.</div>;

  const dateLabel = activeFY ? `For 1-Apr-${new Date(activeFY.start_date).getFullYear()}` : '';

  if (currentView === 'monthly') {
    return (
      <div className="flex flex-col h-full w-full bg-white font-mono text-[11px]">
        <div className="bg-white border-b border-gray-200 px-3 py-1 flex justify-between items-center font-bold">
          <span className="text-black uppercase">Cash Flow</span>
          <span className="text-black">{dateLabel}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-black font-bold select-none">
                <th className="px-3 py-1 text-left border-r border-gray-200">Particulars</th>
                <th className="px-3 py-1 text-right border-r border-gray-200 w-40">Inflow</th>
                <th className="px-3 py-1 text-right border-r border-gray-200 w-40">Outflow</th>
                <th className="px-3 py-1 text-right w-40">Nett Flow</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening Balance row */}
              <tr className="border-b border-gray-200 bg-white">
                <td className="px-3 py-1.5 text-left font-bold text-black">Opening Balance</td>
                <td
                  className="px-3 py-1.5 text-right font-mono border-r border-gray-200"
                  colSpan={2}
                ></td>
                <td className="px-3 py-1.5 text-right font-mono font-bold text-black">
                  {fmtSigned(reportData.openingBalance)}
                </td>
              </tr>
              {reportData.months.map((m, idx) => {
                const isFocused = focusedKey === `m-${idx}`;
                return (
                  <tr
                    key={m.month_name}
                    className={`border-b border-gray-200 cursor-pointer ${
                      isFocused
                        ? 'bg-black/[0.06] font-bold text-black'
                        : 'hover:bg-black/[0.03] text-black'
                    }`}
                    onClick={() => setFocusedKey(`m-${idx}`)}
                    onDoubleClick={() => {
                      setSelectedMonth(m.month_name);
                      setCurrentView('summary');
                      setFocusedKey(null);
                    }}
                  >
                    <td className="px-3 py-1.5 text-left font-semibold">{m.month_name}</td>
                    <td className="px-3 py-1.5 text-right font-mono border-r border-gray-200">
                      {m.inflow > 0 ? fmt(m.inflow) : ''}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono border-r border-gray-200">
                      {m.outflow > 0 ? fmt(m.outflow) : ''}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono font-bold">
                      {fmtSigned(m.nett_flow)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t-2 border-b border-double border-gray-200 bg-white px-3 py-1 flex justify-between font-bold text-black select-none">
          <span className="flex-1 text-left">Grand Total</span>
          <span className="w-40 text-right font-mono">{fmt(reportData.grandTotal.inflow)}</span>
          <span className="w-40 text-right font-mono">{fmt(reportData.grandTotal.outflow)}</span>
          <span className="w-40 text-right font-mono">
            {fmtSigned(reportData.grandTotal.nett_flow)}
          </span>
        </div>

        {/* Closing Balance */}
        <div className="border-b border-gray-200 bg-black/[0.06] px-3 py-1.5 flex justify-between font-bold text-black select-none">
          <span>Closing Balance</span>
          <span className="font-mono">₹{fmtSigned(reportData.closingBalance)}</span>
        </div>

        <CashFlowGraph data={reportData.months} />
      </div>
    );
  }

  // Summary view: use per-month data when a month is selected
  const activeSummary =
    selectedMonth && reportData.monthlySummary?.[selectedMonth]
      ? reportData.monthlySummary[selectedMonth]
      : reportData.summary;

  // Compute totals for this summary view
  const summaryInflowTotal = activeSummary.inflows.reduce((a, b) => a + b.balance, 0);
  const summaryOutflowTotal = activeSummary.outflows.reduce((a, b) => a + b.balance, 0);

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono text-[11px]">
      <div className="bg-white border-b border-gray-200 px-3 py-1 flex justify-between items-center font-bold">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('monthly')}
            className="text-[10px] bg-black/[0.06] hover:bg-black/[0.03] text-black px-1.5 rounded font-sans"
          >
            ← Back
          </button>
          <span className="text-black uppercase">Cash Flow Summary ({selectedMonth})</span>
        </div>
        <span className="text-black">{dateLabel}</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* INFLOW SIDE */}
        <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
          <div className="bg-black/[0.06] border-b border-gray-200 px-3 py-1 font-bold text-black flex justify-between">
            <span>Inflow</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <tbody>
                {activeSummary.inflows.map((item) => {
                  const key = `inf-${item.group_id}`;
                  const isFocused = focusedKey === key;
                  return (
                    <tr
                      key={key}
                      className={`border-b border-gray-200 cursor-pointer ${
                        isFocused
                          ? 'bg-black/[0.06] font-bold text-black'
                          : 'hover:bg-black/[0.03] text-black'
                      }`}
                      onClick={() => setFocusedKey(key)}
                      onDoubleClick={() =>
                        navigate(`/reports/accounts/group-summary/${item.group_id}`)
                      }
                    >
                      <td className="px-3 py-1.5 text-left font-semibold">{item.group_name}</td>
                      <td className="px-3 py-1.5 text-right font-mono w-36">{fmt(item.balance)}</td>
                    </tr>
                  );
                })}
                {activeSummary.inflows.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-center text-black" colSpan={2}>
                      No inflows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* OUTFLOW SIDE */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-black/[0.06] border-b border-gray-200 px-3 py-1 font-bold text-black flex justify-between">
            <span>Outflow</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <tbody>
                {activeSummary.outflows.map((item) => {
                  const key = `outf-${item.group_id}`;
                  const isFocused = focusedKey === key;
                  return (
                    <tr
                      key={key}
                      className={`border-b border-gray-200 cursor-pointer ${
                        isFocused
                          ? 'bg-black/[0.06] font-bold text-black'
                          : 'hover:bg-black/[0.03] text-black'
                      }`}
                      onClick={() => setFocusedKey(key)}
                      onDoubleClick={() =>
                        navigate(`/reports/accounts/group-summary/${item.group_id}`)
                      }
                    >
                      <td className="px-3 py-1.5 text-left font-semibold">{item.group_name}</td>
                      <td className="px-3 py-1.5 text-right font-mono w-36">{fmt(item.balance)}</td>
                    </tr>
                  );
                })}
                {activeSummary.outflows.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-center text-black" colSpan={2}>
                      No outflows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex font-bold text-black border-t border-gray-200 bg-white select-none text-[11px]">
        <div className="flex-1 px-3 py-1.5 flex justify-between border-r border-gray-200">
          <span>Total Inflow</span>
          <span className="font-mono">{fmt(summaryInflowTotal)}</span>
        </div>
        <div className="flex-1 px-3 py-1.5 flex justify-between">
          <span>Total Outflow</span>
          <span className="font-mono">{fmt(summaryOutflowTotal)}</span>
        </div>
      </div>

      <div className="border-t border-gray-200 bg-black/[0.06] text-center py-1.5 font-bold text-black select-none text-[11px]">
        Nett Flow:{' '}
        <span className="font-mono">₹{fmtSigned(summaryInflowTotal - summaryOutflowTotal)}</span>
      </div>
    </div>
  );
}
