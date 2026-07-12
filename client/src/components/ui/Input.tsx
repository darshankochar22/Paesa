import * as React from 'react';
import { cn } from '@/lib/utils';

// Local input — sharp, zinc. Two visual modes:
//  - "box" (default): bordered field used in forms.
//  - "underline": borderless with a focus underline, used in inline grid/voucher
//    entry rows (matches ParticularsTable's ledger/amount inputs).

type InputVariant = 'box' | 'underline';

export interface InputProps extends React.ComponentProps<'input'> {
  variant?: InputVariant;
}

const VARIANTS: Record<InputVariant, string> = {
  box: 'h-8 px-2 border border-gray-200 bg-white focus:border-gray-200 hover:border-gray-200',
  underline:
    'px-0.5 bg-transparent border-b border-transparent focus:border-gray-200 hover:border-gray-200',
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = 'box', type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full min-w-0 text-xs text-black placeholder-black/40 outline-none transition-colors',
        'disabled:cursor-not-allowed disabled:bg-white disabled:text-black',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
export default Input;
