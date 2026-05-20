import { useEffect, useRef } from "react";

interface SideSelectionPanelProps {
  title: string;
  items: { id: string | number; label: string }[];
  selected: string | number;
  onSelect: (val: string) => void;
  onClose: () => void;
  showPrimary?: boolean;
}

export default function SideSelectionPanel({
  title,
  items,
  selected,
  onSelect,
  onClose,
  showPrimary = false,
}: SideSelectionPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-0 right-0 h-full w-64 bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col"
    >
      <div className="px-3 py-2 border-b border-zinc-200 flex justify-between items-center shrink-0">
        <span className="text-xs font-semibold text-zinc-600 tracking-wide uppercase">{title}</span>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xs">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {showPrimary && (
          <div
            className={`px-3 py-2 text-sm cursor-pointer ${
              selected === "" || selected === "Primary"
                ? "text-black font-semibold bg-zinc-100"
                : "text-zinc-700 hover:bg-zinc-50"
            }`}
            onClick={() => { onSelect(""); onClose(); }}
          >
            Primary
          </div>
        )}
        {items.map(item => (
          <div
            key={item.id}
            className={`px-3 py-2 text-sm cursor-pointer ${
              String(selected) === String(item.id)
                ? "text-black font-semibold bg-zinc-100"
                : "text-zinc-700 hover:bg-zinc-50"
            }`}
            onClick={() => { onSelect(String(item.id)); onClose(); }}
          >
            {item.label}
          </div>
        ))}
        {items.length === 0 && !showPrimary && (
          <div className="px-3 py-2 text-sm text-zinc-400">No items found</div>
        )}
      </div>
    </div>
  );
}
