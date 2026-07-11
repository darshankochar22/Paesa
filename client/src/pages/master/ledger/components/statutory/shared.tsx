import { useEffect, useRef } from 'react';
import { useEscape } from '@/hooks/useEscape';

/**
 * Tally-style centered modal chrome (white card, hard border, shadow-2xl, black overlay)
 * with a centred title bar. Used by the Tier-1 / Tier-2 modals.
 */
export function useEscapeClose(isOpen: boolean, onClose: () => void) {
  // Registers on the central escape stack while open, so Escape / footer
  // Quit pops this modal before the screen underneath it.
  useEscape(onClose, isOpen);
}

export function ModalChrome({
  children,
  width = 560,
}: {
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <div data-enter-nav-ignore className="fixed inset-0 z-[60] bg-black/30">
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width }}
      >
        <div className="bg-white border border-zinc-300 shadow-2xl flex flex-col">{children}</div>
      </div>
    </div>
  );
}

export function ModalTitleBar({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="px-4 py-2 border-b border-zinc-300 bg-zinc-50 flex items-center justify-between select-none">
      <span className="text-[13px] font-semibold text-zinc-900">{title}</span>
      <button
        onClick={onClose}
        aria-label="Close"
        className="text-zinc-400 hover:text-zinc-700 text-lg font-bold leading-none"
      >
        &times;
      </button>
    </div>
  );
}

export function ModalFooter({
  onClose,
  onAccept,
  acceptLabel = 'Ok',
}: {
  onClose: () => void;
  onAccept: () => void;
  acceptLabel?: string;
}) {
  return (
    <div className="px-4 py-3 border-t border-zinc-300 flex justify-end gap-2 bg-zinc-50">
      <button
        onClick={onClose}
        className="text-xs px-4 py-1.5 border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-medium"
      >
        Cancel
      </button>
      <button
        onClick={onAccept}
        className="text-xs px-6 py-1.5 border border-zinc-300 bg-black text-white hover:bg-zinc-800 font-medium"
      >
        {acceptLabel}
      </button>
    </div>
  );
}

/**
 * Click-anywhere-outside-to-close hook.
 */
export function useOutsideClick<T extends HTMLElement>(
  enabled: boolean,
  onOutsideClick: () => void,
) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutsideClick();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [enabled, onOutsideClick]);
}

/**
 * Tally-style modal form row (label grey, colon, input right-aligned).
 * Mirrors the layout used by `StatutorySection.tsx` Row component.
 */
export function ModalFormRow({
  label,
  children,
  labelWidth = 'w-60',
  className = '',
  helper,
}: {
  label: string;
  children: React.ReactNode;
  labelWidth?: string;
  className?: string;
  helper?: string;
}) {
  return (
    <div className={`flex items-start min-h-[26px] ${className}`}>
      <span className={`${labelWidth} text-[12px] text-zinc-700 shrink-0 pt-0.5 leading-tight`}>
        {label}
        {helper && <span className="block text-[11px] text-zinc-500 italic mt-0.5">{helper}</span>}
      </span>
      <span className="text-zinc-400 mr-2 shrink-0 pt-0.5">:</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

/**
 * Section heading used inside a Tier-2 detail modal (e.g. "TDS", "TCS").
 */
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] font-bold text-zinc-900 underline underline-offset-2 mb-3">
      {children}
    </div>
  );
}

const inputCls =
  'w-full bg-transparent text-[12px] outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-300 focus:border-zinc-800 transition-colors rounded-sm';
const selectCls =
  'w-full bg-transparent text-[12px] outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-300 focus:border-zinc-800 transition-colors rounded-sm cursor-pointer';

export { inputCls, selectCls };
