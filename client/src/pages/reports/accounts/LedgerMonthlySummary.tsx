import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

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

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Combine Dr/Cr pair into a single "12,345.00 Cr" / "12,345.00 Dr" string,
// matching how real Tally displays a running closing balance.
function closingLabel(dr: number, cr: number) {
  if (dr === 0 && cr === 0) return "—";
  if (dr >= cr) return `${fmt(dr - cr)} Dr`;
  return `${fmt(cr - dr)} Cr`;
}
function closingValue(dr: number, cr: number) {
  return dr - cr; // positive = Dr balance, negative = Cr balance
}

export default function LedgerMonthlySummaryLayout() {
  const navigate = useNavigate();
  const { ledgerId } = useParams<{ ledgerId: string }>();
  const { selectedCompany, activeFY } = useCompany();

  const [data, setData] = React.useState<LedgerMonthlyResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedMonth, setFocusedMonth] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!ledgerId || !selectedCompany?.company_id || !activeFY?.fy_id) return;
    setLoading(true);
    setError(null);
    (window as any).api.report
      .ledgerMonthlySummary(selectedCompany.company_id, activeFY.fy_id, Number(ledgerId))
      .then((res: LedgerMonthlyResponse) => {
        if (res.success) setData(res);
        else setError(res.error || "Failed to load ledger summary");
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [ledgerId, selectedCompany?.company_id, activeFY?.fy_id]);

  const handleMonthOpen = React.useCallback(
    (row: MonthRow) => {
      navigate(`/reports/accounts/ledger?ledger_id=${ledgerId}&month=${encodeURIComponent(row.month)}`);
    },
    [navigate, ledgerId]
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate(-1);
        return;
      }
      if (!focusedMonth || !data) return;
      if (e.key === "Enter") {
        e.preventDefault();
        const row = data.rows.find((r) => r.month === focusedMonth);
        if (row) handleMonthOpen(row);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedMonth, data, handleMonthOpen, navigate]);

  if (loading) {
    return <div className="p-4 text-xs font-mono text-zinc-400">Loading...</div>;
  }
  if (error) {
    return <div className="p-4 text-xs font-mono text-zinc-600">{error}</div>;
  }
  if (!data) return null;

  // Chart: simple bar chart of closing balance per month, no extra deps.
  const values = data.rows.map((r) => Math.abs(closingValue(r.closingDr, r.closingCr)));
  const maxVal = Math.max(...values, 1);
  const chartHeight = 90;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white font-mono">
      <div className="bg-[#18181b] text-white px-3 py-1.5 flex items-center justify-between select-none">
        <button onClick={() => navigate(-1)} className="text-[11px] hover:underline">
          ← Back
        </button>
        <span className="text-[12px] font-bold">Ledger Monthly Summary</span>
        <span className="text-[11px]">{selectedCompany?.name ?? ""}</span>
      </div>

      <div className="bg-[#f4f4f5] border-b border-zinc-200 px-3 py-2 flex justify-between items-start">
        <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-800">
          Particulars
        </span>
        <div className="text-right">
          <div className="text-[11px] italic text-zinc-700">{data.ledger_name}</div>
          <div className="text-[11px] font-bold text-zinc-800">{selectedCompany?.name}</div>
          <div className="text-[10px] text-zinc-500">
            {activeFY ? `For ${activeFY.start_date}` : ""}
          </div>
          <div className="flex justify-end gap-6 mt-1 text-[10px] font-bold text-zinc-700 border-t border-zinc-300 pt-1">
            <span className="w-24 text-right">Debit</span>
            <span className="w-24 text-right">Credit</span>
            <span className="w-28 text-right">Closing Balance</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse font-mono text-[11px]">
          <tbody>
            <tr className="border-b border-zinc-100">
              <td className="px-3 py-1 italic text-zinc-500">Opening Balance</td>
              <td className="px-3 py-1 text-right w-24"></td>
              <td className="px-3 py-1 text-right w-24"></td>
              <td className="px-3 py-1 text-right w-28">
                {closingLabel(data.openingDr, data.openingCr)}
              </td>
            </tr>

            {data.rows.map((row) => {
              const isFocused = focusedMonth === row.month;
              return (
                <tr
                  key={row.month}
                  className={`border-b border-zinc-50 cursor-pointer select-none ${
                    isFocused
                      ? "bg-[#e4e4e7] text-zinc-950 font-bold"
                      : "hover:bg-zinc-50 text-zinc-700"
                  }`}
                  onClick={() => setFocusedMonth(row.month)}
                  onDoubleClick={() => handleMonthOpen(row)}
                >
                  <td className="px-3 py-1 text-left">{row.month}</td>
                  <td className="px-3 py-1 text-right w-24">{row.debit ? fmt(row.debit) : ""}</td>
                  <td className="px-3 py-1 text-right w-24">{row.credit ? fmt(row.credit) : ""}</td>
                  <td className="px-3 py-1 text-right w-28">
                    {closingLabel(row.closingDr, row.closingCr)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-double border-zinc-400 bg-white px-3 py-1.5 flex justify-between font-mono text-[11px] font-bold text-zinc-900 select-none">
        <span>Grand Total</span>
        <span>{closingLabel(data.closingDr, data.closingCr)}</span>
      </div>

      {/* Monthly trend chart, matching the bar chart at the bottom of the real screen */}
      <div className="border-t border-zinc-200 px-4 py-3" style={{ height: chartHeight + 30 }}>
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${data.rows.length * 60} ${chartHeight}`}>
          {data.rows.map((row, i) => {
            const v = Math.abs(closingValue(row.closingDr, row.closingCr));
            const barHeight = maxVal > 0 ? (v / maxVal) * (chartHeight - 16) : 0;
            const x = i * 60 + 18;
            return (
              <g key={row.month}>
                <rect
                  x={x}
                  y={chartHeight - barHeight - 14}
                  width={24}
                  height={barHeight}
                  fill={row.closingDr >= row.closingCr ? "#52525b" : "#71717a"}
                  rx={1}
                />
                <text
                  x={x + 12}
                  y={chartHeight - 2}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#71717a"
                >
                  {row.month.slice(0, 3)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}