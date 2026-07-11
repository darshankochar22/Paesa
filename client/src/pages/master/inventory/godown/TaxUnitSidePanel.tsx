import { useEffect, useRef, useState } from 'react';
import type { TaxUnitType } from '@/types/entities/TaxUnit';

/**
 * Excise Tax Unit side panel shared by GodownCreate / GodownAlter.
 * Keyboard-driven like stock-item ListSidePanel: search input, arrow keys,
 * Enter to pick, Escape to close. Marked data-enter-nav-ignore so the global
 * Enter navigation leaves it alone while open.
 */
export default function TaxUnitSidePanel({
  taxUnits,
  selected,
  onSelect,
  onCreate,
  onClose,
}: {
  taxUnits: TaxUnitType[];
  selected: string;
  onSelect: (name: string) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = taxUnits.filter((tu) => tu.name.toLowerCase().includes(search.toLowerCase()));

  const optionsList: { id: string; label: string; type: 'create' | 'na' | 'item' }[] = [
    { id: '__create', label: 'Create', type: 'create' },
    { id: 'Not Applicable', label: '◆ Not Applicable', type: 'na' },
    ...filtered.map((tu) => ({ id: tu.name, label: tu.name, type: 'item' as const })),
  ];

  const [focusedIndex, setFocusedIndex] = useState(1);

  useEffect(() => {
    const idx = optionsList.findIndex((o) => o.type !== 'create' && o.id === selected);
    setFocusedIndex(idx !== -1 ? idx : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, search]);

  useEffect(() => {
    itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  const pick = (idx: number) => {
    const opt = optionsList[idx];
    if (!opt) return;
    if (opt.type === 'create') {
      onCreate();
      return;
    }
    onSelect(opt.id);
  };

  return (
    <div
      className="w-64 flex flex-col border-l border-zinc-200 bg-white shrink-0 overflow-hidden"
      data-enter-nav-ignore
    >
      <div className="bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 shrink-0">
        List of Excise Tax Units
      </div>
      <input
        ref={inputRef}
        data-enter-skip
        className="px-3 py-1.5 text-xs outline-none border-b border-zinc-200 placeholder-zinc-400 bg-zinc-50 focus:bg-white transition-colors"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex((prev) => (prev + 1) % optionsList.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex((prev) => (prev - 1 + optionsList.length) % optionsList.length);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(focusedIndex);
          }
        }}
      />
      <div className="overflow-y-auto flex-1">
        {optionsList.map((opt, idx) => {
          const isFocused = idx === focusedIndex;
          const isSelected = opt.type !== 'create' && selected === opt.id;
          const base =
            opt.type === 'create'
              ? 'px-3 py-1.5 text-xs font-bold border-b border-zinc-100 cursor-pointer'
              : 'px-3 py-1.5 text-sm cursor-pointer border-b border-zinc-50';
          let cls = 'hover:bg-zinc-100 text-zinc-800';
          if (isFocused) cls = 'bg-zinc-900 text-white font-semibold';
          else if (isSelected) cls = 'bg-zinc-200 font-semibold text-zinc-900';
          else if (opt.type === 'create') cls = 'text-zinc-600 hover:bg-zinc-50';
          return (
            <div
              key={`${opt.type}_${opt.id}`}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              className={`${base} ${cls}`}
              onClick={() => pick(idx)}
              onMouseEnter={() => setFocusedIndex(idx)}
            >
              {opt.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
