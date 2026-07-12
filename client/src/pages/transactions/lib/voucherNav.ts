// Generic keyboard focus-order navigation engine for voucher entry screens.
//
// The engine is deliberately voucher-agnostic: given a container element it
// discovers the *live* set of enabled form controls in DOM order and moves
// focus to the next / previous one. Because it reads the real DOM every time,
// it adapts to every voucher automatically — a field that is conditionally
// rendered (`{cond && <input/>}`), hidden, or disabled simply isn't in the
// list, so it's skipped without a single line of per-voucher logic.
//
// It does NOT know about business rules (opening a ledger list, an allocation
// popup, validation). Those live in the field/popup handlers, which run first
// and call `preventDefault()`; the Enter-nav hook only advances focus when no
// handler claimed the key. See `useVoucherEnterNav`.

const FOCUSABLE_SELECTOR = 'input, select, textarea';

const NON_TEXT_INPUT_TYPES = new Set([
  'hidden',
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'file',
  'range',
]);

/**
 * Is this element a field the keyboard flow should land on? Excludes disabled,
 * read-only, hidden (attribute / inline style / `type=hidden`), explicitly
 * un-tabbable (`tabindex=-1`), and anything inside a `[data-nav-ignore]` island
 * (e.g. a picker embedded in the body that owns its own key handling).
 *
 * Note: conditionally-rendered fields are absent from the DOM entirely, so they
 * never reach this check — that's why "handle conditional fields" needs no code.
 */
export function isNavigable(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  const ctrl = el as HTMLInputElement & { readOnly?: boolean };
  if (ctrl.disabled || ctrl.readOnly) return false;
  if (el.hidden) return false;
  if (el.tabIndex === -1) return false;
  if ((ctrl.type || '').toLowerCase() === 'hidden') return false;
  if (el.style.display === 'none' || el.style.visibility === 'hidden') return false;
  if (el.closest('[data-nav-ignore], [hidden]')) return false;
  return true;
}

/** Live, DOM-ordered list of the container's navigable fields. */
export function navigableFields(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    isNavigable,
  );
}

/**
 * Index of the field to move to, clamped at both ends. Returns the SAME index
 * when already at the boundary (so the caller can tell "no move happened" and
 * leave the key alone — e.g. Enter on the last field falls through to Accept).
 * A negative `current` (focus not in the list) enters at the near end.
 */
export function nextIndex(current: number, len: number, dir: 1 | -1): number {
  if (len === 0) return -1;
  if (current < 0) return dir === 1 ? 0 : len - 1;
  return Math.min(len - 1, Math.max(0, current + dir));
}

/** Focus a field and, for text inputs, select its contents (Tally-style overwrite). */
export function focusField(el: HTMLElement | null | undefined): void {
  if (!el) return;
  el.focus();
  if (el.tagName === 'INPUT') {
    const input = el as HTMLInputElement;
    const type = (input.type || 'text').toLowerCase();
    if (!NON_TEXT_INPUT_TYPES.has(type) && typeof input.select === 'function') input.select();
  }
}

/**
 * Move focus by one field in `dir` (1 = next, -1 = previous) relative to `from`
 * (defaults to the document's active element). Returns true only if focus
 * actually moved — false at the list boundary or when there are no fields.
 */
export function moveFocus(
  container: HTMLElement,
  dir: 1 | -1,
  from: Element | null = (container.getRootNode() as Document).activeElement,
): boolean {
  const fields = navigableFields(container);
  if (fields.length === 0) return false;
  const idx = from ? fields.indexOf(from as HTMLElement) : -1;
  const target = nextIndex(idx, fields.length, dir);
  if (target < 0 || fields[target] === from) return false;
  focusField(fields[target]);
  return true;
}

/** Advance focus to the next field after `from`. */
export function focusNextField(container: HTMLElement, from?: Element | null): boolean {
  return moveFocus(container, 1, from ?? undefined);
}

/** Retreat focus to the previous field before `from`. */
export function focusPrevField(container: HTMLElement, from?: Element | null): boolean {
  return moveFocus(container, -1, from ?? undefined);
}

/** Focus the first navigable field in the container (e.g. on voucher load). */
export function focusFirstField(container: HTMLElement): boolean {
  const fields = navigableFields(container);
  if (fields.length === 0) return false;
  focusField(fields[0]);
  return true;
}

/**
 * Focus a specific field by selector, then continue from it — used by popup
 * "return focus" hand-offs where the anchor is known (e.g. jump to the sales
 * ledger field after Party Details closes). Falls back gracefully if absent.
 */
export function focusBySelector(container: ParentNode, selector: string): boolean {
  const el = container.querySelector<HTMLElement>(selector);
  if (!el || !isNavigable(el)) return false;
  focusField(el);
  return true;
}

// ── Runtime focus tracker ──────────────────────────────────────────────────
// Popup-selection handlers (in the flow hooks) need to advance focus to the
// field AFTER the one that opened the list — but they don't know which field
// that was, and by the time a selection is made the list's own search input
// holds focus. So the engine remembers the last navigable field focused inside
// the registered voucher body (the list search lives outside it, so it never
// overwrites the memory). Any handler can then call `advanceFromLastField()`
// to continue the flow generically, for every voucher and every field type.

let navContainer: HTMLElement | null = null;
let lastFocusedField: HTMLElement | null = null;

/** Called by the nav hook on mount/unmount to scope the tracker to the body. */
export function registerNavContainer(el: HTMLElement | null): void {
  navContainer = el;
  if (!el) lastFocusedField = null;
}

/** Record a field as the "current" one if it's a navigable field in the body. */
export function rememberFocusedField(el: EventTarget | null): void {
  if (el instanceof HTMLElement && navContainer?.contains(el) && isNavigable(el)) {
    lastFocusedField = el;
  }
}

/**
 * Advance focus to the field after the last one the user was on — the generic
 * "return to the voucher and move on" used after a list/popup selection. No-op
 * if the anchor is gone (returns false), so callers can fall back if needed.
 */
export function advanceFromLastField(): boolean {
  if (!navContainer) return false;
  return focusNextField(navContainer, lastFocusedField);
}
