import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { filterPartyGroups, partySide } from "@/lib/outstandingParties";
import InterestGroupTable, { groupByLedger } from "./InterestGroupTable";
import type { GroupedLedger } from "./InterestGroupTable";

/* "Groups" option under Interest Calculations: pick a party group (Sundry
   Debtors / Sundry Creditors or a sub-group), then show that group's interest
   using the same layout as Interest Receivable / Payable. */

interface GroupMeta { group_id: number; name: string; parent: string; drcr: "Dr" | "Cr" }

interface InterestGroupLayoutProps { fromDate?: string; toDate?: string }

export default function InterestGroupLayout({ fromDate: fromProp, toDate: toProp }: InterestGroupLayoutProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [drcr, setDrcr] = React.useState<"Dr" | "Cr">("Dr");

  /* Picker state */
  const [groups, setGroups]           = React.useState<GroupMeta[]>([]);
  const [search, setSearch]           = React.useState("");
  const [pickerFocus, setPickerFocus] = React.useState(0);

  /* Report state */
  const [rows, setRows]                     = React.useState<GroupedLedger[]>([]);
  const [totalPrincipal, setTotalPrincipal] = React.useState(0);
  const [totalInterest, setTotalInterest]   = React.useState(0);
  const [toDate, setToDate]                 = React.useState("");
  const [loading, setLoading]               = React.useState(false);
  const [error, setError]                   = React.useState<string | null>(null);

  const fromDate = fromProp || activeFY?.start_date || "";
  const fyEnd    = toProp || activeFY?.end_date || "";
  const cid      = selectedCompany?.company_id;
  const fyid     = activeFY?.fy_id;

  /* ── Load group picker (Sundry Debtors / Creditors + sub-groups only) ── */
  React.useEffect(() => {
    if (!cid || groupId) return;
    (window as any).api.group.getAll(cid).then((res: any) => {
      const rawList = Array.isArray(res) ? res : (res?.groups ?? res?.data ?? []);
      const nameMap = new Map<number, string>();
      rawList.forEach((g: any) => nameMap.set(g.group_id, g.name));
      const sides = partySide(rawList);
      const list: GroupMeta[] = filterPartyGroups(rawList)
        .map((g: any) => ({
          group_id: g.group_id,
          name: g.name,
          parent: g.parent_group_id ? (nameMap.get(g.parent_group_id) || "") : "",
          drcr: sides.get(g.group_id) || "Dr",
        }))
        .sort((a: GroupMeta, b: GroupMeta) => a.name.localeCompare(b.name));
      setGroups(list);
    });
  }, [cid, groupId]);

  /* ── Load interest once a group is chosen ─────────────────────────── */
  React.useEffect(() => {
    if (!groupId || !cid || !fyid) return;
    setLoading(true);
    setError(null);
    (window as any).api.report.groupInterest(cid, fyid, { group_id: groupId, from_date: fromDate || undefined, to_date: fyEnd || undefined })
      .then((res: any) => {
        if (res?.success) {
          setRows(groupByLedger(res.rows || []));
          setTotalPrincipal(res.total_principal || 0);
          setTotalInterest(res.total_interest || 0);
          setToDate(res.to_date || "");
          if (res.nature) setDrcr(res.nature === "Liabilities" ? "Cr" : "Dr");
        } else {
          setError(res?.error || "Failed to load.");
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [groupId, cid, fyid, fromDate, fyEnd]);

  /* ── Picker keyboard ──────────────────────────────────────────────── */
  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));
  const selectGroup = (g: GroupMeta) => { setGroupId(g.group_id); setGroupName(g.name); setDrcr(g.drcr); };

  React.useEffect(() => {
    if (groupId) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") { if (e.key === "Escape") navigate(-1); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setPickerFocus((p) => Math.min(filtered.length - 1, p + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setPickerFocus((p) => Math.max(0, p - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); const g = filtered[pickerFocus]; if (g) selectGroup(g); }
      else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); navigate(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [groupId, filtered, pickerFocus, navigate]);

  /* ── Picker view (List of Groups) ─────────────────────────────────── */
  if (!groupId) {
    return (
      <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
        <div className="bg-white border-b border-black px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
          <span className="font-bold">Group Interest Calculations</span>
          <span className="ml-auto">Select a group to view interest</span>
        </div>
        <div className="px-3 py-1.5 border-b border-black/10 bg-white">
          <input
            autoFocus
            type="text"
            placeholder="Name of Group..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPickerFocus(0); }}
            className="w-full text-[11px] font-mono border border-black px-2 py-1 rounded outline-none focus:border-black bg-white"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead className="sticky top-0 bg-white border-b border-black z-10 select-none">
              <tr>
                <th className="px-3 py-1.5 text-left font-bold">List of Groups</th>
                <th className="px-3 py-1.5 text-left font-bold w-48">Under</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={2} className="px-4 py-8 text-center text-black/50 italic">No groups found.</td></tr>
              ) : filtered.map((g, idx) => (
                <tr
                  key={g.group_id}
                  className={`border-b border-black/10 cursor-pointer select-none transition-colors ${pickerFocus === idx ? "bg-black/10 text-black font-bold" : "hover:bg-black/[0.04] text-black"}`}
                  onClick={() => selectGroup(g)}
                >
                  <td className="px-3 py-1.5">{g.name}</td>
                  <td className="px-3 py-1.5 text-black/50">{g.parent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-black/60 font-mono text-xs">Loading Interest Calculation...</div>;
  if (error)   return <div className="flex-1 flex items-center justify-center text-black font-mono text-xs px-8 text-center">{error}</div>;

  return (
    <InterestGroupTable
      title="Group Interest Calculations"
      groupName={groupName}
      drcr={drcr}
      fromDate={fromDate}
      toDate={toDate || fyEnd}
      groups={rows}
      totalPrincipal={totalPrincipal}
      totalInterest={totalInterest}
      onEscape={() => { setGroupId(null); setGroupName(""); setRows([]); }}
    />
  );
}
