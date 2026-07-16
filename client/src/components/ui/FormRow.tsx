import React from 'react';

interface FormRowProps {
  label: string;
  required?: boolean;
  labelWidth?: string;
  className?: string;
  children: React.ReactNode;
  /** Small caption rendered under the label (grey, italic) — for hint text. */
  subLabel?: string;
  /** Greys the label to signal the field is inactive/read-only. */
  disabled?: boolean;
  /**
   * Panel-opener row: makes the whole row a Tally-style field that the global
   * Enter walker can land on. Adds tabIndex + data-enter-click + focus styling
   * and fires `onClick` on Enter. Pair with `rowRef` so the caller can call
   * `focusFieldAfter(rowRef.current)` once the opened panel closes, keeping the
   * Enter chain going. Mirrors the Ledger "Under" row implementation.
   */
  enterClick?: boolean;
  onClick?: () => void;
  rowRef?: React.Ref<HTMLDivElement>;
}

export default function FormRow({
  label,
  required = false,
  labelWidth = 'w-56',
  className = 'flex items-center min-h-[32px]',
  children,
  subLabel,
  disabled = false,
  enterClick = false,
  onClick,
  rowRef,
}: FormRowProps) {
  return (
    <div
      ref={rowRef}
      onClick={onClick}
      {...(enterClick ? { tabIndex: 0, 'data-enter-click': true } : {})}
      className={`${className}${onClick ? ' cursor-pointer' : ''}${
        enterClick ? ' focus:bg-zinc-100 outline-none' : ''
      }`}
    >
      <div className={`${labelWidth} shrink-0 py-1`}>
        <span className={`text-sm ${disabled ? 'text-zinc-400' : 'text-black'}`}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {subLabel && (
          <span className="block text-[10px] text-zinc-400 italic leading-tight">{subLabel}</span>
        )}
      </div>
      <span className="text-black mr-2 shrink-0">:</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
