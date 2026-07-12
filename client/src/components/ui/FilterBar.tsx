import * as React from 'react';
import { cn } from '@/lib/utils';

// Horizontal control strip above a table/register: filters/selects on the left,
// action buttons on the right. Absorbs the old blocks/PageToolbar role.

export interface FilterBarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export default function FilterBar({ left, right, children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 bg-white select-none',
        className,
      )}
    >
      {left && <div className="flex items-center gap-2 flex-wrap">{left}</div>}
      {children}
      {right && <div className="flex items-center gap-2 ml-auto">{right}</div>}
    </div>
  );
}
