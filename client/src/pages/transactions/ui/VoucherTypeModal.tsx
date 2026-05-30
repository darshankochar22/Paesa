import { useState, useEffect, useRef } from "react";

// Only the 6 voucher types that are fully implemented
const VOUCHERS: { name: string; key: string }[] = [
  { name: "Contra",   key: "F4" },
  { name: "Payment",  key: "F5" },
  { name: "Receipt",  key: "F6" },
  { name: "Journal",  key: "F7" },
  { name: "Sales",    key: "F8" },
  { name: "Purchase", key: "F9" },
];

interface Props {
  currentType: string;
  onSelect: (type: string) => void;
  onClose: () => void;
}

export default function VoucherTypeModal({ currentType = "", onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = VOUCHERS.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  const initialIdx = filtered.findIndex((v) => v.name === currentType);
  const [highlightIdx, setHighlightIdx] = useState(initialIdx >= 0 ? initialIdx : 0);

  // Clamp highlight index whenever filtered list changes
  useEffect(() => {
    setHighlightIdx((i) => (filtered.length === 0 ? 0 : Math.min(i, filtered.length - 1)));
  }, [search, filtered.length]);

  // Auto-focus the search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[highlightIdx];
        if (item) { onSelect(item.name); onClose(); }
        return;
      }

      // F-key shortcuts jump directly without needing Enter
      const fmap: Record<string, string> = {
        F4: "Contra", F5: "Payment", F6: "Receipt",
        F7: "Journal", F8: "Sales",  F9: "Purchase",
      };
      if (fmap[e.key]) {
        e.preventDefault();
        onSelect(fmap[e.key]);
        onClose();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [filtered, highlightIdx, onSelect, onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-zinc-400 w-[310px] select-none text-[12px] shadow-lg"
        style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif" }}
      >
        {/* ── Title bar ─────────────────────────────────────── */}
        <div className="bg-black text-white text-center px-2 py-1 text-[13px] font-semibold flex justify-between items-center">
          <span className="flex-1 text-center">Change Voucher Type</span>
          <button
            onClick={onClose}
            className="text-white cursor-pointer text-[14px] leading-none px-1 hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        {/* ── Search box ────────────────────────────────────── */}
        <div className="p-2 border-b border-zinc-200 bg-zinc-50">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type to filter…"
            className="w-full border border-zinc-400 px-2 py-0.5 text-[12px] font-sans outline-none bg-white focus:border-black"
          />
        </div>

        {/* ── Column header ─────────────────────────────────── */}
        <div className="bg-zinc-800 text-white px-3 py-1 flex justify-between items-center">
          <span>List of Voucher Types</span>
          <span className="text-[10px] text-zinc-400 italic">↑↓ Enter to select</span>
        </div>

        {/* ── Voucher list ──────────────────────────────────── */}
        <div className="py-1 max-h-[300px] overflow-y-auto">
          <div className="px-2 pt-2 pb-0.5 font-bold text-zinc-900 bg-zinc-100/50 text-[11px] uppercase tracking-wide">
            Accounting Vouchers
          </div>

          {filtered.length === 0 && (
            <div className="px-5 py-3 text-zinc-400 italic text-[11px]">No match found</div>
          )}

          {filtered.map((item, idx) => {
            const isSelected = item.name === currentType;
            const isHighlighted = idx === highlightIdx;

            return (
              <div
                key={item.name}
                onMouseEnter={() => setHighlightIdx(idx)}
                onClick={() => { onSelect(item.name); onClose(); }}
                className={`flex justify-between items-center py-1 pr-3 pl-5 cursor-pointer transition-colors duration-75 ${
                  isHighlighted
                    ? "bg-zinc-800 text-white"
                    : isSelected
                    ? "bg-zinc-200 text-black font-semibold"
                    : "bg-transparent text-zinc-800"
                }`}
              >
                <span>{item.name}</span>
                <span className={`text-[11px] font-normal italic ${
                  isHighlighted ? "text-zinc-300" : "text-zinc-500"
                }`}>
                  {item.key}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Footer hint ───────────────────────────────────── */}
        <div className="border-t border-zinc-200 px-3 py-1.5 bg-zinc-50 text-[10px] text-zinc-500 flex justify-between">
          <span>F4–F9 to jump directly</span>
          <span>Esc to cancel</span>
        </div>
      </div>
    </div>
  );
}
