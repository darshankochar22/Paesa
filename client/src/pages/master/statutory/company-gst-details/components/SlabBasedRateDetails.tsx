import { useEffect, useRef, useState } from "react";
import GSTDetailsListPanel from "./GSTDetailsListPanel";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SlabRow {
  greaterThan: number;
  upTo: string;           // empty string means "and above" (last row)
  taxabilityType: string; // "Taxable" | "Exempt" | "Nil Rated" 
  gstRate: number;        // percentage
}

const TAXABILITY_OPTIONS = ["Taxable", "Exempt", "Nil Rated"];

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface SlabBasedRateDetailsProps {
  isOpen: boolean;
  initialRows?: SlabRow[];
  onSave: (rows: SlabRow[]) => void;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default initial row
// ─────────────────────────────────────────────────────────────────────────────

function makeInitialRows(): SlabRow[] {
  return [{ greaterThan: 0, upTo: "", taxabilityType: "Taxable", gstRate: 0 }];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SlabBasedRateDetails({
  isOpen,
  initialRows,
  onSave,
  onClose,
}: SlabBasedRateDetailsProps) {
  const [rows, setRows] = useState<SlabRow[]>(
    initialRows && initialRows.length > 0 ? initialRows : makeInitialRows()
  );

  // activeCell: { rowIndex, col: "upTo" | "taxabilityType" | "gstRate" }
  const [activeRow, setActiveRow] = useState(0);
  const [activeCol, setActiveCol] = useState<"upTo" | "taxabilityType" | "gstRate">("upTo");

  // List panel state (for Taxability Type)
  const [listOpen, setListOpen] = useState(false);
  const [listSelectedIndex, setListSelectedIndex] = useState(0);

  const [showAccept, setShowAccept] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs for inputs
  const upToRefs = useRef<(HTMLInputElement | null)[]>([]);
  const gstRateRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setRows(initialRows && initialRows.length > 0 ? initialRows : makeInitialRows());
      setActiveRow(0);
      setActiveCol("upTo");
      setShowAccept(false);
      setTimeout(() => containerRef.current?.focus(), 50);
    }
  }, [isOpen, initialRows]);

  // ── Sync focus to inputs ──────────────────────────────────────────────────

  useEffect(() => {
    if (activeCol === "upTo" && upToRefs.current[activeRow]) {
      upToRefs.current[activeRow]?.focus();
    } else if (activeCol === "gstRate" && gstRateRefs.current[activeRow]) {
      gstRateRefs.current[activeRow]?.focus();
    }
  }, [activeRow, activeCol]);

  // ── Sync list panel ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    if (activeCol === "taxabilityType") {
      const currentVal = rows[activeRow]?.taxabilityType || "Taxable";
      const idx = TAXABILITY_OPTIONS.indexOf(currentVal);
      setListSelectedIndex(idx >= 0 ? idx : 0);
      setListOpen(true);
    } else {
      setListOpen(false);
    }
  }, [activeCol, activeRow, isOpen, rows]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const updateRow = (index: number, patch: Partial<SlabRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  /** When user confirms "Up To" value, move to Taxability Type or create next row */
  const confirmUpTo = (rowIndex: number) => {
    const val = rows[rowIndex].upTo.trim();
    if (val === "") {
      // Empty = last row, move to Taxability Type
      setActiveCol("taxabilityType");
      return;
    }
    const numVal = Number(val);
    if (isNaN(numVal) || numVal <= rows[rowIndex].greaterThan) {
      // Invalid — stay on field
      return;
    }
    // Ensure next row exists
    setRows((prev) => {
      const next = [...prev];
      if (rowIndex === next.length - 1) {
        // Add new row starting from current upTo
        next.push({ greaterThan: numVal, upTo: "", taxabilityType: "Taxable", gstRate: 0 });
      } else {
        // Update the next row's greaterThan
        next[rowIndex + 1].greaterThan = numVal;
      }
      return next;
    });
    setActiveCol("taxabilityType");
  };

  /** Apply taxability from the list to the active row */
  const applyTaxability = (val: string) => {
    updateRow(activeRow, {
      taxabilityType: val,
      gstRate: val === "Taxable" ? rows[activeRow].gstRate : 0
    });

    // Move to next field
    if (val === "Taxable") {
      setActiveCol("gstRate");
    } else {
      moveToNextRow(activeRow);
    }
  };

  const confirmGstRate = (rowIndex: number) => {
    moveToNextRow(rowIndex);
  };

  const moveToNextRow = (currentRowIndex: number) => {
    const nextRow = currentRowIndex + 1;
    if (nextRow < rows.length) {
      setActiveRow(nextRow);
      setActiveCol("upTo");
    } else {
      setShowAccept(true);
    }
  };

  const handleSave = () => {
    // Filter out empty/incomplete rows
    const valid = rows.filter((r) => r.upTo !== "" || r === rows[rows.length - 1]);
    onSave(valid.length > 0 ? valid : rows);
    onClose();
  };

  // ── Keyboard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showAccept) {
          setShowAccept(false);
        } else if (listOpen) {
          setListOpen(false);
          setActiveCol("upTo");
        } else {
          onClose();
        }
        return;
      }

      if (showAccept) {
        const k = e.key.toLowerCase();
        if (k === "y" || e.key === "Enter") { e.preventDefault(); handleSave(); }
        else if (k === "n") { e.preventDefault(); setShowAccept(false); }
        return;
      }

      // List panel navigation (Taxability column)
      if (listOpen && activeCol === "taxabilityType") {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setListSelectedIndex((p) => (p + 1) % TAXABILITY_OPTIONS.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setListSelectedIndex((p) => (p - 1 + TAXABILITY_OPTIONS.length) % TAXABILITY_OPTIONS.length);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          applyTaxability(TAXABILITY_OPTIONS[listSelectedIndex]);
          return;
        }
      }

      // Up To column navigation
      if (activeCol === "upTo") {
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          confirmUpTo(activeRow);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (activeRow < rows.length - 1) setActiveRow((p) => p + 1);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (activeRow > 0) setActiveRow((p) => p - 1);
          return;
        }
      }

      // GST Rate column navigation
      if (activeCol === "gstRate") {
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          confirmGstRate(activeRow);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (activeRow < rows.length - 1) setActiveRow((p) => p + 1);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (activeRow > 0) setActiveRow((p) => p - 1);
          return;
        }
      }

      // Ctrl+A / Alt+A — accept
      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setShowAccept(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, listOpen, activeCol, activeRow, rows, listSelectedIndex, showAccept]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const thCell = "px-2 py-1 text-center font-bold text-[10px] text-zinc-800 border border-zinc-300 bg-zinc-100";
  const tdBase = "px-2 py-0.5 border border-zinc-200 text-[11px] font-mono";
  const activeCell = "bg-[#ffea5d] border-[#e6c300]";
  const inactiveCell = "bg-white";

  return (
    <div className="fixed inset-0 bg-black/50 z-[10500] flex items-center justify-center font-mono text-[11px]">
      <div ref={containerRef} tabIndex={-1} className="outline-none flex gap-4 items-stretch animate-fade-in">

        {/* ── Main slab table ─────────────────────────────────────────────── */}
        <div className="bg-white border border-zinc-400 shadow-2xl flex flex-col" style={{ width: 500 }}>

          {/* Title */}
          <div className="text-center font-bold text-xs py-3 border-b border-zinc-200 text-zinc-900 tracking-wide">
            <span className="underline decoration-1 underline-offset-4">
              Slab-Based Tax Rate Details
            </span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {/* Merged header: Slab-wise Item Rate */}
                  <th colSpan={2} className={`${thCell} border-b-0`}>
                    Slab-wise Item Rate
                  </th>
                  <th rowSpan={2} className={thCell}>
                    Taxability<br />Type
                  </th>
                  <th rowSpan={2} className={thCell}>
                    GST<br />Rate
                  </th>
                </tr>
                <tr>
                  <th className={`${thCell} border-t-0`}>Greater Than</th>
                  <th className={`${thCell} border-t-0`}>Up To</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isUpToActive = activeRow === i && activeCol === "upTo";
                  const isTaxabilityActive = activeRow === i && activeCol === "taxabilityType";
                  const isRateActive = activeRow === i && activeCol === "gstRate";

                  return (
                    <tr key={i} className={activeRow === i ? "bg-[#fffbea]" : ""}>
                      {/* Greater Than — read-only */}
                      <td className={`${tdBase} text-right ${inactiveCell}`}>
                        {row.greaterThan}
                      </td>

                      {/* Up To — editable input */}
                      <td
                        className={`${tdBase} p-0 ${isUpToActive ? activeCell : inactiveCell}`}
                        onClick={() => { setActiveRow(i); setActiveCol("upTo"); }}
                      >
                        <input
                          ref={(el) => { upToRefs.current[i] = el; }}
                          type="text"
                          value={row.upTo}
                          onChange={(e) =>
                            updateRow(i, { upTo: e.target.value.replace(/[^\d.]/g, "") })
                          }
                          onFocus={() => { setActiveRow(i); setActiveCol("upTo"); }}
                          className={`w-full px-2 py-0.5 outline-none bg-transparent text-right font-mono text-[11px] font-bold ${isUpToActive ? "bg-[#ffea5d]" : "bg-transparent"
                            }`}
                          placeholder={i === rows.length - 1 ? "(and above)" : ""}
                        />
                      </td>

                      {/* Taxability Type — dropdown */}
                      <td
                        className={`${tdBase} text-left font-bold ${isTaxabilityActive ? activeCell : inactiveCell} cursor-pointer`}
                        onClick={() => { setActiveRow(i); setActiveCol("taxabilityType"); }}
                      >
                        {row.taxabilityType}
                      </td>

                      {/* GST Rate — editable input if Taxable */}
                      <td
                        className={`${tdBase} p-0 text-right ${isRateActive ? activeCell : inactiveCell}`}
                        onClick={() => {
                          if (row.taxabilityType === "Taxable") {
                            setActiveRow(i);
                            setActiveCol("gstRate");
                          }
                        }}
                      >
                        {row.taxabilityType === "Taxable" ? (
                          <div className="flex items-center justify-end pr-1">
                            <input
                              ref={(el) => { gstRateRefs.current[i] = el; }}
                              type="number"
                              min={0}
                              max={100}
                              value={row.gstRate !== undefined ? row.gstRate : 0}
                              onChange={(e) =>
                                updateRow(i, { gstRate: Number(e.target.value) })
                              }
                              onFocus={() => { setActiveRow(i); setActiveCol("gstRate"); }}
                              className={`w-12 px-1 py-0.5 outline-none bg-transparent text-right font-mono text-[11px] font-bold ${isRateActive ? "bg-[#ffea5d]" : "bg-transparent"
                                }`}
                            />
                            <span className="font-bold text-zinc-600">%</span>
                          </div>
                        ) : (
                          <span className="pr-2 text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center font-sans text-[10px] text-zinc-500 shrink-0">
            <div className="flex gap-4">
              <span><span className="underline font-bold text-zinc-700">Q</span>: Quit</span>
              <span><span className="underline font-bold text-zinc-700">A</span>: Accept</span>
              <span className="text-zinc-400">Tab/Enter: next field</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1 border border-zinc-300 rounded text-xs bg-white hover:bg-zinc-50 text-zinc-600 font-medium"
              >
                Quit
              </button>
              <button
                onClick={() => setShowAccept(true)}
                className="px-4 py-1 rounded bg-black text-white text-xs hover:bg-zinc-800 font-medium"
              >
                Accept
              </button>
            </div>
          </div>

          {/* Accept prompt */}
          {showAccept && (
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-[10501]">
              <div className="bg-[#e2f1f1] border-2 border-[#007a78] px-6 py-4 shadow-xl text-center w-52">
                <div className="font-bold text-xs text-[#004d4d] mb-3">Accept?</div>
                <div className="flex justify-center gap-4 text-xs font-bold">
                  <button
                    onClick={handleSave}
                    className="px-3 py-1 bg-[#007a78] text-white hover:bg-[#005a58] w-14"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowAccept(false)}
                    className="px-3 py-1 border border-[#007a78] text-[#007a78] hover:bg-[#cbe6e6] w-14"
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right-side list panel (Taxability options) ────────────────────── */}
        {listOpen && activeCol === "taxabilityType" && (
          <GSTDetailsListPanel
            title="Taxability Type"
            options={TAXABILITY_OPTIONS}
            selectedIndex={listSelectedIndex}
            onSelect={(label) => applyTaxability(label)}
          />
        )}
      </div>
    </div>
  );
}
