import { useEffect, type RefObject } from 'react';
import {
  focusNextField,
  moveFocus,
  registerNavContainer,
  rememberFocusedField,
} from '../lib/voucherNav';

/**
 * Generic Enter-to-advance navigation for ANY container of form fields — the
 * voucher body OR a popup (allocation, bill-wise, cost-centre, bank, …). Attach
 * once, passing a ref to the element that wraps the fields.
 *
 * Design — additive and non-breaking:
 * - The listener sits on `document`, so it runs AFTER React's delegated
 *   per-field `onKeyDown` handlers (React 17+ dispatch at the app root, which is
 *   between the field and `document`). Any field that already handles Enter —
 *   opening a list, confirming an amount, adding a row, running validation —
 *   calls `preventDefault()`, and we then do nothing. Only "plain" fields with
 *   no Enter logic of their own get generic navigation.
 * - It only acts on events originating inside `containerRef`, so sibling
 *   surfaces (other popups, the body behind a popup) are untouched.
 * - While a selection panel (`[data-ledger-panel]`) is open it owns Enter
 *   (selects the highlighted row), so we bail. `guardDialogOverlay` additionally
 *   bails whenever any `[role="dialog"]` exists — used by the body so it stays
 *   quiet while a popup is open; popups leave it off so Enter works inside them.
 *
 * The result: one engine drives field-to-field motion everywhere, with DOM
 * order as the single source of truth for "the next logical field".
 */
export function useEnterFieldNav(
  containerRef: RefObject<HTMLElement | null>,
  opts?: {
    enabled?: boolean;
    guardDialogOverlay?: boolean;
    /**
     * Called when Enter is pressed on the LAST navigable field (focus can't
     * advance). Popups pass their Accept handler here so Enter walks the fields
     * and then accepts the form (Tally behaviour). Omitted by the body variant.
     */
    onExhausted?: () => void;
  },
): void {
  const enabled = opts?.enabled ?? true;
  const guardDialogOverlay = opts?.guardDialogOverlay ?? false;
  const onExhausted = opts?.onExhausted;

  useEffect(() => {
    if (!enabled) return undefined;

    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      // Enter advances (Shift+Enter keeps newline); Tab advances, Shift+Tab
      // retreats — Tab follows the SAME DOM field order as Enter, so both keys
      // walk the intended voucher field sequence, not the native focus order.
      const isEnter = e.key === 'Enter' && !e.shiftKey;
      const isTab = e.key === 'Tab';
      if (!isEnter && !isTab) return;
      // Let real shortcuts (Ctrl/Alt/Cmd + Enter or Tab) pass through.
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const container = containerRef.current;
      if (!container) return;

      const target = e.target as HTMLElement | null;
      if (!target || !container.contains(target)) return;

      // Nested nav containers (e.g. an allocation popup opened over another):
      // the INNERMOST one owns the key, so an outer container ignores a target
      // that sits inside a closer `[data-enter-nav]`.
      const nearest = target.closest('[data-enter-nav]');
      if (nearest && nearest !== container) return;

      // A selection list owns Enter/Tab (it selects/pages the highlighted row).
      if (document.querySelector('[data-ledger-panel]')) return;
      // Body variant: stay quiet while any voucher popup is open, so the key
      // can't leak through to the main screen behind an allocation/detail popup.
      if (guardDialogOverlay && document.querySelector('[data-voucher-popup]')) return;

      const tag = target.tagName;
      if (target.closest('[data-nav-ignore]')) return;

      if (isTab) {
        // Only reorder Tab when it starts from an actual navigable field (so its
        // index is known); elsewhere leave native Tab alone. Directional motion
        // in the voucher's own field order; at a boundary fall through to the
        // native Tab (out to the button bar).
        if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') return;
        if (moveFocus(container, e.shiftKey ? -1 : 1, target)) e.preventDefault();
        return;
      }

      // Enter: TEXTAREA keeps newlines; buttons keep activation.
      if (tag !== 'INPUT' && tag !== 'SELECT') return;
      // Claim the key if focus advanced; on the last field, accept the form when
      // an onExhausted handler is supplied (popup Accept), else leave the key so
      // a field-level "Enter = Accept" handler can still fire.
      if (focusNextField(container, target)) {
        e.preventDefault();
      } else if (onExhausted) {
        e.preventDefault();
        onExhausted();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [containerRef, enabled, guardDialogOverlay, onExhausted]);
}

/**
 * Voucher-body variant of {@link useEnterFieldNav}. Adds two things the body
 * needs and popups don't: it registers the body as the nav container and tracks
 * the last field focused inside it (so popup-selection handlers can call
 * `advanceFromLastField`), and it guards against firing while a popup is open.
 */
export function useVoucherEnterNav(
  containerRef: RefObject<HTMLElement | null>,
  opts?: { enabled?: boolean },
): void {
  // Register the body container + track the last field focused inside it.
  useEffect(() => {
    const container = containerRef.current;
    registerNavContainer(container);
    if (!container) return undefined;
    const onFocusIn = (e: FocusEvent) => rememberFocusedField(e.target);
    container.addEventListener('focusin', onFocusIn);
    return () => {
      container.removeEventListener('focusin', onFocusIn);
      registerNavContainer(null);
    };
  }, [containerRef]);

  useEnterFieldNav(containerRef, { enabled: opts?.enabled ?? true, guardDialogOverlay: true });
}
