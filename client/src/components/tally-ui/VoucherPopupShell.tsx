import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useEscape } from '@/hooks/useEscape';
import { useEnterFieldNav } from '@/pages/transactions/hooks/useVoucherEnterNav';
import { openFirstField } from '@/pages/transactions/lib/voucherNav';
import { focusFirstField } from '@/pages/transactions/lib/voucherNav';

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
  size?: 'max' | 'compact' | 'tally';
  /**
   * Header layout. 'between' (default) = title left, headerRight right.
   * 'stacked' = title over headerRight, both centered (TallyPrime column popups
   * like Bill-wise Details), with the close button pinned to the top-right.
   */
  headerVariant?: 'between' | 'stacked';
  /** Overrides the panel size classes entirely when provided. */
  panelClassName?: string;
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
  headerVariant = 'between',
  panelClassName,
  bodyClassName,
  children,
}: VoucherPopupShellProps) {
  // Esc closes via the central escape stack; Alt+A accepts when a handler exists.
  useEscape(onClose);

  // Enter advances field-to-field inside the popup body (Tally keyboard flow),
  // so every popup built on this shell is keyboard-operable with no per-popup
  // wiring. Additive: fields with their own Enter handler (amount confirm, add
  // row, open a sub-picker) call preventDefault and keep their behaviour.
  // Enter walks the popup's fields; Enter on the LAST field accepts the form
  // (Tally behaviour) when an Accept handler exists.
  const bodyRef = useRef<HTMLDivElement>(null);
  useEnterFieldNav(bodyRef, { onExhausted: onAccept });

  // Pull keyboard focus INTO the popup on open (unless a child already claimed
  // it via autoFocus), so Enter navigates the popup — not the voucher screen
  // behind it. Without this, focus stays on the main grid and Enter walks the
  // stock row (qty→rate) instead of the allocation fields.
  useEffect(() => {
    const body = bodyRef.current;
    if (body && !body.contains(document.activeElement)) openFirstField(body);
    if (body && !body.contains(document.activeElement)) focusFirstField(body);
  }, []);

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
    <div
      data-voucher-popup
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 select-none"
    >
      <div
        className={cn(
          'bg-white border border-gray-300 shadow-2xl flex flex-col overflow-hidden',
          panelClassName ??
            (size === 'max'
              ? 'w-[calc(100vw-64px)] h-[calc(100vh-64px)] max-w-[1500px]'
              : size === 'tally'
                ? // TallyPrime's narrow, tall column popup (Bill-wise Details etc.)
                  'w-[460px] max-w-[94vw] h-[calc(100vh-72px)] max-h-[960px]'
                : 'min-w-[420px] max-w-[92vw] max-h-[90vh]'),
        )}
      >
        {/* Header — long, clean, white */}
        {headerVariant === 'stacked' ? (
          <div className="relative shrink-0 flex flex-col items-center px-6 py-3 border-b border-gray-300 bg-white">
            <span className="text-sm font-semibold text-black tracking-wide text-center">
              {title}
            </span>
            {headerRight && (
              <div className="mt-0.5 text-xs text-gray-700 text-center">{headerRight}</div>
            )}
            <span className="text-sm font-semibold text-black tracking-wide text-center">
              {title}
            </span>
            {headerRight && (
              <div className="mt-0.5 text-xs text-gray-700 text-center">{headerRight}</div>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-2.5 text-gray-500 hover:text-black text-lg leading-none px-1"
            >
              ×
            </button>
          </div>
        ) : (
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
        )}

        {/* Body */}
        <div
          ref={bodyRef}
          data-enter-nav
          className={cn('flex-1 overflow-y-auto px-6 py-4 select-text', bodyClassName)}
        >
          {children}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white">
          <span className="text-xs text-black">
            {hint ?? (onAccept ? 'Alt+A: Accept  ·  Esc: Close' : 'Esc: Close')}
          </span>
          <div className="flex items-center gap-2">
            {footerExtra}
            <button
              onClick={onClose}
              className="text-sm px-4 py-1.5 border border-gray-200 text-black bg-white hover:bg-black/[0.03]"
            >
              Cancel
            </button>
            {onAccept && (
              <button
                onClick={onAccept}
                className="text-sm px-5 py-1.5 bg-black text-white hover:bg-black/80"
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
