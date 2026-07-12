import * as React from 'react';
import { cn } from '@/lib/utils';
import { useEscape } from '@/hooks/useEscape';
import { PRIORITY, useShortcuts } from '@/lib/shortcuts';

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
  // DIALOG priority: while a modal is open, Esc closes it — never the
  // panel/screen underneath.
  useShortcuts([{ keys: 'Escape', handler: onClose, allowInInputs: true }], {
    priority: PRIORITY.DIALOG,
    enabled: open,
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={onClose}
      role="dialog"
    >
      <div
        className={cn(
          'bg-white border border-gray-200 shadow-lg flex flex-col max-h-[85vh]',
          width,
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-3 py-1.5 bg-black text-white text-xs font-semibold uppercase tracking-wider flex justify-between items-center select-none">
            <span>{title}</span>
            <button
              onClick={onClose}
              className="text-black hover:text-white text-base leading-none px-1"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-3 text-xs text-black">{children}</div>
        {footer && (
          <div className="px-3 py-2 border-t border-gray-200 bg-white flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
