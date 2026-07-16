import { useEffect, useMemo, useState, useRef, type ReactNode } from 'react';
import type { UnitType } from '../../../types/api';

export interface PanelColumn {
  header: string;
  render: (item: any) => ReactNode;
  /** Width + alignment classes shared by header and cell, e.g. "w-16 text-right". */
  className?: string;
}

interface LedgerListPanelProps {
  title: string;
  items: any[];
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onSelect: (item: any) => void;
  onClose: () => void;
  onCreateNew: () => void;
  createLabel: string;
  /** When provided (stock-item selection), shows an "End of List" row that ends item entry. */
  onEndOfList?: () => void;
  /** Enter while the search is empty → skip selection (e.g. Physical Stock: go to next item). */
  onEnterEmpty?: () => void;
  height?: string;
  stockBalances?: Record<number, number>;
  /** Per-godown balances (keyed by godown_id) for the item being entered — shown in the godown picker. */
  godownBalances?: Record<number, number>;
  /** Unit symbol appended to godown balances (the current item's unit). */
  balanceUnit?: string;
  allUnits?: UnitType[];
  /** Multi-column layout (employee / attendance-type pickers). When set, rows render
   *  these columns under a header instead of the plain name, and the panel widens. */
  columns?: PanelColumn[];
}

export default function LedgerListPanel({
  title,
  items,
  searchTerm,
  onSearchChange,
  onSelect,
  onClose,
  onCreateNew,
  createLabel,
  onEndOfList,
  onEnterEmpty,
  height = 'h-full',
  stockBalances,
  godownBalances,
  balanceUnit,
  allUnits,
  columns,
}: LedgerListPanelProps) {
  const [hi, setHi] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      items.filter(
        (it) =>
          !searchTerm ||
          it.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (it.alias && it.alias.toLowerCase().includes(searchTerm.toLowerCase())),
      ),
    [items, searchTerm],
  );

  // "End of List" is a navigable row at hi === -1 (only when the panel has an
  // End-of-List action). Default highlight: End of List when the search is empty
  // (Tally's ◆ default — a blank Enter finishes); the first match once you type.
  const hasEndOfList = Boolean(onEndOfList);
  useEffect(() => {
    setHi(hasEndOfList && !searchTerm.trim() ? -1 : 0);
  }, [searchTerm, hasEndOfList]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-hi]') as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [hi]);

  useEffect(() => {
    const last = filtered.length - 1;
    const min = hasEndOfList ? -1 : 0; // -1 = the "End of List" row
    const PAGE = 10; // rows per PgUp/PgDn jump (TallyPrime-style)
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHi((p) => Math.min(p + 1, last));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHi((p) => Math.max(p - 1, min));
      }
      if (e.key === 'PageDown') {
        e.preventDefault();
        setHi((p) => Math.min(p + PAGE, last));
      }
      if (e.key === 'PageUp') {
        e.preventDefault();
        setHi((p) => Math.max(p - PAGE, min));
      }
      if (e.key === 'Home') {
        e.preventDefault();
        setHi(min);
      }
      if (e.key === 'End') {
        e.preventDefault();
        setHi(Math.max(min, last));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (hasEndOfList) {
          // Highlight on "End of List" (hi < 0) → finish; on a real row → select
          // it; empty list → finish.
          if (hi < 0) {
            onEndOfList!();
            return;
          }
          if (filtered[hi]) {
            onSelect(filtered[hi]);
            return;
          }
          onEndOfList!();
          return;
        }
        // Panels without an End-of-List row (e.g. payroll): a blank Enter uses
        // onEnterEmpty; otherwise select the highlighted row.
        if (!searchTerm.trim() && onEnterEmpty) {
          onEnterEmpty();
          return;
        }
        if (filtered[hi]) onSelect(filtered[hi]);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, hi, onSelect, onClose, searchTerm, onEnterEmpty, onEndOfList, hasEndOfList]);

  return (
    <div
      data-ledger-panel
      className={`${columns ? 'w-[440px]' : 'w-64'} border-l border-black flex flex-col shrink-0 bg-white ${height}`}
    >
      <div className="bg-black text-white px-2 py-1 text-xs font-semibold select-none flex justify-between items-center">
        <span>{title}</span>
        <button onClick={onClose} className="text-white hover:text-gray-300 font-bold leading-none">
          &times;
        </button>
      </div>

      <div className="border-b border-gray-300">
        <input
          autoFocus
          type="text"
          className="w-full text-xs outline-none px-2 py-1 bg-white"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
        />
      </div>

      <div
        className="px-2 py-1 text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-200 text-black select-none"
        onClick={onCreateNew}
      >
        {createLabel}
      </div>

      {onEndOfList && (
        <div
          data-hi={hi < 0 ? 'true' : undefined}
          className={`px-2 py-1 text-xs cursor-pointer border-b border-gray-200 text-black select-none italic ${
            hi < 0 ? 'bg-[#f0c040] font-semibold' : 'hover:bg-gray-100'
          }`}
          onClick={onEndOfList}
          onMouseEnter={() => setHi(-1)}
        >
          &#9670; End of List
        </div>
      )}

      {columns && (
        <div className="flex gap-2 px-2 py-1 border-b border-gray-300 bg-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-600 select-none">
          {columns.map((col, ci) => (
            <div key={ci} className={col.className ?? 'flex-1 min-w-0'}>
              {col.header}
            </div>
          ))}
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto min-h-0">
        {filtered.map((item, idx) => (
          <div
            key={
              item.ledger_id ??
              item.item_id ??
              item.godown_id ??
              item.employee_id ??
              item.attendance_type_id ??
              item.pay_head_id ??
              idx
            }
            data-hi={idx === hi ? 'true' : undefined}
            className={`px-2 py-0.5 text-xs cursor-pointer select-none flex items-center gap-2 ${
              columns ? '' : 'justify-between'
            } ${
              idx === hi ? 'bg-[#f0c040] text-black font-semibold' : 'text-black hover:bg-gray-50'
            }`}
            onClick={() => onSelect(item)}
            onMouseEnter={() => setHi(idx)}
          >
            {columns ? (
              columns.map((col, ci) => (
                <div key={ci} className={`${col.className ?? 'flex-1 min-w-0'} truncate`}>
                  {col.render(item)}
                </div>
              ))
            ) : (
              <>
                <span>{item.name}</span>
                {stockBalances && item.item_id != null && (
                  <span className="text-[10px] text-gray-500 tabular-nums">
                    {Number(stockBalances[item.item_id] ?? 0).toFixed(2)}{' '}
                    {allUnits?.find((u) => u.unit_id === item.unit_id)?.symbol ?? ''}
                  </span>
                )}
                {godownBalances && item.godown_id != null && (
                  <span className="text-[10px] text-gray-500 tabular-nums">
                    {Number(godownBalances[item.godown_id] ?? 0).toLocaleString('en-IN')}
                    {balanceUnit ? ` ${balanceUnit}` : ''}
                  </span>
                )}
              </>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-2 py-2 text-xs text-gray-400 italic">No results</div>
        )}
      </div>

      <div className="border-t border-gray-200 px-2 py-1 text-[10px] text-gray-500 select-none bg-gray-50">
        ↑↓ / PgUp PgDn Navigate &nbsp;·&nbsp; Enter Select
      </div>
    </div>
  );
}
