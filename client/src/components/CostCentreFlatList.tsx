import { useState } from "react";
import type { CostCentreType } from "@/types/api";

interface CostCentreFlatListProps {
  costCentres: CostCentreType[];
  selectedId?: number | null;
  onSelect?: (cc: CostCentreType) => void;
  onCreate?: () => void;
  onClose?: () => void;
  title?: string;
  showHeader?: boolean;
}

export default function CostCentreFlatList({
  costCentres,
  selectedId,
  onSelect,
  onCreate,
  onClose,
  title,
  showHeader = true,
}: CostCentreFlatListProps) {
  const [search, setSearch] = useState("");

  const filteredCCs = costCentres.filter((cc) =>
    cc.name.toLowerCase().includes(search.toLowerCase())
  );

  const sortedCCs = [...filteredCCs].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="flex flex-col h-full bg-white font-mono text-[12px]">
      {showHeader && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50 select-none shrink-0">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            {title || "List of Cost Centres"}
          </span>
          <div className="flex items-center gap-3">
            {onCreate && (
              <button
                onClick={onCreate}
                className="text-[11px] text-zinc-500 hover:text-zinc-800 font-medium transition-colors font-sans"
              >
                + Create
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors font-sans"
              >
                &times;
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search box for filtering */}
      <div className="p-2 border-b border-zinc-100 shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Cost Centre..."
          className="w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none focus:border-zinc-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {costCentres.length === 0 ? (
          <div className="text-zinc-400 p-3 italic text-center text-[11px]">No Cost Centres found</div>
        ) : sortedCCs.length === 0 ? (
          <div className="text-zinc-400 p-3 italic text-center text-[11px]">No matches</div>
        ) : (
          sortedCCs.map((cc) => {
            const isSelected = cc.cc_id === selectedId;
            return (
              <div
                key={cc.cc_id}
                className={`flex items-center min-h-[26px] px-3 py-1 cursor-pointer text-[12px] select-none ${
                  isSelected
                    ? "bg-zinc-100 font-bold text-black"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
                onClick={() => onSelect?.(cc)}
              >
                <span className="truncate">{cc.name}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
