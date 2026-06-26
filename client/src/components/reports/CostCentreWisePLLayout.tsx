import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

const fmt = (v: number) =>
  v === 0 ? "" : new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));
const fmtTotal = (v: number) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));

export default function CostCentreWisePLLayout() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  const cid = selectedCompany?.company_id;
  const fyid = activeFY?.fy_id;

  React.useEffect(() => {
    if (!cid || !fyid) { setLoading(false); return; }
    setLoading(true);
    (window as any).api.report.run("cost_centre_wise_p_and_l", { company_id: cid, fy_id: fyid })
      .then((res: any) => {
        if (res?.success) {
          setRows(res.rows || []);
        } else {
          setError(res?.error || "Failed to load Cost Centre-wise P&L.");
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [cid, fyid]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIndex(p => Math.min(rows.length - 1, p + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIndex(p => Math.max(0, p - 1)); }
      else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); navigate(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, navigate]);

  if (loading) return <div className="flex-1 flex items-center justify-center text-zinc-500 font-mono text-xs">Loading Cost Centre-wise P&L...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-xs">{error}</div>;

  const totalExpense = rows.reduce((s, r) => s + (Number(r.expense_debit) || 0), 0);
  const totalIncome = rows.reduce((s, r) => s + (Number(r.income_credit) || 0), 0);
  const totalAmount = totalIncome - totalExpense;

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      <div className="bg-[#f4f4f5] border-b border-zinc-300 px-3 py-1 text-[10px] font-mono text-zinc-700 flex gap-6 select-none">
        <span className="font-bold">Cost Centre-wise Profit & Loss</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700 select-none">
            <tr>
              <th className="px-4 py-2 text-left font-bold">Particulars</th>
              <th className="w-40 text-right px-4 py-2 font-bold border-l border-zinc-200">Expense/Debit</th>
              <th className="w-40 text-right px-4 py-2 font-bold border-l border-zinc-200">Income/Credit</th>
              <th className="w-40 text-right px-4 py-2 font-bold border-l border-zinc-200">Current Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400 italic">No records found.</td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const isFocused = focusedIndex === idx;
                return (
                  <tr
                    key={row.cc_id || idx}
                    className={`border-b border-zinc-100 cursor-pointer select-none transition-colors ${
                      isFocused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800 font-semibold"
                    }`}
                    onClick={() => setFocusedIndex(idx)}
                  >
                    <td className="px-4 py-1.5 text-left">{row.particulars}</td>
                    <td className="w-40 text-right px-4 py-1.5 border-l border-zinc-100">{fmt(row.expense_debit)}</td>
                    <td className="w-40 text-right px-4 py-1.5 border-l border-zinc-100">{fmt(row.income_credit)}</td>
                    <td className={`w-40 text-right px-4 py-1.5 border-l border-zinc-100 ${row.current_amount < 0 ? "text-zinc-700" : ""}`}>
                      {fmt(row.current_amount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="sticky bottom-0 bg-[#f4f4f5] border-t border-zinc-300 z-10 font-bold text-zinc-800">
              <tr>
                <td className="px-4 py-2 text-left">Grand Total</td>
                <td className="w-40 text-right px-4 py-2 border-l border-zinc-300">{fmtTotal(totalExpense)}</td>
                <td className="w-40 text-right px-4 py-2 border-l border-zinc-300">{fmtTotal(totalIncome)}</td>
                <td className={`w-40 text-right px-4 py-2 border-l border-zinc-300 ${totalAmount < 0 ? "text-zinc-700" : ""}`}>
                  {fmtTotal(totalAmount)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
