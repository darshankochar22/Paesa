import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../../context/CompanyContext";
import { cn } from "@/lib/utils";

interface StockGroup {
  group_id: number;
  group_name: string;
  closing_qty: number;
  closing_value: number;
  item_count: number;
  items: StockItem[];
}

interface StockItem {
  item_id: number;
  item_name: string;
  group_name: string;
  unit_name: string;
  closing_qty: number;
  closing_value: number;
  rate: number;
}

interface MonthRow {
  month: string;
  in_qty: number;
  in_value: number;
  out_qty: number;
  out_value: number;
  closing_qty: number;
  closing_value: number;
}

type Level = "groups" | "items" | "monthly";

const fmt = (val: number, digits = 2): string => {
  if (val === 0) return "";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(val);
};

const fmtQty = (val: number): string => {
  if (val === 0) return "";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

function MonthlyChart({ months }: { months: MonthRow[] }) {
  const W = 520, H = 140;
  const PADL = 60, PADR = 20, PADT = 20, PADB = 36;
  const chartW = W - PADL - PADR;
  const chartH = H - PADT - PADB;

  const values = months.map((m) => m.closing_value);
  const maxVal = Math.max(...values, 0.01);

  const points = months.map((m, i) => {
    const x = PADL + (i / (months.length - 1)) * chartW;
    const y = PADT + chartH - (m.closing_value / maxVal) * chartH;
    return { x, y, m };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    v: maxVal * f,
    y: PADT + chartH - f * chartH,
  }));

  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <svg width={W} height={H} className="font-mono text-[9px]">
      {yTicks.map((t, i) => (
        <line
          key={i}
          x1={PADL}
          y1={t.y}
          x2={W - PADR}
          y2={t.y}
          stroke="#d1e5ed"
          strokeDasharray="3,3"
        />
      ))}
    
      {yTicks.map((t, i) => (
        <text key={i} x={PADL - 4} y={t.y + 3} textAnchor="end" fill="#6b7280" fontSize={9}>
          {t.v === 0 ? "0" : t.v >= 100000 ? `${(t.v / 100000).toFixed(1)}L` : t.v >= 1000 ? `${(t.v / 1000).toFixed(0)}K` : t.v.toFixed(0)}
        </text>
      ))}
  
      <line x1={PADL} y1={PADT} x2={PADL} y2={PADT + chartH} stroke="#9cbac7" />
      <line x1={PADL} y1={PADT + chartH} x2={W - PADR} y2={PADT + chartH} stroke="#9cbac7" />
      
      <path d={pathD} fill="none" stroke="#0078a8" strokeWidth={1.5} />
    
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={hovered === i ? 4 : 2.5}
            fill={hovered === i ? "#f59e0b" : "#0078a8"}
            stroke="white"
            strokeWidth={1}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "default" }}
          />

          <text
            x={p.x}
            y={PADT + chartH + 14}
            textAnchor="middle"
            fill="#6b7280"
            fontSize={8}
          >
            {p.m.month.slice(0, 3)}
          </text>
        </g>
      ))}
      {/* Tooltip */}
      {hovered !== null && (() => {
        const p = points[hovered];
        const label = `₹${fmt(p.m.closing_value)}`;
        const tx = Math.min(p.x + 6, W - PADR - 80);
        return (
          <g>
            <rect x={tx} y={p.y - 18} width={70} height={14} rx={2} fill="#002d40" opacity={0.85} />
            <text x={tx + 4} y={p.y - 7} fill="white" fontSize={9}>{label}</text>
          </g>
        );
      })()}
    </svg>
  );
}

