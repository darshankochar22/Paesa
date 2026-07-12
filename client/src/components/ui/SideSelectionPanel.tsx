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
}: SideSelectionPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Flat option list (Primary first when enabled) for keyboard navigation.
  const options: { id: string; label: string }[] = [
    ...(showPrimary ? [{ id: '', label: primaryLabel }] : []),
    ...items.map((item) => ({ id: String(item.id), label: item.label })),
  ];

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
    if (keyboard) ref.current?.focus();
  }, [keyboard]);

  const pick = (idx: number) => {
    const opt = options[idx];
    if (!opt) return;
    onSelect(opt.id);
    onClose();
  };

  return (
    <div
      ref={ref}
      tabIndex={keyboard ? 0 : undefined}
      data-enter-nav-ignore={keyboard ? '' : undefined}
      onKeyDown={
        keyboard
          ? (e) => {
              if (options.length === 0) return;
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
            }
          : undefined
      }
      className="absolute top-0 right-0 h-full w-64 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col outline-none"
    >
      <div className="px-3 py-2 border-b border-gray-200 flex justify-between items-center shrink-0">
        <span className="text-xs font-semibold text-black tracking-wide uppercase">{title}</span>
        <button onClick={onClose} className="text-black hover:text-black text-xs">
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {showPrimary && (
          <div
            className={`px-3 py-2 text-sm cursor-pointer ${
              keyboard && focusedIndex === 0
                ? 'bg-zinc-900 text-white font-semibold'
                : selected === '' || selected === primaryLabel
                  ? 'text-black font-semibold bg-white'
                  : 'text-black hover:bg-black/[0.03]'
            }`}
            onClick={() => {
              onSelect('');
              onClose();
            }}
            onMouseEnter={keyboard ? () => setFocusedIndex(0) : undefined}
          >
            {primaryLabel}
          </div>
        )}
        {items.map((item, i) => {
          const optIndex = showPrimary ? i + 1 : i;
          return (
            <div
              key={item.id}
              className={`px-3 py-2 text-sm cursor-pointer ${
                keyboard && focusedIndex === optIndex
                  ? 'bg-zinc-900 text-white font-semibold'
                  : String(selected) === String(item.id)
                    ? 'text-black font-semibold bg-white'
                    : 'text-black hover:bg-black/[0.03]'
              }`}
              onClick={() => {
                onSelect(String(item.id));
                onClose();
              }}
              onMouseEnter={keyboard ? () => setFocusedIndex(optIndex) : undefined}
            >
              {item.label}
            </div>
          );
        })}
        {items.length === 0 && !showPrimary && (
          <div className="px-3 py-2 text-sm text-black">No items found</div>
        )}
      </div>
    </div>
  );
}
