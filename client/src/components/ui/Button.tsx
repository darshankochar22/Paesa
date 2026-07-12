import * as React from 'react';
import { cn } from '@/lib/utils';

// Local, self-contained button — sharp corners, zinc grayscale, no shadcn/radix.
// Emphasis hierarchy (UI guide): primary = solid black; secondary = bordered;
// ghost = borderless; danger = bordered (no red — destructive shown by context).

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-black text-white border border-gray-200 hover:bg-black/[0.03] active:bg-black/[0.06]',
  secondary:
    'bg-white text-black border border-gray-200 hover:bg-black/[0.03] active:bg-black/[0.06]',
  ghost:
    'bg-transparent text-black border border-transparent hover:bg-black/[0.03] active:bg-black/[0.06]',
  danger:
    'bg-white text-black border border-gray-200 font-bold hover:bg-black/[0.03] active:bg-black/[0.06]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[11px] gap-1',
  md: 'h-8 px-3 text-xs gap-1.5',
  lg: 'h-9 px-4 text-sm gap-1.5',
  icon: 'h-8 w-8 p-0 justify-center',
};

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: Variant;
  size?: Size;
}

export default function Button({
  className,
  variant = 'secondary',
  size = 'md',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap select-none outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-black disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
