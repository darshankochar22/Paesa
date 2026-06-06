import { useState, useEffect, useRef } from "react";

interface ListSidePanelProps {
  title: string;
  items: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => boolean | void;
  onClose: () => void;
  showPrimary?: boolean;
  primaryLabel?: string;
  showCreate?: boolean;
  onCreateNew?: () => void;
}

export default function ListSidePanel({
  title,
  items,
  selected,
  onSelect,
  onClose,
  showPrimary = false,
  primaryLabel = "Not Applicable",
  showCreate = false,
  onCreateNew,
}: ListSidePanelProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = items.filter(i =>
    i.label.toLowerCase().includes(search.toLowerCase())
  );

  // Build flat list of all selectable options
  const optionsList: { id: string; label: string; type: "primary" | "create" | "item" }[] = [];
  if (showPrimary) {
    optionsList.push({ id: "", label: primaryLabel, type: "primary" });
  }
  if (showCreate) {
    optionsList.push({ id: "create_new", label: "Create New", type: "create" });
  }
  filtered.forEach(item => {
    optionsList.push({ id: item.id, label: item.label, type: "item" });
  });

  const [focusedIndex, setFocusedIndex] = useState(0);

  // Reset focus when filtered items list changes or selections change
  useEffect(() => {
    const initialIdx = optionsList.findIndex(o => o.id === selected);
    if (initialIdx !== -1) {
      setFocusedIndex(initialIdx);
    } else {
      setFocusedIndex(0);
    }
  }, [selected, search]);

  // Scroll focused element into view
  useEffect(() => {
    if (itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  return (
    <div className="w-64 border-l border-zinc-300 flex flex-col bg-white shrink-0 font-mono shadow-md select-none">
      <div className="bg-zinc-800 text-white text-xs px-3 py-1.5 font-bold uppercase tracking-wider">{title}</div>
      <input
        ref={inputRef}
        className="px-3 py-1.5 text-xs outline-none border-b border-zinc-200 placeholder-zinc-400 font-mono bg-zinc-50 focus:bg-white transition-colors"
        placeholder="Search..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocusedIndex(prev => (prev + 1) % optionsList.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocusedIndex(prev => (prev - 1 + optionsList.length) % optionsList.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            const currentOpt = optionsList[focusedIndex];
            if (currentOpt) {
              if (currentOpt.type === "create") {
                onCreateNew?.();
                onClose();
              } else {
                const keepOpen = onSelect(currentOpt.id);
                if (!keepOpen) onClose();
              }
            }
          }
        }}
      />
      <div className="flex-1 overflow-y-auto min-h-0 py-0.5">
        {optionsList.map((opt, idx) => {
          const isFocused = idx === focusedIndex;
          const isSelected = opt.type === "primary" ? !selected : selected === opt.id;
          
          let textColor = "text-zinc-800";
          if (opt.type === "create" || opt.id === "toggle_more" || opt.id === "show_more" || opt.id === "show_less") {
            textColor = "text-zinc-950 font-bold";
          }
          
          let bgClass = "hover:bg-zinc-50";
          if (isFocused) {
            bgClass = "bg-zinc-900 text-white font-medium";
            textColor = "text-white";
          } else if (isSelected) {
            bgClass = "bg-zinc-200 font-bold text-zinc-955";
          }

          return (
            <div
              key={`${opt.type}_${opt.id}_${idx}`}
              ref={el => { itemRefs.current[idx] = el; }}
              className={`flex items-center px-3 py-1 text-xs cursor-pointer border-b border-zinc-100/50 transition-colors ${bgClass} ${textColor}`}
              onClick={() => {
                if (opt.type === "create") {
                  onCreateNew?.();
                  onClose();
                } else {
                  const keepOpen = onSelect(opt.id);
                  if (!keepOpen) onClose();
                }
              }}
            >
              <span className="truncate">{opt.label}</span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-zinc-200 px-3 py-1.5 bg-zinc-50">
        <button onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-800 font-sans">Esc: Close</button>
      </div>
    </div>
  );
}
