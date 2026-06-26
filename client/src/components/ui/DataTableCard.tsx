import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
  maxHeight = "320px",
  className,
}: DataTableCardProps) {
  return (
    <div className={cn("border border-zinc-200 bg-white overflow-hidden", className)}>
      {(title || headerRight) && (
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 flex justify-between items-center">
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">{title}</span>
          {headerRight}
        </div>
      )}
      <div className="overflow-y-auto" style={{ maxHeight }}>
        <table className="w-full text-[11px] border-collapse">
          <thead className="bg-zinc-50 sticky top-0 z-10">
            <tr className="text-left">
              {columns.map((c, idx) => (
                <th
                  key={idx}
                  className={cn(
                    "px-3 py-1.5 font-bold text-zinc-400 border-b border-zinc-200",
                    c.className
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTableCard;
