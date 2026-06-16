import type { ReactNode } from "react";
import { Card } from "@/components/shadcn/card";
import { Table, TableHeader, TableBody, TableRow, TableHead } from "@/components/shadcn/table";
import { cn } from "@/lib/utils";

export type DataTableColumn = {
  /** Header text for the column. */
  header: ReactNode;
  /** Optional className applied to the <th> (e.g. text-right / text-center). */
  className?: string;
};

export type DataTableCardProps = {
  /** Small uppercase title shown in the card header bar. */
  title?: ReactNode;
  /** Optional node rendered at the right of the header bar. */
  headerRight?: ReactNode;
  /** Column header definitions. */
  columns: DataTableColumn[];
  /** Pre-rendered <TableRow> rows for the table body. */
  children: ReactNode;
  /** Max height of the scrollable body region. */
  maxHeight?: string;
  className?: string;
};

/**
 * Card-wrapped, dense shadcn Table with a header title bar and a scrollable
 * body. Header row is sticky. Sizing overridden to keep the compact Tally feel.
 */
export function DataTableCard({
  title,
  headerRight,
  columns,
  children,
  maxHeight = "320px",
  className,
}: DataTableCardProps) {
  return (
    <Card
      className={cn(
        "gap-0 py-0 rounded-lg ring-0 border border-zinc-200 bg-white shadow-sm overflow-hidden",
        className
      )}
    >
      {(title || headerRight) && (
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 flex justify-between items-center">
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
            {title}
          </span>
          {headerRight}
        </div>
      )}
      <div className="overflow-y-auto" style={{ maxHeight }}>
        <Table className="text-[11px]">
          <TableHeader className="bg-zinc-50/80 sticky top-0 z-10">
            <TableRow className="text-left hover:bg-transparent">
              {columns.map((c, idx) => (
                <TableHead
                  key={idx}
                  className={cn(
                    "h-auto px-3 py-1.5 font-bold text-zinc-400",
                    c.className
                  )}
                >
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-100">{children}</TableBody>
        </Table>
      </div>
    </Card>
  );
}

export default DataTableCard;
