import * as React from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  TABLE_HEADER,
  TABLE_ROW,
  TABLE_ROW_HOVER,
  TABLE_ROW_FOCUSED,
  TOTALS_ROW,
  GROUP_ROW,
  PLACEHOLDER,
  rowStripe,
} from './tokens';

export interface TableColumn {
  key: string;
  label: string;
  /** Tailwind col-span within the 12-col grid, e.g. "col-span-7". */
  span: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: any, idx: number) => ReactNode;
}

type Variant = 'list' | 'report';

interface Props {
  columns: TableColumn[];
  rows: any[];
  onRowClick?: (row: any) => void;
  /** Report-only: Enter / double-click drill-down. */
  onRowActivate?: (row: any) => void;
  loading?: boolean;
  emptyMessage?: string;
  rowKey: (row: any) => string | number;
  rowClassName?: (row: any, idx: number) => string;
  /**
   * "list" (default) = zebra master/list table.
   * "report" = mono register: keyboard nav, focus highlight, totals/group rows,
   * expandable `row.subItems`.
   */
  variant?: Variant;
  dense?: boolean;
  /** Classify a row for styling. Falls back to row.isTotal / row.isHeader. */
  getRowVariant?: (row: any, idx: number) => 'default' | 'total' | 'header';
}

const ALIGN: Record<string, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

const GRID = { gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' } as const;

export default function DataTable({
  columns,
  rows,
  onRowClick,
  onRowActivate,
  loading,
  emptyMessage = 'No records found.',
  rowKey,
  rowClassName,
  variant = 'list',
  dense,
  getRowVariant,
}: Props) {
  const isReport = variant === 'report';
  const [focus, setFocus] = React.useState(0);
  const [expanded, setExpanded] = React.useState<Record<string | number, boolean>>({});
  const containerRef = React.useRef<HTMLDivElement>(null);

  const classify = React.useCallback(
    (row: any, idx: number): 'default' | 'total' | 'header' => {
      if (getRowVariant) return getRowVariant(row, idx);
      if (
        row?.isTotal ||
        String(row?.label ?? '')
          .toLowerCase()
          .includes('total')
      )
        return 'total';
      if (row?.isHeader) return 'header';
      return 'default';
    },
    [getRowVariant],
  );

  // ── Report keyboard navigation ────────────────────────────────────────────
  React.useEffect(() => {
    if (!isReport) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA'))
        return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocus((p) => Math.min(rows.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocus((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        const r = rows[focus];
        if (r) {
          e.preventDefault();
          (onRowActivate ?? onRowClick)?.(r);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isReport, rows, focus, onRowActivate, onRowClick]);

  React.useEffect(() => {
    if (focus >= rows.length) setFocus(Math.max(0, rows.length - 1));
  }, [rows.length, focus]);

  React.useEffect(() => {
    const node = containerRef.current?.querySelector(`[data-row-index="${focus}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [focus]);

  const clickable = !!(onRowClick || onRowActivate);
  const padY = dense ? 'py-1' : 'py-2.5';

  const renderCells = (row: any, idx: number, extraCellClass = '') =>
    columns.map((col) => (
      <div key={col.key} className={cn(col.span, ALIGN[col.align ?? 'left'], extraCellClass)}>
        {col.render ? col.render(row, idx) : (row[col.key] ?? (isReport ? '' : '—'))}
      </div>
    ));

  return (
    <div
      ref={containerRef}
      className={cn('flex-1 overflow-y-auto min-h-0', isReport && 'font-mono text-[11px]')}
    >
      {/* Header */}
      <div className={cn('grid sticky top-0 z-10 px-3 py-2', TABLE_HEADER)} style={GRID}>
        {columns.map((col) => (
          <div key={col.key} className={cn(col.span, ALIGN[col.align ?? 'left'])}>
            {col.label}
          </div>
        ))}
      </div>

      {loading && <div className={PLACEHOLDER}>Loading…</div>}
      {!loading && rows.length === 0 && <div className={PLACEHOLDER}>{emptyMessage}</div>}

      {!loading &&
        rows.map((row, idx) => {
          const kind = classify(row, idx);
          const isTotal = kind === 'total';
          const isHeader = kind === 'header';
          const isFocused = isReport && idx === focus;
          const hasSub = isReport && Array.isArray(row.subItems) && row.subItems.length > 0;
          const open = expanded[rowKey(row)];

          return (
            <React.Fragment key={rowKey(row)}>
              <div
                data-row-index={idx}
                onClick={() => {
                  if (isReport) setFocus(idx);
                  if (hasSub) setExpanded((e) => ({ ...e, [rowKey(row)]: !e[rowKey(row)] }));
                  onRowClick?.(row);
                }}
                onDoubleClick={() => (onRowActivate ?? onRowClick)?.(row)}
                className={cn(
                  'grid px-3 items-center',
                  padY,
                  TABLE_ROW,
                  !isReport && rowStripe(idx),
                  clickable && !isTotal && !isHeader && TABLE_ROW_HOVER,
                  isHeader && GROUP_ROW,
                  isTotal && TOTALS_ROW,
                  isFocused && TABLE_ROW_FOCUSED,
                  rowClassName?.(row, idx),
                )}
                style={GRID}
              >
                {columns.map((col, ci) => (
                  <div
                    key={col.key}
                    className={cn(col.span, ALIGN[col.align ?? 'left'], isTotal && 'font-bold')}
                  >
                    {hasSub && ci === 0 && (
                      <span className="mr-1 font-bold">{open ? '▼' : '▶'}</span>
                    )}
                    {col.render ? col.render(row, idx) : (row[col.key] ?? (isReport ? '' : '—'))}
                  </div>
                ))}
              </div>

              {hasSub &&
                open &&
                row.subItems.map((sub: any, si: number) => (
                  <div
                    key={`${rowKey(row)}-sub-${si}`}
                    className={cn(
                      'grid px-3 py-0.5 text-black font-semibold border-b border-gray-200',
                    )}
                    style={GRID}
                  >
                    {renderCells(sub, si, 'pl-3')}
                  </div>
                ))}
            </React.Fragment>
          );
        })}
    </div>
  );
}
