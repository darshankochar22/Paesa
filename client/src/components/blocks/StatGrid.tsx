import type { ReactNode } from "react";
import { Card } from "@/components/shadcn/card";
import { cn } from "@/lib/utils";
import { StatCard, type StatCardProps } from "./StatCard";

export type StatGridProps = {
  /** Stat items rendered as a vertical divide-y list inside a card. */
  stats: StatCardProps[];
  /** Optional small uppercase header label. */
  title?: ReactNode;
  /** Optional element rendered at the right of the header (e.g. status dot). */
  headerRight?: ReactNode;
  className?: string;
};

/**
 * Card-wrapped, dense list of StatCards with an optional header bar.
 * Keeps the compact Tally summary look used across utility pages.
 */
export function StatGrid({ stats, title, headerRight, className }: StatGridProps) {
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
      <div className="divide-y divide-zinc-100">
        {stats.map((s, idx) => (
          <StatCard key={idx} {...s} />
        ))}
      </div>
    </Card>
  );
}

export default StatGrid;
