import type { ReactNode } from "react";
import { Card } from "@/components/shadcn/card";
import { cn } from "@/lib/utils";

export type PageToolbarProps = {
  /** Card heading (uppercase tracked title). */
  title?: ReactNode;
  /** Optional description paragraph under the title. */
  description?: ReactNode;
  /** Controls row (selects, buttons) rendered below the heading. */
  children?: ReactNode;
  className?: string;
};

/**
 * Compact card header/toolbar with a title, optional description and a row of
 * controls. Used at the top of utility panels in the dense Tally style.
 */
export function PageToolbar({ title, description, children, className }: PageToolbarProps) {
  return (
    <Card
      className={cn(
        "gap-3 py-0 p-5 rounded-lg ring-0 border border-zinc-200 bg-white shadow-sm",
        className
      )}
    >
      {title && (
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
          {title}
        </h2>
      )}
      {description && (
        <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </Card>
  );
}

export default PageToolbar;
