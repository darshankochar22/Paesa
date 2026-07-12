import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type DataTableColumn = {
  header: ReactNode;
  className?: string;
};

export type DataTableCardProps = {
  title?: ReactNode;
  headerRight?: ReactNode;
  columns: DataTableColumn[];
  /** Pre-rendered <tr> rows for the table body. */
  children: ReactNode;
  maxHeight?: string;
  className?: string;
};

/** Card-wrapped dense table with sticky header. Local — native <table>, no shadcn. */
export function DataTableCard({
  title,
  headerRight,
  columns,
  children,
  maxHeight = '320px',
  className,
}: DataTableCardProps) {
  return (
    <div className={cn('border border-gray-200 bg-white overflow-hidden', className)}>
      {(title || headerRight) && (
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center">
          <span className="text-[9px] font-bold uppercase tracking-wider text-black">{title}</span>
          {headerRight}
        </div>
      )}
      <div className="overflow-y-auto" style={{ maxHeight }}>
        <table className="w-full text-[11px] border-collapse">
          <thead className="bg-white sticky top-0 z-10">
            <tr className="text-left">
              {columns.map((c, idx) => (
                <th
                  key={idx}
                  className={cn(
                    'px-3 py-1.5 font-bold text-black border-b border-gray-200',
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTableCard;
