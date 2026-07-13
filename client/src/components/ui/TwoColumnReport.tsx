import * as React from 'react';
import { cn } from '@/lib/utils';
import { fmt } from '@/lib/format';

// The side-by-side report body used by Balance Sheet (Liabilities | Assets) and
// Profit & Loss (Expenses | Income). Each side is a titled panel with a scrolling
// body and a bold totals strip. Generic over the row type via `renderRow`.

export interface ReportSide<T> {
  title: string;
  rows: T[];
  total: number;
  totalLabel?: string;
  emptyMessage?: string;
}

export interface TwoColumnReportProps<T> {
  left: ReportSide<T>;
  right: ReportSide<T>;
  periodLabel?: string;
  /** Company name shown centered in each column header (Tally-style). */
  centerLabel?: string;
  /** Render one row's inner content (the panel supplies the <div> wrapper). */
  renderRow: (row: T, side: 'left' | 'right', idx: number) => React.ReactNode;
  rowKey: (row: T, idx: number) => string | number;
  className?: string;
}

function Panel<T>({
  side,
  which,
  periodLabel,
  centerLabel,
  renderRow,
  rowKey,
}: {
  side: ReportSide<T>;
  which: 'left' | 'right';
  periodLabel?: string;
  centerLabel?: string;
  renderRow: TwoColumnReportProps<T>['renderRow'];
  rowKey: TwoColumnReportProps<T>['rowKey'];
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200 last:border-r-0">
      <div className="relative border-b border-gray-200 px-3 py-1.5 flex justify-between items-center select-none">
        <span className="font-mono text-[11px] font-bold text-black tracking-wide uppercase">
          {side.title}
        </span>
        {centerLabel ? (
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center leading-tight pointer-events-none">
            <span className="font-mono text-[11px] font-bold text-black">{centerLabel}</span>
            {periodLabel && <span className="font-mono text-[10px] text-black">{periodLabel}</span>}
          </div>
        ) : (
          periodLabel && <span className="font-mono text-[10px] text-black">{periodLabel}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {side.rows.length === 0 ? (
          <div className="px-3 py-8 text-center text-black italic text-[11px]">
            {side.emptyMessage ?? 'No entries for this period.'}
          </div>
        ) : (
          side.rows.map((row, idx) => (
            <React.Fragment key={rowKey(row, idx)}>{renderRow(row, which, idx)}</React.Fragment>
          ))
        )}
      </div>

      <div className="border-t-2 border-black px-3 py-1.5 flex justify-between font-mono text-[11px] font-bold text-black select-none">
        <span>{side.totalLabel ?? 'Total'}</span>
        <span>₹{fmt(side.total)}</span>
      </div>
    </div>
  );
}

export default function TwoColumnReport<T>({
  left,
  right,
  periodLabel,
  centerLabel,
  renderRow,
  rowKey,
  className,
}: TwoColumnReportProps<T>) {
  return (
    <div className={cn('flex flex-1 overflow-hidden font-mono', className)}>
      <Panel
        side={left}
        which="left"
        periodLabel={periodLabel}
        centerLabel={centerLabel}
        renderRow={renderRow}
        rowKey={rowKey}
      />
      <Panel
        side={right}
        which="right"
        periodLabel={periodLabel}
        centerLabel={centerLabel}
        renderRow={renderRow}
        rowKey={rowKey}
      />
    </div>
  );
}
