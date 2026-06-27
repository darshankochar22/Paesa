import * as React from "react";
import { useCompany } from "@/context/CompanyContext";

const fmt = (val: number) =>
  val === 0
    ? ""
    : new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

interface BreakupRow {
  id: number;
  pay_head_name: string;
  pay_type: string;
  emp_name: string;
  amount: number;
}

export default function PayHeadEmployeeBreakupLayout() {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "";

  const [rows, setRows] = React.useState<BreakupRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIdx, setFocusedIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId || !fyId) return;
    setLoading(true);
    setError(null);
    (window as any).api.report
      .payHeadEmployeeBreakup(companyId, fyId)
      .then((res: any) => {
        if (res.success) { setRows(res.rows || []); setFocusedIdx(0); }
        else setError(res.error || "Failed to load Pay Head Employee Breakup");
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [companyId, fyId]);

  React.useEffect(() => {
    if (!rows.length) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIdx(p => Math.min(rows.length - 1, p + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIdx(p => Math.max(0, p - 1)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows]);

  const grandTotal = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  // Group rows by pay head
  const grouped = React.useMemo(() => {
    const map = new Map<string, BreakupRow[]>();
    for (const row of rows) {
      if (!map.has(row.pay_head_name)) map.set(row.pay_head_name, []);
      map.get(row.pay_head_name)!.push(row);
    }
    return map;
  }, [rows]);

  if (loading) return <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">Loading Pay Head Employee Breakup...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-xs px-8 text-center">{error}</div>;

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10">
            <tr>
              <th colSpan={3} className="px-3 py-0.5 text-left font-normal italic text-zinc-500">All pay heads — employee breakup</th>
              <th className="px-3 py-0.5 text-right font-normal text-zinc-500">{periodLabel}</th>
            </tr>
            <tr className="border-t border-zinc-200 text-zinc-900">
              <th className="px-3 py-1.5 text-left font-bold">Pay Head</th>
              <th className="px-3 py-1.5 text-left font-bold w-32">Pay Type</th>
              <th className="px-3 py-1.5 text-left font-bold">Employee</th>
              <th className="px-3 py-1.5 text-right font-bold w-32">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400 italic">No records found.</td></tr>
            ) : Array.from(grouped.entries()).map(([payHead, phRows]) => (
              <React.Fragment key={payHead}>
                <tr className="bg-zinc-100 border-b border-zinc-200">
                  <td colSpan={4} className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
                    {payHead} <span className="font-normal normal-case text-zinc-400 ml-2">{phRows[0]?.pay_type}</span>
                  </td>
                </tr>
                {phRows.map((row) => {
                  const idx = rows.indexOf(row);
                  const focused = idx === focusedIdx;
                  return (
                    <tr key={row.id} onClick={() => setFocusedIdx(idx)}
                      className={`border-b border-zinc-100 cursor-pointer transition-colors ${focused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}>
                      <td className="px-3 py-1.5 pl-6 text-zinc-400">—</td>
                      <td className="px-3 py-1.5" />
                      <td className="px-3 py-1.5">{row.emp_name}</td>
                      <td className="px-3 py-1.5 text-right">{fmt(Number(row.amount) || 0)}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] shrink-0">
        <table className="w-full text-[11px] font-mono">
          <tbody>
            <tr className="font-bold text-zinc-900">
              <td className="px-3 py-1.5">Grand Total</td>
              <td className="w-32" />
              <td />
              <td className="px-3 py-1.5 text-right w-32">{fmt(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
