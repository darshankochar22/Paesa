import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

const fmt = (val: number) =>
  val === 0 ? "" : new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return dateStr; }
};

export default function GroupVouchersLayout() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const { selectedCompany, activeFY } = useCompany();

  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  React.useEffect(() => {
    if (!companyId || !fyId || !groupId) return;
    setLoading(true);
    setError(null);
    (window as any).api.report.run("group_vouchers", { company_id: companyId, fy_id: fyId, group_id: Number(groupId), from_date: activeFY?.start_date, to_date: activeFY?.end_date })
      .then((res: any) => {
        if (res.success) { setData(res); setFocusedIndex(0); }
        else setError(res.error || "Failed to load group vouchers");
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [companyId, fyId, groupId]);

  const rows: any[] = data?.rows || data?.vouchers || [];

  React.useEffect(() => {
    if (!rows.length) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIndex(p => Math.min(rows.length - 1, p + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIndex(p => Math.max(0, p - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); const r = rows[focusedIndex]; if (r?.voucher_id || r?.id) navigate(`/transactions/voucher/${r.voucher_id || r.id}`); }
      else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); navigate(-1); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rows, focusedIndex, navigate]);

  if (loading) return <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">Loading Group Vouchers...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-xs px-8 text-center">{error}</div>;

  const totalDebit = rows.reduce((s: number, r: any) => s + (Number(r.debit) || Number(r.debit_total) || 0), 0);
  const totalCredit = rows.reduce((s: number, r: any) => s + (Number(r.credit) || Number(r.credit_total) || 0), 0);
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "";

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
            <tr>
              <th className="px-4 py-2 text-left font-bold w-24">Date</th>
              <th className="px-4 py-2 text-left font-bold">Particulars</th>
              <th className="px-4 py-2 text-left font-bold w-32">Vch Type</th>
              <th className="px-4 py-2 text-right font-bold w-24">Vch No.</th>
              <th className="px-4 py-2 text-right font-bold w-32">Debit</th>
              <th className="px-4 py-2 text-right font-bold w-32">Credit</th>
            </tr>
            <tr className="bg-[#f4f4f5]">
              <th colSpan={6} className="px-4 py-0.5 text-right font-normal italic text-zinc-500 border-b border-zinc-200">
                {data?.group_name || `Group ID: ${groupId}`} / {selectedCompany?.name} — {periodLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400 italic">No vouchers found.</td></tr>
            ) : (
              rows.map((row: any, idx: number) => {
                const isFocused = idx === focusedIndex;
                return (
                  <tr
                    key={idx}
                    onClick={() => setFocusedIndex(idx)}
                    onDoubleClick={() => { const id = row.voucher_id || row.id; if (id) navigate(`/transactions/voucher/${id}`); }}
                    className={`border-b border-zinc-100 cursor-pointer transition-colors ${isFocused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
                  >
                    <td className="px-4 py-1.5 whitespace-nowrap">{formatDate(row.date || row.voucher_date)}</td>
                    <td className="px-4 py-1.5 truncate max-w-xs">{row.particulars || row.party_name || row.narration || "—"}</td>
                    <td className="px-4 py-1.5">{row.voucher_type}</td>
                    <td className="px-4 py-1.5 text-right">{row.voucher_number || row.vch_no || "—"}</td>
                    <td className="px-4 py-1.5 text-right font-mono">{fmt(Number(row.debit) || Number(row.debit_total) || 0)}</td>
                    <td className="px-4 py-1.5 text-right font-mono">{fmt(Number(row.credit) || Number(row.credit_total) || 0)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grand Total */}
      <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] px-4 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 select-none shrink-0">
        <span className="flex-1">Grand Total</span>
        <span className="w-32 text-right pr-2">{fmt(totalDebit)}</span>
        <span className="w-32 text-right pr-2">{fmt(totalCredit)}</span>
      </div>
    </div>
  );
}