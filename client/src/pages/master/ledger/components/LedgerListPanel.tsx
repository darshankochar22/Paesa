import { useState, useEffect, useRef } from "react";
import type { LedgerType } from "@/types/api";

interface LedgerListPanelProps {
  ledgers: LedgerType[];
  selectedId: number | null;
  onSelect: (l: LedgerType) => void;
  onClose: () => void;
}

export default function LedgerListPanel({
  ledgers,
  selectedId,
  onSelect,
  onClose,
}: LedgerListPanelProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = ledgers.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
      <div className="px-3 py-2 border-b border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center select-none">
        <span>List of Ledgers</span>
        <button onClick={onClose} className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors">
          &times;
        </button>
      </div>
      <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50/30">
        <input
          ref={inputRef}
          className="w-full text-xs bg-white border border-zinc-200 rounded px-2 py-1 outline-none focus:border-zinc-800 transition-colors"
          placeholder="Search ledgers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-xs text-zinc-400 px-3 py-2 italic select-none">No ledgers found</div>
        )}
        {filtered.map((l) => (
          <div
            key={l.ledger_id}
            onClick={() => {
              onSelect(l);
              onClose();
            }}
            className={[
              "text-sm px-3 py-2 border-b border-zinc-100 cursor-pointer select-none transition-colors",
              selectedId === l.ledger_id
                ? "bg-zinc-900 text-white font-medium"
                : "hover:bg-zinc-50 text-zinc-700",
            ].join(" ")}
          >
            {l.name}
          </div>
        ))}
      </div>
    </div>
  );
}
