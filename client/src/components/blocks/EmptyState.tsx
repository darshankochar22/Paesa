import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  /** Message to display (e.g. "No entries for this ledger."). */
  message: ReactNode;
  className?: string;
};

/**
 * Tiny centered placeholder for empty / loading table or list states,
 * styled to the dense Tally muted look.
 */
export function EmptyState({ message, className }: EmptyStateProps) {
  return (
    <div className={cn("px-3 py-6 text-center text-zinc-400 text-[11px]", className)}>
      {message}
    </div>
  );
}

export default EmptyState;
