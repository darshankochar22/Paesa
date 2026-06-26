import * as React from "react";
import { cn } from "@/lib/utils";

// Local input — sharp, zinc. Two visual modes:
//  - "box" (default): bordered field used in forms.
//  - "underline": borderless with a focus underline, used in inline grid/voucher
//    entry rows (matches ParticularsTable's ledger/amount inputs).

type InputVariant = "box" | "underline";

export interface InputProps extends React.ComponentProps<"input"> {
  variant?: InputVariant;
}

const VARIANTS: Record<InputVariant, string> = {
  box: "h-8 px-2 border border-zinc-300 bg-white focus:border-zinc-800 hover:border-zinc-400",
  underline:
    "px-0.5 bg-transparent border-b border-transparent focus:border-zinc-800 hover:border-zinc-200",
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = "box", type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "w-full min-w-0 text-xs text-zinc-900 placeholder-zinc-400 outline-none transition-colors",
        "disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400",
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
export default Input;
