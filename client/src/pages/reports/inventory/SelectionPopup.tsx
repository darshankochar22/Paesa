import * as React from "react";

// The TallyPrime "Select <X>" popup that opens when an Inventory Books report
// needs a group / category / godown chosen first. Renders as a centered popup
// over a dimmed backdrop (not an inline side panel). Keyboard nav (arrows/Enter)
// stays in the parent report — this is presentational + click handlers only.

export interface SelectionItem {
  id: React.Key;
  name: string;
}

export interface SelectionPopupProps {
  title: string;        // "Select Stock Group"
  fieldLabel: string;   // "Name of Group"
  listLabel: string;    // "List of Stock Groups"
  companyName?: string;
  subtitle?: React.ReactNode;   // e.g. the already-chosen item, shown under company
  items: SelectionItem[];
  index: number;
  loading?: boolean;
  emptyText?: string;
  /** When provided, the field becomes a live search input (else a static value). */
  search?: string;
  onSearchChange?: (v: string) => void;
  onIndexChange: (i: number) => void;
  onAccept: (i: number) => void;
  onCancel: () => void;
  onCreate?: () => void;
}

export default function SelectionPopup({
  title,
  fieldLabel,
  listLabel,
  companyName,
  subtitle,
  items,
  index,
  loading,
  emptyText = "No records found.",
  search,
  onSearchChange,
  onIndexChange,
  onAccept,
  onCancel,
  onCreate,
}: SelectionPopupProps) {
  const activeRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [index]);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-zinc-900/30 pt-16 select-none">
      <div className="w-[420px] bg-white border border-zinc-400 shadow-xl flex flex-col max-h-[72vh]">
        <div className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-semibold text-center">{title}</div>

        {companyName && (
          <div className="px-3 py-1.5 border-b border-zinc-300 bg-zinc-50 text-center text-[11px] font-semibold">
            {companyName}
          </div>
        )}

        {subtitle && (
          <div className="px-3 py-1.5 border-b border-zinc-300 text-[11px] text-zinc-700">{subtitle}</div>
        )}

        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-300">
          <span className="text-xs shrink-0">{fieldLabel}</span>
          <span className="text-xs">:</span>
          {onSearchChange ? (
            <input
              autoFocus
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className="flex-1 border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs outline-none focus:border-zinc-500"
            />
          ) : (
            <span className="flex-1 border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs font-bold truncate">
              {items[index]?.name ?? ""}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between px-3 py-1 border-b border-zinc-300 bg-zinc-50">
          <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-600">{listLabel}</span>
          {onCreate && (
            <button onClick={onCreate} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-900">
              Create
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="px-3 py-4 text-xs text-zinc-400 italic">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-4 text-xs text-zinc-400 italic">{emptyText}</div>
          ) : (
            items.map((it, idx) => (
              <div
                key={it.id}
                ref={idx === index ? activeRef : undefined}
                onClick={() => onIndexChange(idx)}
                onDoubleClick={() => onAccept(idx)}
                className={`px-3 py-1 text-xs cursor-pointer ${
                  idx === index ? "bg-zinc-200 text-zinc-950 font-bold" : "hover:bg-zinc-100 text-zinc-800"
                }`}
              >
                {it.name}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600">
          <button onClick={onCancel} className="hover:text-zinc-900">Q: Quit</button>
          <button onClick={() => onAccept(index)} className="hover:text-zinc-900">Enter: Accept</button>
        </div>
      </div>
    </div>
  );
}
