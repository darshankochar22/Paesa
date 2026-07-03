import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import SelectionPopup from "./SelectionPopup";
import StockBarChart, { type ChartBar } from "./StockBarChart";

function fyMonthRange(fyStart: string, idx: number): { from: string; to: string } {
  const d = new Date(fyStart + "T00:00:00");
  const year = d.getFullYear() + Math.floor((d.getMonth() + idx) / 12);
  const month = (d.getMonth() + idx) % 12;
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return { from, to: `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}` };
}

interface Opening { qty: number; value: number; }

const fmtAmount = (val: number | null | undefined) => {
  const n = Number(val) || 0;
  if (n === 0) return "";
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

const fmtQty = (val: number | null | undefined, unit?: string) => {
  const n = Number(val) || 0;
  if (n === 0) return "";
  const num = n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return unit ? `${num} ${unit}` : num;
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
  } catch {
    return dateStr;
  }
};

interface GodownRow { godown_id: number; name: string; }
interface ItemRow {
  item_id: number;
  item_name: string;
  group_id?: number | null;
  group_name?: string | null;
  unit_name?: string;
  closing_qty: number;
  rate: number;
  closing_value: number;
}
interface GroupMeta { id: number; name: string; }
/* Level-2 list mixes stock groups (aggregated) with ungrouped items,
   alphabetically — TallyPrime's Godown Summary. */
type SummaryEntry =
  | { kind: "group"; name: string; group: GroupMeta; qty: number; value: number; unit?: string }
  | { kind: "item"; name: string; item: ItemRow };
interface MonthRow {
  month: string;
  in_qty: number; in_value: number;
  out_qty: number; out_value: number;
  closing_qty: number; closing_value: number;
}
interface VoucherRow {
  voucher_id: number;
  date: string;
  particulars: string;
  voucher_type: string;
  voucher_number: string | number;
  inwards_qty: number | null;
  inwards_value: number | null;
  outwards_qty: number | null;
  outwards_value: number | null;
  closing_qty: number;
  closing_value: number;
}

type Level =
  | { step: "godown" }
  | { step: "summary"; godown: GodownRow }
  | { step: "group"; godown: GodownRow; group: GroupMeta }
  | { step: "monthly"; godown: GodownRow; item: ItemRow; group?: GroupMeta }
  | { step: "vouchers"; godown: GodownRow; item: ItemRow; group?: GroupMeta };

