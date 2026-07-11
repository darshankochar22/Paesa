import { useEffect, useRef, useState } from 'react';
import type { GroupType } from '@/types/api';

interface GroupFlatListProps {
  groups: GroupType[];
  selectedId?: number | null;
  onSelect?: (group: GroupType) => void;
  onCreate?: () => void;
  onClose?: () => void;
  title?: string;
  showHeader?: boolean;
}

export default function GroupFlatList({
  groups,
  selectedId,
  onSelect,
  onCreate,
  onClose,
  title,
  showHeader = true,
}: GroupFlatListProps) {
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));
  const filtered = sortedGroups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const idx = filtered.findIndex((g) => g.group_id === selectedId);
    setFocusedIndex(idx !== -1 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, search]);

  useEffect(() => {
    itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  const header = showHeader && (
    <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50 select-none">
      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
        {title || 'List of Groups'}
      </span>
      <div className="flex items-center gap-3">
        {onCreate && (
          <button
            onClick={onCreate}
            className="text-[11px] text-zinc-500 hover:text-zinc-800 font-medium transition-colors"
          >
            + Create
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );

  if (!groups || groups.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white">
        {header}
        <div className="text-sm text-zinc-400 p-4">No groups found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white" data-enter-nav-ignore>
      {header}
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
            onClose?.();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (filtered.length) setFocusedIndex((prev) => (prev + 1) % filtered.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filtered.length)
              setFocusedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const group = filtered[focusedIndex];
            if (group) onSelect?.(group);
          }
        }}
      />
      <div className="flex-1 overflow-y-auto">
        {filtered.map((group, idx) => {
          const isSelected = group.group_id === selectedId;
          const isFocused = idx === focusedIndex;
          let rowCls = 'text-zinc-700 hover:bg-zinc-50';
          if (isFocused) rowCls = 'bg-zinc-900 text-white font-medium';
          else if (isSelected) rowCls = 'bg-zinc-100 font-semibold text-black';
          return (
            <div
              key={group.group_id}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              className={`flex items-center min-h-[28px] px-3 cursor-pointer text-[13px] select-none ${rowCls}`}
              onClick={() => onSelect?.(group)}
            >
              <span className="truncate">{group.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
