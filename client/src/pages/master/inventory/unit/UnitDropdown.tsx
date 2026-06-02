import { useState, useEffect, useRef } from "react";
import type { UnitType } from "@/types/entities/Unit";

export default function UnitDropdown({
  value,
  onChange,
  units,
  onCreate,
  placeholder,
}: {
  value: string;
  onChange: (id: string) => void;
  units: UnitType[];
  onCreate: () => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedUnit = units.find(u => String(u.unit_id) === value);
  const allOptions = units.map(u => ({ id: String(u.unit_id), label: u.symbol, formal: u.formal_name }));

  useEffect(() => {
    setHighlightedIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, allOptions.length));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedIndex === 0) {
          onCreate();
          setOpen(false);
        } else {
          const opt = allOptions[highlightedIndex - 1];
          if (opt) { onChange(opt.id); setOpen(false); }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, highlightedIndex, allOptions, onCreate, onChange]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-left text-sm px-1.5 py-1 min-w-[90px] border border-zinc-200 rounded bg-white hover:border-zinc-300 focus:border-zinc-500 focus:outline-none transition-colors flex items-center justify-between gap-1"
      >
        <span className={selectedUnit ? "text-zinc-900 font-medium uppercase" : "text-zinc-400"}>
          {selectedUnit ? selectedUnit.symbol : placeholder}
        </span>
        <span className="text-zinc-400 text-[10px] ml-1">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl z-50 min-w-[200px] overflow-hidden"
          style={{ maxHeight: "280px", overflowY: "auto" }}
        >
          <div className="bg-zinc-100 px-3 py-2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider border-b border-zinc-200">
            List of Units
          </div>

          <div
            className={`px-3 py-2 text-xs cursor-pointer transition-colors border-b border-zinc-100 flex items-center gap-2 ${
              highlightedIndex === 0 ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-600"
            }`}
            onClick={() => { onCreate(); setOpen(false); }}
            onMouseEnter={() => setHighlightedIndex(0)}
          >
            <span className="text-base leading-none">+</span>
            <span className="font-medium">Create</span>
          </div>

          {allOptions.map((opt, idx) => (
            <div
              key={opt.id}
              className={`px-4 py-2 text-xs cursor-pointer transition-colors ${
                highlightedIndex === idx + 1 ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-800"
              } ${value === opt.id ? "font-semibold" : ""}`}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              onMouseEnter={() => setHighlightedIndex(idx + 1)}
            >
              <span className="uppercase">{opt.label}</span>
              {opt.formal && (
                <span className={highlightedIndex === idx + 1 ? "text-zinc-300" : "text-zinc-400"}>
                  {" "}({opt.formal})
                </span>
              )}
            </div>
          ))}

          {allOptions.length === 0 && (
            <div className="px-4 py-3 text-xs text-zinc-400 text-center">No units available</div>
          )}
        </div>
      )}
    </div>
  );
}
