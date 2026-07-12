import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** Optional content to render on the right side of the header */
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Bordered card with a dark-label header.
 * Used in VoucherView for Accounting Entries, Stock Particulars, etc.
 */
export default function SectionCard({ title, headerRight, children, className }: Props) {
  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className ?? ''}`}>
      <div className="bg-white px-3 py-2 border-b border-gray-200 flex justify-between items-center shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-black">{title}</span>
        {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
      </div>
      {children}
    </div>
  );
}
