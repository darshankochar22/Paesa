import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { partySide } from "@/lib/outstandingParties";
import InterestGroupTable, { groupByLedger } from "./InterestGroupTable";
import type { GroupedLedger } from "./InterestGroupTable";

/* "Groups" option under Interest Calculations: pick ANY group (like TallyPrime's
   Group Interest Calculation lists every group — Primary, Bank OCC A/c, Capital
   Account, … Sundry Debtors/Creditors), then show that group's interest using
   the same layout as Interest Receivable / Payable. The backend computes
   interest for whatever interest-enabled ledgers sit under the chosen group and
   returns empty when none do. */

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

  /* ── Load group picker ─────────────────────────────────────────────
   * Like TallyPrime's Group Interest Calculation: show only the groups that
   * are actually IN USE — a group that (directly or via any descendant) holds
   * a ledger, plus that group's ancestor chain. Empty/unused predefined groups
   * (Sales Accounts, Fixed Assets, Suspense, …) are hidden. */
  React.useEffect(() => {
    if (!cid || groupId) return;
    Promise.all([
      (window as any).api.group.getAll(cid),
      (window as any).api.ledger.getAll(cid),
    ]).then(([grpRes, ledRes]: any[]) => {
      const rawList = Array.isArray(grpRes) ? grpRes : (grpRes?.groups ?? grpRes?.data ?? []);
      const ledgerList = Array.isArray(ledRes) ? ledRes : (ledRes?.ledgers ?? ledRes?.data ?? []);
      const nameMap = new Map<number, string>();
      const byId = new Map<number, any>();
      rawList.forEach((g: any) => { nameMap.set(g.group_id, g.name); byId.set(g.group_id, g); });

      // Groups that hold a ledger, expanded up the parent chain to the root.
      const inUse = new Set<number>();
      ledgerList.forEach((l: any) => {
        let cur = l.group_id != null ? byId.get(l.group_id) : undefined;
        const seen = new Set<number>();
        while (cur && !seen.has(cur.group_id)) {
          inUse.add(cur.group_id);
          seen.add(cur.group_id);
          cur = cur.parent_group_id != null ? byId.get(cur.parent_group_id) : undefined;
        }
      });

      // partySide only tags the Sundry Debtors/Creditors subtrees; other groups
      // default to "Dr" here and the backend's `nature` corrects the display.
      const sides = partySide(rawList);
      const list: GroupMeta[] = rawList
        .filter((g: any) => inUse.has(g.group_id))
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
