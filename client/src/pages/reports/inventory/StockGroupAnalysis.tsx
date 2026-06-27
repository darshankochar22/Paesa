import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

const fmt = (val: number | null | undefined) => {
  const n = Number(val) || 0;
  if (n === 0) return "";
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

const fmtQty = (val: number | null | undefined, unit?: string) => {
  const n = Number(val) || 0;
  if (n === 0) return "";
  const s = n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return unit ? `${s} ${unit}` : s;
};

const fmtDate = (d?: string | null) => {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }); }
  catch { return d; }
};

interface GroupRow {
  group_id: number;
  group_name: string;
  opening_qty: number; opening_value: number;
  in_qty: number; in_value: number;
  out_qty: number; out_value: number;
  closing_qty: number; closing_value: number;
}
interface ItemRow {
  item_id: number;
  item_name: string;
  unit_name: string;
  opening_qty: number; opening_value: number;
  in_qty: number; in_value: number;
  out_qty: number; out_value: number;
  closing_qty: number; closing_value: number;
}
interface MonthRow {
  month: string;
  in_qty: number; in_value: number;
  out_qty: number; out_value: number;
  closing_qty: number; closing_value: number;
}
interface VoucherRow {
  voucher_id: number | null;
  date: string | null;
  particulars: string;
  voucher_type: string;
  voucher_number: string | number;
  inwards_qty: number | null; inwards_value: number | null;
  outwards_qty: number | null; outwards_value: number | null;
  closing_qty: number; closing_value: number;
}

type Level =
  | { step: "groups" }
  | { step: "items"; group: GroupRow }
  | { step: "monthly"; group: GroupRow; item: ItemRow }
  | { step: "vouchers"; group: GroupRow; item: ItemRow };

// Shared header row for movement analysis columns
function MovHeader() {
  return (
    <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
      <tr>
        <th rowSpan={2} className="px-3 py-1 text-left font-bold align-bottom border-b border-zinc-300">Particulars</th>
        <th colSpan={2} className="px-2 py-0.5 text-center font-bold border-b border-l border-zinc-200">Opening Balance</th>
        <th colSpan={2} className="px-2 py-0.5 text-center font-bold border-b border-l border-zinc-200">Inwards</th>
        <th colSpan={2} className="px-2 py-0.5 text-center font-bold border-b border-l border-zinc-200">Outwards</th>
        <th colSpan={2} className="px-2 py-0.5 text-center font-bold border-b border-l border-zinc-200">Closing Balance</th>
      </tr>
      <tr>
        <th className="px-2 py-1 text-right font-bold w-24 border-l border-zinc-200">Quantity</th>
        <th className="px-2 py-1 text-right font-bold w-28">Value</th>
        <th className="px-2 py-1 text-right font-bold w-24 border-l border-zinc-200">Quantity</th>
        <th className="px-2 py-1 text-right font-bold w-28">Value</th>
        <th className="px-2 py-1 text-right font-bold w-24 border-l border-zinc-200">Quantity</th>
        <th className="px-2 py-1 text-right font-bold w-28">Value</th>
        <th className="px-2 py-1 text-right font-bold w-24 border-l border-zinc-200">Quantity</th>
        <th className="px-2 py-1 text-right font-bold w-28">Value</th>
      </tr>
    </thead>
  );
}

function MovTotalRow({ label, oQty, oVal, iQty, iVal, outQty, outVal, cQty, cVal, unit }: {
  label: string; oQty: number; oVal: number; iQty: number; iVal: number;
  outQty: number; outVal: number; cQty: number; cVal: number; unit?: string;
}) {
  return (
    <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 shrink-0">
      <span className="flex-1">{label}</span>
      <span className="w-24 text-right border-l border-zinc-300 pr-1">{fmtQty(oQty, unit)}</span>
      <span className="w-28 text-right pr-1">{fmt(oVal)}</span>
      <span className="w-24 text-right border-l border-zinc-300 pr-1">{fmtQty(iQty, unit)}</span>
      <span className="w-28 text-right pr-1">{fmt(iVal)}</span>
      <span className="w-24 text-right border-l border-zinc-300 pr-1">{fmtQty(outQty, unit)}</span>
      <span className="w-28 text-right pr-1">{fmt(outVal)}</span>
      <span className="w-24 text-right border-l border-zinc-300 pr-1">{fmtQty(cQty, unit)}</span>
      <span className="w-28 text-right pr-1">{fmt(cVal)}</span>
    </div>
  );
}