export default function GodownSummary() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dmy = (iso: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso); return m ? `${Number(m[3])}-${MON[Number(m[2])-1]}-${m[1].slice(2)}` : iso; };
  const periodLabel = activeFY ? `${dmy(activeFY.start_date)} to ${dmy(activeFY.end_date)}` : "";

  const [level, setLevel] = React.useState<Level>({ step: "godown" });

  // ── Level 1: Godown picker ───────────────────────────────────────────────
  const [godowns, setGodowns] = React.useState<GodownRow[]>([]);
  const [loadingGodowns, setLoadingGodowns] = React.useState(true);
  const [godownIndex, setGodownIndex] = React.useState(0);

  React.useEffect(() => {
    if (!companyId) { setLoadingGodowns(false); return; }
    setLoadingGodowns(true);
    (window as any).api.godown.getAll(companyId)
      .then((res: any) => { if (res.success) setGodowns(res.godowns ?? []); setLoadingGodowns(false); })
      .catch(() => setLoadingGodowns(false));
  }, [companyId]);

  // ── Level 2: Godown Summary (stock groups + ungrouped items) ────────────
  const [items, setItems] = React.useState<ItemRow[]>([]);
  const [loadingItems, setLoadingItems] = React.useState(false);
  const [itemsError, setItemsError] = React.useState<string | null>(null);
  const [itemIndex, setItemIndex] = React.useState(0);
  const [groupItemIndex, setGroupItemIndex] = React.useState(0);

  const loadItems = React.useCallback((godown: GodownRow) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "summary", godown });
    setLoadingItems(true);
    setItemsError(null);
    setItemIndex(0);
    (window as any).api.report
      .godownItems(companyId, fyId, godown.godown_id, activeFY?.end_date)
      .then((res: any) => {
        if (res.success) setItems(res.rows ?? []);
        else setItemsError(res.error || "Failed to load godown summary");
        setLoadingItems(false);
      });
  }, [companyId, fyId, activeFY]);

  // Mixed alphabetical list: one row per stock group (aggregated over its
  // items in this godown) + each ungrouped item — TallyPrime's layout.
  const summaryEntries = React.useMemo<SummaryEntry[]>(() => {
    const groups = new Map<number, { name: string; qty: number; value: number; units: Set<string> }>();
    const entries: SummaryEntry[] = [];
    for (const it of items) {
      if (it.group_id != null) {
        if (!groups.has(it.group_id)) {
          groups.set(it.group_id, { name: it.group_name || "Ungrouped", qty: 0, value: 0, units: new Set() });
        }
        const g = groups.get(it.group_id)!;
        g.qty += Number(it.closing_qty) || 0;
        g.value += Number(it.closing_value) || 0;
        if (it.unit_name) g.units.add(it.unit_name);
      } else {
        entries.push({ kind: "item", name: it.item_name, item: it });
      }
    }
    for (const [id, g] of groups) {
      entries.push({
        kind: "group", name: g.name, group: { id, name: g.name },
        qty: g.qty, value: g.value,
        unit: g.units.size === 1 ? [...g.units][0] : undefined,
      });
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const groupItems = React.useCallback(
    (group: GroupMeta) => items.filter((it) => it.group_id === group.id),
    [items]
  );

  const openGroup = React.useCallback((godown: GodownRow, group: GroupMeta) => {
    setGroupItemIndex(0);
    setLevel({ step: "group", godown, group });
  }, []);

  // ── Level 3: Godown Monthly Summary ──────────────────────────────────────
  const [months, setMonths] = React.useState<MonthRow[]>([]);
  const [monthsOpening, setMonthsOpening] = React.useState<Opening>({ qty: 0, value: 0 });
  const [loadingMonths, setLoadingMonths] = React.useState(false);
  const [monthsError, setMonthsError] = React.useState<string | null>(null);
  const [monthIndex, setMonthIndex] = React.useState(0);

  const loadMonths = React.useCallback((godown: GodownRow, item: ItemRow, group?: GroupMeta) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "monthly", godown, item, group });
    setLoadingMonths(true);
    setMonthsError(null);
    setMonthIndex(0);
    (window as any).api.report
      .godownItemMonthly(companyId, fyId, godown.godown_id, item.item_id)
      .then((res: any) => {
        if (res.success) {
          setMonths(res.months ?? []);
          setMonthsOpening(res.opening ?? { qty: 0, value: 0 });
        } else setMonthsError(res.error || "Failed to load monthly summary");
        setLoadingMonths(false);
      });
  }, [companyId, fyId]);

  // ── Level 4: Godown Vouchers ─────────────────────────────────────────────
  const [voucherRows, setVoucherRows] = React.useState<VoucherRow[]>([]);
  const [voucherOpening, setVoucherOpening] = React.useState<Opening>({ qty: 0, value: 0 });
  const [loadingVouchers, setLoadingVouchers] = React.useState(false);
  const [voucherError, setVoucherError] = React.useState<string | null>(null);
  const [voucherIndex, setVoucherIndex] = React.useState(0);

  const loadVouchers = React.useCallback((godown: GodownRow, item: ItemRow, fromDate?: string, toDate?: string, group?: GroupMeta) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "vouchers", godown, item, group });
    setLoadingVouchers(true);
    setVoucherError(null);
    setVoucherIndex(0);
    (window as any).api.report
      .godownVouchers(companyId, fyId, godown.godown_id, item.item_id, fromDate ?? activeFY?.start_date, toDate ?? activeFY?.end_date)
      .then((res: any) => {
        if (res.success) {
          setVoucherRows(res.rows ?? []);
          setVoucherOpening(res.opening ?? { qty: 0, value: 0 });
        } else setVoucherError(res.error || "Failed to load godown vouchers");
        setLoadingVouchers(false);
      });
  }, [companyId, fyId, activeFY]);

  const backToGodowns = React.useCallback(() => { setLevel({ step: "godown" }); setItems([]); }, []);
  // Esc from a group's item list → group screen; from the top list → summary.
  const backToSummary = React.useCallback((godown: GodownRow, group?: GroupMeta) => {
    setLevel(group ? { step: "group", godown, group } : { step: "summary", godown });
    setMonths([]);
  }, []);
  const backToMonthly = React.useCallback((godown: GodownRow, item: ItemRow, group?: GroupMeta) => {
    setLevel({ step: "monthly", godown, item, group });
    setVoucherRows([]);
  }, []);

  // ── Keyboard nav: godown level ───────────────────────────────────────────
  React.useEffect(() => {
    if (level.step !== "godown") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setGodownIndex((p) => Math.min(godowns.length - 1, p + 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setGodownIndex((p) => Math.max(0, p - 1)); return; }
      if (e.key === "Enter") { e.preventDefault(); const g = godowns[godownIndex]; if (g) loadItems(g); return; }
      if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); navigate(-1); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [level.step, godowns, godownIndex, navigate, loadItems]);

  // ── Keyboard nav: summary level (groups + ungrouped items) ──────────────
  React.useEffect(() => {
    if (level.step !== "summary") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setItemIndex((p) => Math.min(summaryEntries.length - 1, p + 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setItemIndex((p) => Math.max(0, p - 1)); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        const entry = summaryEntries[itemIndex];
        if (!entry) return;
        if (entry.kind === "group") openGroup(level.godown, entry.group);
        else loadMonths(level.godown, entry.item);
        return;
      }
      if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToGodowns(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [level, summaryEntries, itemIndex, loadMonths, openGroup, backToGodowns]);

  // ── Keyboard nav: group level (items under one stock group) ─────────────
  React.useEffect(() => {
    if (level.step !== "group") return;
    const list = groupItems(level.group);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setGroupItemIndex((p) => Math.min(list.length - 1, p + 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setGroupItemIndex((p) => Math.max(0, p - 1)); return; }
      if (e.key === "Enter") { e.preventDefault(); const it = list[groupItemIndex]; if (it) loadMonths(level.godown, it, level.group); return; }
      if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); setLevel({ step: "summary", godown: level.godown }); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [level, groupItems, groupItemIndex, loadMonths]);

  // ── Keyboard nav: monthly level ──────────────────────────────────────────
  React.useEffect(() => {
    if (level.step !== "monthly") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setMonthIndex((p) => Math.min(months.length - 1, p + 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMonthIndex((p) => Math.max(0, p - 1)); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        if (activeFY?.start_date) { const { from, to } = fyMonthRange(activeFY.start_date, monthIndex); loadVouchers(level.godown, level.item, from, to, level.group); }
        else loadVouchers(level.godown, level.item, undefined, undefined, level.group);
        return;
      }
      if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToSummary(level.godown, level.group); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [level, months, monthIndex, loadVouchers, backToSummary, activeFY]);

  // ── Keyboard nav: voucher level ──────────────────────────────────────────
  React.useEffect(() => {
    if (level.step !== "vouchers") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setVoucherIndex((p) => Math.min(voucherRows.length - 1, p + 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setVoucherIndex((p) => Math.max(0, p - 1)); return; }
      if (e.key === "Enter") { e.preventDefault(); const r = voucherRows[voucherIndex]; if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`); return; }
      if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToMonthly(level.godown, level.item, level.group); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [level, voucherRows, voucherIndex, navigate, backToMonthly]);

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL 1 — Select Godown (matches screenshot 2)
  // ═══════════════════════════════════════════════════════════════════════
  if (level.step === "godown") {
    return (
      <SelectionPopup
        title="Select Godown"
        fieldLabel="Name of Godown"
        listLabel="List of Godowns"
        companyName={selectedCompany?.name}
        items={godowns.map((g) => ({ id: g.godown_id, name: g.name }))}
        index={godownIndex}
        loading={loadingGodowns}
        emptyText="No godowns found."
        onIndexChange={setGodownIndex}
        onAccept={(i) => { const g = godowns[i]; if (g) loadItems(g); }}
        onCancel={() => navigate(-1)}
        onCreate={() => navigate("/master/create/godown")}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL 2 — Godown Summary: stock groups + ungrouped items (screenshot 1)
  // LEVEL 2b — items under one stock group in this godown (screenshot 2)
  // ═══════════════════════════════════════════════════════════════════════
  if (level.step === "summary" || level.step === "group") {
    const inGroup = level.step === "group";
    const list: ItemRow[] = inGroup ? groupItems(level.group) : [];
    // Grand total always sums the raw items (a group row is just its items).
    const totalBase = inGroup ? list : items;
    const grandQty = totalBase.reduce((s, r) => s + (Number(r.closing_qty) || 0), 0);
    const grandValue = totalBase.reduce((s, r) => s + (Number(r.closing_value) || 0), 0);
    const rowCount = inGroup ? list.length : summaryEntries.length;
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
          <span className="font-bold text-sm tracking-wide">Godown Summary</span>
          <span className="font-bold text-sm">{selectedCompany?.name || "Company"}</span>
          <span />
        </div>
        <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-zinc-300 font-mono">
          <div className="flex flex-col gap-0.5">
            <span>Godown: <span className="font-bold">{level.godown.name}</span></span>
            {inGroup && <span>Stock Group: <span className="font-bold">{level.group.name}</span></span>}
          </div>
          <span>Closing Balance &nbsp; {periodLabel}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono select-none">
            <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
              <tr>
                <th className="px-3 py-1 text-left font-bold">Particulars</th>
                <th className="px-3 py-1 text-right font-bold w-32 border-l border-zinc-200">Quantity</th>
                <th className="px-3 py-1 text-right font-bold w-28 border-l border-zinc-200">Rate</th>
                <th className="px-3 py-1 text-right font-bold w-32 border-l border-zinc-200">Value</th>
              </tr>
            </thead>
            <tbody>
              {loadingItems ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400 italic">Loading...</td></tr>
              ) : itemsError ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-600">{itemsError}</td></tr>
              ) : rowCount === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400 italic">No records found.</td></tr>
              ) : inGroup ? (
                list.map((row, idx) => {
                  const isFocused = idx === groupItemIndex;
                  return (
                    <tr
                      key={row.item_id}
                      onClick={() => setGroupItemIndex(idx)}
                      onDoubleClick={() => loadMonths(level.godown, row, level.group)}
                      className={`border-b border-zinc-100 cursor-pointer ${isFocused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
                    >
                      <td className="px-3 py-1">{row.item_name}</td>
                      <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtQty(row.closing_qty, row.unit_name)}</td>
                      <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtAmount(row.rate)}</td>
                      <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtAmount(row.closing_value)}</td>
                    </tr>
                  );
                })
              ) : (
                summaryEntries.map((entry, idx) => {
                  const isFocused = idx === itemIndex;
                  const isGroup = entry.kind === "group";
                  const qty = isGroup ? entry.qty : entry.item.closing_qty;
                  const value = isGroup ? entry.value : entry.item.closing_value;
                  const rate = isGroup ? (entry.qty ? entry.value / entry.qty : 0) : entry.item.rate;
                  const unit = isGroup ? entry.unit : entry.item.unit_name;
                  return (
                    <tr
                      key={`${entry.kind}-${isGroup ? entry.group.id : entry.item.item_id}`}
                      onClick={() => setItemIndex(idx)}
                      onDoubleClick={() => {
                        if (isGroup) openGroup(level.godown, entry.group);
                        else loadMonths(level.godown, entry.item);
                      }}
                      className={`border-b border-zinc-100 cursor-pointer ${isFocused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
                    >
                      <td className={`px-3 py-1 ${isGroup ? "font-semibold" : ""}`}>{entry.name}</td>
                      <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtQty(qty, unit)}</td>
                      <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtAmount(rate)}</td>
                      <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtAmount(value)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 shrink-0">
          <span className="flex-1">Grand Total</span>
          <span className="w-32 text-right border-l border-zinc-300 pr-2">{fmtQty(grandQty)}</span>
          <span className="w-28 border-l border-zinc-300" />
          <span className="w-32 text-right border-l border-zinc-300 pr-2">{fmtAmount(grandValue)}</span>
        </div>

        <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
          <button
            onClick={() => (inGroup ? setLevel({ step: "summary", godown: level.godown }) : backToGodowns())}
            className="hover:underline hover:text-zinc-900"
          >
            Q: Quit
          </button>
          <button onClick={backToGodowns} className="hover:underline hover:text-zinc-900">F4: Godown</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL 3 — Godown Monthly Summary (matches screenshot 5)
  // ═══════════════════════════════════════════════════════════════════════
  if (level.step === "monthly") {
    const totIn = months.reduce((s, r) => s + (Number(r.in_qty) || 0), 0);
    const totInVal = months.reduce((s, r) => s + (Number(r.in_value) || 0), 0);
    const totOut = months.reduce((s, r) => s + (Number(r.out_qty) || 0), 0);
    const totOutVal = months.reduce((s, r) => s + (Number(r.out_value) || 0), 0);
    const lastClosingQty = months.length ? months[months.length - 1].closing_qty : 0;
    const lastClosingVal = months.length ? months[months.length - 1].closing_value : 0;
    const monthChartBars: ChartBar[] = months.map((r) => ({
      label: r.month.length > 4 ? r.month.slice(0, 3) : r.month,
      value: r.closing_qty,
    }));

    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
          <span className="font-bold text-sm tracking-wide">Godown Monthly Summary</span>
          <span className="font-bold text-sm">{selectedCompany?.name || "Company"}</span>
          <span />
        </div>
        <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-zinc-300 font-mono">
          <div className="flex flex-col gap-0.5">
            <span>Godown: <span className="font-bold">{level.godown.name}</span></span>
            <span>Stock Item: <span className="font-bold">{level.item.item_name}</span></span>
          </div>
          <span>{periodLabel}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono select-none">
            <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
              <tr>
                <th rowSpan={2} className="px-3 py-1 text-left font-bold align-bottom">Particulars</th>
                <th colSpan={2} className="px-3 py-0.5 text-center font-bold border-b border-l border-zinc-200">Inwards</th>
                <th colSpan={2} className="px-3 py-0.5 text-center font-bold border-b border-l border-zinc-200">Outwards</th>
                <th colSpan={2} className="px-3 py-0.5 text-center font-bold border-b border-l border-zinc-200">Closing Balance</th>
              </tr>
              <tr>
                <th className="px-3 py-1 text-right font-bold w-20 border-l border-zinc-200">Quantity</th>
                <th className="px-3 py-1 text-right font-bold w-24">Value</th>
                <th className="px-3 py-1 text-right font-bold w-20 border-l border-zinc-200">Quantity</th>
                <th className="px-3 py-1 text-right font-bold w-24">Value</th>
                <th className="px-3 py-1 text-right font-bold w-20 border-l border-zinc-200">Quantity</th>
                <th className="px-3 py-1 text-right font-bold w-24">Value</th>
              </tr>
            </thead>
            <tbody>
              {loadingMonths ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400 italic">Loading...</td></tr>
              ) : monthsError ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-600">{monthsError}</td></tr>
              ) : (
                <>
                {(monthsOpening.qty !== 0 || monthsOpening.value !== 0) && (
                  <tr className="border-b border-zinc-100 italic text-zinc-700">
                    <td className="px-3 py-1">Opening Balance</td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100" />
                    <td className="px-3 py-1 text-right" />
                    <td className="px-3 py-1 text-right border-l border-zinc-100" />
                    <td className="px-3 py-1 text-right" />
                    <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtQty(monthsOpening.qty)}</td>
                    <td className="px-3 py-1 text-right">{fmtAmount(monthsOpening.value)}</td>
                  </tr>
                )}
                {months.map((row, idx) => {
                  const isFocused = idx === monthIndex;
                  return (
                    <tr
                      key={row.month}
                      onClick={() => setMonthIndex(idx)}
                      onDoubleClick={() => { if (activeFY?.start_date) { const { from, to } = fyMonthRange(activeFY.start_date, idx); loadVouchers(level.godown, level.item, from, to, level.group); } else loadVouchers(level.godown, level.item, undefined, undefined, level.group); }}
                      className={`border-b border-zinc-100 cursor-pointer ${isFocused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
                    >
                      <td className="px-3 py-1">{row.month}</td>
                      <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtQty(row.in_qty)}</td>
                      <td className="px-3 py-1 text-right">{fmtAmount(row.in_value)}</td>
                      <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtQty(row.out_qty)}</td>
                      <td className="px-3 py-1 text-right">{fmtAmount(row.out_value)}</td>
                      <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtQty(row.closing_qty)}</td>
                      <td className="px-3 py-1 text-right">{fmtAmount(row.closing_value)}</td>
                    </tr>
                  );
                })}
                </>
              )}
            </tbody>
          </table>
        </div>

        {monthChartBars.length > 0 && <StockBarChart bars={monthChartBars} selectedIndex={monthIndex} />}

        <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 shrink-0">
          <span className="flex-1">Grand Total</span>
          <span className="w-20 text-right border-l border-zinc-300 pr-2">{fmtQty(totIn)}</span>
          <span className="w-24 text-right pr-2">{fmtAmount(totInVal)}</span>
          <span className="w-20 text-right border-l border-zinc-300 pr-2">{fmtQty(totOut)}</span>
          <span className="w-24 text-right pr-2">{fmtAmount(totOutVal)}</span>
          <span className="w-20 text-right border-l border-zinc-300 pr-2">{fmtQty(lastClosingQty)}</span>
          <span className="w-24 text-right pr-2">{fmtAmount(lastClosingVal)}</span>
        </div>

        <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
          <button onClick={() => backToSummary(level.godown, level.group)} className="hover:underline hover:text-zinc-900">Q: Quit</button>
          <button onClick={() => { if (activeFY?.start_date) { const { from, to } = fyMonthRange(activeFY.start_date, monthIndex); loadVouchers(level.godown, level.item, from, to, level.group); } else loadVouchers(level.godown, level.item, undefined, undefined, level.group); }} className="hover:underline hover:text-zinc-900">Enter: Vouchers</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL 4 — Godown Vouchers (matches screenshot 6)
  // ═══════════════════════════════════════════════════════════════════════
  const hasOpening = voucherOpening.qty !== 0 || voucherOpening.value !== 0;
  // Opening balance is shown as a leading Inwards row, so it counts toward the Inwards total.
  const totalInQty = voucherOpening.qty + voucherRows.reduce((s, r) => s + (Number(r.inwards_qty) || 0), 0);
  const totalInValue = voucherOpening.value + voucherRows.reduce((s, r) => s + (Number(r.inwards_value) || 0), 0);
  const totalOutQty = voucherRows.reduce((s, r) => s + (Number(r.outwards_qty) || 0), 0);
  const totalOutValue = voucherRows.reduce((s, r) => s + (Number(r.outwards_value) || 0), 0);
  const finalClosingQty = voucherRows.length ? voucherRows[voucherRows.length - 1].closing_qty : voucherOpening.qty;
  const finalClosingValue = voucherRows.length ? voucherRows[voucherRows.length - 1].closing_value : voucherOpening.value;

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
        <span className="font-bold text-sm tracking-wide">Godown Vouchers</span>
        <span className="font-bold text-sm">{selectedCompany?.name || "Company"}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-zinc-300 font-mono">
        <div className="flex flex-col gap-0.5">
          <span>Stock Item: <span className="font-bold">{level.item.item_name}</span></span>
          <span>Godown: <span className="font-bold">{level.godown.name}</span></span>
        </div>
        <span>{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
            <tr>
              <th rowSpan={2} className="px-3 py-1 text-left font-bold w-20 border-b border-zinc-300 align-bottom">Date</th>
              <th rowSpan={2} className="px-3 py-1 text-left font-bold border-b border-zinc-300 align-bottom">Particulars</th>
              <th rowSpan={2} className="px-3 py-1 text-left font-bold w-28 border-b border-zinc-300 align-bottom">Vch Type</th>
              <th rowSpan={2} className="px-3 py-1 text-right font-bold w-20 border-b border-zinc-300 align-bottom">Vch No.</th>
              <th colSpan={2} className="px-3 py-0.5 text-center font-bold border-b border-l border-zinc-200">Inwards</th>
              <th colSpan={2} className="px-3 py-0.5 text-center font-bold border-b border-l border-zinc-200">Outwards</th>
              <th colSpan={2} className="px-3 py-0.5 text-center font-bold border-b border-l border-zinc-200">Closing</th>
            </tr>
            <tr>
              <th className="px-3 py-1 text-right font-bold w-20 border-l border-zinc-200">Quantity</th>
              <th className="px-3 py-1 text-right font-bold w-24">Value</th>
              <th className="px-3 py-1 text-right font-bold w-20 border-l border-zinc-200">Quantity</th>
              <th className="px-3 py-1 text-right font-bold w-24">Value</th>
              <th className="px-3 py-1 text-right font-bold w-20 border-l border-zinc-200">Quantity</th>
              <th className="px-3 py-1 text-right font-bold w-24">Value</th>
            </tr>
          </thead>
          <tbody>
            {loadingVouchers ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-zinc-400 italic">Loading vouchers...</td></tr>
            ) : voucherError ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-zinc-600">{voucherError}</td></tr>
            ) : voucherRows.length === 0 && !hasOpening ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-zinc-400 italic">No records found.</td></tr>
            ) : (
              <>
              {hasOpening && (
                <tr className="border-b border-zinc-100 italic text-zinc-700">
                  <td className="px-3 py-1 whitespace-nowrap">{formatDate(activeFY?.start_date)}</td>
                  <td className="px-3 py-1">Opening Balance</td>
                  <td className="px-3 py-1" />
                  <td className="px-3 py-1 text-right" />
                  <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtQty(voucherOpening.qty)}</td>
                  <td className="px-3 py-1 text-right">{fmtAmount(voucherOpening.value)}</td>
                  <td className="px-3 py-1 text-right border-l border-zinc-100" />
                  <td className="px-3 py-1 text-right" />
                  <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtQty(voucherOpening.qty)}</td>
                  <td className="px-3 py-1 text-right">{fmtAmount(voucherOpening.value)}</td>
                </tr>
              )}
              {voucherRows.map((row, idx) => {
                const isFocused = idx === voucherIndex;
                return (
                  <tr
                    key={row.voucher_id}
                    onClick={() => setVoucherIndex(idx)}
                    onDoubleClick={() => navigate(`/transactions/voucher/${row.voucher_id}`)}
                    className={`border-b border-zinc-100 cursor-pointer ${isFocused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
                  >
                    <td className="px-3 py-1 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-3 py-1 truncate max-w-xs">{row.particulars}</td>
                    <td className="px-3 py-1">{row.voucher_type}</td>
                    <td className="px-3 py-1 text-right">{row.voucher_number ?? "—"}</td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtQty(row.inwards_qty)}</td>
                    <td className="px-3 py-1 text-right">{fmtAmount(row.inwards_value)}</td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtQty(row.outwards_qty)}</td>
                    <td className="px-3 py-1 text-right">{fmtAmount(row.outwards_value)}</td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtQty(row.closing_qty)}</td>
                    <td className="px-3 py-1 text-right">{fmtAmount(row.closing_value)}</td>
                  </tr>
                );
              })}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-zinc-300 px-3 py-1 text-center text-[10px] italic text-zinc-500">
        Totals as per 'Default' valuation :
      </div>
      <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 shrink-0">
        <span className="w-20" />
        <span className="flex-1" />
        <span className="w-28" />
        <span className="w-20" />
        <span className="w-20 text-right pr-2 border-l border-zinc-300">{fmtQty(totalInQty)}</span>
        <span className="w-24 text-right pr-2">{fmtAmount(totalInValue)}</span>
        <span className="w-20 text-right pr-2 border-l border-zinc-300">{fmtQty(totalOutQty)}</span>
        <span className="w-24 text-right pr-2">{fmtAmount(totalOutValue)}</span>
        <span className="w-20 text-right pr-2 border-l border-zinc-300">{fmtQty(finalClosingQty)}</span>
        <span className="w-24 text-right pr-2">{fmtAmount(finalClosingValue)}</span>
      </div>

      <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
        <button onClick={() => backToMonthly(level.godown, level.item, level.group)} className="hover:underline hover:text-zinc-900">Q: Quit</button>
        <button onClick={backToGodowns} className="hover:underline hover:text-zinc-900">F4: Godown</button>
      </div>
    </div>
  );
}
