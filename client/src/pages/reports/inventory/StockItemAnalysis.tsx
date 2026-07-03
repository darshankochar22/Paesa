import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import SelectionPopup from "./SelectionPopup";
import ItemMovementAnalysis, { type PartyMov, type MovCursor, type MovSection } from "./ItemMovementAnalysis";
import ItemVoucherAnalysis, { type VoucherRow } from "./ItemVoucherAnalysis";
import { rowFamily, aggregateParties } from "./movementAggregate";

// Issue #158 — Statements of Inventory · Movement Analysis → Stock Item Analysis.
// Flow: Select Stock Item → Item Movement Analysis (Suppliers / Buyers)
//       → Item Voucher Analysis (per ledger + direction) → voucher.

interface StockItem { item_id: number; name: string; unit_name?: string; }

type Level =
  | { step: "select" }
  | { step: "movement"; item: StockItem }
  | { step: "vouchers"; item: StockItem; party: string; direction: MovSection };

const FooterBar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
    {children}
  </div>
);

export default function StockItemAnalysis() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "";

  const [level, setLevel] = React.useState<Level>({ step: "select" });

  // ── Stock items for selection ────────────────────────────────────────────
  const [allItems, setAllItems] = React.useState<StockItem[]>([]);
  const [itemsLoading, setItemsLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectIdx, setSelectIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId) { setItemsLoading(false); return; }
    setItemsLoading(true);
    (window as any).api.stockItem.getAll(companyId).then((res: any) => {
      const list: StockItem[] = ((res.stockItems ?? []) as any[])
        .map(r => ({ item_id: r.item_id, name: r.name, unit_name: r.unit_name ?? r.unit ?? "" }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setAllItems(list);
      setItemsLoading(false);
    });
  }, [companyId]);

  const filtered = React.useMemo(() =>
    search.trim() === "" ? allItems : allItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase())),
    [allItems, search]
  );
  React.useEffect(() => { setSelectIdx(0); }, [search]);

  // ── Item Movement Analysis (Suppliers / Buyers) ──────────────────────────
  const allRowsRef = React.useRef<VoucherRow[]>([]);
  const [movData, setMovData] = React.useState<{ inward: PartyMov[]; outward: PartyMov[] } | null>(null);
  const [movLoading, setMovLoading] = React.useState(false);
  const [movErr, setMovErr] = React.useState<string | null>(null);
  const [movCursor, setMovCursor] = React.useState<MovCursor>({ section: "inward", idx: 0 });

  const loadMovement = React.useCallback((item: StockItem) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "movement", item });
    setMovLoading(true); setMovErr(null); setMovData(null); setMovCursor({ section: "inward", idx: 0 });
    (window as any).api.report.stockItemVouchers(companyId, fyId, item.item_id, activeFY?.start_date, activeFY?.end_date).then((res: any) => {
      if (res.success) { allRowsRef.current = res.rows ?? []; setMovData(aggregateParties(res.rows ?? [])); }
      else setMovErr(res.error || "Failed to load movement");
      setMovLoading(false);
    });
  }, [companyId, fyId, activeFY]);

  // ── Item Voucher Analysis (per ledger + direction) ───────────────────────
  const [voucherIdx, setVoucherIdx] = React.useState(0);
  const voucherRows = React.useMemo(() => {
    if (level.step !== "vouchers") return [];
    return allRowsRef.current.filter(r =>
      r.voucher_id && r.particulars === level.party && rowFamily(r) === level.direction);
  }, [level]);

  const openVouchers = React.useCallback((section: MovSection, party: string) => {
    setLevel(l => l.step === "movement" ? { step: "vouchers", item: l.item, party, direction: section } : l);
    setVoucherIdx(0);
  }, []);

  const backToSelect = React.useCallback(() => { setLevel({ step: "select" }); setMovData(null); setSearch(""); }, []);

  // ── Keyboard ─────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (level.step === "select") {
        if (e.key === "ArrowDown") { e.preventDefault(); setSelectIdx(p => Math.min(filtered.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setSelectIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); const it = filtered[selectIdx]; if (it) loadMovement(it); }
        else if (e.key === "Escape") { e.preventDefault(); navigate(-1); }
      } else if (level.step === "movement") {
        const inLen = movData?.inward.length ?? 0;
        const outLen = movData?.outward.length ?? 0;
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
        } else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToSelect(); }
      } else {
        if (e.key === "ArrowDown") { e.preventDefault(); setVoucherIdx(p => Math.min(voucherRows.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setVoucherIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); const r = voucherRows[voucherIdx]; if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`); }
        else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); loadMovement(level.item); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [level, filtered, selectIdx, movData, movCursor, voucherRows, voucherIdx, loadMovement, openVouchers, backToSelect, navigate]);

  // ── Select Stock Item ────────────────────────────────────────────────────
  if (level.step === "select") {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
          <span className="font-bold text-sm tracking-wide">Stock Item Analysis</span>
          <span className="font-bold text-sm">{selectedCompany?.name || "Company"}</span>
          <span />
        </div>
        <SelectionPopup
          title="Select Stock Item" fieldLabel="Name of Item" listLabel="List of Stock Items"
          companyName={selectedCompany?.name}
          items={filtered.map(i => ({ id: i.item_id, name: i.name }))}
          index={selectIdx} loading={itemsLoading} search={search}
          onSearchChange={setSearch} onIndexChange={setSelectIdx}
          onAccept={(i) => { const item = filtered[i]; if (item) loadMovement(item); }}
          onCancel={() => navigate(-1)}
          onCreate={() => navigate("/master/create/stock-item")}
        />
      </div>
    );
  }

  // ── Item Movement Analysis (Suppliers / Buyers) ──────────────────────────
  if (level.step === "movement") {
    const it = level.item;
    return (
      <ItemMovementAnalysis
        itemName={it.name} companyName={selectedCompany?.name} periodLabel={periodLabel} unit={it.unit_name}
        inward={movData?.inward ?? []} outward={movData?.outward ?? []}
        loading={movLoading} error={movErr}
        cursor={movCursor} onCursor={setMovCursor}
        onActivate={(section, party) => openVouchers(section, party.name)}
        footer={<FooterBar><button onClick={backToSelect} className="hover:underline hover:text-zinc-900">Q: Back to Item Selection</button><span className="text-zinc-400">Enter: Item voucher analysis</span></FooterBar>}
      />
    );
  }

  // ── Item Voucher Analysis (leaf → voucher) ───────────────────────────────
  const it = level.item;
  return (
    <ItemVoucherAnalysis
      itemName={it.name} companyName={selectedCompany?.name} periodLabel={periodLabel}
      ledgerName={level.party} direction={level.direction} unit={it.unit_name}
      rows={voucherRows} loading={false} error={null}
      selectedIndex={voucherIdx} onSelectIndex={setVoucherIdx}
      onOpenVoucher={(r) => r.voucher_id && navigate(`/transactions/voucher/${r.voucher_id}`)}
      footer={<FooterBar>
        <button onClick={() => loadMovement(it)} className="hover:underline hover:text-zinc-900">Q: Back</button>
        <span className="text-zinc-400">Enter: Alter</span>
        <span className="text-zinc-400">A: Add Vch</span>
        <span className="text-zinc-400">2: Duplicate Vch</span>
        <span className="text-zinc-400">I: Insert Vch</span>
      </FooterBar>}
    />
  );
}
