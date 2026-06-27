import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import SelectionPopup from "./SelectionPopup";
import ItemEstimatesTable, { type EstRow } from "./ItemEstimatesTable";

interface GroupRef { group_id: number; group_name: string; }
interface RawRow {
  item_id: number; name: string; unit: string; bom_name: string;
  qty: number; cost: number; amount: number;
  components: { name: string; unit: string; qty: number; rate: number; amount: number }[];
}

const PRIMARY_ID = -1; // sentinel: "Primary" => items under all stock groups

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dmy = (iso?: string) => {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : iso;
};

const FooterBar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-white text-[10px] font-semibold text-zinc-600 shrink-0">
    {children}
  </div>
);

type Level = { step: "select" } | { step: "report"; group: GroupRef };

export default function CostEstimation() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const asAt = dmy(activeFY?.end_date);

  const [level, setLevel] = React.useState<Level>({ step: "select" });

  // ── Select Stock Group popup ──────────────────────────────────────────────
  const [groupList, setGroupList] = React.useState<GroupRef[]>([]);
  const [groupListLoading, setGroupListLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectIdx, setSelectIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId) { setGroupListLoading(false); return; }
    setGroupListLoading(true);
    (window as any).api.stockGroup.getAll(companyId).then((res: any) => {
      const list: GroupRef[] = [...(res.stockGroups ?? [])]
        .map((g: any) => ({ group_id: g.sg_id, group_name: g.name }))
        .sort((a: GroupRef, b: GroupRef) => a.group_name.localeCompare(b.group_name));
      setGroupList([{ group_id: PRIMARY_ID, group_name: "Primary" }, ...list]);
      setGroupListLoading(false);
    });
  }, [companyId]);

  const filtered = React.useMemo(() =>
    search.trim() === "" ? groupList : groupList.filter(g => g.group_name.toLowerCase().includes(search.toLowerCase())),
    [groupList, search]
  );
  React.useEffect(() => { setSelectIdx(0); }, [search]);

  // ── Item Estimates report ─────────────────────────────────────────────────
  const [rows, setRows] = React.useState<RawRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [rowIdx, setRowIdx] = React.useState(0);

  const loadReport = React.useCallback((group: GroupRef) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "report", group });
    setLoading(true); setErr(null); setRowIdx(0);
    (window as any).api.report.costEstimation(companyId, fyId, group.group_id).then((res: any) => {
      if (res.success) setRows(res.rows ?? []);
      else setErr(res.error || "Failed to load");
      setLoading(false);
    });
  }, [companyId, fyId]);

  const backToSelect = React.useCallback(() => { setLevel({ step: "select" }); setRows([]); setSearch(""); }, []);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (level.step === "select") {
        if (e.key === "ArrowDown") { e.preventDefault(); setSelectIdx(p => Math.min(filtered.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setSelectIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); const g = filtered[selectIdx]; if (g) loadReport(g); }
        else if (e.key === "Escape") { e.preventDefault(); navigate(-1); }
      } else {
        if (e.key === "ArrowDown") { e.preventDefault(); setRowIdx(p => Math.min(rows.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setRowIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToSelect(); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [level, filtered, selectIdx, rows, rowIdx, loadReport, backToSelect, navigate]);

  if (level.step === "select") {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
          <span className="font-bold text-sm tracking-wide">Cost Estimation</span>
          <span className="font-bold text-sm">{selectedCompany?.name || "Company"}</span>
          <span />
        </div>
        <SelectionPopup
          title="Select Stock Group" fieldLabel="Name of Group" listLabel="List of Stock Groups"
          companyName={selectedCompany?.name}
          items={filtered.map(g => ({ id: g.group_id, name: g.group_name }))}
          index={selectIdx} loading={groupListLoading} search={search}
          onSearchChange={setSearch} onIndexChange={setSelectIdx}
          onAccept={(i) => { const g = filtered[i]; if (g) loadReport(g); }}
          onCancel={() => navigate(-1)}
          onCreate={() => navigate("/master/create/stock-group")}
        />
      </div>
    );
  }

  const estRows: EstRow[] = rows.map(r => ({
    id: r.item_id, name: r.name, unit: r.unit, qty: r.qty, cost: r.cost, amount: r.amount,
    components: r.components,
  }));
  return (
    <ItemEstimatesTable
      companyName={selectedCompany?.name} groupLabel={level.group.group_name} asAt={asAt}
      rows={estRows} loading={loading} error={err}
      selectedIndex={rowIdx} onSelectIndex={setRowIdx}
      footer={<FooterBar><button onClick={backToSelect} className="hover:underline hover:text-zinc-900">Q: Back to Group Selection</button><span className="text-zinc-400">Space/Double-click: Expand components</span></FooterBar>}
    />
  );
}
