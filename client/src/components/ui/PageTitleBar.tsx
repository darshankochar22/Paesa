import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/**
 * Dark zinc-900 top bar used on every master/transaction page.
 * Contains a title, an optional right-aligned subtitle, and optional action buttons.
 */
export default function PageTitleBar({ title, subtitle, actions }: Props) {
  return (
    <div className="px-3 py-1.5 text-xs font-semibold bg-zinc-900 text-white flex justify-between items-center select-none shadow-sm animate-fade-in">
      <span className="uppercase tracking-wider">{title}</span>
      <div className="flex items-center gap-3">
        {subtitle && (
          <span className="text-zinc-400 text-[10px]">{subtitle}</span>
        )}
        {actions}
      </div>
    </div>
  );
}
