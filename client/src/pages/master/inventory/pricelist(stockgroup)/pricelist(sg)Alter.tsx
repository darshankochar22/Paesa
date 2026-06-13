

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel } from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockGroup {
  sg_id: number;
  name: string;
}

interface StockItem {
  item_id: number;
  name: string;
}

interface PriceListLine {
  line_id?: number;
  particulars: string;
  item_id: number | null;
  qty_from: string;
  qty_less_than: string;
  rate: string;
  disc_percent: string;
}

const emptyLine = (): PriceListLine => ({
  particulars: "",
  item_id: null,
  qty_from: "",
  qty_less_than: "",
  rate: "",
  disc_percent: "",
});

const cellCls =
  "bg-transparent outline-none text-[11px] font-mono text-zinc-900 w-full px-1 py-0.5 border border-transparent focus:border-zinc-300 rounded";

// ─── Component ────────────────────────────────────────────────────────────────

export default function PriceListSGAlter() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  // ── Header fields
  const [stockGroups, setStockGroups] = useState<StockGroup[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [priceLevels, setPriceLevels] = useState<string[]>([]);

  const [selectedGroup, setSelectedGroup] = useState<string>("All Items");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [applicableFrom, setApplicableFrom] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // ── Table lines
  const [lines, setLines] = useState<PriceListLine[]>([emptyLine()]);

  // ── UI state
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Dropdown popups
  const [showGroupList, setShowGroupList] = useState(false);
  const [showLevelList, setShowLevelList] = useState(false);
  const [activeItemDropdown, setActiveItemDropdown] = useState<number | null>(null);
  const [itemSearch, setItemSearch] = useState("");

  const particularRefs = useRef<(HTMLInputElement | null)[]>([]);
  const qtyFromRefs    = useRef<(HTMLInputElement | null)[]>([]);
  const qtyUpToRefs    = useRef<(HTMLInputElement | null)[]>([]);
  const rateRefs       = useRef<(HTMLInputElement | null)[]>([]);
  const discRefs       = useRef<(HTMLInputElement | null)[]>([]);

  // ── Load masters + existing record
  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      try {
        // Stock groups
        if (window.api?.stockGroup) {
          const sg = await window.api.stockGroup.getAll(companyId);
          if (sg?.success) setStockGroups(sg.stockGroups ?? []);
        }
        // Stock items
        if (window.api?.stockItem) {
          const si = await window.api.stockItem.getAll(companyId);
          if (si?.success) setStockItems(si.stockItems ?? []);
        }
        // Price levels
        if (window.api?.priceLevels) {
          const pl = await window.api.priceLevels.get(companyId);
          if (pl?.success && pl?.data) {
            const named = (pl.data as string[]).filter((n) => n.trim() !== "");
            setPriceLevels(named);
          }
        }
        // Existing price list record
        if (id && window.api?.priceList) {
          const result = await window.api.priceList.getById(Number(id));
          if (result?.success && result?.data) {
            const record = result.data;
            setSelectedGroup(record.stock_group ?? "All Items");
            setSelectedLevel(record.price_level ?? "");
            setApplicableFrom(
              record.applicable_from
                ? record.applicable_from.slice(0, 10)
                : new Date().toISOString().slice(0, 10)
            );
            const fetchedLines: PriceListLine[] = (record.lines ?? []).map((l: any) => ({
              line_id:      l.line_id,
              particulars:  l.particulars ?? "",
              item_id:      l.item_id ?? null,
              qty_from:     String(l.qty_from ?? ""),
              qty_less_than: String(l.qty_less_than ?? ""),
              rate:         String(l.rate ?? ""),
              disc_percent: String(l.disc_percent ?? ""),
            }));
            setLines([...fetchedLines, emptyLine()]);
          } else {
            setError("Price list not found.");
          }
        }
      } catch (err) {
        console.error("Failed to load:", err);
        setError("Failed to load price list.");
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [companyId, id]);

  // ── Line helpers
  const setLineField = (
    index: number,
    field: keyof PriceListLine,
    value: string | number | null
  ) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (index === next.length - 1 && field === "particulars" && String(value).trim() !== "") {
        next.push(emptyLine());
      }
      return next;
    });
  };

  const removeLine = (index: number) => {
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) return [emptyLine()];
      return next;
    });
    setTimeout(() => particularRefs.current[Math.max(0, index - 1)]?.focus(), 0);
  };

  const pickItem = (index: number, item: StockItem) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        particulars: item.name,
        item_id: item.item_id,
      };
      if (index === next.length - 1) next.push(emptyLine());
      return next;
    });
    setActiveItemDropdown(null);
    setItemSearch("");
    setTimeout(() => qtyFromRefs.current[index]?.focus(), 0);
  };

  // ── Submit (update)
  const handleSubmit = useCallback(async () => {
    if (!companyId)      { setError("No company selected."); return; }
    if (!selectedLevel)  { setError("Select a price level."); return; }
    if (!applicableFrom) { setError("Enter applicable from date."); return; }

    const filledLines = lines.filter((l) => l.particulars.trim() !== "");
    if (filledLines.length === 0) { setError("Add at least one item."); return; }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (window.api?.priceList) {
        const result = await window.api.priceList.update({
          id:              Number(id),
          company_id:      companyId,
          stock_group:     selectedGroup,
          price_level:     selectedLevel,
          applicable_from: applicableFrom,
          lines: filledLines.map((l) => ({
            line_id:       l.line_id,
            item_id:       l.item_id,
            particulars:   l.particulars.trim(),
            qty_from:      parseFloat(l.qty_from)       || 0,
            qty_less_than: parseFloat(l.qty_less_than)  || 0,
            rate:          parseFloat(l.rate)            || 0,
            disc_percent:  parseFloat(l.disc_percent)   || 0,
          })),
        });
        if (!result.success) throw new Error(result.error || "Update failed.");
      }
      setSuccess("Price list updated successfully.");
      setTimeout(() => {
        setSuccess(null);
        navigate("/master/alter");
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update price list.");
    } finally {
      setLoading(false);
    }
  }, [companyId, id, selectedGroup, selectedLevel, applicableFrom, lines, navigate]);

  // ── Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showGroupList || showLevelList || activeItemDropdown !== null) {
          setShowGroupList(false);
          setShowLevelList(false);
          setActiveItemDropdown(null);
          return;
        }
        e.preventDefault();
        navigate("/master/alter");
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate, showGroupList, showLevelList, activeItemDropdown]);

  // ── Row keyboard nav
  const handleParticularKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (lines[i].particulars.trim() !== "") {
        setActiveItemDropdown(null);
        qtyFromRefs.current[i]?.focus();
      }
    }
    if (e.key === "Backspace" && lines[i].particulars === "" && lines.length > 1) {
      e.preventDefault();
      removeLine(i);
    }
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent,
    rowIndex: number,
    nextRef: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      nextRef.current[rowIndex]?.focus();
    }
  };

  const handleDiscKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const next = particularRefs.current[rowIndex + 1];
      if (next) next.focus();
    }
  };

  const filteredItems = stockItems.filter((it) =>
    it.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const actions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Esc",   label: "Quit",   onClick: () => navigate("/master/alter") },
  ];

  const filledCount = lines.filter((l) => l.particulars.trim() !== "").length;

  const formatDateDisplay = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }).replace(/ /g, "-");
  };

  // ── Loading state
  if (fetching) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm font-mono">
        Loading price list...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-950">
      <PageTitleBar title="Price List (Stock Group) — Alter" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-4 py-2 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center shrink-0 font-sans">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-4 py-2 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center shrink-0 font-sans">
          <span>• {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 font-bold">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Header Form ── */}
          <div className="border-b border-zinc-200 bg-white px-6 py-3 shrink-0">
            <div className="grid grid-cols-[180px_1fr] gap-y-1.5 gap-x-4 max-w-lg text-xs font-mono">

              {/* Stock Group Name */}
              <span className="text-zinc-500 flex items-center">Stock Group Name</span>
              <div className="relative">
                <div
                  className="flex items-center gap-1 border border-zinc-300 rounded px-2 py-0.5 bg-amber-50 cursor-pointer hover:border-zinc-400 text-[11px] font-mono font-bold"
                  onClick={() => { setShowGroupList((p) => !p); setShowLevelList(false); }}
                >
                  <span className="text-zinc-400 mr-1">◆</span>
                  <span className="text-zinc-900">{selectedGroup}</span>
                </div>
                {showGroupList && (
                  <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-zinc-300 rounded shadow-lg w-64 max-h-56 overflow-y-auto">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 flex justify-between">
                      <span>List of Stock Groups</span>
                    </div>
                    {[{ sg_id: 0, name: "All Items" }, ...stockGroups].map((sg) => (
                      <div
                        key={sg.sg_id}
                        className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-amber-100 ${selectedGroup === sg.name ? "bg-amber-200 font-bold" : ""}`}
                        onClick={() => { setSelectedGroup(sg.name); setShowGroupList(false); }}
                      >
                        {sg.name === "All Items" && <span className="text-zinc-400 mr-1">◆</span>}
                        {sg.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Price Level */}
              <span className="text-zinc-500 flex items-center">Price Level</span>
              <div className="relative">
                <div
                  className="flex items-center gap-1 border border-zinc-300 rounded px-2 py-0.5 bg-white cursor-pointer hover:border-zinc-400 text-[11px] font-mono font-bold"
                  onClick={() => { setShowLevelList((p) => !p); setShowGroupList(false); }}
                >
                  <span className="text-zinc-900">{selectedLevel || "Select..."}</span>
                </div>
                {showLevelList && (
                  <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-zinc-300 rounded shadow-lg w-56 max-h-48 overflow-y-auto">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                      Price Levels
                    </div>
                    {priceLevels.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-zinc-400">No price levels found.</div>
                    ) : (
                      priceLevels.map((pl, i) => (
                        <div
                          key={i}
                          className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-amber-100 ${selectedLevel === pl ? "bg-amber-200 font-bold" : ""}`}
                          onClick={() => { setSelectedLevel(pl); setShowLevelList(false); }}
                        >
                          {pl}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Applicable From */}
              <span className="text-zinc-500 flex items-center">Applicable From</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={applicableFrom}
                  onChange={(e) => setApplicableFrom(e.target.value)}
                  className="border border-zinc-300 rounded px-2 py-0.5 text-[11px] font-mono font-bold text-zinc-900 bg-white focus:outline-none focus:border-zinc-500 w-36"
                />
                {applicableFrom && (
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {formatDateDisplay(applicableFrom)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Sub-header ── */}
          <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-1.5 flex items-center gap-8 text-[11px] font-mono shrink-0">
            <span>
              <span className="text-zinc-400">Under Group</span>
              <span className="mx-2 text-zinc-300">:</span>
              <span className="text-zinc-400">◆</span>
              <span className="font-bold text-zinc-800 ml-1">{selectedGroup}</span>
            </span>
            <span>
              <span className="text-zinc-400">Price Level</span>
              <span className="mx-2 text-zinc-300">:</span>
              <span className="font-bold text-zinc-800">{selectedLevel || "—"}</span>
            </span>
            <span>
              <span className="text-zinc-400">Applicable From:</span>
              <span className="font-bold text-zinc-800 ml-2">{formatDateDisplay(applicableFrom)}</span>
            </span>
            <span className="ml-auto text-zinc-400">
              {filledCount} {filledCount === 1 ? "item" : "items"}
            </span>
          </div>

          {/* ── Table ── */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full text-[11px] font-mono border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-zinc-100 border-b border-zinc-300">
                  <th className="text-left px-3 py-2 font-bold text-zinc-600 w-12">S.No.</th>
                  <th className="text-left px-3 py-2 font-bold text-zinc-600 w-64">Particulars</th>
                  <th className="text-center px-2 py-2 font-bold text-zinc-600 w-48" colSpan={2}>
                    Quantities
                    <div className="flex justify-between mt-0.5 text-[10px] font-normal text-zinc-400">
                      <span className="w-1/2 text-center">From:</span>
                      <span className="w-1/2 text-center">Less than</span>
                    </div>
                  </th>
                  <th className="text-right px-3 py-2 font-bold text-zinc-600 w-28">Rate</th>
                  <th className="text-center px-3 py-2 font-bold text-zinc-600 w-28">
                    Disc. %
                    <div className="text-[10px] font-normal text-zinc-400">(if any)</div>
                  </th>
                  <th className="w-6"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const isLastEmpty = i === lines.length - 1 && line.particulars.trim() === "";
                  const filtered = line.particulars.trim()
                    ? stockItems.filter((it) =>
                        it.name.toLowerCase().includes(line.particulars.toLowerCase())
                      )
                    : stockItems;

                  return (
                    <tr
                      key={i}
                      className={`border-b border-zinc-100 group ${
                        isLastEmpty ? "bg-amber-50/40" : "hover:bg-zinc-50"
                      }`}
                    >
                      <td className="px-3 py-1 text-zinc-400 text-center align-middle">
                        {isLastEmpty ? "" : i + 1}
                      </td>

                      <td className="px-2 py-1 align-middle relative">
                        <input
                          ref={(el) => { particularRefs.current[i] = el; }}
                          className={cellCls + " font-bold"}
                          value={line.particulars}
                          placeholder={isLastEmpty ? "Select item..." : ""}
                          onChange={(e) => {
                            setLineField(i, "particulars", e.target.value);
                            setLineField(i, "item_id", null);
                            setActiveItemDropdown(i);
                            setItemSearch(e.target.value);
                          }}
                          onFocus={() => {
                            setActiveItemDropdown(i);
                            setItemSearch(line.particulars);
                          }}
                          onBlur={() => setTimeout(() => setActiveItemDropdown(null), 150)}
                          onKeyDown={(e) => handleParticularKeyDown(e, i)}
                        />
                        {activeItemDropdown === i && (
                          <div className="absolute left-0 top-full mt-0.5 z-50 bg-white border border-zinc-300 rounded shadow-lg w-64 max-h-48 overflow-y-auto">
                            <div className="px-3 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                              <span>List Of Items</span>
                            </div>
                            {filtered.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-zinc-400">No items found.</div>
                            ) : (
                              filtered.map((it) => (
                                <div
                                  key={it.item_id}
                                  onMouseDown={(e) => { e.preventDefault(); pickItem(i, it); }}
                                  className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-amber-100 ${
                                    line.item_id === it.item_id ? "bg-amber-200 font-bold" : ""
                                  }`}
                                >
                                  {it.name}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-2 py-1 align-middle w-24">
                        <input
                          ref={(el) => { qtyFromRefs.current[i] = el; }}
                          className={cellCls + " text-right"}
                          value={line.qty_from}
                          placeholder="0"
                          onChange={(e) => setLineField(i, "qty_from", e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, i, qtyUpToRefs)}
                        />
                      </td>

                      <td className="px-2 py-1 align-middle w-24">
                        <input
                          ref={(el) => { qtyUpToRefs.current[i] = el; }}
                          className={cellCls + " text-right"}
                          value={line.qty_less_than}
                          placeholder="0"
                          onChange={(e) => setLineField(i, "qty_less_than", e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, i, rateRefs)}
                        />
                      </td>

                      <td className="px-2 py-1 align-middle">
                        <input
                          ref={(el) => { rateRefs.current[i] = el; }}
                          className={cellCls + " text-right"}
                          value={line.rate}
                          placeholder="0.00"
                          onChange={(e) => setLineField(i, "rate", e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, i, discRefs)}
                        />
                      </td>

                      <td className="px-2 py-1 align-middle">
                        <input
                          ref={(el) => { discRefs.current[i] = el; }}
                          className={cellCls + " text-right"}
                          value={line.disc_percent}
                          placeholder="0"
                          onChange={(e) => setLineField(i, "disc_percent", e.target.value)}
                          onKeyDown={(e) => handleDiscKeyDown(e, i)}
                        />
                      </td>

                      <td className="px-1 align-middle">
                        {!isLastEmpty && (
                          <button
                            onClick={() => removeLine(i)}
                            className="text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            tabIndex={-1}
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <RightActionPanel actions={actions} />
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50 shrink-0 font-sans">
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/master/alter")}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium"
          >
            Quit
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
          >
            {loading ? "Updating..." : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}