import * as React from 'react';
import { cn } from '@/lib/utils';

// Local native-select wrapper — sharp, zinc. Accepts either children <option>s
// or an `options` array of {value,label}. Keeps the native dropdown (fast,
// keyboard-friendly, no portal) but styled to match the app.

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.ComponentProps<'select'> {
  options?: SelectOption[];
  placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-8 w-full min-w-0 px-2 pr-7 text-xs text-black bg-white border border-gray-200',
        'outline-none transition-colors hover:border-gray-200 focus:border-gray-200 cursor-pointer',
        'disabled:cursor-not-allowed disabled:bg-white disabled:text-black',
        'appearance-none bg-[length:14px] bg-no-repeat bg-[right_0.5rem_center]',
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2371717a%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')]",
        className,
      )}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options
        ? options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))
        : children}
    </select>
  ),
);
Select.displayName = 'Select';
export default Select;
