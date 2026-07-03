import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import SelectionPopup from "./SelectionPopup";
import ItemMovementAnalysis, { type PartyMov, type MovCursor, type MovSection } from "./ItemMovementAnalysis";
import ItemVoucherAnalysis, { type VoucherRow } from "./ItemVoucherAnalysis";
import { rowFamily, aggregateParties } from "./movementAggregate";

// Issue #164 — Statements of Inventory · Reorder Status.
// Submenu (Stock Groups / Stock Category) → Select master → Reorder Status
// report → drill item → Item Movement Analysis → Item Voucher Analysis → voucher.

type Scope = "group" | "category";
interface ScopeRef { id: number; name: string }
interface ReorderItem {
  item_id: number; item_name: string; unit_name: string;
  closing_qty: number; po_pending: number; so_due: number; nett_available: number;
  reorder_level: number; shortfall: number; min_reorder_qty: number; to_order: number;
}

const PRIMARY_ID = -1;

const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const dmy = (iso?: string) => {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : iso;
};
const fmtQty = (v: number | null | undefined, unit?: string) => {
  const n = Number(v) || 0;
  if (n === 0) return "";
  const s = Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  const t = unit ? `${s} ${unit}` : s;
  return n < 0 ? `(-)${t}` : t;
};

type Level =
  | { step: "submenu" }
  | { step: "select"; scope: Scope }
  | { step: "report"; scope: Scope; ref: ScopeRef }
  | { step: "movement"; scope: Scope; ref: ScopeRef; item: ReorderItem }
  | { step: "vouchers"; scope: Scope; ref: ScopeRef; item: ReorderItem; party: string; direction: MovSection };

const FooterBar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
    {children}
  </div>
);

const TH = "px-2 py-1 text-right font-bold text-zinc-700 border-b border-zinc-300 align-bottom whitespace-pre-line w-24";

