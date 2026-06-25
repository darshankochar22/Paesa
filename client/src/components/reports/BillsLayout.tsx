import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

/* ── Types ─────────────────────────────────────────────────────────── */
interface BillRow {
  bill_id: number;
  date: string;
  ref_no: string;
  party_name: string;
  pending_amount: number;
  due_date: string;
  credit_period: string;
  overdue_days: number;
  ageing: string;
}

type AgeingKey = "0-30" | "31-60" | "61-90" | "90+";
type AgeingTotals = Record<AgeingKey, number>;

interface Props {
  mode: "receivable" | "payable";
}

/* ── Formatters ─────────────────────────────────────────────────────── */
const fmtDate = (d: string) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  const day = dt.getDate();
  const mon = dt.toLocaleString("en-IN", { month: "short" });
  const yr  = String(dt.getFullYear()).slice(-2);
  return `${day}-${mon}-${yr}`;
};

const fmt = (v: number) =>
  v === 0 ? "" : new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));

const fmtTotal = (v: number) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));

const BUCKETS: AgeingKey[] = ["0-30", "31-60", "61-90", "90+"];

/* ── Component ─────────────────────────────────────────────────────── */
export default function BillsLayout({ mode }: Props) {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  const [rows, setRows]               = React.useState<BillRow[]>([]);
  const [bucketTotals, setBuckets]    = React.useState<AgeingTotals>({ "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 });
  const [as_on, setAsOn]              = React.useState("");
  const [loading, setLoading]         = React.useState(true);
  const [error, setError]             = React.useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  const fromDate = activeFY?.start_date || "";
  const toDate   = activeFY?.end_date   || "";

  React.useEffect(() => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) { setLoading(false); return; }
    setLoading(true);
    const method = mode === "receivable" ? "billsReceivable" : "billsPayable";
    (window as any).api.report[method](selectedCompany.company_id, activeFY.fy_id)
      .then((res: any) => {
        if (res?.success) {
          const mapped: BillRow[] = (res.rows || []).map((r: any, i: number) => ({
            bill_id:        i,
            date:           r.bill_date || r.date || "",
            ref_no:         String(r.bill || r.ref_no || ""),
            party_name:     r.party || r.party_name || "",
            pending_amount: Number(r.balance ?? r.pending_amount ?? 0),
            due_date:       r.due_date || "",
            credit_period:  String(r.credit_period || ""),
            overdue_days:   Number(r.overdue_days ?? 0),
            ageing:         r.ageing || "",
          }));
          setRows(mapped);
          setBuckets(res.bucketTotals || { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 });
          setAsOn(res.as_on || "");
        } else {
          setError(res?.error || "Failed to load.");
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedCompany?.company_id, activeFY?.fy_id, mode]);

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

  const grandTotal = rows.reduce((s, r) => s + r.pending_amount, 0);
  const title = mode === "receivable" ? "Bills Receivable" : "Bills Payable";

  if (loading) return <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">Loading {title}...</div>;
  if (error)   return <div className="flex-1 flex items-center justify-center text-red-500 font-mono text-xs px-8 text-center">{error}</div>;

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      {/* Sub-header */}
      <div className="bg-[#e5eff5] border-b border-zinc-300 px-3 py-1 text-[10px] font-mono text-zinc-700 flex gap-6 select-none">
        <span>Group : <span className="font-bold">♦ All Items</span></span>
        <span>Details of : <span className="font-bold">Pending Bills</span></span>
        <span className="ml-auto">
          {as_on ? `As on ${fmtDate(as_on)}` : `${fmtDate(fromDate)} to ${fmtDate(toDate)}`}
        </span>
      </div>

      {/* Ageing summary bar */}
      <div className="bg-[#f5f9fb] border-b border-zinc-200 px-3 py-1 text-[10px] font-mono flex gap-8 select-none text-zinc-600">
        {BUCKETS.map(b => (
          <span key={b}>
            <span className="font-bold text-zinc-800">{b} days:</span>{" "}
            {fmt(bucketTotals[b]) || "0.00"}
          </span>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-[#e5eff5] border-b border-zinc-300 z-10 select-none">
            <tr>
              <th className="px-3 py-1.5 text-left font-bold w-[11%]">Date</th>
              <th className="px-3 py-1.5 text-left font-bold w-[10%]">Ref. No.</th>
              <th className="px-3 py-1.5 text-left font-bold">Party's Name</th>
              <th className="px-3 py-1.5 text-right font-bold w-[16%]">Pending Amount</th>
              <th className="px-3 py-1.5 text-center font-bold w-[8%]">Credit Days</th>
              <th className="px-3 py-1.5 text-left font-bold w-[11%]">Due On</th>
              <th className="px-3 py-1.5 text-center font-bold w-[9%]">Overdue Days</th>
              <th className="px-3 py-1.5 text-center font-bold w-[7%]">Ageing</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-zinc-400 italic">No pending bills found.</td></tr>
            ) : rows.map((row, idx) => {
              const isFocused = focusedIndex === idx;
              return (
                <tr
                  key={row.bill_id}
                  className={`border-b border-zinc-100 cursor-pointer select-none transition-colors ${isFocused ? "bg-[#ffcc00] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
                  onClick={() => setFocusedIndex(idx)}
                >
                  <td className="px-3 py-1.5">{fmtDate(row.date)}</td>
                  <td className="px-3 py-1.5">{row.ref_no}</td>
                  <td className="px-3 py-1.5 font-semibold">{row.party_name}</td>
                  <td className="px-3 py-1.5 text-right">{fmt(row.pending_amount)}</td>
                  <td className="px-3 py-1.5 text-center">{row.credit_period || ""}</td>
                  <td className="px-3 py-1.5">{fmtDate(row.due_date)}</td>
                  <td className={`px-3 py-1.5 text-center ${row.overdue_days > 0 ? "text-red-600 font-bold" : ""}`}>
                    {row.overdue_days > 0 ? row.overdue_days : ""}
                  </td>
                  <td className="px-3 py-1.5 text-center text-zinc-500">{row.ageing}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Grand total footer */}
      <div className="border-t-2 border-double border-zinc-400 bg-[#e5eff5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 select-none">
        <span className="flex-[3] pl-[21%]">Grand Total</span>
        <span className="w-[16%] text-right">{fmtTotal(grandTotal)}</span>
        <span className="flex-1" />
      </div>
    </div>
  );
}