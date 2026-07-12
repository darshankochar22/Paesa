import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type EmptyStateProps = {
  message: ReactNode;
  className?: string;
};

/** Tiny centered placeholder for empty / loading list states. */
export function EmptyState({ message, className }: EmptyStateProps) {
  return (
    <div className={cn('px-3 py-6 text-center text-black text-[11px]', className)}>{message}</div>
  );
}

export default EmptyState;
