import * as React from 'react';

// The TallyPrime "Select <X>" popup that opens when an Inventory Books report
// needs a group / category / godown chosen first. Renders as a centered popup
// over a dimmed backdrop (not an inline side panel). Keyboard nav (arrows/Enter)
// stays in the parent report — this is presentational + click handlers only.

export interface SelectionItem {
  id: React.Key;
  name: string;
  /** Extra column values, aligned 1:1 with `columns` (after the name column). */
  cols?: string[];
}

export interface SelectionColumn {
  label: string;
  width?: string; // tailwind width class, e.g. "w-24"
  align?: 'left' | 'right';
}

export interface SelectionPopupProps {
  title: string; // "Select Stock Group"
  fieldLabel: string; // "Name of Group"
  listLabel: string; // "List of Stock Groups"
  companyName?: string;
  subtitle?: React.ReactNode; // e.g. the already-chosen item, shown under company
  /** When set, the list renders as a multi-column table (Name + these columns). */
  columns?: SelectionColumn[];
  /** Header for the name column when `columns` is set (default "Name"). */
  nameColLabel?: string;
  /** Widen the popup — useful for multi-column lists. Default 420px. */
  width?: number;
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
  columns,
  nameColLabel = 'Name',
  width,
  items,
  index,
  loading,
  emptyText = 'No records found.',
  search,
  onSearchChange,
  onIndexChange,
  onAccept,
  onCreate,
}: SelectionPopupProps) {
  const activeRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 pt-16 select-none">
      <div
        style={{ width: width ?? 420 }}
        className="bg-white border border-gray-200 shadow-xl flex flex-col max-h-[72vh]"
      >
        <div className="px-3 py-1.5 bg-black text-white text-xs font-semibold text-center">
          {title}
        </div>

        {companyName && (
          <div className="px-3 py-1.5 border-b border-gray-200 bg-white text-center text-[11px] font-semibold">
            {companyName}
          </div>
        )}

        {subtitle && (
          <div className="px-3 py-1.5 border-b border-gray-200 text-[11px] text-black">
            {subtitle}
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
          <span className="text-xs shrink-0">{fieldLabel}</span>
          <span className="text-xs">:</span>
          {onSearchChange ? (
            <input
              autoFocus
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="flex-1 border border-gray-200 bg-black/[0.06] px-2 py-1 text-xs outline-none focus:border-gray-200"
            />
          ) : (
            <span className="flex-1 border border-gray-200 bg-black/[0.06] px-2 py-1 text-xs font-bold truncate">
              {items[index]?.name ?? ''}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between px-3 py-1 border-b border-gray-200 bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wide text-black">
            {listLabel}
          </span>
          {onCreate && (
            <button
              onClick={onCreate}
              className="text-[10px] font-bold text-black hover:text-black"
            >
              Create
            </button>
          )}
        </div>

        {columns && columns.length > 0 && (
          <div className="flex px-3 py-1 border-b border-gray-200 bg-white text-[10px] font-bold text-black">
            <span className="flex-1">{nameColLabel}</span>
            {columns.map((c, i) => (
              <span
                key={i}
                className={`${c.width ?? 'w-24'} ${c.align === 'right' ? 'text-right' : 'text-left'}`}
              >
                {c.label}
              </span>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="px-3 py-4 text-xs text-black italic">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-4 text-xs text-black italic">{emptyText}</div>
          ) : (
            items.map((it, idx) => (
              <div
                key={it.id}
                ref={idx === index ? activeRef : undefined}
                onClick={() => onIndexChange(idx)}
                onDoubleClick={() => onAccept(idx)}
                className={`flex px-3 py-1 text-xs cursor-pointer ${
                  idx === index
                    ? 'bg-black/[0.06] text-black font-bold'
                    : 'hover:bg-black/[0.03] text-black'
                }`}
              >
                {columns && columns.length > 0 ? (
                  <>
                    <span className="flex-1 truncate">{it.name}</span>
                    {columns.map((c, i) => (
                      <span
                        key={i}
                        className={`${c.width ?? 'w-24'} ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                      >
                        {it.cols?.[i] ?? ''}
                      </span>
                    ))}
                  </>
                ) : (
                  it.name
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 px-3 py-1 border-t border-gray-200 bg-white text-[10px] font-semibold text-black">
          <button
            onClick={() => !loading && items.length > 0 && onAccept(index)}
            className={
              loading || items.length === 0 ? 'text-black cursor-default' : 'hover:text-black'
            }
          >
            Enter: Accept
          </button>
        </div>
      </div>
    </div>
  );
}
