import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { filterPartyLedgers } from "@/lib/outstandingParties";

/* ── Formatters ────────────────────────────────────────────────────── */
const fmtDate = (d: string) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${dt.getDate()}-${dt.toLocaleString("en-IN", { month: "short" })}-${String(dt.getFullYear()).slice(-2)}`;
};
const fmt = (v: number) =>
  v === 0 ? "" : new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));
const fmtTotal = (v: number) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));

/* ── Types ─────────────────────────────────────────────────────────── */
interface LedgerMeta { ledger_id: number; name: string; group_name?: string }
interface BillRow {
  bill: string;
  bill_date: string;
  due_date: string;
  credit_period: string;
  overdue_days: number;
  balance: number;
  ageing: string;
}
interface AgeingTotals { "0-30": number; "31-60": number; "61-90": number; "90+": number }

/* ── Main Component ─────────────────────────────────────────────────── */
export default function LedgerOutstandingsLayout() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { selectedCompany, activeFY } = useCompany();

  /* Read ledger_id from URL search params or router state */
  const [ledgerId, setLedgerId] = React.useState<number | null>(() => {
    const p = new URLSearchParams(location.search);
    const id = p.get("ledger_id");
    return id ? Number(id) : ((location.state as any)?.ledger_id ?? null);
  });
  const [ledgerName, setLedgerName] = React.useState<string>(() => {
    const p = new URLSearchParams(location.search);
    return p.get("ledger_name") || (location.state as any)?.ledger_name || "";
  });

  /* Picker state */
  const [ledgers, setLedgers]       = React.useState<LedgerMeta[]>([]);
  const [search, setSearch]         = React.useState("");
  const [pickerFocus, setPickerFocus] = React.useState(0);

  /* Drill-down state */
  const [rows, setRows]           = React.useState<BillRow[]>([]);
  const [bucketTotals, setBuckets]  = React.useState<AgeingTotals>({ "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 });
  const [as_on, setAsOn]          = React.useState("");
  const [loading, setLoading]     = React.useState(false);
  const [error, setError]         = React.useState<string | null>(null);
  const [focusedIdx, setFocused]  = React.useState(0);

  const fromDate = activeFY?.start_date || "";
  const toDate   = activeFY?.end_date   || "";
  const cid      = selectedCompany?.company_id;
  const fyid     = activeFY?.fy_id;

  /* ── Load ledger picker ─────────────────────────────────────────── */
  React.useEffect(() => {
    if (!cid || ledgerId) return;
    // Restrict the picker to Sundry Debtors / Sundry Creditors parties (incl. sub-groups).
    Promise.all([
      (window as any).api.ledger.getAll(cid),
      (window as any).api.group.getAll(cid),
    ]).then(([ledRes, grpRes]: any[]) => {
      const rawList = Array.isArray(ledRes) ? ledRes : (ledRes?.ledgers ?? ledRes?.data ?? []);
      const groups = grpRes?.groups ?? (Array.isArray(grpRes) ? grpRes : []);
      const list: LedgerMeta[] = filterPartyLedgers(rawList, groups)
        .map((l: any) => ({ ledger_id: l.ledger_id, name: l.name, group_name: l.group_name || "" }))
        .sort((a: LedgerMeta, b: LedgerMeta) => a.name.localeCompare(b.name));
      setLedgers(list);
    });
  }, [cid, ledgerId]);

  /* ── Load bill data once ledger selected ─────────────────────────── */
  React.useEffect(() => {
    if (!ledgerId || !cid || !fyid) return;
    setLoading(true);
    setError(null);
    (window as any).api.report.ledgerOutstandings(cid, fyid, ledgerId)
      .then((res: any) => {
        if (res?.success) {
          setRows(res.rows || []);
          setBuckets(res.bucketTotals || { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 });
          setAsOn(res.as_on || "");
        } else {
          setError(res?.error || "Failed to load.");
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ledgerId, cid, fyid]);

  /* ── Keyboard for picker ──────────────────────────────────────────── */
  const filtered = ledgers.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));

  React.useEffect(() => {
    if (ledgerId) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") {
        if (e.key === "Escape") navigate(-1);
        return;
      }
      if (e.key === "ArrowDown") { e.preventDefault(); setPickerFocus(p => Math.min(filtered.length - 1, p + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setPickerFocus(p => Math.max(0, p - 1)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const l = filtered[pickerFocus];
        if (l) { setLedgerId(l.ledger_id); setLedgerName(l.name); }
      } else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); navigate(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ledgerId, filtered, pickerFocus, navigate]);

  /* ── Keyboard for drill-down table ───────────────────────────────── */
  React.useEffect(() => {
    if (!ledgerId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setFocused(p => Math.min(rows.length - 1, p + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setFocused(p => Math.max(0, p - 1)); }
      else if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        setLedgerId(null); setLedgerName(""); setRows([]); setFocused(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ledgerId, rows, navigate]);

  /* ── Picker view ─────────────────────────────────────────────────── */
  if (!ledgerId) {
    return (
      <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
        <div className="bg-white border-b border-black px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
          <span className="font-bold">Ledger Outstandings</span>
          <span className="ml-auto">Select a ledger to view pending bills</span>
        </div>
        {/* Search */}
        <div className="px-3 py-1.5 border-b border-black/10 bg-white">
          <input
            autoFocus
            type="text"
            placeholder="Type to search ledger..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPickerFocus(0); }}
            className="w-full text-[11px] font-mono border border-black px-2 py-1 rounded outline-none focus:border-black bg-white"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead className="sticky top-0 bg-white border-b border-black z-10 select-none">
              <tr>
                <th className="px-3 py-1.5 text-left font-bold">Ledger Name</th>
                <th className="px-3 py-1.5 text-left font-bold w-48">Group</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={2} className="px-4 py-8 text-center text-black/60 italic">No ledgers found.</td></tr>
              ) : filtered.map((l, idx) => (
                <tr
                  key={l.ledger_id}
                  className={`border-b border-black/10 cursor-pointer select-none transition-colors ${pickerFocus === idx ? "bg-black/10 text-black font-bold" : "hover:bg-black/[0.04] text-black"}`}
                  onClick={() => { setPickerFocus(idx); setLedgerId(l.ledger_id); setLedgerName(l.name); }}
                >
                  <td className="px-3 py-1.5">{l.name}</td>
                  <td className="px-3 py-1.5 text-black/60">{l.group_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ── Loading / Error states ─────────────────────────────────────── */
  if (loading) return <div className="flex-1 flex items-center justify-center text-black/60 font-mono text-xs">Loading Ledger Outstandings...</div>;
  if (error)   return <div className="flex-1 flex items-center justify-center text-black font-mono text-xs px-8 text-center">{error}</div>;

  const grandTotal = rows.reduce((s, r) => s + r.balance, 0);
  const BUCKETS = ["0-30", "31-60", "61-90", "90+"] as const;

  /* ── Drill-down view ─────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      {/* Sub-header */}
      <div className="bg-white border-b border-black px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
        <span>Ledger : <span className="font-bold">{ledgerName}</span></span>
        <span>Details of : <span className="font-bold">Pending Bills</span></span>
        <span className="ml-auto">
          {as_on ? `As on ${fmtDate(as_on)}` : `${fmtDate(fromDate)} to ${fmtDate(toDate)}`}
        </span>
      </div>

      {/* Ageing summary bar */}
      <div className="bg-white border-b border-black/10 px-3 py-1 text-[10px] font-mono flex gap-8 select-none text-black">
        {BUCKETS.map(b => (
          <span key={b}><span className="font-bold text-black">{b} days:</span> {fmt(bucketTotals[b]) || "0.00"}</span>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-white border-b border-black z-10 select-none">
            <tr>
              <th className="px-3 py-1.5 text-left font-bold">Bill Ref</th>
              <th className="px-3 py-1.5 text-left font-bold w-[11%]">Bill Date</th>
              <th className="px-3 py-1.5 text-center font-bold w-[8%]">Credit Days</th>
              <th className="px-3 py-1.5 text-left font-bold w-[11%]">Due On</th>
              <th className="px-3 py-1.5 text-center font-bold w-[8%]">Overdue Days</th>
              <th className="px-3 py-1.5 text-right font-bold w-[16%]">Balance</th>
              <th className="px-3 py-1.5 text-center font-bold w-[8%]">Ageing</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-black/60 italic">No pending bills for this ledger.</td></tr>
            ) : rows.map((row, idx) => {
              const isFocused = focusedIdx === idx;
              return (
                <tr
                  key={idx}
                  className={`border-b border-black/10 cursor-pointer select-none transition-colors ${isFocused ? "bg-black/10 text-black font-bold" : "hover:bg-black/[0.04] text-black"}`}
                  onClick={() => setFocused(idx)}
                >
                  <td className="px-3 py-1.5 font-semibold">{row.bill}</td>
                  <td className="px-3 py-1.5">{fmtDate(row.bill_date)}</td>
                  <td className="px-3 py-1.5 text-center">{row.credit_period || ""}</td>
                  <td className="px-3 py-1.5">{fmtDate(row.due_date)}</td>
                  <td className={`px-3 py-1.5 text-center ${row.overdue_days > 0 ? "text-black font-bold" : ""}`}>{row.overdue_days > 0 ? row.overdue_days : ""}</td>
                  <td className="px-3 py-1.5 text-right">{fmt(row.balance)}</td>
                  <td className="px-3 py-1.5 text-center text-black/60">{row.ageing}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer total */}
      <div className="border-t-2 border-double border-black bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black select-none">
        <span className="flex-1">Total</span>
        <span className="w-[16%] text-right pr-3">{fmtTotal(grandTotal)}</span>
        <span className="w-[8%]" />
      </div>
    </div>
  );
}