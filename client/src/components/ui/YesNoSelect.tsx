/**
 * Canonical Yes/No control for master forms.
 *
 * Renders a real <select> (like the Ledger screens) rather than a
 * `data-enter-click` toggle span, so the global Enter navigation advances to
 * the next field instead of getting trapped flipping the value in place.
 *
 * `value` accepts the DB-style 0/1 (or boolean/undefined); `onChange` fires
 * only when the selection actually changes, so passing a plain toggle handler
 * is fine.
 */
const defaultSelectCls =
  'bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';

export default function YesNoSelect({
  value,
  onChange,
  className = defaultSelectCls,
  disabled = false,
}: {
  value: number | boolean | undefined;
  /** Called with the new boolean state when the selection changes. */
  onChange: (yes: boolean) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <select
      className={className}
      value={value ? 'Yes' : 'No'}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === 'Yes')}
    >
      <option value="No">No</option>
      <option value="Yes">Yes</option>
    </select>
  );
}
