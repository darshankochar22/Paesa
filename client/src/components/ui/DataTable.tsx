import type { ReactNode } from "react";

export interface TableColumn {
  key: string;
  label: string;
  /** Tailwind col-span class e.g. "col-span-3" */
  span: string;
  align?: "left" | "right" | "center";
  render?: (row: any, idx: number) => ReactNode;
}

interface Props {
  columns: TableColumn[];
  rows: any[];
  onRowClick?: (row: any) => void;
  loading?: boolean;
  emptyMessage?: string;
  rowKey: (row: any) => string | number;
  /** Extra className for each data row */
  rowClassName?: (row: any, idx: number) => string;
}

const ALIGN_CLASS = { left: "text-left", right: "text-right", center: "text-center" };

export default function DataTable({
  columns,
  rows,
  onRowClick,
  loading,
  emptyMessage = "No records found.",
  rowKey,
  rowClassName,
}: Props) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      {/* Sticky Header */}
      <div className="grid sticky top-0 z-10 px-3 py-2 bg-zinc-100 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-600 select-none" style={{ gridTemplateColumns: `repeat(12, minmax(0, 1fr))` }}>
        {columns.map(col => (
          <div key={col.key} className={`${col.span} ${ALIGN_CLASS[col.align ?? "left"]}`}>
            {col.label}
          </div>
        ))}
      </div>

      {loading && (
        <div className="px-3 py-8 text-center text-zinc-400 italic text-xs">Loading…</div>
      )}

      {!loading && rows.length === 0 && (
        <div className="px-3 py-8 text-center text-zinc-400 italic text-xs">{emptyMessage}</div>
      )}

      {!loading && rows.map((row, idx) => (
        <div
          key={rowKey(row)}
          onClick={() => onRowClick?.(row)}
          className={`grid px-3 py-2.5 border-b border-zinc-100 items-center transition-colors text-xs ${
            onRowClick ? "cursor-pointer hover:bg-zinc-50/80" : ""
          } ${idx % 2 === 0 ? "bg-white" : "bg-zinc-50/30"} ${rowClassName?.(row, idx) ?? ""}`}
          style={{ gridTemplateColumns: `repeat(12, minmax(0, 1fr))` }}
        >
          {columns.map(col => (
            <div
              key={col.key}
              className={`${col.span} ${ALIGN_CLASS[col.align ?? "left"]}`}
            >
              {col.render ? col.render(row, idx) : (row[col.key] ?? "—")}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
