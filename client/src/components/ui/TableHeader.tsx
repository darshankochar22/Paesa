import { cn } from "@/lib/utils";
import { TABLE_HEADER } from "./tokens";

// The 12-col grid header strip repeated above every voucher/register table.
// One definition, driven by a column list. Numbers right-aligned by default.

export interface HeaderColumn {
  label: React.ReactNode;
  span: string; // e.g. "col-span-7"
  align?: "left" | "right" | "center";
}

export interface TableHeaderProps {
  columns: HeaderColumn[];
  className?: string;
}

const ALIGN: Record<string, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export default function TableHeader({ columns, className }: TableHeaderProps) {
  return (
    <div className={cn("grid grid-cols-12 px-3 py-2 shrink-0", TABLE_HEADER, className)}>
      {columns.map((c, i) => (
        <div key={i} className={cn(c.span, ALIGN[c.align ?? "left"])}>
          {c.label}
        </div>
      ))}
    </div>
  );
}
