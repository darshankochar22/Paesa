import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PageToolbarProps = {
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** Titled card header/toolbar with optional description + controls row. Local. */
export function PageToolbar({ title, description, children, className }: PageToolbarProps) {
  return (
    <div className={cn('flex flex-col gap-3 p-5 border border-gray-200 bg-white', className)}>
      {title && <h2 className="text-sm font-bold uppercase tracking-wider text-black">{title}</h2>}
      {description && (
        <p className="text-[11px] text-black font-sans leading-relaxed">{description}</p>
      )}
      {children}
    </div>
  );
}

export default PageToolbar;
