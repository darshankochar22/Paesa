import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import SelectionPopup from "./SelectionPopup";
import MovementAnalysisTable, { type MovRow } from "./MovementAnalysisTable";
import ItemVoucherAnalysis, { type VoucherRow } from "./ItemVoucherAnalysis";

interface Ledger { ledger_id: number; name: string; }
interface ItemRow {
  item_id: number; item_name: string; unit_name: string;
  purchase_qty: number; purchase_value: number;
  sales_qty: number; sales_value: number;
}

type Level =
  | { step: "select" }
  | { step: "report"; ledger: Ledger }
  | { step: "vouchers"; ledger: Ledger; item: ItemRow };

const FooterBar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
    {children}
  </div>
);

export default function LedgerAnalysis() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "";

  const [level, setLevel] = React.useState<Level>({ step: "select" });

  // Ledgers for selection
  const [ledgers, setLedgers] = React.useState<Ledger[]>([]);
  const [ledgersLoading, setLedgersLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectIdx, setSelectIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId) { setLedgersLoading(false); return; }
    setLedgersLoading(true);
    (window as any).api.ledger.getAll(companyId).then((res: any) => {
      const list: Ledger[] = [...(res.ledgers ?? [])].sort((a: Ledger, b: Ledger) => a.name.localeCompare(b.name));
      setLedgers(list);
      setLedgersLoading(false);
    });
  }, [companyId]);

  const filtered = React.useMemo(() =>
    search.trim() === "" ? ledgers : ledgers.filter(l => l.name.toLowerCase().includes(search.toLowerCase())),
    [ledgers, search]
  );
  React.useEffect(() => { setSelectIdx(0); }, [search]);

  // Report
  const [items, setItems] = React.useState<ItemRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [rowIdx, setRowIdx] = React.useState(0);

  const loadReport = React.useCallback((ledger: Ledger) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "report", ledger });
    setLoading(true); setErr(null); setRowIdx(0);
    (window as any).api.report.ledgerAnalysis(companyId, fyId, ledger.ledger_id).then((res: any) => {
      if (res.success) setItems(res.items ?? []);
      else setErr(res.error || "Failed to load");
      setLoading(false);
    });
  }, [companyId, fyId]);

  // Item voucher analysis
  const [vouchers, setVouchers] = React.useState<VoucherRow[]>([]);
  const [loadingV, setLoadingV] = React.useState(false);
  const [vErr, setVErr] = React.useState<string | null>(null);
  const [vIdx, setVIdx] = React.useState(0);

  const loadVouchers = React.useCallback((ledger: Ledger, item: ItemRow) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "vouchers", ledger, item });
    setLoadingV(true); setVErr(null); setVIdx(0);
    (window as any).api.report.ledgerItemVouchers(companyId, fyId, ledger.ledger_id, item.item_id).then((res: any) => {
      if (res.success) {
        // Group into Purchases then Sales sections (by voucher-type family), each chronological.
        const fam = (vt: string) => (/credit note|sales|sale/i.test(vt || "") ? 1 : 0);
        const sorted = [...(res.rows ?? [])].sort((a, b) =>
          fam(a.voucher_type) - fam(b.voucher_type) || String(a.date).localeCompare(String(b.date)));
        setVouchers(sorted);
      } else setVErr(res.error || "Failed to load vouchers");
      setLoadingV(false);
    });
  }, [companyId, fyId]);

  const backToSelect = React.useCallback(() => { setLevel({ step: "select" }); setItems([]); setSearch(""); }, []);
  const backToReport = React.useCallback((ledger: Ledger) => { setLevel({ step: "report", ledger }); setVouchers([]); }, []);

  // Keyboard nav — selection popup
  React.useEffect(() => {
    if (level.step !== "select") return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectIdx(p => Math.min(filtered.length - 1, p + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSelectIdx(p => Math.max(0, p - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); const l = filtered[selectIdx]; if (l) loadReport(l); }
      else if (e.key === "Escape") { e.preventDefault(); navigate(-1); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [level.step, filtered, selectIdx, loadReport, navigate]);

  React.useEffect(() => {
    if (level.step === "report") {
      const h = (e: KeyboardEvent) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setRowIdx(p => Math.min(items.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setRowIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); const it = items[rowIdx]; if (it) loadVouchers(level.ledger, it); }
        else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToSelect(); }
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }
    if (level.step === "vouchers") {
      const h = (e: KeyboardEvent) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setVIdx(p => Math.min(vouchers.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setVIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); const r = vouchers[vIdx]; if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`); }
        else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToReport(level.ledger); }
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }
  }, [level, items, rowIdx, vouchers, vIdx, loadVouchers, backToSelect, backToReport, navigate]);

  if (level.step === "select") {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
          <span className="font-bold text-sm tracking-wide">Ledger Analysis</span>
          <span className="font-bold text-sm">{selectedCompany?.name || "Company"}</span>
          <span />
        </div>
        <SelectionPopup
          title="Ledger Analysis" fieldLabel="Name of Ledger" listLabel="List of Ledgers"
          companyName={selectedCompany?.name}
          items={filtered.map(l => ({ id: l.ledger_id, name: l.name }))}
          index={selectIdx} loading={ledgersLoading} search={search}
          onSearchChange={setSearch} onIndexChange={setSelectIdx}
          onAccept={(i) => { const l = filtered[i]; if (l) loadReport(l); }}
          onCancel={() => navigate(-1)}
        />
      </div>
    );
  }

  if (level.step === "report") {
    const l = level.ledger;
    const rows: MovRow[] = items.map(it => ({ id: it.item_id, name: it.item_name, unit: it.unit_name, leftQty: it.purchase_qty, leftValue: it.purchase_value, rightQty: it.sales_qty, rightValue: it.sales_value }));
    return (
      <MovementAnalysisTable
        title="Ledger Analysis" companyName={selectedCompany?.name} subtitle={l.name}
        periodLabel={periodLabel} leftLabel="Purchases" rightLabel="Sales" rows={rows}
        loading={loading} error={err} emptyText="No inventory movement found for this ledger."
        selectedIndex={rowIdx} onSelectIndex={setRowIdx}
        onActivate={(_r, i) => loadVouchers(l, items[i])}
        footer={<FooterBar><button onClick={backToSelect} className="hover:underline hover:text-zinc-900">Q: Back to Ledger Selection</button><span className="text-zinc-400">Enter: Item voucher analysis</span></FooterBar>}
      />
    );
  }

  const { ledger: l, item: it } = level;
  return (
    <ItemVoucherAnalysis
      itemName={it.item_name} companyName={selectedCompany?.name} periodLabel={periodLabel}
      ledgerName={l.name} unit={it.unit_name}
      rows={vouchers} loading={loadingV} error={vErr}
      selectedIndex={vIdx} onSelectIndex={setVIdx}
      onOpenVoucher={(r) => r.voucher_id && navigate(`/transactions/voucher/${r.voucher_id}`)}
      footer={<FooterBar>
        <button onClick={() => backToReport(l)} className="hover:underline hover:text-zinc-900">Q: Back to Ledger</button>
        <span className="text-zinc-400">Enter: Alter</span>
        <span className="text-zinc-400">A: Add Vch</span>
        <span className="text-zinc-400">2: Duplicate Vch</span>
        <span className="text-zinc-400">I: Insert Vch</span>
      </FooterBar>}
    />
  );
}
