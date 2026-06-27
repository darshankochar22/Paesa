import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import SelectionPopup from "./SelectionPopup";
import MovementAnalysisTable, { type MovRow } from "./MovementAnalysisTable";

interface JobRef { cc_id: number; name: string; }
interface RawItem {
  item_id: number; item_name: string; unit_name: string;
  in_qty: number; in_value: number; out_qty: number; out_value: number;
}

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

type Level = { step: "select" } | { step: "report"; job: JobRef };

export default function JobWorkAnalysis() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${dmy(activeFY.start_date)} to ${dmy(activeFY.end_date)}` : "";

  const [level, setLevel] = React.useState<Level>({ step: "select" });

  // ── Select Job / Project popup (Jobs/Projects = Cost Centres) ─────────────
  const [jobs, setJobs] = React.useState<JobRef[]>([]);
  const [jobsLoading, setJobsLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectIdx, setSelectIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId) { setJobsLoading(false); return; }
    setJobsLoading(true);
    (window as any).api.costCentre.getAll(companyId).then((res: any) => {
      const list: JobRef[] = [...(res.costCentres ?? res.cost_centres ?? [])]
        .map((c: any) => ({ cc_id: c.cc_id, name: c.name }))
        .sort((a: JobRef, b: JobRef) => a.name.localeCompare(b.name));
      setJobs(list);
      setJobsLoading(false);
    });
  }, [companyId]);

  const filtered = React.useMemo(() =>
    search.trim() === "" ? jobs : jobs.filter(j => j.name.toLowerCase().includes(search.toLowerCase())),
    [jobs, search]
  );
  React.useEffect(() => { setSelectIdx(0); }, [search]);

  // ── Job Work report ───────────────────────────────────────────────────────
  const [items, setItems] = React.useState<RawItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [rowIdx, setRowIdx] = React.useState(0);

  const loadReport = React.useCallback((job: JobRef) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "report", job });
    setLoading(true); setErr(null); setRowIdx(0);
    (window as any).api.report.jobWorkAnalysis(companyId, fyId, job.cc_id).then((res: any) => {
      if (res.success) setItems(res.items ?? []);
      else setErr(res.error || "Failed to load");
      setLoading(false);
    });
  }, [companyId, fyId]);

  const backToSelect = React.useCallback(() => { setLevel({ step: "select" }); setItems([]); setSearch(""); }, []);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (level.step === "select") {
        if (e.key === "ArrowDown") { e.preventDefault(); setSelectIdx(p => Math.min(filtered.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setSelectIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); const j = filtered[selectIdx]; if (j) loadReport(j); }
        else if (e.key === "Escape") { e.preventDefault(); navigate(-1); }
      } else {
        if (e.key === "ArrowDown") { e.preventDefault(); setRowIdx(p => Math.min(items.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setRowIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToSelect(); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [level, filtered, selectIdx, items, loadReport, backToSelect, navigate]);

  if (level.step === "select") {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
          <span className="font-bold text-sm tracking-wide">Job Work Analysis</span>
          <span className="font-bold text-sm">{selectedCompany?.name || "Company"}</span>
          <span />
        </div>
        <SelectionPopup
          title="Select Job / Project" fieldLabel="Job / Project" listLabel="List of Jobs/Projects"
          companyName={selectedCompany?.name}
          items={filtered.map(j => ({ id: j.cc_id, name: j.name }))}
          index={selectIdx} loading={jobsLoading} search={search}
          emptyText="No Jobs/Projects found. Use Create to add one."
          onSearchChange={setSearch} onIndexChange={setSelectIdx}
          onAccept={(i) => { const j = filtered[i]; if (j) loadReport(j); }}
          onCancel={() => navigate(-1)}
          onCreate={() => navigate("/master/create/cost-centre")}
        />
      </div>
    );
  }

  const rows: MovRow[] = items.map(it => ({
    id: it.item_id, name: it.item_name, unit: it.unit_name,
    leftQty: it.in_qty, leftValue: it.in_value, rightQty: it.out_qty, rightValue: it.out_value,
  }));
  return (
    <MovementAnalysisTable
      title="Job Work Analysis" companyName={selectedCompany?.name} subtitle={`Job/Project: ${level.job.name}`}
      periodLabel={periodLabel} leftLabel="Consumption" rightLabel="Production" rows={rows}
      loading={loading} error={err} emptyText="No material movement for this Job/Project."
      selectedIndex={rowIdx} onSelectIndex={setRowIdx}
      footer={<FooterBar><button onClick={backToSelect} className="hover:underline hover:text-zinc-900">Q: Back to Job Selection</button></FooterBar>}
    />
  );
}
