import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

// Issues #178 / #179 — Sale Bills Pending / Purchase Bills Pending.
// Tracking-number reconciliation: bills raised whose goods have not yet moved
// against a Delivery Note (sales) / Receipt Note (purchase).
// F5 cross-links the two reports, matching TallyPrime.

type Mode = "sales" | "purchase";

interface Row {
  voucher_id: number | null;
  date: string;
  tracking_no: string;
  item_name: string;
  party_name: string;
  unit: string;
  initial_qty: number;
  pending_qty: number;
  rate: number;
  disc_amount: number;
  value: number;
}

const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const dmy = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : iso;
};
const fmtNum = (v: number | null | undefined) =>
  !v ? "" : new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const fmtQty = (v: number | null | undefined, unit?: string) => {
  const n = Number(v) || 0;
  if (n === 0) return "";
  const num = n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return unit ? `${num} ${unit}` : num;
};

const TH = "px-2 py-1 font-bold text-[10px] bg-zinc-100 border-b border-zinc-300";

export default function BillsPending({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${dmy(activeFY.start_date)} to ${dmy(activeFY.end_date)}` : "";

  const title = mode === "sales" ? "Sales Bills Pending" : "Purchase Bills Pending";
  const otherTitle = mode === "sales" ? "Purchase Bills Pending" : "Sales Bills Pending";
  const otherRoute = mode === "sales"
    ? "/reports/statements-of-inventory/purchase-bills-pending"
    : "/reports/statements-of-inventory/sale-bills-pending";
  const sectionLabel = mode === "sales"
    ? "Bills Made but Goods not Delivered :"
    : "Bills Received but Goods not Received :";

  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId || !fyId) { setLoading(false); return; }
    setLoading(true); setErr(null);
    (window as any).api.report.billsPending(companyId, fyId, mode).then((res: any) => {
      if (res?.success) setRows(res.rows ?? []);
      else setErr(res?.error ?? "Failed to load bills pending.");
      setLoading(false);
    }).catch((e: any) => { setErr(e.message); setLoading(false); });
  }, [companyId, fyId, mode]);

  const totals = rows.reduce((a, r) => ({
    initial: a.initial + r.initial_qty, pending: a.pending + r.pending_qty, value: a.value + r.value,
  }), { initial: 0, pending: 0, value: 0 });
  // Quantity totals carry a unit only when every row shares one (else blank).
  const unitSet = new Set(rows.filter(r => r.pending_qty).map(r => r.unit));
  const totalUnit = unitSet.size === 1 ? [...unitSet][0] : "";

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx(p => Math.min(rows.length - 1, p + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setIdx(p => Math.max(0, p - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); const r = rows[idx]; if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`); }
      else if (e.key === "F5") { e.preventDefault(); navigate(otherRoute); }
      else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); navigate(-1); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [rows, idx, navigate, otherRoute]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
        <span className="font-bold text-sm tracking-wide">{title}</span>
        <span className="font-bold text-sm">{selectedCompany?.name ?? ""}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-zinc-300 font-mono text-[11px]">
        <span className="font-semibold">{sectionLabel}</span>
        <span>{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={`${TH} text-left`}>Date</th>
              <th className={`${TH} text-left`}>Tracking Number</th>
              <th className={`${TH} text-left`}>Name of Item</th>
              <th className={`${TH} text-right w-28`}>Initial Quantity</th>
              <th className={`${TH} text-right w-28`}>Pending Quantity</th>
              <th className={`${TH} text-right w-24`}>Rate (Disc %)</th>
              <th className={`${TH} text-right w-28`}>Value</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400 italic">Loading…</td></tr>
            ) : err ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-600">{err}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400 italic">No bills pending.</td></tr>
            ) : rows.map((r, i) => (
              <React.Fragment key={i}>
                <tr
                  onClick={() => setIdx(i)}
                  onDoubleClick={() => r.voucher_id && navigate(`/transactions/voucher/${r.voucher_id}`)}
                  className={`border-b border-zinc-100 cursor-pointer ${i === idx ? "bg-[#e4e4e7] font-bold" : "hover:bg-zinc-50"}`}
                >
                  <td className="px-2 py-1 whitespace-nowrap">{dmy(r.date)}</td>
                  <td className="px-2 py-1">{r.tracking_no}</td>
                  <td className="px-2 py-1">{r.item_name}</td>
                  <td className="px-2 py-1 text-right w-28">{fmtQty(r.initial_qty, r.unit)}</td>
                  <td className="px-2 py-1 text-right w-28">{fmtQty(r.pending_qty, r.unit)}</td>
                  <td className="px-2 py-1 text-right w-24">{fmtNum(r.rate)}</td>
                  <td className="px-2 py-1 text-right w-28">{fmtNum(r.value)}</td>
                </tr>
                <tr className={i === idx ? "bg-[#e4e4e7]" : ""}>
                  <td />
                  <td colSpan={6} className="px-2 pb-1 italic text-zinc-500">To: {r.party_name || "—"}</td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total row — fixed widths mirror the numeric columns so it aligns */}
      <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] px-2 py-1.5 flex font-mono text-[11px] font-bold shrink-0">
        <span className="flex-1 pl-2">Total</span>
        <span className="w-28 text-right">{totalUnit ? fmtQty(totals.initial, totalUnit) : ""}</span>
        <span className="w-28 text-right">{totalUnit ? fmtQty(totals.pending, totalUnit) : ""}</span>
        <span className="w-24" />
        <span className="w-28 text-right">{fmtNum(totals.value)}</span>
      </div>

      <div className="flex items-center gap-6 px-3 py-1 border-t border-zinc-300 bg-white text-[10px] font-semibold text-zinc-600 shrink-0">
        <button onClick={() => navigate(-1)} className="hover:text-zinc-900">Q: Quit</button>
        <button onClick={() => navigate(otherRoute)} className="hover:text-zinc-900">F5: {otherTitle}</button>
        <span className="text-zinc-400">Enter: Open voucher</span>
      </div>
    </div>
  );
}
