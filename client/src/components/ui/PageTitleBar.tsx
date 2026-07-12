import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Center the subtitle in the bar (TallyPrime company-name style) instead of
   *  the default right-aligned small caption. */
  subtitleCenter?: boolean;
}

/**
 * Dark black top bar used on every master/transaction page.
 * Contains a title, an optional subtitle (right-aligned by default, or centered
 * via `subtitleCenter`), and optional action buttons.
 */
export default function PageTitleBar({ title, subtitle, actions, subtitleCenter }: Props) {
  return (
    <div className="relative px-3 py-1.5 text-xs font-semibold bg-black text-white flex justify-between items-center select-none shadow-sm animate-fade-in">
      <span className="uppercase tracking-wider">{title}</span>
      {subtitle && subtitleCenter && (
        <span className="absolute left-1/2 -translate-x-1/2 text-black text-sm font-semibold tracking-wide">
          {subtitle}
        </span>
      )}
      <div className="flex items-center gap-3">
        {subtitle && !subtitleCenter && <span className="text-black text-[10px]">{subtitle}</span>}
        {actions}
      </div>
    </div>
  );
}
