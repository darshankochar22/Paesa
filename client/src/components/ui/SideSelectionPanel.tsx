import { useEffect, useRef, useState } from 'react';

interface SideSelectionPanelProps {
  title: string;
  items: { id: string | number; label: string }[];
  selected: string | number;
  onSelect: (val: string) => void;
  onClose: () => void;
  showPrimary?: boolean;
  primaryLabel?: string;
  /**
   * Opt-in Tally-style keyboard navigation: arrow Up/Down to move a highlighted
   * row, Enter to pick it, Escape to close. Focuses the panel on open and marks
   * it data-enter-nav-ignore so the global Enter walker leaves it alone. Off by
   * default to keep existing mouse-only consumers unchanged.
   */
  keyboard?: boolean;
  /**
   * Opt-in search box at the top of the panel — for long lists (e.g. the 46 UQC
   * codes). Filters items by label; arrow/Enter/Escape work over the filtered set.
   * Off by default so existing short-list consumers are unchanged.
   */
  searchable?: boolean;
}

export default function SideSelectionPanel({
  title,
  items,
  selected,
  onSelect,
  onClose,
  showPrimary = false,
  primaryLabel = 'Primary',
  keyboard = false,
  searchable = false,
}: SideSelectionPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [search, setSearch] = useState('');

  // Full flat option list (Primary first when enabled).
  const allOptions: { id: string; label: string }[] = [
    ...(showPrimary ? [{ id: '', label: primaryLabel }] : []),
    ...items.map((item) => ({ id: String(item.id), label: item.label })),
  ];
  // What's shown after the (optional) search filter.
  const options =
    searchable && search
      ? allOptions.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
      : allOptions;

  const initialIndex = Math.max(
    0,
    options.findIndex((o) => o.id === String(selected)),
  );
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    if (searchable) searchRef.current?.focus();
    else if (keyboard) ref.current?.focus();
  }, [keyboard, searchable]);

  // Keep the highlight valid + in view as the filter narrows the list.
  useEffect(() => {
    setFocusedIndex((prev) => Math.min(prev, Math.max(0, options.length - 1)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  useEffect(() => {
    itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  const pick = (idx: number) => {
    const opt = options[idx];
    if (!opt) return;
    onSelect(opt.id);
    onClose();
  };

  const navKeys = (e: React.KeyboardEvent) => {
    if (options.length === 0) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + options.length) % options.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(focusedIndex);
    }
  };

  const kbActive = keyboard || searchable;

  return (
    <div
      ref={ref}
      tabIndex={keyboard && !searchable ? 0 : undefined}
      data-enter-nav-ignore={kbActive ? '' : undefined}
      onKeyDown={keyboard && !searchable ? navKeys : undefined}
      className="absolute top-0 right-0 h-full w-64 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col outline-none"
    >
      <div className="px-3 py-2 border-b border-gray-200 flex justify-between items-center shrink-0">
        <span className="text-xs font-semibold text-black tracking-wide uppercase">{title}</span>
        <button onClick={onClose} className="text-black hover:text-black text-xs">
          ✕
        </button>
      </div>

      {searchable && (
        <input
          ref={searchRef}
          data-enter-skip
          className="px-3 py-1.5 text-xs outline-none border-b border-gray-200 placeholder-black/40 focus:bg-black/[0.02] transition-colors shrink-0"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={navKeys}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {!searchable && showPrimary && (
          <div
            className={`px-3 py-2 text-sm cursor-pointer ${
              kbActive && focusedIndex === 0
                ? 'bg-zinc-900 text-white font-semibold'
                : selected === '' || selected === primaryLabel
                  ? 'text-black font-semibold bg-white'
                  : 'text-black hover:bg-black/[0.03]'
            }`}
            onClick={() => {
              onSelect('');
              onClose();
            }}
            onMouseEnter={kbActive ? () => setFocusedIndex(0) : undefined}
          >
            {primaryLabel}
          </div>
        )}

        {/* Non-searchable, non-primary path renders items directly (unchanged behaviour). */}
        {!searchable &&
          items.map((item, i) => {
            const optIndex = showPrimary ? i + 1 : i;
            return (
              <div
                key={item.id}
                ref={(el) => {
                  itemRefs.current[optIndex] = el;
                }}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  kbActive && focusedIndex === optIndex
                    ? 'bg-zinc-900 text-white font-semibold'
                    : String(selected) === String(item.id)
                      ? 'text-black font-semibold bg-white'
                      : 'text-black hover:bg-black/[0.03]'
                }`}
                onClick={() => {
                  onSelect(String(item.id));
                  onClose();
                }}
                onMouseEnter={kbActive ? () => setFocusedIndex(optIndex) : undefined}
              >
                {item.label}
              </div>
            );
          })}

        {/* Searchable path renders the filtered flat option list. */}
        {searchable &&
          options.map((opt, idx) => (
            <div
              key={opt.id || `__primary_${idx}`}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              className={`px-3 py-2 text-sm cursor-pointer ${
                focusedIndex === idx
                  ? 'bg-zinc-900 text-white font-semibold'
                  : String(selected) === opt.id
                    ? 'text-black font-semibold bg-white'
                    : 'text-black hover:bg-black/[0.03]'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(opt.id);
                onClose();
              }}
              onMouseEnter={() => setFocusedIndex(idx)}
            >
              {opt.label}
            </div>
          ))}

        {options.length === 0 && (
          <div className="px-3 py-2 text-sm text-black italic">No items found</div>
        )}
      </div>
    </div>
  );
}
