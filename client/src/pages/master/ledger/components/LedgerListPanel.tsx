import { useState, useEffect, useRef, useMemo } from 'react';
import type { LedgerType, GroupType } from '@/types/api';

interface LedgerListPanelProps {
  ledgers: LedgerType[];
  groups: GroupType[];
  selectedId: number | null;
  onSelect: (l: LedgerType) => void;
  onClose: () => void;
  /** Fill the whole content area (opening selection) vs. narrow slide-in switcher. */
  fullWidth?: boolean;
}

type Row =
  { kind: 'group'; name: string } | { kind: 'ledger'; ledger: LedgerType; ledgerIndex: number };

export default function LedgerListPanel({
  ledgers,
  groups,
  selectedId,
  onSelect,
  onClose,
  fullWidth = false,
}: LedgerListPanelProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const groupNameById = useMemo(() => {
    const map: Record<number, string> = {};
    groups.forEach((g) => {
      if (g.group_id) map[g.group_id] = g.name;
    });
    return map;
  }, [groups]);

  // Ledgers arranged under their parent group, alphabetically within each group.
  // `rows` is the flat render list (group headers + ledgers); `ledgerRows` is the
  // subset used for keyboard navigation so Up/Down skip the group headers.
  const { rows, ledgerRows } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = ledgers.filter(
      (l) =>
        !q ||
        l.name.toLowerCase().includes(q) ||
        (l.alias ? l.alias.toLowerCase().includes(q) : false),
    );

    const byGroup = new Map<string, LedgerType[]>();
    matched.forEach((l) => {
      const gName = l.group_id ? (groupNameById[l.group_id] ?? 'Primary') : 'Primary';
      if (!byGroup.has(gName)) byGroup.set(gName, []);
      byGroup.get(gName)!.push(l);
    });

    const sortedGroupNames = [...byGroup.keys()].sort((a, b) => a.localeCompare(b));
    const rowsOut: Row[] = [];
    const ledgerRowsOut: { ledger: LedgerType; rowIndex: number }[] = [];
    sortedGroupNames.forEach((gName) => {
      rowsOut.push({ kind: 'group', name: gName });
      byGroup
        .get(gName)!
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((ledger) => {
          const ledgerIndex = ledgerRowsOut.length;
          ledgerRowsOut.push({ ledger, rowIndex: rowsOut.length });
          rowsOut.push({ kind: 'ledger', ledger, ledgerIndex });
        });
    });
    return { rows: rowsOut, ledgerRows: ledgerRowsOut };
  }, [ledgers, groupNameById, search]);

  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const idx = ledgerRows.findIndex((r) => r.ledger.ledger_id === selectedId);
    setFocusedIndex(idx !== -1 ? idx : 0);
  }, [selectedId, search, ledgerRows]);

  useEffect(() => {
    const rowIndex = ledgerRows[focusedIndex]?.rowIndex;
    if (rowIndex != null) rowRefs.current[rowIndex]?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, ledgerRows]);

  const commit = (l: LedgerType) => {
    onSelect(l);
    onClose();
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (ledgerRows.length) setFocusedIndex((prev) => (prev + 1) % ledgerRows.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (ledgerRows.length)
        setFocusedIndex((prev) => (prev - 1 + ledgerRows.length) % ledgerRows.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const l = ledgerRows[focusedIndex]?.ledger;
      if (l) commit(l);
    }
  };

  return (
    <div
      className={[
        'border-l border-zinc-200 flex flex-col shrink-0 bg-white min-h-0',
        fullWidth ? 'flex-1 min-w-0' : 'w-80',
      ].join(' ')}
      data-enter-nav-ignore
    >
      <div className="px-3 py-2 border-b border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center select-none">
        <span>List of Ledgers{ledgerRows.length ? ` (${ledgerRows.length})` : ''}</span>
        {!fullWidth && (
          <button
            onClick={onClose}
            className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors"
          >
            &times;
          </button>
        )}
      </div>
      <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50/30">
        <input
          ref={inputRef}
          data-enter-skip
          className="w-full text-xs bg-white border border-zinc-200 rounded px-2 py-1 outline-none focus:border-zinc-800 transition-colors"
          placeholder="Search ledgers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onSearchKeyDown}
        />
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {ledgerRows.length === 0 && (
          <div className="text-xs text-zinc-400 px-3 py-2 italic select-none">No ledgers found</div>
        )}
        {rows.map((row, idx) => {
          if (row.kind === 'group') {
            return (
              <div
                key={`g-${row.name}-${idx}`}
                ref={(el) => {
                  rowRefs.current[idx] = el;
                }}
                className="sticky top-0 z-10 bg-zinc-100 border-y border-zinc-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-zinc-600 select-none"
              >
                {row.name}
              </div>
            );
          }
          const l = row.ledger;
          const isFocused = row.ledgerIndex === focusedIndex;
          const isSelected = selectedId === l.ledger_id;
          const ob = Number(l.opening_balance) || 0;
          return (
            <div
              key={l.ledger_id}
              ref={(el) => {
                rowRefs.current[idx] = el;
              }}
              onClick={() => commit(l)}
              className={[
                'flex items-center gap-2 pl-5 pr-3 py-1.5 border-b border-zinc-100 cursor-pointer select-none transition-colors',
                isFocused
                  ? 'bg-zinc-900 text-white'
                  : isSelected
                    ? 'bg-zinc-200 text-zinc-900 font-medium'
                    : 'hover:bg-zinc-50 text-zinc-700',
              ].join(' ')}
            >
              <span className="flex-1 min-w-0 truncate text-sm">
                {l.name}
                {l.alias && (
                  <span
                    className={[
                      'ml-1.5 text-[11px]',
                      isFocused ? 'text-zinc-300' : 'text-zinc-400',
                    ].join(' ')}
                  >
                    ({l.alias})
                  </span>
                )}
              </span>
              <span
                className={[
                  'shrink-0 text-xs tabular-nums text-right',
                  isFocused ? 'text-zinc-200' : 'text-zinc-500',
                ].join(' ')}
              >
                {ob === 0 ? '0.00' : `${ob.toFixed(2)} ${l.opening_balance_type || 'Dr'}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
