import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { StatCard, type StatCardProps } from "./StatCard";

export type StatGridProps = {
  stats: StatCardProps[];
  title?: ReactNode;
  headerRight?: ReactNode;
  className?: string;
};

/** Card-wrapped dense list of StatCards. Local — no shadcn. */
export function StatGrid({ stats, title, headerRight, className }: StatGridProps) {
  return (
    <div className={cn("border border-zinc-200 bg-white overflow-hidden", className)}>
      {(title || headerRight) && (
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 flex justify-between items-center">
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">{title}</span>
          {headerRight}
        </div>
      )}
      <div className="divide-y divide-zinc-100">
        {stats.map((s, idx) => (
          <StatCard key={idx} {...s} />
        ))}
      </div>
    </div>
  );
}

export default StatGrid;
