import * as React from 'react';
import { cn } from '@/lib/utils';
import { useEscape } from '@/hooks/useEscape';

// Local modal — sharp, zinc, no radix/portal lib. A centered dialog over a
// dimmed backdrop. For full-screen report/voucher views use FullScreenPanel
// instead; Modal is for small confirmations / sub-forms (bill-wise, cost-centre).

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  footer?: React.ReactNode;
  width?: string; // tailwind width class, e.g. "w-[480px]"
  children: React.ReactNode;
}

export default function Modal({
  open,
  onClose,
  title,
  footer,
  width = 'w-[480px]',
  children,
}: ModalProps) {
  useEscape(onClose, open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40"
      onMouseDown={onClose}
    >
      <div
        className={cn(
          'bg-white border border-zinc-300 shadow-lg flex flex-col max-h-[85vh]',
          width,
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-semibold uppercase tracking-wider flex justify-between items-center select-none">
            <span>{title}</span>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white text-base leading-none px-1"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-3 text-xs text-zinc-900">{children}</div>
        {footer && (
          <div className="px-3 py-2 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
