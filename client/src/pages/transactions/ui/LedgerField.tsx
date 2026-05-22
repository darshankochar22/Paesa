/**
 * LedgerField — the label:value input row used to pick a ledger.
 * Combines the text input, balance display, and field-focus wiring.
 * Reused in the Account row, Party A/c, and Sales/Purchase Ledger rows.
 */

interface Props {
  /** Current display value (ledger name or search term) */
  value: string;
  /** Optional balance string shown in muted text next to the input */
  balance?: string;
  placeholder?: string;
  onFocus: () => void;
  onChange: (value: string) => void;
  /** Tailwind class applied to the wrapping div */
  className?: string;
}

export default function LedgerField({
  value,
  balance,
  placeholder,
  onFocus,
  onChange,
  className = "",
}: Props) {
  return (
    <div className={`flex-1 flex items-center gap-2 ${className}`}>
      <input
        type="text"
        className="flex-1 bg-transparent text-xs outline-none px-2 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded font-semibold text-zinc-800"
        value={value}
        placeholder={placeholder}
        onFocus={onFocus}
        onChange={e => onChange(e.target.value)}
      />
      {balance && (
        <span className="text-[10px] text-zinc-400 font-sans italic shrink-0 select-none">
          (Bal: {balance})
        </span>
      )}
    </div>
  );
}
