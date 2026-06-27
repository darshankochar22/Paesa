import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dmy = (iso?: string) => {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : iso;
};
const fmtQty = (val: number, unit?: string) => {
  const n = Number(val) || 0;
  if (n === 0) return "";
  const s = n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return unit ? `${s} ${unit}` : s;
};
const fmtAmt = (val: number) => {
  const n = Number(val) || 0;
  if (n === 0) return "";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface Row { item_id: number; item_name: string; unit_name: string; qty: number; rate: number; value: number; }

interface Props {
  /** "from-party" → Stock From Party; "with-job-worker" → Stock With Job Worker. */
  mode: "from-party" | "with-job-worker";
}

/**
 * Job Work — Stock From Party / With Job Worker. Closing balance (quantity,
 * rate, value) of material moved under job work but not yet returned.
 */
export default function JobWorkStock({ mode }: Props) {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${dmy(activeFY.start_date)} to ${dmy(activeFY.end_date)}` : "";
  const title = mode === "with-job-worker" ? "Stock With Job Worker" : "Stock From Party";

  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId || !fyId) { setLoading(false); return; }
    setLoading(true); setError(null); setIdx(0);
    (window as any).api.report.jobWorkStock(companyId, fyId, mode).then((res: any) => {
      if (res.success) setRows(res.items ?? []);
      else setError(res.error || "Failed to load");
      setLoading(false);
    });
  }, [companyId, fyId, mode]);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx(p => Math.min(rows.length - 1, p + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setIdx(p => Math.max(0, p - 1)); }
      else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); navigate(-1); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [rows.length, navigate]);

  const totalQty = rows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
  const totalValue = rows.reduce((s, r) => s + (Number(r.value) || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
        <span className="font-bold text-sm tracking-wide">{title}</span>
        <span className="font-bold text-sm">{selectedCompany?.name || "Company"}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-zinc-300 font-mono">
        <span className="font-semibold">Closing Balance</span>
        <span>{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
            <tr>
              <th className="px-3 py-1 text-left font-bold">Particulars</th>
              <th className="px-3 py-1 text-right font-bold w-36 border-l border-zinc-200">Quantity</th>
              <th className="px-3 py-1 text-right font-bold w-32 border-l border-zinc-200">Rate</th>
              <th className="px-3 py-1 text-right font-bold w-40 border-l border-zinc-200">Value</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400 italic">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-600">{error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400 italic">No records found.</td></tr>
            ) : (
              rows.map((r, i) => {
                const focused = i === idx;
                return (
                  <tr key={r.item_id} onClick={() => setIdx(i)}
                    className={`border-b border-zinc-100 cursor-pointer ${focused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}>
                    <td className="px-3 py-1">{r.item_name}</td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtQty(r.qty, r.unit_name)}</td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtAmt(r.rate)}</td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtAmt(r.value)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 shrink-0">
        <span className="flex-1">Grand Total</span>
        <span className="w-36 text-right border-l border-zinc-300 pr-2">{fmtQty(totalQty)}</span>
        <span className="w-32 border-l border-zinc-300" />
        <span className="w-40 text-right border-l border-zinc-300 pr-2">{fmtAmt(totalValue)}</span>
      </div>

      <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
        <button onClick={() => navigate(-1)} className="hover:underline hover:text-zinc-900">Q: Quit</button>
      </div>
    </div>
  );
}
