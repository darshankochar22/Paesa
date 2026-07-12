const VARIANT_CLASSES: Record<string, string> = {
  success: 'bg-black text-white',
  danger: 'bg-black text-white',
  warning: 'bg-white text-black',
  info: 'bg-black text-white',
  neutral: 'bg-white text-black',
  violet: 'bg-white text-black',
  orange: 'bg-white text-black',
};

// Map common voucher types and status labels to variant names
const TYPE_VARIANT: Record<string, string> = {
  Receipt: 'neutral',
  Payment: 'neutral',
  Contra: 'neutral',
  Journal: 'neutral',
  Sales: 'neutral',
  Purchase: 'neutral',
  Active: 'success',
  Cancelled: 'danger',
};

interface Props {
  label: string;
  /** Pass a variant key or a voucher type string — auto-maps known types */
  variant?: string;
  size?: 'xs' | 'sm';
}

export default function StatusBadge({ label, variant, size = 'xs' }: Props) {
  const resolvedVariant = variant ?? TYPE_VARIANT[label] ?? 'neutral';
  const cls = VARIANT_CLASSES[resolvedVariant] ?? VARIANT_CLASSES.neutral;
  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[9px] px-1.5 py-0.5';
  return (
    <span
      className={`font-bold rounded-full uppercase tracking-wider select-none ${sizeClass} ${cls}`}
    >
      {label}
    </span>
  );
}
