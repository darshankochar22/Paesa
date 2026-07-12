import * as React from 'react';
import { cn } from '@/lib/utils';

// Local checkbox — sharp, zinc. Checked = solid black box with white tick.

export interface CheckboxProps extends Omit<React.ComponentProps<'input'>, 'type'> {
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id ?? React.useId();
    return (
      <label
        htmlFor={inputId}
        className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-black"
      >
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className={cn(
            'h-3.5 w-3.5 appearance-none border border-gray-200 bg-white cursor-pointer',
            'checked:bg-black checked:border-gray-200 transition-colors',
            "checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%223%22><path d=%22M5 13l4 4L19 7%22/></svg>')] bg-center bg-no-repeat bg-[length:12px]",
            'focus-visible:ring-2 focus-visible:ring-black outline-none',
            className,
          )}
          {...props}
        />
        {label && <span>{label}</span>}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';
export default Checkbox;
