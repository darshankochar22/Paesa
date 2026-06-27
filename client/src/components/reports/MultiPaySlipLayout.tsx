import * as React from "react";
import { useCompany } from "@/context/CompanyContext";

const fmtAmount = (val: number) =>
  val === 0
    ? ""
    : new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

interface PaySlipRow {
  id: number;
  particulars: string;
  emp_number: string;
  account_no: string;
  bank_name: string;
  branch: string;
  amount: number;
  email_id: string;
}

export default function MultiPaySlipLayout() {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "";

  const [rows, setRows] = React.useState<PaySlipRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIdx, setFocusedIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId || !fyId) return;
    setLoading(true);
    setError(null);
    (window as any).api.report
      .paySlip(companyId, fyId)
      .then((res: any) => {
        if (res.success) {
          setRows(res.rows || []);
          setFocusedIdx(0);
        } else {
          setError(res.error || "Failed to load Pay Slip");
        }
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

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">Loading Pay Slip...</div>;
  }
  if (error) {
    return <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-xs px-8 text-center">{error}</div>;
  }

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-900">
            {/* Report sub-title row */}
            <tr className="bg-[#f4f4f5]">
              <th colSpan={6} className="px-3 py-0.5 text-left font-normal italic text-zinc-500">
                For all employees
              </th>
              <th className="px-3 py-0.5 text-right font-normal text-zinc-500">
                {periodLabel}
              </th>
            </tr>
            {/* Column headers */}
            <tr className="border-t border-zinc-200">
              <th className="px-3 py-1.5 text-left font-bold">Particulars</th>
              <th className="px-3 py-1.5 text-left font-bold w-32">Employee Number</th>
              <th className="px-3 py-1.5 text-left font-bold w-32">Account No.</th>
              <th className="px-3 py-1.5 text-left font-bold w-32">Bank Name</th>
              <th className="px-3 py-1.5 text-left font-bold w-28">Branch</th>
              <th className="px-3 py-1.5 text-right font-bold w-32">Amount</th>
              <th className="px-3 py-1.5 text-left font-bold w-44">E-Mail ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-400 italic">
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const isFocused = idx === focusedIdx;
                return (
                  <tr
                    key={row.id}
                    onClick={() => setFocusedIdx(idx)}
                    className={`border-b border-zinc-100 cursor-pointer transition-colors ${
                      isFocused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"
                    }`}
                  >
                    <td className="px-3 py-1.5">{row.particulars}</td>
                    <td className="px-3 py-1.5">{row.emp_number}</td>
                    <td className="px-3 py-1.5">{row.account_no}</td>
                    <td className="px-3 py-1.5">{row.bank_name}</td>
                    <td className="px-3 py-1.5">{row.branch}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{fmtAmount(Number(row.amount) || 0)}</td>
                    <td className="px-3 py-1.5">{row.email_id}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grand Total */}
      <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] shrink-0 select-none">
        <table className="w-full text-[11px] font-mono">
          <tbody>
            <tr className="font-bold text-zinc-900">
              <td className="px-3 py-1.5">Grand Total</td>
              <td className="w-32" />
              <td className="w-32" />
              <td className="w-32" />
              <td className="w-28" />
              <td className="px-3 py-1.5 text-right w-32 font-mono">{fmtAmount(grandTotal)}</td>
              <td className="w-44" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
