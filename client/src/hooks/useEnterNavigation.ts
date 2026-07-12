import { useEffect } from 'react';

/**
 * Global Tally-style Enter navigation.
 *
 * Mounted once in Layout. On Enter, focus moves to the next focusable field
 * inside the nearest ancestor marked `data-enter-nav`. Screens opt in by
 * putting that attribute on their form container.
 *
 * Field-level attributes:
 * - data-enter-click     Enter activates the element (click) instead of
 *                        advancing — for span/div "fields" that open side
 *                        panels (Under/Group/Category/Unit). Give these
 *                        tabIndex={0} so the walker can land on them.
 * - data-enter-advance   Pair with data-enter-click on an inline toggle
 *                        (Yes/No span that flips a value in place rather than
 *                        opening a panel): Enter clicks it AND advances to the
 *                        next field, so keyboard flow isn't trapped on it.
 * - data-enter-skip      Excluded from the walk order.
 * - data-enter-newline   On a textarea: Enter inserts a newline as usual.
 * - data-enter-accept    Clicked when Enter is pressed on the last field
 *                        (the form's Accept button).
 * - data-enter-nav-ignore  Zone whose Enter events the walker ignores
 *                        (open side panels / popups with their own keys).
 *
 * Field-specific handlers stay authoritative: any onKeyDown that calls
 * e.preventDefault() suppresses the global walk for that keystroke.
 */

const FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function isNavigable(el: Element): boolean {
  if (el.hasAttribute('data-enter-skip')) return false;
  if ((el as HTMLElement).offsetParent === null) return false; // hidden
  if (
    (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
    el.readOnly &&
    !el.hasAttribute('data-enter-click')
  )
    return false;
  if (el instanceof HTMLButtonElement) return false; // buttons act, they don't chain
  return true;
}

export function focusableFields(container: Element): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    isNavigable,
  );
}

/** Focus the field after `current` inside `container`. Returns false when `current` is the last field. */
export function focusNextField(container: Element, current: HTMLElement): boolean {
  const fields = focusableFields(container);
  const idx = fields.indexOf(current);
  // When `current` is itself navigable, step to the next in walk order. When it
  // isn't (e.g. a <button> panel-opener, which focusableFields excludes), anchor
  // by DOM position instead — otherwise idx is -1 and we'd wrongly jump to the
  // first field.
  const next =
    idx !== -1
      ? fields[idx + 1]
      : fields.find(
          (f) => !!(current.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING),
        );
  if (!next) return false;
  next.focus();
  if (next instanceof HTMLInputElement && (next.type === 'text' || next.type === 'number')) {
    try {
      next.select();
    } catch {
      // number inputs without selection support
    }
  }
  return true;
}

/**
 * Focus the field after `el` once the current render settles — used after a
 * side-panel selection closes the panel, to continue the Enter chain.
 */
export function focusFieldAfter(el: HTMLElement | null) {
  if (!el) return;
  setTimeout(() => {
    const container = el.closest('[data-enter-nav]');
    if (!container) return;
    // When the panel-opener was the last field, land on the Accept button so
    // Enter confirms — matching Tally's "…last field → Accept" flow instead of
    // dropping focus.
    if (!focusNextField(container, el)) {
      container.querySelector<HTMLElement>('[data-enter-accept]')?.focus();
    }
  }, 50);
}

export function useGlobalEnterNavigation() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (!target || !(target instanceof HTMLElement)) return;
      if (target.closest('[data-enter-nav-ignore]')) return;
      const container = target.closest('[data-enter-nav]');
      if (!container) return;

      // Buttons and links keep their native Enter activation.
      if (
        target instanceof HTMLButtonElement ||
        target instanceof HTMLAnchorElement ||
        (target instanceof HTMLInputElement &&
          (target.type === 'button' || target.type === 'submit'))
      )
        return;

      if (target.hasAttribute('data-enter-click')) {
        e.preventDefault();
        target.click();
        // Inline toggles (data-enter-advance) flip a value in place, so continue
        // the Enter chain. Panel-openers omit it: their opened panel advances the
        // chain itself on selection (focusFieldAfter), so we must stay put here.
        if (target.hasAttribute('data-enter-advance')) focusNextField(container, target);
        return;
      }

      if (target instanceof HTMLTextAreaElement && target.hasAttribute('data-enter-newline'))
        return;

      e.preventDefault();
      if (!focusNextField(container, target)) {
        const accept = container.querySelector<HTMLElement>('[data-enter-accept]');
        accept?.click();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
