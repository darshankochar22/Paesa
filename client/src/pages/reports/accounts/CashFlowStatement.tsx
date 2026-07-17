import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { useShortcuts, PRIORITY } from '@/lib/shortcuts';

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

// Hierarchical cash-flow node: primary group -> sub-groups -> ledgers.
// inflow/outflow are gross (never netted), so a node can appear on both sides.
interface CFNode {
  type: 'group' | 'ledger';
  id: string;
  group_id?: number;
  ledger_id?: number;
  name: string;
  inflow: number;
  outflow: number;
  children: CFNode[];
}

interface CashFlowData {
  months: MonthRow[];
  grandTotal: { inflow: number; outflow: number; nett_flow: number };
  summary: { inflows: SummaryItem[]; outflows: SummaryItem[] };
  monthlySummary: Record<string, { inflows: SummaryItem[]; outflows: SummaryItem[] }>;
  tree: CFNode[];
  monthlyTree: Record<string, CFNode[]>;
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
  // Drill path inside the summary: each level fixes the side (inflow/outflow)
  // and the node whose children we're viewing. Empty = the two-panel summary.
  const [drill, setDrill] = React.useState<{ side: 'inflow' | 'outflow'; node: CFNode }[]>([]);

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

  // Activate a summary row: drill into a group, or open a ledger's vouchers.
  const activate = React.useCallback(
    (node: CFNode, side: 'inflow' | 'outflow') => {
      if (node.type === 'ledger') {
        if (node.ledger_id != null) {
          // Open the ledger's vouchers directly (skip the monthly summary page).
          const monthQ = selectedMonth ? `&month=${encodeURIComponent(selectedMonth)}` : '';
          navigate(`/reports/accounts/ledger?ledger_id=${node.ledger_id}${monthQ}`);
        }
        return;
      }
      if (node.children.some((c) => c[side] > 0)) {
        setDrill((d) => [...d, { side, node }]);
        setFocusedKey(null);
      }
    },
    [navigate, selectedMonth],
  );

  // Enter opens the focused summary row (same as double-click).
  useShortcuts(
    [
      {
        keys: 'Enter',
        handler: () => {
          if (currentView !== 'summary' || !reportData || !focusedKey) return false;
          if (drill.length > 0) {
            const lvl = drill[drill.length - 1];
            const node = lvl.node.children.find((c) => c.id === focusedKey);
            if (node) {
              activate(node, lvl.side);
              return true;
            }
            return false;
          }
          const dash = focusedKey.indexOf('-');
          const side = focusedKey.slice(0, dash) as 'inflow' | 'outflow';
          if (side !== 'inflow' && side !== 'outflow') return false;
          const nodeId = focusedKey.slice(dash + 1);
          const tree =
            (selectedMonth && reportData.monthlyTree?.[selectedMonth]) || reportData.tree || [];
          const node = tree.find((n) => n.id === nodeId);
          if (node) {
            activate(node, side);
            return true;
          }
          return false;
        },
      },
    ],
    { priority: PRIORITY.SCREEN },
  );

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
                      setDrill([]);
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

  // Summary view: primary-group tree, per-month when a month is selected.
  const activeTree: CFNode[] =
    (selectedMonth && reportData.monthlyTree?.[selectedMonth]) || reportData.tree || [];

  // ----- Drill-down view (single side, "Group Cash Flow" style) -----
  if (drill.length > 0) {
    const level = drill[drill.length - 1];
    const side = level.side;
    const rows = level.node.children.filter((c) => c[side] > 0);
    const total = rows.reduce((a, c) => a + c[side], 0);
    const trail = drill.map((d) => d.node.name).join(' › ');

    return (
      <div className="flex flex-col h-full w-full bg-white font-mono text-[11px]">
        <div className="bg-white border-b border-gray-200 px-3 py-1 flex justify-between items-center font-bold">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrill((d) => d.slice(0, -1))}
              className="text-[10px] bg-black/[0.06] hover:bg-black/[0.03] text-black px-1.5 rounded font-sans"
            >
              ← Back
            </button>
            <span className="text-black uppercase">{trail}</span>
          </div>
          <span className="text-black">{dateLabel}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-black font-bold select-none">
                <th className="px-3 py-1 text-left border-r border-gray-200">Particulars</th>
                <th className="px-3 py-1 text-right border-r border-gray-200 w-40">Inflow</th>
                <th className="px-3 py-1 text-right w-40">Outflow</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const isFocused = focusedKey === c.id;
                const actionable = c.type === 'ledger' || c.children.some((x) => x[side] > 0);
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-gray-200 ${actionable ? 'cursor-pointer' : ''} ${
                      isFocused
                        ? 'bg-black/[0.06] font-bold text-black'
                        : 'hover:bg-black/[0.03] text-black'
                    }`}
                    onClick={() => setFocusedKey(c.id)}
                    onDoubleClick={() => activate(c, side)}
                  >
                    <td className="px-3 py-1.5 text-left font-semibold">{c.name}</td>
                    <td className="px-3 py-1.5 text-right font-mono border-r border-gray-200">
                      {c.inflow > 0 ? fmt(c.inflow) : ''}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {c.outflow > 0 ? fmt(c.outflow) : ''}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-center text-black" colSpan={3}>
                    No entries
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-b border-gray-200 bg-white px-3 py-1.5 flex font-bold text-black select-none">
          <span className="flex-1 text-left">Grand Total</span>
          <span className="w-40 text-right font-mono border-r border-gray-200 pr-3">
            {side === 'inflow' ? fmt(total) : ''}
          </span>
          <span className="w-40 text-right font-mono">{side === 'outflow' ? fmt(total) : ''}</span>
        </div>
      </div>
    );
  }

  // ----- Two-panel primary-group summary (Inflow | Outflow) -----
  const inflowRoots = activeTree.filter((n) => n.inflow > 0);
  const outflowRoots = activeTree.filter((n) => n.outflow > 0);
  const summaryInflowTotal = inflowRoots.reduce((a, b) => a + b.inflow, 0);
  const summaryOutflowTotal = outflowRoots.reduce((a, b) => a + b.outflow, 0);

  const SidePanel = ({
    side,
    roots,
    border,
  }: {
    side: 'inflow' | 'outflow';
    roots: CFNode[];
    border: boolean;
  }) => (
    <div
      className={`flex-1 flex flex-col overflow-hidden ${border ? 'border-r border-gray-200' : ''}`}
    >
      <div className="bg-black/[0.06] border-b border-gray-200 px-3 py-1 font-bold text-black">
        {side === 'inflow' ? 'Inflow' : 'Outflow'}
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <tbody>
            {roots.map((node) => {
              const key = `${side}-${node.id}`;
              const isFocused = focusedKey === key;
              const drillable = node.children.some((c) => c[side] > 0);
              return (
                <tr
                  key={key}
                  className={`border-b border-gray-200 ${drillable ? 'cursor-pointer' : ''} ${
                    isFocused
                      ? 'bg-black/[0.06] font-bold text-black'
                      : 'hover:bg-black/[0.03] text-black'
                  }`}
                  onClick={() => setFocusedKey(key)}
                  onDoubleClick={() => activate(node, side)}
                >
                  <td className="px-3 py-1.5 text-left font-semibold">{node.name}</td>
                  <td className="px-3 py-1.5 text-right font-mono w-36">{fmt(node[side])}</td>
                </tr>
              );
            })}
            {roots.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-center text-black" colSpan={2}>
                  No {side}s
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

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
        <SidePanel side="inflow" roots={inflowRoots} border />
        <SidePanel side="outflow" roots={outflowRoots} border={false} />
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
