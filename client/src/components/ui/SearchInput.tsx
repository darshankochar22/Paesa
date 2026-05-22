import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Styled search input reused in LedgerPanel, VoucherList, COA pages, etc.
 */
export default function SearchInput({ value, onChange, placeholder = "Search…", autoFocus, className }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus]);

  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 transition-all bg-white w-full ${className ?? ""}`}
    />
  );
}
