interface DetailCellProps {
  label: string;
  value: string;
}

export function DetailCell({ label, value }: DetailCellProps) {
  return (
    <div className="px-3 py-2.5">
      <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider mb-0.5">
        {label}
      </div>
      <div className="text-zinc-800 font-semibold truncate" title={value}>
        {value}
      </div>
    </div>
  );
}


interface DrCrBadgeProps {
  type: "Dr" | "Cr";
}

export function DrCrBadge({ type }: DrCrBadgeProps) {
  return (
    <span
      className={`text-[9px] font-bold px-1 py-0.5 rounded ${
        type === "Dr" ? "bg-black text-white" : "bg-zinc-600 text-white"
      }`}
    >
      {type}
    </span>
  );
}

interface TableHeaderCol {
  label: string;
  span: string;
  align?: string;
}

interface TableHeaderProps {
  cols: TableHeaderCol[];
}

export function TableHeader({ cols }: TableHeaderProps) {
  return (
    <div className="grid grid-cols-12 px-3 py-1.5 bg-zinc-50 border-b border-zinc-100 text-[9px] font-bold uppercase tracking-wider text-zinc-500 select-none">
      {cols.map((c) => (
        <div key={c.label} className={`${c.span} ${c.align ?? ""}`}>
          {c.label}
        </div>
      ))}
    </div>
  );
}