export default function StockGroupAnalysis() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "";

  const [level, setLevel] = React.useState<Level>({ step: "groups" });

  // Level 1: All groups
  const [groups, setGroups] = React.useState<GroupRow[]>([]);
  const [loadingGroups, setLoadingGroups] = React.useState(true);
  const [groupErr, setGroupErr] = React.useState<string | null>(null);
  const [groupIdx, setGroupIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId || !fyId) { setLoadingGroups(false); return; }
    setLoadingGroups(true);
    setGroupErr(null);
    (window as any).api.report.stockGroupAnalysis(companyId, fyId).then((res: any) => {
      if (res.success) setGroups(res.groups ?? []);
      else setGroupErr(res.error || "Failed to load");
      setLoadingGroups(false);
    });
  }, [companyId, fyId]);

  // Level 2: Items in group
  const [items, setItems] = React.useState<ItemRow[]>([]);
  const [loadingItems, setLoadingItems] = React.useState(false);
  const [itemErr, setItemErr] = React.useState<string | null>(null);
  const [itemIdx, setItemIdx] = React.useState(0);

  const loadItems = React.useCallback((group: GroupRow) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "items", group });
    setLoadingItems(true);
    setItemErr(null);
    setItemIdx(0);
    (window as any).api.report.stockGroupAnalysisItems(companyId, fyId, group.group_id).then((res: any) => {
      if (res.success) setItems(res.items ?? []);
      else setItemErr(res.error || "Failed to load items");
      setLoadingItems(false);
    });
  }, [companyId, fyId]);

  // Level 3: Monthly breakdown
  const [months, setMonths] = React.useState<MonthRow[]>([]);
  const [loadingMonths, setLoadingMonths] = React.useState(false);
  const [monthErr, setMonthErr] = React.useState<string | null>(null);
  const [monthIdx, setMonthIdx] = React.useState(0);

  const loadMonths = React.useCallback((group: GroupRow, item: ItemRow) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "monthly", group, item });
    setLoadingMonths(true);
    setMonthErr(null);
    setMonthIdx(0);
    (window as any).api.report.stockItemMonthly(companyId, fyId, item.item_id).then((res: any) => {
      if (res.success) setMonths(res.months ?? []);
      else setMonthErr(res.error || "Failed to load monthly");
      setLoadingMonths(false);
    });
  }, [companyId, fyId]);

  // Level 4: Vouchers
  const [vouchers, setVouchers] = React.useState<VoucherRow[]>([]);
  const [loadingVouchers, setLoadingVouchers] = React.useState(false);
  const [voucherErr, setVoucherErr] = React.useState<string | null>(null);
  const [voucherIdx, setVoucherIdx] = React.useState(0);

  const loadVouchers = React.useCallback((group: GroupRow, item: ItemRow) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "vouchers", group, item });
    setLoadingVouchers(true);
    setVoucherErr(null);
    setVoucherIdx(0);
    (window as any).api.report.stockItemVouchers(companyId, fyId, item.item_id, activeFY?.start_date, activeFY?.end_date).then((res: any) => {
      if (res.success) setVouchers(res.rows ?? []);
      else setVoucherErr(res.error || "Failed to load vouchers");
      setLoadingVouchers(false);
    });
  }, [companyId, fyId, activeFY]);

  const backToGroups = React.useCallback(() => { setLevel({ step: "groups" }); setItems([]); }, []);
  const backToItems  = React.useCallback((group: GroupRow) => { setLevel({ step: "items", group }); setMonths([]); }, []);
  const backToMonths = React.useCallback((group: GroupRow, item: ItemRow) => { setLevel({ step: "monthly", group, item }); setVouchers([]); }, []);

  // Keyboard nav — Level 1
  React.useEffect(() => {
    if (level.step !== "groups") return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setGroupIdx(p => Math.min(groups.length - 1, p + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setGroupIdx(p => Math.max(0, p - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); const g = groups[groupIdx]; if (g) loadItems(g); }
      else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); navigate(-1); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [level.step, groups, groupIdx, loadItems, navigate]);

  // Keyboard nav — Level 2
  React.useEffect(() => {
    if (level.step !== "items") return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setItemIdx(p => Math.min(items.length - 1, p + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setItemIdx(p => Math.max(0, p - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); const it = items[itemIdx]; if (it) loadMonths(level.group, it); }
      else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToGroups(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [level, items, itemIdx, loadMonths, backToGroups]);

  // Keyboard nav — Level 3
  React.useEffect(() => {
    if (level.step !== "monthly") return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setMonthIdx(p => Math.min(months.length - 1, p + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setMonthIdx(p => Math.max(0, p - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); loadVouchers(level.group, level.item); }
      else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToItems(level.group); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [level, months, monthIdx, loadVouchers, backToItems]);

  // Keyboard nav — Level 4
  React.useEffect(() => {
    if (level.step !== "vouchers") return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setVoucherIdx(p => Math.min(vouchers.length - 1, p + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setVoucherIdx(p => Math.max(0, p - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); const r = vouchers[voucherIdx]; if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`); }
      else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToMonths(level.group, level.item); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [level, vouchers, voucherIdx, navigate, backToMonths]);

  const reportHeader = (title: string, subtitle?: string) => (
    <>
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
        <span className="font-bold text-sm tracking-wide">{title}</span>
        <span className="font-bold text-sm">{selectedCompany?.name || "Company"}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-zinc-300 font-mono text-[11px]">
        <span>{subtitle}</span>
        <span>{periodLabel}</span>
      </div>
    </>
  );

  // ── Level 1: All Stock Groups ────────────────────────────────────────────
  if (level.step === "groups") {
    const totals = groups.reduce((acc, g) => ({
      oQty: acc.oQty + g.opening_qty, oVal: acc.oVal + g.opening_value,
      iQty: acc.iQty + g.in_qty,      iVal: acc.iVal + g.in_value,
      outQty: acc.outQty + g.out_qty, outVal: acc.outVal + g.out_value,
      cQty: acc.cQty + g.closing_qty, cVal: acc.cVal + g.closing_value,
    }), { oQty: 0, oVal: 0, iQty: 0, iVal: 0, outQty: 0, outVal: 0, cQty: 0, cVal: 0 });

    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        {reportHeader("Stock Group Analysis", "Movement Analysis — All Groups")}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono select-none">
            <MovHeader />
            <tbody>
              {loadingGroups ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-zinc-400 italic">Loading...</td></tr>
              ) : groupErr ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-zinc-600">{groupErr}</td></tr>
              ) : groups.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-zinc-400 italic">No stock groups found.</td></tr>
              ) : groups.map((g, idx) => (
                <tr
                  key={g.group_id}
                  onClick={() => setGroupIdx(idx)}
                  onDoubleClick={() => loadItems(g)}
                  className={`border-b border-zinc-100 cursor-pointer ${idx === groupIdx ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
                >
                  <td className="px-3 py-1">{g.group_name}</td>
                  <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(g.opening_qty)}</td>
                  <td className="px-2 py-1 text-right">{fmt(g.opening_value)}</td>
                  <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(g.in_qty)}</td>
                  <td className="px-2 py-1 text-right">{fmt(g.in_value)}</td>
                  <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(g.out_qty)}</td>
                  <td className="px-2 py-1 text-right">{fmt(g.out_value)}</td>
                  <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(g.closing_qty)}</td>
                  <td className="px-2 py-1 text-right">{fmt(g.closing_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <MovTotalRow label="Grand Total" oQty={totals.oQty} oVal={totals.oVal} iQty={totals.iQty} iVal={totals.iVal} outQty={totals.outQty} outVal={totals.outVal} cQty={totals.cQty} cVal={totals.cVal} />
        <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
          <button onClick={() => navigate(-1)} className="hover:underline hover:text-zinc-900">Q: Quit</button>
          <span className="text-zinc-400">Enter: Drill into group</span>
        </div>
      </div>
    );
  }

  // ── Level 2: Items in group ──────────────────────────────────────────────
  if (level.step === "items") {
    const g = level.group;
    const totals = items.reduce((acc, it) => ({
      oQty: acc.oQty + it.opening_qty, oVal: acc.oVal + it.opening_value,
      iQty: acc.iQty + it.in_qty,      iVal: acc.iVal + it.in_value,
      outQty: acc.outQty + it.out_qty, outVal: acc.outVal + it.out_value,
      cQty: acc.cQty + it.closing_qty, cVal: acc.cVal + it.closing_value,
    }), { oQty: 0, oVal: 0, iQty: 0, iVal: 0, outQty: 0, outVal: 0, cQty: 0, cVal: 0 });

    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        {reportHeader("Stock Group Analysis", `Group: ${g.group_name}`)}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono select-none">
            <MovHeader />
            <tbody>
              {loadingItems ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-zinc-400 italic">Loading...</td></tr>
              ) : itemErr ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-zinc-600">{itemErr}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-zinc-400 italic">No items in this group.</td></tr>
              ) : items.map((it, idx) => (
                <tr
                  key={it.item_id}
                  onClick={() => setItemIdx(idx)}
                  onDoubleClick={() => loadMonths(g, it)}
                  className={`border-b border-zinc-100 cursor-pointer ${idx === itemIdx ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
                >
                  <td className="px-3 py-1">{it.item_name}</td>
                  <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(it.opening_qty, it.unit_name)}</td>
                  <td className="px-2 py-1 text-right">{fmt(it.opening_value)}</td>
                  <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(it.in_qty, it.unit_name)}</td>
                  <td className="px-2 py-1 text-right">{fmt(it.in_value)}</td>
                  <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(it.out_qty, it.unit_name)}</td>
                  <td className="px-2 py-1 text-right">{fmt(it.out_value)}</td>
                  <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(it.closing_qty, it.unit_name)}</td>
                  <td className="px-2 py-1 text-right">{fmt(it.closing_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <MovTotalRow label="Grand Total" oQty={totals.oQty} oVal={totals.oVal} iQty={totals.iQty} iVal={totals.iVal} outQty={totals.outQty} outVal={totals.outVal} cQty={totals.cQty} cVal={totals.cVal} />
        <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
          <button onClick={backToGroups} className="hover:underline hover:text-zinc-900">Q: Back to Groups</button>
          <span className="text-zinc-400">Enter: Monthly breakdown</span>
        </div>
      </div>
    );
  }

  // ── Level 3: Monthly breakdown ───────────────────────────────────────────
  if (level.step === "monthly") {
    const { group: g, item: it } = level;
    const totIn    = months.reduce((s, r) => s + (r.in_qty    || 0), 0);
    const totInV   = months.reduce((s, r) => s + (r.in_value  || 0), 0);
    const totOut   = months.reduce((s, r) => s + (r.out_qty   || 0), 0);
    const totOutV  = months.reduce((s, r) => s + (r.out_value || 0), 0);
    const lastCQty = months.length ? months[months.length - 1].closing_qty : 0;
    const lastCVal = months.length ? months[months.length - 1].closing_value : 0;

    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        {reportHeader("Stock Item Monthly Summary", `Item: ${it.item_name}`)}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono select-none">
            <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
              <tr>
                <th rowSpan={2} className="px-3 py-1 text-left font-bold align-bottom border-b border-zinc-300">Particulars</th>
                <th colSpan={2} className="px-2 py-0.5 text-center font-bold border-b border-l border-zinc-200">Inwards</th>
                <th colSpan={2} className="px-2 py-0.5 text-center font-bold border-b border-l border-zinc-200">Outwards</th>
                <th colSpan={2} className="px-2 py-0.5 text-center font-bold border-b border-l border-zinc-200">Closing Balance</th>
              </tr>
              <tr>
                <th className="px-2 py-1 text-right font-bold w-24 border-l border-zinc-200">Quantity</th>
                <th className="px-2 py-1 text-right font-bold w-28">Value</th>
                <th className="px-2 py-1 text-right font-bold w-24 border-l border-zinc-200">Quantity</th>
                <th className="px-2 py-1 text-right font-bold w-28">Value</th>
                <th className="px-2 py-1 text-right font-bold w-24 border-l border-zinc-200">Quantity</th>
                <th className="px-2 py-1 text-right font-bold w-28">Value</th>
              </tr>
            </thead>
            <tbody>
              {loadingMonths ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400 italic">Loading...</td></tr>
              ) : monthErr ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-600">{monthErr}</td></tr>
              ) : months.map((row, idx) => (
                <tr
                  key={row.month}
                  onClick={() => setMonthIdx(idx)}
                  onDoubleClick={() => loadVouchers(g, it)}
                  className={`border-b border-zinc-100 cursor-pointer ${idx === monthIdx ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
                >
                  <td className="px-3 py-1">{row.month}</td>
                  <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(row.in_qty)}</td>
                  <td className="px-2 py-1 text-right">{fmt(row.in_value)}</td>
                  <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(row.out_qty)}</td>
                  <td className="px-2 py-1 text-right">{fmt(row.out_value)}</td>
                  <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(row.closing_qty)}</td>
                  <td className="px-2 py-1 text-right">{fmt(row.closing_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 shrink-0">
          <span className="flex-1">Grand Total</span>
          <span className="w-24 text-right border-l border-zinc-300 pr-1">{fmtQty(totIn)}</span>
          <span className="w-28 text-right pr-1">{fmt(totInV)}</span>
          <span className="w-24 text-right border-l border-zinc-300 pr-1">{fmtQty(totOut)}</span>
          <span className="w-28 text-right pr-1">{fmt(totOutV)}</span>
          <span className="w-24 text-right border-l border-zinc-300 pr-1">{fmtQty(lastCQty)}</span>
          <span className="w-28 text-right pr-1">{fmt(lastCVal)}</span>
        </div>
        <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
          <button onClick={() => backToItems(g)} className="hover:underline hover:text-zinc-900">Q: Back to Items</button>
          <button onClick={() => loadVouchers(g, it)} className="hover:underline hover:text-zinc-900">Enter: View Vouchers</button>
        </div>
      </div>
    );
  }

  // ── Level 4: Vouchers ────────────────────────────────────────────────────
  const { group: g, item: it } = level;
  const totInQty   = vouchers.reduce((s, r) => s + (Number(r.inwards_qty)   || 0), 0);
  const totInVal   = vouchers.reduce((s, r) => s + (Number(r.inwards_value) || 0), 0);
  const totOutQty  = vouchers.reduce((s, r) => s + (Number(r.outwards_qty)  || 0), 0);
  const totOutVal  = vouchers.reduce((s, r) => s + (Number(r.outwards_value)|| 0), 0);
  const finalCQty  = vouchers.length ? vouchers[vouchers.length - 1].closing_qty   : 0;
  const finalCVal  = vouchers.length ? vouchers[vouchers.length - 1].closing_value : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
      {reportHeader("Stock Item Vouchers", `Item: ${it.item_name}`)}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
            <tr>
              <th rowSpan={2} className="px-2 py-1 text-left font-bold w-20 border-b border-zinc-300 align-bottom">Date</th>
              <th rowSpan={2} className="px-2 py-1 text-left font-bold border-b border-zinc-300 align-bottom">Particulars</th>
              <th rowSpan={2} className="px-2 py-1 text-left font-bold w-28 border-b border-zinc-300 align-bottom">Vch Type</th>
              <th rowSpan={2} className="px-2 py-1 text-right font-bold w-16 border-b border-zinc-300 align-bottom">Vch No.</th>
              <th colSpan={2} className="px-2 py-0.5 text-center font-bold border-b border-l border-zinc-200">Inwards</th>
              <th colSpan={2} className="px-2 py-0.5 text-center font-bold border-b border-l border-zinc-200">Outwards</th>
              <th colSpan={2} className="px-2 py-0.5 text-center font-bold border-b border-l border-zinc-200">Closing</th>
            </tr>
            <tr>
              <th className="px-2 py-1 text-right font-bold w-20 border-l border-zinc-200">Qty</th>
              <th className="px-2 py-1 text-right font-bold w-24">Value</th>
              <th className="px-2 py-1 text-right font-bold w-20 border-l border-zinc-200">Qty</th>
              <th className="px-2 py-1 text-right font-bold w-24">Value</th>
              <th className="px-2 py-1 text-right font-bold w-20 border-l border-zinc-200">Qty</th>
              <th className="px-2 py-1 text-right font-bold w-24">Value</th>
            </tr>
          </thead>
          <tbody>
            {loadingVouchers ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-zinc-400 italic">Loading vouchers...</td></tr>
            ) : voucherErr ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-zinc-600">{voucherErr}</td></tr>
            ) : vouchers.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-zinc-400 italic">No records found.</td></tr>
            ) : vouchers.map((row, idx) => (
              <tr
                key={row.voucher_id ?? `row-${idx}`}
                onClick={() => setVoucherIdx(idx)}
                onDoubleClick={() => row.voucher_id && navigate(`/transactions/voucher/${row.voucher_id}`)}
                className={`border-b border-zinc-100 cursor-pointer ${idx === voucherIdx ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
              >
                <td className="px-2 py-1 whitespace-nowrap">{fmtDate(row.date)}</td>
                <td className="px-2 py-1 truncate max-w-xs">{row.particulars}</td>
                <td className="px-2 py-1">{row.voucher_type}</td>
                <td className="px-2 py-1 text-right">{row.voucher_number || ""}</td>
                <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(row.inwards_qty)}</td>
                <td className="px-2 py-1 text-right">{fmt(row.inwards_value)}</td>
                <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(row.outwards_qty)}</td>
                <td className="px-2 py-1 text-right">{fmt(row.outwards_value)}</td>
                <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(row.closing_qty)}</td>
                <td className="px-2 py-1 text-right">{fmt(row.closing_value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 shrink-0">
        <span className="w-20" /><span className="flex-1" /><span className="w-28" /><span className="w-16" />
        <span className="w-20 text-right pr-1 border-l border-zinc-300">{fmtQty(totInQty)}</span>
        <span className="w-24 text-right pr-1">{fmt(totInVal)}</span>
        <span className="w-20 text-right pr-1 border-l border-zinc-300">{fmtQty(totOutQty)}</span>
        <span className="w-24 text-right pr-1">{fmt(totOutVal)}</span>
        <span className="w-20 text-right pr-1 border-l border-zinc-300">{fmtQty(finalCQty)}</span>
        <span className="w-24 text-right pr-1">{fmt(finalCVal)}</span>
      </div>
      <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
        <button onClick={() => backToMonths(g, it)} className="hover:underline hover:text-zinc-900">Q: Back to Monthly</button>
        <span className="text-zinc-400">Enter: Open voucher</span>
      </div>
    </div>
  );
}
