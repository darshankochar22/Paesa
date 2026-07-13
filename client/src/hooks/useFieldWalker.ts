import { useEffect, type RefObject } from 'react';

/**
 * TallyPrime-style vertical field walker for master forms that drive focus via an
 * `activeField` id + an ordered `fields` list (as opposed to the global
 * `data-enter-nav` DOM walker). Replaces the copy-pasted
 * "FIELDS array + refMap focus effect + window keydown Enter/Arrow/Tab" block
 * found in ~23 screens.
 *
 * Responsibilities (only field traversal + focus):
 *  - focuses `refs[active]` whenever `active` changes
 *  - Enter / ArrowDown / Tab            → next field (or `onLast()` on the last)
 *  - ArrowUp / Shift+Tab                → previous field
 *
 * Screen-specific keys (Y/N quick-select, Alt+A accept, Esc quit, opening side
 * panels) stay in the screen — combine with `useMasterShortcuts`. Pass
 * `enabled: false` to pause the walk (e.g. while a prompt/side-panel is open).
 *
 *   useFieldWalker({
 *     fields, active, setActive, refs,
 *     onLast: () => setShowAccept(true),
 *     enabled: !showAccept,
 *   });
 */
type FieldRef = RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>;

interface FieldWalkerOptions {
  /** Ordered focusable field ids (may be recomputed each render for conditional fields). */
  fields: string[];
  active: string;
  setActive: (id: string) => void;
  /** Map of field id → element ref, used to move DOM focus. */
  refs: Record<string, FieldRef>;
  /** Called when the user advances past the last field (e.g. show Accept prompt / submit). */
  onLast?: () => void;
  /** When false, focus sync and key handling are paused. Default true. */
  enabled?: boolean;
}

export function useFieldWalker({
  fields,
  active,
  setActive,
  refs,
  onLast,
  enabled = true,
}: FieldWalkerOptions) {
  // Keep DOM focus on the active field.
  useEffect(() => {
    if (!enabled) return;
    refs[active]?.current?.focus();
    // refs is a stable-enough lookup; we intentionally key on `active`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const idx = fields.indexOf(active);
      if (idx === -1) return;

      if (e.key === 'Enter' || e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        if (idx === fields.length - 1) onLast?.();
        else setActive(fields[idx + 1]);
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        if (idx > 0) setActive(fields[idx - 1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fields, active, setActive, onLast, enabled]);
}
