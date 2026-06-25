import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

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

interface GroupMeta { group_id: number; name: string; parent?: string }
interface BillEntry {
  bill: string;
  bill_date: string;
  due_date: string;
  credit_period: string;
  overdue_days: number;
  balance: number;
  ageing: string;
}
interface LedgerRow {
  ledger_id: number;
  party: string;
  total: number;
  bills: BillEntry[];
}
interface AgeingTotals { "0-30": number; "31-60": number; "61-90": number; "90+": number }

export default function GroupOutstandingsLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { selectedCompany, activeFY } = useCompany();


  const [groupId, setGroupId] = React.useState<number | null>(() => {
    const p = new URLSearchParams(location.search);
    const id = p.get("group_id");
    return id ? Number(id) : ((location.state as any)?.group_id ?? null);
  });
  const [groupName, setGroupName] = React.useState<string>(() => {
    const p = new URLSearchParams(location.search);
    return p.get("group_name") || (location.state as any)?.group_name || "";
  });

  /* Picker state */
  const [groups, setGroups]         = React.useState<GroupMeta[]>([]);
  const [search, setSearch]         = React.useState("");
  const [pickerFocus, setPickerFocus] = React.useState(0);

  /* Data state */
  const [rows, setRows]             = React.useState<LedgerRow[]>([]);
  const [bucketTotals, setBuckets]  = React.useState<AgeingTotals>({ "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 });
  const [as_on, setAsOn]            = React.useState("");
  const [loading, setLoading]       = React.useState(false);
  const [error, setError]           = React.useState<string | null>(null);
  const [focusedIdx, setFocused]    = React.useState(0);
  const [expandedIds, setExpanded]  = React.useState<Set<number>>(new Set());

  const fromDate = activeFY?.start_date || "";
  const toDate   = activeFY?.end_date   || "";
  const cid      = selectedCompany?.company_id;
  const fyid     = activeFY?.fy_id;

  /* ── Load group picker ──────────────────────────────────────────── */
  React.useEffect(() => {
    if (!cid || groupId) return;
    (window as any).api.group.getAll(cid).then((res: any) => {
      const rawList = Array.isArray(res) ? res : (res?.groups ?? res?.data ?? []);
      const nameMap = new Map<number, string>();
      rawList.forEach((g: any) => nameMap.set(g.group_id, g.name));

      const list: GroupMeta[] = rawList
        .map((g: any) => ({
          group_id: g.group_id,
          name: g.name,
          parent: g.parent_group_id ? (nameMap.get(g.parent_group_id) || "") : ""
        }))
        .sort((a: GroupMeta, b: GroupMeta) => a.name.localeCompare(b.name));
      setGroups(list);
    });
  }, [cid, groupId]);

  /* ── Load group bill data ──────────────────────────────────────── */
  React.useEffect(() => {
    if (!groupId || !cid || !fyid) return;
    setLoading(true);
    setError(null);
    (window as any).api.report.groupOutstandings(cid, fyid, groupId)
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
  }, [groupId, cid, fyid]);

  /* ── Filtered group list ────────────────────────────────────────── */
  const filtered = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  /* ── Keyboard: picker ──────────────────────────────────────────── */
  React.useEffect(() => {
    if (groupId) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") {
        if (e.key === "Escape") navigate(-1);
        return;
      }
      if (e.key === "ArrowDown") { e.preventDefault(); setPickerFocus(p => Math.min(filtered.length - 1, p + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setPickerFocus(p => Math.max(0, p - 1)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const g = filtered[pickerFocus];
        if (g) { setGroupId(g.group_id); setGroupName(g.name); }
      } else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); navigate(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [groupId, filtered, pickerFocus, navigate]);

  /* ── Keyboard: drill-down ──────────────────────────────────────── */
  React.useEffect(() => {
    if (!groupId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setFocused(p => Math.min(rows.length - 1, p + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setFocused(p => Math.max(0, p - 1)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const row = rows[focusedIdx];
        if (row) setExpanded(prev => {
          const s = new Set(prev);
          if (s.has(row.ledger_id)) {
            s.delete(row.ledger_id);
          } else {
            s.add(row.ledger_id);
          }
          return s;
        });
      } else if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        setGroupId(null); setGroupName(""); setRows([]); setFocused(0); setExpanded(new Set());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [groupId, rows, focusedIdx, navigate]);

  /* ── Picker view ─────────────────────────────────────────────────── */
  if (!groupId) {
    return (
      <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
        <div className="bg-[#e5eff5] border-b border-zinc-300 px-3 py-1 text-[10px] font-mono text-zinc-700 flex gap-6 select-none">
          <span className="font-bold">Group Outstandings</span>
          <span className="ml-auto">Select a group to view pending bills</span>
        </div>
        <div className="px-3 py-1.5 border-b border-zinc-200 bg-[#f5f9fb]">
          <input
            autoFocus
            type="text"
            placeholder="Type to search group..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPickerFocus(0); }}
            className="w-full text-[11px] font-mono border border-zinc-300 px-2 py-1 rounded outline-none focus:border-blue-400 bg-white"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead className="sticky top-0 bg-[#e5eff5] border-b border-zinc-300 z-10 select-none">
              <tr>
                <th className="px-3 py-1.5 text-left font-bold">Group Name</th>
                <th className="px-3 py-1.5 text-left font-bold w-48">Under</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={2} className="px-4 py-8 text-center text-zinc-400 italic">No groups found.</td></tr>
              ) : filtered.map((g, idx) => (
                <tr
                  key={g.group_id}
                  className={`border-b border-zinc-100 cursor-pointer select-none transition-colors ${pickerFocus === idx ? "bg-[#ffcc00] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
                  onClick={() => { setPickerFocus(idx); setGroupId(g.group_id); setGroupName(g.name); }}
                >
                  <td className="px-3 py-1.5">{g.name}</td>
                  <td className="px-3 py-1.5 text-zinc-500">{g.parent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">Loading Group Outstandings...</div>;
  if (error)   return <div className="flex-1 flex items-center justify-center text-red-500 font-mono text-xs px-8 text-center">{error}</div>;

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const BUCKETS = ["0-30", "31-60", "61-90", "90+"] as const;

  /* ── Drill-down view ─────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      {/* Sub-header */}
      <div className="bg-[#e5eff5] border-b border-zinc-300 px-3 py-1 text-[10px] font-mono text-zinc-700 flex gap-6 select-none">
        <span>Group : <span className="font-bold">{groupName}</span></span>
        <span>Details of : <span className="font-bold">Pending Bills</span></span>
        <span className="ml-auto">
          {as_on ? `As on ${fmtDate(as_on)}` : `${fmtDate(fromDate)} to ${fmtDate(toDate)}`}
        </span>
      </div>

      {/* Ageing summary bar */}
      <div className="bg-[#f5f9fb] border-b border-zinc-200 px-3 py-1 text-[10px] font-mono flex gap-8 select-none text-zinc-600">
        {BUCKETS.map(b => (
          <span key={b}><span className="font-bold text-zinc-800">{b} days:</span> {fmt(bucketTotals[b]) || "0.00"}</span>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-[#e5eff5] border-b border-zinc-300 z-10 select-none">
            <tr>
              <th className="px-3 py-1.5 text-left font-bold">Party / Bill Ref</th>
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
              <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400 italic">No pending bills for this group.</td></tr>
            ) : rows.map((row, idx) => {
              const isFocused = focusedIdx === idx;
              const isExpanded = expandedIds.has(row.ledger_id);
              return (
                <React.Fragment key={row.ledger_id}>
                  {/* Ledger (party) header row */}
                  <tr
                    className={`border-b border-zinc-200 cursor-pointer select-none transition-colors ${isFocused ? "bg-[#ffcc00] text-zinc-950" : "bg-[#edf4f9] text-zinc-900"} font-bold`}
                    onClick={() => setFocused(idx)}
                    onDoubleClick={() => setExpanded(prev => {
                      const s = new Set(prev);
                      if (s.has(row.ledger_id)) {
                        s.delete(row.ledger_id);
                      } else {
                        s.add(row.ledger_id);
                      }
                      return s;
                    })}
                  >
                    <td className="px-3 py-1.5">{isExpanded ? "▾" : "▸"} {row.party}</td>
                    <td colSpan={4} />
                    <td className="px-3 py-1.5 text-right">{fmt(row.total)}</td>
                    <td />
                  </tr>
                  {/* Individual bill rows (expanded) */}
                  {isExpanded && row.bills.map((b, bi) => (
                    <tr key={bi} className="border-b border-zinc-100 bg-white text-zinc-700">
                      <td className="px-3 py-1 pl-8">{b.bill}</td>
                      <td className="px-3 py-1">{fmtDate(b.bill_date)}</td>
                      <td className="px-3 py-1 text-center">{b.credit_period || ""}</td>
                      <td className="px-3 py-1">{fmtDate(b.due_date)}</td>
                      <td className={`px-3 py-1 text-center ${b.overdue_days > 0 ? "text-red-600 font-bold" : ""}`}>{b.overdue_days > 0 ? b.overdue_days : ""}</td>
                      <td className="px-3 py-1 text-right">{fmt(b.balance)}</td>
                      <td className="px-3 py-1 text-center text-zinc-400">{b.ageing}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer total */}
      <div className="border-t-2 border-double border-zinc-400 bg-[#e5eff5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 select-none">
        <span className="flex-1">Grand Total</span>
        <span className="w-[16%] text-right pr-3">{fmtTotal(grandTotal)}</span>
        <span className="w-[8%]" />
      </div>
    </div>
  );
}