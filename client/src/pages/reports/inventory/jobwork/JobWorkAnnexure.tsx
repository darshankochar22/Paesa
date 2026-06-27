import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import SelectionPopup from "../SelectionPopup";

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

interface ExciseUnit { id: number; name: string; }
interface Row {
  voucher_id: number; date: string; voucher_number: string | number;
  party: string; item_name: string; unit_name: string; quantity: number; amount: number;
}

interface Props {
  /** "IV" → goods sent for job work; "V" → goods received. */
  annexure: "IV" | "V";
}

/**
 * Jobwork Annexure IV / V — excise challan register. First picks an excise (tax)
 * unit, then lists the material movement under job work for that annexure.
 */
export default function JobWorkAnnexure({ annexure }: Props) {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${dmy(activeFY.start_date)} to ${dmy(activeFY.end_date)}` : "";

  const [step, setStep] = React.useState<"select" | "report">("select");
  const [unit, setUnit] = React.useState<ExciseUnit | null>(null);

  // ── Select Excise Unit ──────────────────────────────────────────────────
  const [units, setUnits] = React.useState<ExciseUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectIdx, setSelectIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId) { setUnitsLoading(false); return; }
    setUnitsLoading(true);
    (window as any).api.taxUnits.getAll(companyId).then((res: any) => {
      const list: ExciseUnit[] = [...(res.taxUnits ?? [])]
        .filter((u: any) => !u.registered_for || u.registered_for === "Excise")
        .map((u: any) => ({ id: u.tax_unit_id, name: u.name }))
        .sort((a: ExciseUnit, b: ExciseUnit) => a.name.localeCompare(b.name));
      setUnits(list);
      setUnitsLoading(false);
    });
  }, [companyId]);

  const filtered = React.useMemo(() =>
    search.trim() === "" ? units : units.filter(u => u.name.toLowerCase().includes(search.toLowerCase())),
    [units, search]
  );
  React.useEffect(() => { setSelectIdx(0); }, [search]);

  // ── Annexure report ─────────────────────────────────────────────────────
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rowIdx, setRowIdx] = React.useState(0);

  const loadReport = React.useCallback((u: ExciseUnit) => {
    if (!companyId || !fyId) return;
    setUnit(u); setStep("report");
    setLoading(true); setError(null); setRowIdx(0);
    (window as any).api.report.jobWorkAnnexure(companyId, fyId, annexure, u.id).then((res: any) => {
      if (res.success) setRows(res.rows ?? []);
      else setError(res.error || "Failed to load");
      setLoading(false);
    });
  }, [companyId, fyId, annexure]);

  const backToSelect = React.useCallback(() => { setStep("select"); setRows([]); setSearch(""); }, []);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (step === "select") {
        if (e.key === "ArrowDown") { e.preventDefault(); setSelectIdx(p => Math.min(filtered.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setSelectIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); const u = filtered[selectIdx]; if (u) loadReport(u); }
        else if (e.key === "Escape") { e.preventDefault(); navigate(-1); }
      } else {
        if (e.key === "ArrowDown") { e.preventDefault(); setRowIdx(p => Math.min(rows.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setRowIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); const r = rows[rowIdx]; if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`); }
        else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToSelect(); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [step, filtered, selectIdx, rows, rowIdx, loadReport, backToSelect, navigate]);

  if (step === "select") {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
          <span className="font-bold text-sm tracking-wide">Select Excise Unit</span>
          <span className="font-bold text-sm">{selectedCompany?.name || "Company"}</span>
          <span />
        </div>
        <SelectionPopup
          title={`Jobwork Annexure - ${annexure}`} fieldLabel="Name of excise unit" listLabel="List of Excise Units"
          companyName={selectedCompany?.name}
          items={filtered.map(u => ({ id: u.id, name: u.name }))}
          index={selectIdx} loading={unitsLoading} search={search} emptyText="No excise units found."
          onSearchChange={setSearch} onIndexChange={setSelectIdx}
          onAccept={(i) => { const u = filtered[i]; if (u) loadReport(u); }}
          onCancel={() => navigate(-1)}
          onCreate={() => navigate("/master/create/tax-units")}
        />
      </div>
    );
  }

  const totalQty = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  const totalAmt = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
        <span className="font-bold text-sm tracking-wide">Jobwork Annexure - {annexure}</span>
        <span className="font-bold text-sm">{selectedCompany?.name || "Company"}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-zinc-300 font-mono">
        <span className="font-semibold">{unit?.name}</span>
        <span>{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
            <tr>
              <th className="px-3 py-1 text-left font-bold w-24">Date</th>
              <th className="px-3 py-1 text-left font-bold w-24">Vch No.</th>
              <th className="px-3 py-1 text-left font-bold">Party</th>
              <th className="px-3 py-1 text-left font-bold">Item</th>
              <th className="px-3 py-1 text-right font-bold w-32 border-l border-zinc-200">Quantity</th>
              <th className="px-3 py-1 text-right font-bold w-36 border-l border-zinc-200">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400 italic">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-600">{error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400 italic">No records found.</td></tr>
            ) : (
              rows.map((r, i) => {
                const focused = i === rowIdx;
                return (
                  <tr key={`${r.voucher_id}-${i}`} onClick={() => setRowIdx(i)}
                    onDoubleClick={() => r.voucher_id && navigate(`/transactions/voucher/${r.voucher_id}`)}
                    className={`border-b border-zinc-100 cursor-pointer ${focused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}>
                    <td className="px-3 py-1 whitespace-nowrap">{dmy(r.date)}</td>
                    <td className="px-3 py-1">{r.voucher_number || ""}</td>
                    <td className="px-3 py-1 truncate">{r.party}</td>
                    <td className="px-3 py-1 truncate">{r.item_name}</td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtQty(r.quantity, r.unit_name)}</td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtAmt(r.amount)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 shrink-0">
        <span className="w-24" /><span className="w-24" /><span className="flex-1">Grand Total</span><span className="flex-1" />
        <span className="w-32 text-right border-l border-zinc-300 pr-2">{fmtQty(totalQty)}</span>
        <span className="w-36 text-right border-l border-zinc-300 pr-2">{fmtAmt(totalAmt)}</span>
      </div>

      <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
        <button onClick={backToSelect} className="hover:underline hover:text-zinc-900">Q: Back to Excise Unit</button>
        <span className="text-zinc-400">Enter: Open voucher</span>
      </div>
    </div>
  );
}
