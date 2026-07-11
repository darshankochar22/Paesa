import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useEscape } from '@/hooks/useEscape';

/**
 * Shared shell for every popup opened from a voucher entry screen
 * (allocations, details, pickers). One consistent look:
 *
 *  - near-full-page white panel (not edge-to-edge) on a dimmed overlay
 *  - long, clean, WHITE header — title left, hint/extra right, thin divider
 *  - scrollable body
 *  - white footer: hint text left, Cancel / Accept right
 *
 * `size="compact"` is for small utility pickers (date picker, number picker)
 * where a near-full-page panel would be absurd — same chrome, natural size.
 */
interface VoucherPopupShellProps {
  title: string;
  /** Optional right side of the header (e.g. item name, party name). */
  headerRight?: ReactNode;
  onClose: () => void;
  /** Omit to hide the Accept button (read-only popups). */
  onAccept?: () => void;
  acceptLabel?: string;
  /** Footer hint; defaults to the standard key help. */
  hint?: ReactNode;
  /** Extra footer actions rendered left of Cancel. */
  footerExtra?: ReactNode;
  size?: 'max' | 'compact';
  /** Extra classes for the body wrapper (e.g. p-0 for edge-to-edge tables). */
  bodyClassName?: string;
  children: ReactNode;
}

export function VoucherPopupShell({
  title,
  headerRight,
  onClose,
  onAccept,
  acceptLabel = 'Accept',
  hint,
  footerExtra,
  size = 'max',
  bodyClassName,
  children,
}: VoucherPopupShellProps) {
  // Esc closes via the central escape stack; Alt+A accepts when a handler exists.
  useEscape(onClose);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (onAccept && e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        onAccept();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onAccept]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 select-none">
      <div
        className={cn(
          'bg-white border border-gray-300 shadow-2xl flex flex-col overflow-hidden',
          size === 'max'
            ? 'w-[calc(100vw-64px)] h-[calc(100vh-64px)] max-w-[1500px]'
            : 'min-w-[420px] max-w-[92vw] max-h-[90vh]',
        )}
      >
        {/* Header — long, clean, white */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-gray-300 bg-white">
          <span className="text-base font-semibold text-black tracking-wide">{title}</span>
          <div className="flex items-center gap-4">
            {headerRight && <div className="text-sm text-gray-700">{headerRight}</div>}
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-gray-500 hover:text-black text-lg leading-none px-1"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={cn('flex-1 overflow-y-auto px-6 py-4 select-text', bodyClassName)}>
          {children}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t border-gray-300 bg-white">
          <span className="text-xs text-gray-600">
            {hint ?? (onAccept ? 'Alt+A: Accept  ·  Esc: Close' : 'Esc: Close')}
          </span>
          <div className="flex items-center gap-2">
            {footerExtra}
            <button
              onClick={onClose}
              className="text-sm px-4 py-1.5 border border-black text-black bg-white hover:bg-gray-100"
            >
              Cancel
            </button>
            {onAccept && (
              <button
                onClick={onAccept}
                className="text-sm px-5 py-1.5 bg-black text-white hover:bg-gray-800"
              >
                {acceptLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoucherPopupShell;
