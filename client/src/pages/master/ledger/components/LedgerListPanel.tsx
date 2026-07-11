import { useState, useEffect, useRef } from 'react';
import type { LedgerType } from '@/types/api';

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
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = ledgers.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()));

  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const idx = filtered.findIndex((l) => l.ledger_id === selectedId);
    setFocusedIndex(idx !== -1 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, search]);

  useEffect(() => {
    itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  return (
    <div
      className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white"
      data-enter-nav-ignore
    >
      <div className="px-3 py-2 border-b border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center select-none">
        <span>List of Ledgers</span>
        <button
          onClick={onClose}
          className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors"
        >
          &times;
        </button>
      </div>
      <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50/30">
        <input
          ref={inputRef}
          data-enter-skip
          className="w-full text-xs bg-white border border-zinc-200 rounded px-2 py-1 outline-none focus:border-zinc-800 transition-colors"
          placeholder="Search ledgers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (filtered.length) setFocusedIndex((prev) => (prev + 1) % filtered.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (filtered.length)
                setFocusedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const l = filtered[focusedIndex];
              if (l) {
                onSelect(l);
                onClose();
              }
            }
          }}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-xs text-zinc-400 px-3 py-2 italic select-none">No ledgers found</div>
        )}
        {filtered.map((l, idx) => (
          <div
            key={l.ledger_id}
            ref={(el) => {
              itemRefs.current[idx] = el;
            }}
            onClick={() => {
              onSelect(l);
              onClose();
            }}
            className={[
              'text-sm px-3 py-2 border-b border-zinc-100 cursor-pointer select-none transition-colors',
              idx === focusedIndex
                ? 'bg-zinc-900 text-white font-medium'
                : selectedId === l.ledger_id
                  ? 'bg-zinc-200 text-zinc-900 font-medium'
                  : 'hover:bg-zinc-50 text-zinc-700',
            ].join(' ')}
          >
            {l.name}
          </div>
        ))}
      </div>
    </div>
  );
}
