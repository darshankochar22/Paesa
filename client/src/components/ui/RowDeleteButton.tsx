import { cn } from '@/lib/utils';

// The hover-reveal "✕ remove row" button repeated across every voucher grid.
// Gray only — appears on row hover (parent needs `group`).

export interface RowDeleteButtonProps {
  onClick: () => void;
  className?: string;
  title?: string;
}

export default function RowDeleteButton({
  onClick,
  className,
  title = 'Remove row',
}: RowDeleteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={-1}
      aria-label={title}
      title={title}
      className={cn(
        'shrink-0 ml-1 font-bold text-[10px] text-black hover:text-black',
        'opacity-0 group-hover:opacity-100 transition-opacity',
        className,
      )}
    >
      &times;
    </button>
  );
}
