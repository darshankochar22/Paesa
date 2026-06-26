import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
};

/** Compact label : value (detail) stat row in the dense Tally style. */
export function StatCard({ label, value, detail, className }: StatCardProps) {
  return (
    <div className={cn("grid grid-cols-12 items-center px-4 py-3 hover:bg-zinc-50/40", className)}>
      <span className="col-span-5 font-semibold text-zinc-400">{label}</span>
      <span className="col-span-1 text-zinc-300">:</span>
      <div className="col-span-6 flex flex-col">
        <span className="font-bold text-zinc-900 text-xs">{value}</span>
        {detail && <span className="text-[10px] text-zinc-500 font-sans mt-0.5">{detail}</span>}
      </div>
    </div>
  );
}

export default StatCard;