export default function StockSummary() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  // ── Level state ────────────────────────────────────────────────────────────
  const [level, setLevel] = useState<Level>("groups");
  const [groups, setGroups] = useState<StockGroup[]>([]);
  const [totalClosingValue, setTotalClosingValue] = useState(0);
  const [totalClosingQty, setTotalClosingQty] = useState(0);

  const [selectedGroup, setSelectedGroup] = useState<StockGroup | null>(null);
  const [groupItems, setGroupItems] = useState<StockItem[]>([]);
  const [groupItemsTotal, setGroupItemsTotal] = useState({ qty: 0, value: 0 });

  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [monthlyData, setMonthlyData] = useState<{ item_name: string; opening_qty: number; opening_value: number; months: MonthRow[] } | null>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const companyName = selectedCompany?.name || "";
  const fyLabel = activeFY?.start_date
    ? (() => {
        const d = new Date(activeFY.start_date);
        return `1-Apr-${d.getFullYear()} to 31-Mar-${d.getFullYear() + 1}`;
      })()
    : "";

  // ── Visible rows for keyboard nav ──────────────────────────────────────────
  const visibleRows: Array<{ id: string | number; label: string }> = (() => {
    if (level === "groups") return groups.map((g) => ({ id: g.group_id, label: g.group_name }));
    if (level === "items")  return groupItems.map((it) => ({ id: it.item_id, label: it.item_name }));
    if (level === "monthly") return monthlyData ? monthlyData.months.map((m, i) => ({ id: i, label: m.month })) : [];
    return [];
  })();

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadGroups = useCallback(async () => {
    if (!companyId || !fyId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.report.stockSummary(companyId, fyId, undefined, "FIFO");
      if (!res.success) throw new Error(res.error || "Failed to load stock summary");
      // Filter out groups with no closing value AND no items with any activity
      const nonEmpty = (res.groups as StockGroup[]).filter(
        (g) => g.closing_value !== 0 || g.closing_qty !== 0 || g.item_count > 0
      );
      setGroups(nonEmpty);
      setTotalClosingValue(res.totalClosingValue || 0);
      setTotalClosingQty(res.totalClosingQty || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId]);

  const loadItemMonthly = useCallback(async (item: StockItem) => {
    if (!companyId || !fyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await (window as any).api.report.run("stock_item_monthly", { company_id: companyId, fy_id: fyId, item_id: item.item_id });
      if (!res.success) throw new Error(res.error || "Failed to load monthly data");
      setMonthlyData(res as any);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  // Clamp focused index when rows change
  useEffect(() => {
    setFocusedIndex((prev) => Math.min(Math.max(prev, 0), Math.max(visibleRows.length - 1, 0)));
  }, [visibleRows.length]);

  // ── Drill-down actions ─────────────────────────────────────────────────────
  const drillToGroup = (g: StockGroup) => {
    setSelectedGroup(g);
    setFocusedIndex(0);
    setLevel("items");
    const items = (g.items || []).filter(
      (it) => it.closing_qty !== 0 || it.closing_value !== 0
    );
    setGroupItems(items);
    const qty = items.reduce((s, it) => s + it.closing_qty, 0);
    const value = items.reduce((s, it) => s + it.closing_value, 0);
    setGroupItemsTotal({ qty, value });
  };

  const drillToItem = (it: StockItem) => {
    setSelectedItem(it);
    setFocusedIndex(0);
    setLevel("monthly");
    loadItemMonthly(it);
  };

  const handleBack = () => {
    if (level === "monthly") {
      setLevel("items");
      setMonthlyData(null);
      setFocusedIndex(0);
    } else if (level === "items") {
      setLevel("groups");
      setSelectedGroup(null);
      setGroupItems([]);
      setFocusedIndex(0);
    } else {
      navigate(-1);
    }
  };

  const handleRowEnter = (idx: number) => {
    if (level === "groups") {
      const g = groups[idx];
      if (g) drillToGroup(g);
    } else if (level === "items") {
      const it = groupItems[idx];
      if (it) drillToItem(it);
    }
  };

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, visibleRows.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleRowEnter(focusedIndex);
      }
      if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        handleBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusedIndex, visibleRows, level, groups, groupItems]);

  // ── Title / breadcrumb ─────────────────────────────────────────────────────
  const pageTitle = (() => {
    if (level === "groups") return "Stock Summary";
    if (level === "items") return `Stock Summary  ›  ${selectedGroup?.group_name}`;
    return `Stock Summary  ›  ${selectedGroup?.group_name}  ›  ${selectedItem?.item_name}`;
  })();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-screen bg-white select-none text-zinc-900 font-mono text-[11px]">

      {/* Title Bar */}
      <div className="bg-[#cbe2ec] border-b border-[#a8c6d1] px-3 py-1.5 flex items-center justify-between shrink-0 text-[#002d40]">
        <div className="font-bold text-sm truncate">{pageTitle}</div>
        <div className="font-bold text-sm">{companyName}</div>
        <div className="text-[10px] text-zinc-500">{fyLabel}</div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex min-h-0">

        {/* Table region */}
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          <div className="flex-1 overflow-y-auto">

            {/* ── LEVEL 1: Stock Groups ─────────────────────────────────── */}
            {level === "groups" && (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-[#ecf4f7] text-[#002d40] z-10 border-b border-[#a8c6d1] text-[10px]">
                  <tr>
                    <th className="text-left px-3 py-2 font-bold border-r border-[#a8c6d1] w-[45%]">Particulars</th>
                    <th className="text-right px-3 py-2 font-bold border-r border-[#a8c6d1] w-[18%]">Closing Qty</th>
                    <th className="text-right px-3 py-2 font-bold border-r border-[#a8c6d1] w-[18%]">Rate</th>
                    <th className="text-right px-3 py-2 font-bold w-[19%]">Closing Value</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="text-center py-8 text-zinc-400 italic">Loading stock summary…</td></tr>
                  ) : error ? (
                    <tr><td colSpan={4} className="text-center py-8 text-red-500">{error}</td></tr>
                  ) : groups.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-zinc-400 italic">No stock groups with activity found.</td></tr>
                  ) : (
                    groups.map((g, idx) => {
                      const isFocused = idx === focusedIndex;
                      const avgRate = g.closing_qty !== 0 ? g.closing_value / g.closing_qty : 0;
                      return (
                        <tr
                          key={g.group_id}
                          onClick={() => setFocusedIndex(idx)}
                          onDoubleClick={() => drillToGroup(g)}
                          className={cn(
                            "border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer h-6 text-[12px]",
                            isFocused ? "bg-[#ffcc00] text-black font-bold" : "font-bold text-zinc-900"
                          )}
                        >
                          <td className="px-3 py-0.5 border-r border-zinc-100 align-middle">
                            <span className="mr-1 text-zinc-400">▶</span>
                            {g.group_name}
                          </td>
                          <td className="px-3 py-0.5 text-right border-r border-zinc-100 align-middle">
                            {fmtQty(g.closing_qty)}
                          </td>
                          <td className="px-3 py-0.5 text-right border-r border-zinc-100 align-middle">
                            {avgRate > 0 ? fmt(avgRate) : ""}
                          </td>
                          <td className="px-3 py-0.5 text-right align-middle">
                            {fmt(g.closing_value)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {/* Grand Total */}
                  {!loading && !error && groups.length > 0 && (
                    <tr className="bg-[#ecf4f7] border-t border-[#a8c6d1] border-b-2 border-double border-zinc-800 font-bold text-zinc-900 text-[12px] h-7">
                      <td className="px-3 py-1 text-left uppercase align-middle border-r border-[#a8c6d1]">Grand Total</td>
                      <td className="px-3 py-1 text-right border-r border-[#a8c6d1] align-middle">{fmtQty(totalClosingQty)}</td>
                      <td className="px-3 py-1 text-right border-r border-[#a8c6d1] align-middle"></td>
                      <td className="px-3 py-1 text-right align-middle">{fmt(totalClosingValue)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* ── LEVEL 2: Stock Items in a Group ───────────────────────── */}
            {level === "items" && (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-[#ecf4f7] text-[#002d40] z-10 border-b border-[#a8c6d1] text-[10px]">
                  <tr>
                    <th className="text-left px-3 py-2 font-bold border-r border-[#a8c6d1] w-[45%]">Particulars</th>
                    <th className="text-right px-3 py-2 font-bold border-r border-[#a8c6d1] w-[18%]">Closing Qty</th>
                    <th className="text-right px-3 py-2 font-bold border-r border-[#a8c6d1] w-[18%]">Rate</th>
                    <th className="text-right px-3 py-2 font-bold w-[19%]">Closing Value</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="text-center py-8 text-zinc-400 italic">Loading items…</td></tr>
                  ) : error ? (
                    <tr><td colSpan={4} className="text-center py-8 text-red-500">{error}</td></tr>
                  ) : groupItems.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-zinc-400 italic">No stock items in this group.</td></tr>
                  ) : (
                    groupItems.map((it, idx) => {
                      const isFocused = idx === focusedIndex;
                      const qtyLabel = it.closing_qty !== 0
                        ? `${fmtQty(it.closing_qty)}${it.unit_name ? " " + it.unit_name : ""}`
                        : "";
                      return (
                        <tr
                          key={it.item_id}
                          onClick={() => setFocusedIndex(idx)}
                          onDoubleClick={() => drillToItem(it)}
                          className={cn(
                            "border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer h-6 text-[12px]",
                            isFocused ? "bg-[#ffcc00] text-black font-bold" : "text-zinc-800"
                          )}
                        >
                          <td className="px-3 py-0.5 border-r border-zinc-100 align-middle pl-6">
                            {it.item_name}
                          </td>
                          <td className="px-3 py-0.5 text-right border-r border-zinc-100 align-middle">
                            {qtyLabel}
                          </td>
                          <td className="px-3 py-0.5 text-right border-r border-zinc-100 align-middle">
                            {it.rate > 0 ? fmt(it.rate) : ""}
                          </td>
                          <td className="px-3 py-0.5 text-right align-middle">
                            {fmt(it.closing_value)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {/* Group total */}
                  {!loading && !error && groupItems.length > 0 && (
                    <tr className="bg-[#ecf4f7] border-t border-[#a8c6d1] border-b-2 border-double border-zinc-800 font-bold text-zinc-900 text-[12px] h-7">
                      <td className="px-3 py-1 text-left uppercase align-middle border-r border-[#a8c6d1]">
                        {selectedGroup?.group_name} Total
                      </td>
                      <td className="px-3 py-1 text-right border-r border-[#a8c6d1] align-middle">
                        {fmtQty(groupItemsTotal.qty)}
                      </td>
                      <td className="px-3 py-1 text-right border-r border-[#a8c6d1] align-middle"></td>
                      <td className="px-3 py-1 text-right align-middle">
                        {fmt(groupItemsTotal.value)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* ── LEVEL 3: Monthly Breakdown ─────────────────────────────── */}
            {level === "monthly" && (
              <div className="pb-4">
                {loading ? (
                  <div className="text-center py-8 text-zinc-400 italic">Loading monthly data…</div>
                ) : error ? (
                  <div className="text-center py-8 text-red-500">{error}</div>
                ) : monthlyData ? (
                  <>
                    {/* Monthly table */}
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-[#ecf4f7] text-[#002d40] z-10 border-b border-[#a8c6d1] text-[10px]">
                        <tr>
                          <th rowSpan={2} className="text-left px-3 py-2 font-bold border-r border-[#a8c6d1] w-[18%] align-bottom">Particulars</th>
                          <th colSpan={2} className="text-center px-2 py-1 font-bold border-r border-[#a8c6d1] border-b border-[#a8c6d1]">Inwards</th>
                          <th colSpan={2} className="text-center px-2 py-1 font-bold border-r border-[#a8c6d1] border-b border-[#a8c6d1]">Outwards</th>
                          <th colSpan={2} className="text-center px-2 py-1 font-bold border-b border-[#a8c6d1]">Closing Balance</th>
                        </tr>
                        <tr>
                          <th className="text-right px-2 py-1 font-bold border-r border-[#a8c6d1] w-[12%]">Qty</th>
                          <th className="text-right px-2 py-1 font-bold border-r border-[#a8c6d1] w-[13%]">Value</th>
                          <th className="text-right px-2 py-1 font-bold border-r border-[#a8c6d1] w-[12%]">Qty</th>
                          <th className="text-right px-2 py-1 font-bold border-r border-[#a8c6d1] w-[13%]">Value</th>
                          <th className="text-right px-2 py-1 font-bold border-r border-[#a8c6d1] w-[12%]">Qty</th>
                          <th className="text-right px-2 py-1 font-bold w-[13%]">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Opening Balance row */}
                        <tr className="bg-[#f7fafc] border-b border-zinc-200 h-6 font-bold text-[12px] text-zinc-700">
                          <td className="px-3 py-0.5 border-r border-zinc-100 align-middle">Opening Balance</td>
                          <td className="px-2 py-0.5 text-right border-r border-zinc-100 align-middle"></td>
                          <td className="px-2 py-0.5 text-right border-r border-zinc-100 align-middle"></td>
                          <td className="px-2 py-0.5 text-right border-r border-zinc-100 align-middle"></td>
                          <td className="px-2 py-0.5 text-right border-r border-zinc-100 align-middle"></td>
                          <td className="px-2 py-0.5 text-right border-r border-zinc-100 align-middle">
                            {fmtQty(monthlyData.opening_qty)}
                          </td>
                          <td className="px-2 py-0.5 text-right align-middle">
                            {fmt(monthlyData.opening_value)}
                          </td>
                        </tr>
                        {monthlyData.months.map((m, idx) => {
                          const isFocused = idx === focusedIndex;
                          const hasActivity = m.in_qty !== 0 || m.out_qty !== 0;
                          return (
                            <tr
                              key={m.month}
                              onClick={() => setFocusedIndex(idx)}
                              className={cn(
                                "border-b border-zinc-100 hover:bg-zinc-50 cursor-default h-6 text-[12px]",
                                isFocused ? "bg-[#ffcc00] text-black font-bold" : hasActivity ? "text-zinc-900" : "text-zinc-400"
                              )}
                            >
                              <td className="px-3 py-0.5 border-r border-zinc-100 align-middle">{m.month}</td>
                              <td className="px-2 py-0.5 text-right border-r border-zinc-100 align-middle">{fmtQty(m.in_qty)}</td>
                              <td className="px-2 py-0.5 text-right border-r border-zinc-100 align-middle">{fmt(m.in_value)}</td>
                              <td className="px-2 py-0.5 text-right border-r border-zinc-100 align-middle">{fmtQty(m.out_qty)}</td>
                              <td className="px-2 py-0.5 text-right border-r border-zinc-100 align-middle">{fmt(m.out_value)}</td>
                              <td className="px-2 py-0.5 text-right border-r border-zinc-100 align-middle">{fmtQty(m.closing_qty)}</td>
                              <td className="px-2 py-0.5 text-right align-middle">{fmt(m.closing_value)}</td>
                            </tr>
                          );
                        })}
                        {/* Grand Total */}
                        {(() => {
                          const last = monthlyData.months[monthlyData.months.length - 1];
                          const totalInQty   = monthlyData.months.reduce((s, m) => s + m.in_qty,   0);
                          const totalInVal   = monthlyData.months.reduce((s, m) => s + m.in_value, 0);
                          const totalOutQty  = monthlyData.months.reduce((s, m) => s + m.out_qty,  0);
                          const totalOutVal  = monthlyData.months.reduce((s, m) => s + m.out_value,0);
                          return (
                            <tr className="bg-[#ecf4f7] border-t border-[#a8c6d1] border-b-2 border-double border-zinc-800 font-bold text-zinc-900 text-[12px] h-7">
                              <td className="px-3 py-1 uppercase align-middle border-r border-[#a8c6d1]">Grand Total</td>
                              <td className="px-2 py-1 text-right border-r border-[#a8c6d1] align-middle">{fmtQty(totalInQty)}</td>
                              <td className="px-2 py-1 text-right border-r border-[#a8c6d1] align-middle">{fmt(totalInVal)}</td>
                              <td className="px-2 py-1 text-right border-r border-[#a8c6d1] align-middle">{fmtQty(totalOutQty)}</td>
                              <td className="px-2 py-1 text-right border-r border-[#a8c6d1] align-middle">{fmt(totalOutVal)}</td>
                              <td className="px-2 py-1 text-right border-r border-[#a8c6d1] align-middle">{fmtQty(last?.closing_qty ?? 0)}</td>
                              <td className="px-2 py-1 text-right align-middle">{fmt(last?.closing_value ?? 0)}</td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>

                    {/* SVG Line Chart */}
                    <div className="px-4 pt-4 pb-2">
                      <div className="text-[10px] font-bold text-[#002d40] mb-1 uppercase tracking-wide">
                        Closing Stock Value — {monthlyData.item_name}
                      </div>
                      <div className="border border-[#a8c6d1] bg-[#f9fcfe] inline-block p-2">
                        <MonthlyChart months={monthlyData.months} />
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            )}

          </div>
        </div>

        {/* Right sidebar buttons */}
        <div className="w-[120px] bg-[#cbe2ec] border-l border-[#a8c6d1] flex flex-col p-1 gap-1 shrink-0 text-[#002d40] text-[10px] font-bold">
          {level !== "groups" && (
            <button
              onClick={handleBack}
              className="w-full text-left p-1 border border-[#9cbac7] bg-[#d9ecf5] hover:bg-[#b0d4e5]"
            >
              ← Back
            </button>
          )}
          <button
            onClick={() => loadGroups()}
            className="w-full text-left p-1 border border-[#9cbac7] bg-[#d9ecf5] hover:bg-[#b0d4e5]"
          >
            F5: Refresh
          </button>
          <div className="flex-1" />
          <button
            onClick={handleBack}
            className="w-full text-left p-1 border border-[#9cbac7] bg-[#d9ecf5] hover:bg-[#b0d4e5] text-red-700"
          >
            Esc: Back
          </button>
        </div>
      </div>
    </div>
  );
}