export default function ReorderStatus() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const asAt = dmy(activeFY?.end_date);
  const periodLabel = activeFY ? `${dmy(activeFY.start_date)} to ${dmy(activeFY.end_date)}` : "";

  const [level, setLevel] = React.useState<Level>({ step: "submenu" });

  // ── Submenu (Stock Groups / Stock Category) ──────────────────────────────
  const [subIdx, setSubIdx] = React.useState(0);
  const SUB = React.useMemo(() => ([
    { scope: "group" as Scope, label: "Stock Groups" },
    { scope: "category" as Scope, label: "Stock Category" },
  ]), []);

  // ── Select master (group or category) ────────────────────────────────────
  const [masters, setMasters] = React.useState<ScopeRef[]>([]);
  const [mastersLoading, setMastersLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selectIdx, setSelectIdx] = React.useState(0);

  const openSelect = React.useCallback((scope: Scope) => {
    if (!companyId) return;
    setLevel({ step: "select", scope });
    setSearch(""); setSelectIdx(0); setMastersLoading(true);
    const api = (window as any).api;
    const p = scope === "category" ? api.stockCategory.getAll(companyId) : api.stockGroup.getAll(companyId);
    p.then((res: any) => {
      const raw = scope === "category" ? (res.stockCategories ?? []) : (res.stockGroups ?? []);
      const list: ScopeRef[] = [...raw]
        .map((r: any) => ({ id: scope === "category" ? r.sc_id : r.sg_id, name: r.name }))
        .sort((a: ScopeRef, b: ScopeRef) => a.name.localeCompare(b.name));
      setMasters([{ id: PRIMARY_ID, name: "Primary" }, ...list]);
      setMastersLoading(false);
    });
  }, [companyId]);

  const filtered = React.useMemo(() =>
    search.trim() === "" ? masters : masters.filter(m => m.name.toLowerCase().includes(search.toLowerCase())),
    [masters, search]
  );
  React.useEffect(() => { setSelectIdx(0); }, [search]);

  // ── Reorder report ───────────────────────────────────────────────────────
  const [items, setItems] = React.useState<ReorderItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [rowIdx, setRowIdx] = React.useState(0);

  const loadReport = React.useCallback((scope: Scope, ref: ScopeRef) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "report", scope, ref });
    setLoading(true); setErr(null); setRowIdx(0);
    (window as any).api.report.reorderStatusScoped(companyId, fyId, scope, ref.id).then((res: any) => {
      if (res.success) setItems(res.items ?? []);
      else setErr(res.error || "Failed to load");
      setLoading(false);
    });
  }, [companyId, fyId]);

  // ── Item Movement Analysis + Item Voucher Analysis drill ─────────────────
  const allRowsRef = React.useRef<VoucherRow[]>([]);
  const [movData, setMovData] = React.useState<{ inward: PartyMov[]; outward: PartyMov[] } | null>(null);
  const [movLoading, setMovLoading] = React.useState(false);
  const [movErr, setMovErr] = React.useState<string | null>(null);
  const [movCursor, setMovCursor] = React.useState<MovCursor>({ section: "inward", idx: 0 });
  const [voucherIdx, setVoucherIdx] = React.useState(0);

  const loadMovement = React.useCallback((scope: Scope, ref: ScopeRef, item: ReorderItem) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "movement", scope, ref, item });
    setMovLoading(true); setMovErr(null); setMovData(null); setMovCursor({ section: "inward", idx: 0 });
    (window as any).api.report.stockItemVouchers(companyId, fyId, item.item_id, activeFY?.start_date, activeFY?.end_date).then((res: any) => {
      if (res.success) { allRowsRef.current = res.rows ?? []; setMovData(aggregateParties(res.rows ?? [])); }
      else setMovErr(res.error || "Failed to load movement");
      setMovLoading(false);
    });
  }, [companyId, fyId, activeFY]);

  const voucherRows = React.useMemo(() => {
    if (level.step !== "vouchers") return [];
    return allRowsRef.current.filter(r =>
      r.voucher_id && r.particulars === level.party && rowFamily(r) === level.direction);
  }, [level]);

  const openVouchers = React.useCallback((section: MovSection, party: string) => {
    setLevel(l => l.step === "movement" ? { step: "vouchers", scope: l.scope, ref: l.ref, item: l.item, party, direction: section } : l);
    setVoucherIdx(0);
  }, []);

  // ── Keyboard ─────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (level.step === "submenu") {
        if (e.key === "ArrowDown") { e.preventDefault(); setSubIdx(p => Math.min(SUB.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setSubIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); openSelect(SUB[subIdx].scope); }
        else if (e.key === "Escape") { e.preventDefault(); navigate(-1); }
      } else if (level.step === "select") {
        if (e.key === "ArrowDown") { e.preventDefault(); setSelectIdx(p => Math.min(filtered.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setSelectIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); const m = filtered[selectIdx]; if (m) loadReport(level.scope, m); }
        else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); setLevel({ step: "submenu" }); }
      } else if (level.step === "report") {
        if (e.key === "ArrowDown") { e.preventDefault(); setRowIdx(p => Math.min(items.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setRowIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); const it = items[rowIdx]; if (it) loadMovement(level.scope, level.ref, it); }
        else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); openSelect(level.scope); }
      } else if (level.step === "movement") {
        const inLen = movData?.inward.length ?? 0, outLen = movData?.outward.length ?? 0;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMovCursor(c => c.section === "inward"
            ? (c.idx < inLen - 1 ? { section: "inward", idx: c.idx + 1 } : { section: "outward", idx: 0 })
            : { section: "outward", idx: Math.min(outLen - 1, c.idx + 1) });
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setMovCursor(c => c.section === "outward"
            ? (c.idx > 0 ? { section: "outward", idx: c.idx - 1 } : { section: "inward", idx: Math.max(0, inLen - 1) })
            : { section: "inward", idx: Math.max(0, c.idx - 1) });
        } else if (e.key === "Enter") {
          e.preventDefault();
          const list = movCursor.section === "inward" ? movData?.inward : movData?.outward;
          const row = list?.[movCursor.idx];
          if (row) openVouchers(movCursor.section, row.name);
        } else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); loadReport(level.scope, level.ref); }
      } else {
        if (e.key === "ArrowDown") { e.preventDefault(); setVoucherIdx(p => Math.min(voucherRows.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setVoucherIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); const r = voucherRows[voucherIdx]; if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`); }
        else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); loadMovement(level.scope, level.ref, level.item); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [level, SUB, subIdx, filtered, selectIdx, items, rowIdx, movData, movCursor, voucherRows, voucherIdx, openSelect, loadReport, loadMovement, openVouchers, navigate]);

  const TitleBar = ({ title }: { title: string }) => (
    <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
      <span className="font-bold text-sm tracking-wide">{title}</span>
      <span className="font-bold text-sm">{selectedCompany?.name || "Company"}</span>
      <span />
    </div>
  );

  // ── Submenu ──────────────────────────────────────────────────────────────
  if (level.step === "submenu") {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <TitleBar title="Reorder Status" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-72 border border-zinc-300">
            <div className="bg-zinc-900 text-white px-3 py-1 text-sm font-semibold">Reorder Status</div>
            {SUB.map((s, i) => (
              <div
                key={s.scope}
                onClick={() => openSelect(s.scope)}
                onMouseEnter={() => setSubIdx(i)}
                className={`px-3 py-1.5 cursor-pointer border-b border-zinc-100 ${i === subIdx ? "bg-zinc-200 font-bold" : "hover:bg-zinc-50"}`}
              >
                {s.label}
              </div>
            ))}
          </div>
        </div>
        <FooterBar><button onClick={() => navigate(-1)} className="hover:underline hover:text-zinc-900">Q: Quit</button><span className="text-zinc-400">Enter: Select</span></FooterBar>
      </div>
    );
  }

  // ── Select master ────────────────────────────────────────────────────────
  if (level.step === "select") {
    const isCat = level.scope === "category";
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <TitleBar title="Reorder Status" />
        <SelectionPopup
          title={isCat ? "Select Stock Category" : "Select Stock Group"}
          fieldLabel={isCat ? "Name of Stock Category" : "Name of Group"}
          listLabel={isCat ? "List of Stock Categories" : "List of Stock Groups"}
          companyName={selectedCompany?.name}
          items={filtered.map(m => ({ id: m.id, name: m.name }))}
          index={selectIdx} loading={mastersLoading} search={search}
          onSearchChange={setSearch} onIndexChange={setSelectIdx}
          onAccept={(i) => { const m = filtered[i]; if (m) loadReport(level.scope, m); }}
          onCancel={() => setLevel({ step: "submenu" })}
          onCreate={() => navigate(isCat ? "/master/create/stock-category" : "/master/create/stock-group")}
        />
      </div>
    );
  }

  // ── Reorder report ───────────────────────────────────────────────────────
  if (level.step === "report") {
    const title = level.scope === "category" ? "Stock Category Reorder Status" : "Stock Group Reorder Status";
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <TitleBar title={title} />
        <div className="flex justify-between items-start px-3 py-1 bg-white border-b border-zinc-300 font-mono text-[11px]">
          <div>
            <div><span className="text-zinc-500">Items Under:</span> <span className="font-semibold">{level.ref.name}</span></div>
            <div className="text-[10px] italic text-zinc-500">(all items)</div>
          </div>
          <span className="font-semibold">as at {asAt}</span>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead className="sticky top-0 bg-zinc-100 z-10">
              <tr>
                <th className="px-2 py-1 text-left font-bold text-zinc-700 border-b border-zinc-300 align-bottom">Name of Item</th>
                <th className={TH}>{"Closing\nStock"}</th>
                <th className={TH}>{"Purc Orders\nPending"}</th>
                <th className={TH}>{"Sale Orders\nDue"}</th>
                <th className={TH}>{"Nett\nAvailable"}</th>
                <th className={TH}>{"Re-order\nLevel"}</th>
                <th className={TH}>{"Short fall"}</th>
                <th className={TH}>{"Min\nReorder Qty"}</th>
                <th className={TH}>{"Order to be\nPlaced"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-zinc-400 italic">Loading…</td></tr>
              ) : err ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-zinc-600">{err}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-zinc-400 italic">No items in this {level.scope === "category" ? "category" : "group"}.</td></tr>
              ) : items.map((it, idx) => {
                const u = it.unit_name;
                return (
                  <tr
                    key={it.item_id}
                    onClick={() => setRowIdx(idx)}
                    onDoubleClick={() => loadMovement(level.scope, level.ref, it)}
                    className={`border-b border-zinc-100 cursor-pointer ${idx === rowIdx ? "bg-zinc-200 text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
                    title="Enter / double-click: item movement analysis"
                  >
                    <td className="px-2 py-1">{it.item_name}</td>
                    <td className="px-2 py-1 text-right">{fmtQty(it.closing_qty, u)}</td>
                    <td className="px-2 py-1 text-right">{fmtQty(it.po_pending, u)}</td>
                    <td className="px-2 py-1 text-right">{fmtQty(it.so_due, u)}</td>
                    <td className="px-2 py-1 text-right">{fmtQty(it.nett_available, u)}</td>
                    <td className="px-2 py-1 text-right">{fmtQty(it.reorder_level, u)}</td>
                    <td className="px-2 py-1 text-right">{fmtQty(it.shortfall, u)}</td>
                    <td className="px-2 py-1 text-right">{fmtQty(it.min_reorder_qty, u)}</td>
                    <td className="px-2 py-1 text-right">{fmtQty(it.to_order, u)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <FooterBar>
          <button onClick={() => openSelect(level.scope)} className="hover:underline hover:text-zinc-900">Q: Back</button>
          <span className="text-zinc-400">Enter: Item movement analysis</span>
        </FooterBar>
      </div>
    );
  }

  // ── Item Movement Analysis ───────────────────────────────────────────────
  if (level.step === "movement") {
    const it = level.item;
    return (
      <ItemMovementAnalysis
        itemName={it.item_name} companyName={selectedCompany?.name} periodLabel={periodLabel} unit={it.unit_name}
        inward={movData?.inward ?? []} outward={movData?.outward ?? []}
        loading={movLoading} error={movErr}
        cursor={movCursor} onCursor={setMovCursor}
        onActivate={(section, party) => openVouchers(section, party.name)}
        footer={<FooterBar><button onClick={() => loadReport(level.scope, level.ref)} className="hover:underline hover:text-zinc-900">Q: Back to Reorder Status</button><span className="text-zinc-400">Enter: Item voucher analysis</span></FooterBar>}
      />
    );
  }

  // ── Item Voucher Analysis → voucher ──────────────────────────────────────
  const it = level.item;
  return (
    <ItemVoucherAnalysis
      itemName={it.item_name} companyName={selectedCompany?.name} periodLabel={periodLabel}
      ledgerName={level.party} direction={level.direction} unit={it.unit_name}
      rows={voucherRows} loading={false} error={null}
      selectedIndex={voucherIdx} onSelectIndex={setVoucherIdx}
      onOpenVoucher={(r) => r.voucher_id && navigate(`/transactions/voucher/${r.voucher_id}`)}
      footer={<FooterBar>
        <button onClick={() => loadMovement(level.scope, level.ref, it)} className="hover:underline hover:text-zinc-900">Q: Back</button>
        <span className="text-zinc-400">Enter: Alter</span>
        <span className="text-zinc-400">A: Add Vch</span>
        <span className="text-zinc-400">2: Duplicate Vch</span>
        <span className="text-zinc-400">I: Insert Vch</span>
      </FooterBar>}
    />
  );
}
