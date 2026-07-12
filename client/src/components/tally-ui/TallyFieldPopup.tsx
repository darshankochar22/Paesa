import { useEffect, useRef, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useEscape } from '@/hooks/useEscape';

/**
 * Compact, centred sub-dialog matching TallyPrime's field pop-ups
 * (Dispatch Details, Order Details, Party Details, …).
 *
 * Unlike {@link VoucherPopupShell} (a near-full-page report panel), this is a
 * small box overlaid on the voucher — bold *centred* title, tight rows, and
 * NO Cancel/Accept buttons. It is accepted with Ctrl+A (Tally's accept) and
 * closed with Esc, exactly like the real program; the app's status bar shows
 * the A: Accept / Q: Quit hints, so the box itself stays chrome-free.
 *
 * Colour note: Tally paints the active field yellow. This project's theme is
 * strict black/white/gray (see UI.md), so callers highlight the focused input
 * with a gray fill (`focus:bg-black/[0.06]`) instead — same *behaviour*, no hue.
 *
 * Keyboard (Tally, no mouse needed): Enter advances to the next field in DOM
 * order; Enter on the LAST field accepts the whole form. Fields that need their
 * own Enter behaviour (open a pick-list, add a grid row) just call
 * `e.preventDefault()` in their own handler — this shell skips any Enter that a
 * field already handled (`defaultPrevented`), so the two never fight.
 */

// Focusable form controls inside the box, in DOM (= visual) order. Buttons are
// excluded on purpose — dropdown options are picked with Enter by their own
// handlers, not treated as tab stops.
const FIELD_SELECTOR = 'input, select, textarea';
function isFocusableField(el: HTMLElement): boolean {
  return (
    !(el as HTMLInputElement).disabled &&
    (el as HTMLInputElement).type !== 'hidden' &&
    el.tabIndex !== -1 &&
    // offsetParent is null for display:none / detached nodes (e.g. a field
    // hidden by the current form state) — never focus those.
    el.offsetParent !== null
  );
}
// Text-like inputs get their contents selected on focus, mirroring Tally, so the
// next keystroke overtypes the field.
const SELECTABLE_TYPES = new Set(['text', 'search', 'tel', 'url', 'password', 'number', 'email']);
function focusField(el: HTMLElement) {
  el.focus();
  if (el.tagName === 'INPUT' && SELECTABLE_TYPES.has((el as HTMLInputElement).type)) {
    try {
      (el as HTMLInputElement).select();
    } catch {
      /* some input types disallow select() — ignore */
    }
  }
}
interface TallyFieldPopupProps {
  title: string;
  onClose: () => void;
  onAccept?: () => void;
  /** Box width in px. Tally sizes each pop-up to its fields; default suits the
   *  6-field dispatch/receipt forms. */
  width?: number;
  children: ReactNode;
}

export function TallyFieldPopup({
  title,
  onClose,
  onAccept,
  width = 600,
  children,
}: TallyFieldPopupProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  // Esc pops this layer off the central escape stack.
  useEscape(onClose);

  // Pull focus INTO the popup on open (unless a child already claimed it via
  // autoFocus), so Enter navigates the popup's fields — not the voucher screen
  // behind it (which would walk the stock row qty→rate instead).
  useEffect(() => {
    const box = boxRef.current;
    if (!box || box.contains(document.activeElement)) return;
    const fields = Array.from(box.querySelectorAll<HTMLElement>(FIELD_SELECTOR)).filter(
      isFocusableField,
    );
    if (fields[0]) focusField(fields[0]);
  }, []);

  // Ctrl+A accepts from anywhere (Tally).
  useEffect(() => {
    if (!onAccept) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        onAccept();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onAccept]);

  // Enter → next field; Enter on the last field → accept. Skips any Enter a
  // field already handled itself (defaultPrevented) and any modified Enter
  // (Shift+Enter still inserts a newline in a textarea).
  const handleEnterNav = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.defaultPrevented) return;
    if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    const target = e.target as HTMLElement;
    if (!/^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
    const box = boxRef.current;
    if (!box) return;
    const fields = Array.from(box.querySelectorAll<HTMLElement>(FIELD_SELECTOR)).filter(
      isFocusableField,
    );
    const idx = fields.indexOf(target);
    if (idx === -1) return;
    e.preventDefault();
    if (idx < fields.length - 1) focusField(fields[idx + 1]);
    else onAccept?.();
  };

  return (
    <div
      data-voucher-popup
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 select-none"
    >
      <div
        ref={boxRef}
        onKeyDown={handleEnterNav}
        className="bg-white border border-gray-200 shadow-md flex flex-col"
        style={{ width, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 32px)' }}
      >
        {/* Title — bold, centred, thin divider (Tally sub-form header) */}
        <div className="shrink-0 text-center text-[13px] font-bold text-black py-1 border-b border-gray-200">
          {title}
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 select-text">{children}</div>
      </div>
    </div>
  );
}

export default TallyFieldPopup;
