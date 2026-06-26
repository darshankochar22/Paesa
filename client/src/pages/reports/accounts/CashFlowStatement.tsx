import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

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
}

const fmt = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(val));

function CashFlowGraph({ data }: { data: MonthRow[] }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.inflow, d.outflow)), 1000);

  return (
    <div className="border-t border-zinc-300 p-3 bg-white select-none mt-auto">
      <div className="flex h-24 items-end gap-4 border-b border-zinc-400 pb-1 font-mono text-[9px]">
        {data.map((m) => {
          const inflowHeight = (m.inflow / maxVal) * 80;
          const outflowHeight = (m.outflow / maxVal) * 80;

          return (
            <div key={m.month_name} className="flex flex-col items-center flex-1 min-w-[35px]">
              <div className="w-full flex justify-center items-end gap-0.5 h-20">
                {m.inflow > 0 && (
                  <div style={{ height: `${Math.max(inflowHeight, 2)}%` }} className="w-2.5 bg-zinc-900" />
                )}
                {m.outflow > 0 && (
                  <div style={{ height: `${Math.max(outflowHeight, 2)}%` }} className="w-2.5 bg-zinc-800" />
                )}
              </div>
              <span className="mt-1 text-zinc-600 text-[9px] font-sans">{m.month_name.slice(0, 3)}</span>
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

  const [currentView, setCurrentView] = React.useState<"monthly" | "summary">("monthly");
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
          setError(res?.error || "Failed to load cash flow statement.");
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedCompany, activeFY]);

  if (loading) return <div className="p-6 text-xs font-mono text-zinc-500">Loading Cash Flow Data...</div>;
  if (error) return <div className="p-6 text-xs font-mono text-zinc-600">{error}</div>;
  if (!reportData) return <div className="p-6 text-xs font-mono text-zinc-400">No entries available.</div>;

  const dateLabel = activeFY ? `For 1-Apr-${new Date(activeFY.start_date).getFullYear()}` : "";

  if (currentView === "monthly") {
    return (
      <div className="flex flex-col h-full w-full bg-white font-mono text-[11px]">
        <div className="bg-[#f4f4f5] border-b border-zinc-300 px-3 py-1 flex justify-between items-center font-bold">
          <span className="text-zinc-800 uppercase">Cash Flow</span>
          <span className="text-zinc-600">{dateLabel}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-700 font-bold select-none">
                <th className="px-3 py-1 text-left border-r border-zinc-200">Particulars</th>
                <th className="px-3 py-1 text-right border-r border-zinc-200 w-40">Inflow</th>
                <th className="px-3 py-1 text-right border-r border-zinc-200 w-40">Outflow</th>
                <th className="px-3 py-1 text-right w-40">Nett Flow</th>
              </tr>
            </thead>
            <tbody>
              {reportData.months.map((m, idx) => {
                const isFocused = focusedKey === `m-${idx}`;
                return (
                  <tr
                    key={m.month_name}
                    className={`border-b border-zinc-100 cursor-pointer ${
                      isFocused ? "bg-[#e4e4e7] font-bold text-zinc-950" : "hover:bg-zinc-50 text-zinc-800"
                    }`}
                    onClick={() => setFocusedKey(`m-${idx}`)}
                    onDoubleClick={() => {
                      setSelectedMonth(m.month_name);
                      setCurrentView("summary");
                      setFocusedKey(null);
                    }}
                  >
                    <td className="px-3 py-1.5 text-left font-semibold">{m.month_name}</td>
                    <td className="px-3 py-1.5 text-right font-mono border-r border-zinc-100">{m.inflow > 0 ? fmt(m.inflow) : ""}</td>
                    <td className="px-3 py-1.5 text-right font-mono border-r border-zinc-100">{m.outflow > 0 ? fmt(m.outflow) : ""}</td>
                    <td className="px-3 py-1.5 text-right font-mono font-bold">{fmt(m.nett_flow)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t-2 border-b border-double border-zinc-400 bg-[#f4f4f5] px-3 py-1 flex justify-between font-bold text-zinc-900 select-none">
          <span className="flex-1 text-left">Grand Total</span>
          <span className="w-40 text-right font-mono">{fmt(reportData.grandTotal.inflow)}</span>
          <span className="w-40 text-right font-mono">{fmt(reportData.grandTotal.outflow)}</span>
          <span className="w-40 text-right font-mono">{fmt(reportData.grandTotal.nett_flow)}</span>
        </div>

        <CashFlowGraph data={reportData.months} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono text-[11px]">
      <div className="bg-[#f4f4f5] border-b border-zinc-300 px-3 py-1 flex justify-between items-center font-bold">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView("monthly")}
            className="text-[10px] bg-zinc-300 hover:bg-zinc-400 text-zinc-800 px-1.5 rounded font-sans"
          >
            ← Back
          </button>
          <span className="text-zinc-800 uppercase">Cash Flow Summary ({selectedMonth})</span>
        </div>
        <span className="text-zinc-500">{dateLabel}</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* INFLOW SIDE */}
        <div className="flex-1 flex flex-col border-r border-zinc-300 overflow-hidden">
          <div className="bg-zinc-100 border-b border-zinc-200 px-3 py-1 font-bold text-zinc-700 flex justify-between">
            <span>Inflow</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <tbody>
                {reportData.summary.inflows.map((item) => {
                  const key = `inf-${item.group_id}`;
                  const isFocused = focusedKey === key;
                  return (
                    <tr
                      key={key}
                      className={`border-b border-zinc-50 cursor-pointer ${
                        isFocused ? "bg-[#e4e4e7] font-bold text-zinc-950" : "hover:bg-zinc-50 text-zinc-800"
                      }`}
                      onClick={() => setFocusedKey(key)}
                      onDoubleClick={() => navigate(`/reports/accounts/group-summary/${item.group_id}`)}
                    >
                      <td className="px-3 py-1.5 text-left font-semibold">{item.group_name}</td>
                      <td className="px-3 py-1.5 text-right font-mono w-36">{fmt(item.balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* OUTFLOW SIDE */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-zinc-100 border-b border-zinc-200 px-3 py-1 font-bold text-zinc-700 flex justify-between">
            <span>Outflow</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <tbody>
                {reportData.summary.outflows.map((item) => {
                  const key = `outf-${item.group_id}`;
                  const isFocused = focusedKey === key;
                  return (
                    <tr
                      key={key}
                      className={`border-b border-zinc-50 cursor-pointer ${
                        isFocused ? "bg-[#e4e4e7] font-bold text-zinc-950" : "hover:bg-zinc-50 text-zinc-800"
                      }`}
                      onClick={() => setFocusedKey(key)}
                      onDoubleClick={() => navigate(`/reports/accounts/group-summary/${item.group_id}`)}
                    >
                      <td className="px-3 py-1.5 text-left font-semibold">{item.group_name}</td>
                      <td className="px-3 py-1.5 text-right font-mono w-36">{fmt(item.balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex font-bold text-zinc-900 border-t border-zinc-400 bg-[#f4f4f5] select-none text-[11px]">
        <div className="flex-1 px-3 py-1.5 flex justify-between border-r border-zinc-300">
          <span>Total Inflow</span>
          <span className="font-mono">{fmt(reportData.grandTotal.inflow)}</span>
        </div>
        <div className="flex-1 px-3 py-1.5 flex justify-between">
          <span>Total Outflow</span>
          <span className="font-mono">{fmt(reportData.grandTotal.outflow)}</span>
        </div>
      </div>

      <div className="border-t border-zinc-300 bg-[#e4e4e7] text-center py-1.5 font-bold text-zinc-900 select-none text-[11px]">
        Nett Flow: <span className="font-mono">₹{fmt(reportData.grandTotal.nett_flow)}</span>
      </div>
    </div>
  );
}