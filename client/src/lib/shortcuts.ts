import { useEffect, useRef } from 'react';

/**
 * Central TallyPrime-style keyboard-shortcut registry.
 *
 * One window listener (installed at module load, so it always runs before any
 * per-screen `useEffect` listener) dispatches to registered bindings by
 * priority. Exactly one handler acts per keystroke:
 *
 * - Element-level React onKeyDown handlers that call preventDefault() still
 *   win — the registry skips events that arrive already defaultPrevented.
 * - When a registry binding handles a key it calls preventDefault() +
 *   stopImmediatePropagation(), so legacy window keydown listeners never
 *   double-fire for that keystroke.
 * - `defer: true` bindings (global fallbacks like Alt+G) wait until after the
 *   event finishes dispatching and only run if no legacy handler claimed it
 *   via preventDefault() — new global shortcuts can't steal keys from screens
 *   that already use them.
 *
 * Priorities: higher wins; ties go to the most recently mounted registration,
 * so stacked panels resolve Esc to the topmost one.
 *
 * Input safety: while focus is in a text-entry element, bare keys (letters,
 * arrows, Enter, Escape) are suppressed by default; F-keys and Ctrl/Alt
 * combos still work — matching TallyPrime, where F-keys act anywhere but
 * plain letters type. Override per binding with `allowInInputs`.
 */

export const PRIORITY = {
  GLOBAL: 0, // app-wide (top menu, F11/F12, Go To)
  SCREEN: 10, // the current page/screen
  PANEL: 20, // full-screen panels, selection panels
  POPUP: 30, // dropdowns, transient popups
  DIALOG: 40, // modal dialogs
} as const;

/** Return false to decline the key and let lower-priority bindings try. */
export type ShortcutHandler = (e: KeyboardEvent) => boolean | void;

export interface ShortcutBinding {
  /** e.g. "F5", "Alt+F2", "Ctrl+A", "Escape", "ArrowDown", "K" (or several). */
  keys: string | string[];
  handler: ShortcutHandler;
  /** Fire even while typing in an input/textarea/select. Default: true for F-keys and Ctrl/Alt/Meta combos, false for bare keys. */
  allowInInputs?: boolean;
  /** Fire even while focus is inside a [role="dialog"]. Default: only for DIALOG-priority registrations. */
  allowInDialogs?: boolean;
  /** Run only after the event fully dispatches and no other handler claimed it (legacy screens win). GLOBAL bindings only. */
  defer?: boolean;
  /**
   * Handle the key in the CAPTURE phase — before React's root handlers, any
   * focused element's onKeyDown, and every legacy window listener. This makes
   * the shortcut win unconditionally over the current screen/voucher state
   * (TallyPrime's "shortcut always switches" behaviour). Use for truly global
   * keys (voucher openers, F2/F3, Ctrl+A/Ctrl+N) that must never be swallowed
   * by whatever field or popup happens to be focused. Cannot combine with defer.
   */
  capture?: boolean;
}

interface RegistryEntry {
  seq: number;
  priority: number;
  getBindings: () => ShortcutBinding[];
}

const registry: RegistryEntry[] = [];
let seqCounter = 0;

const KEY_ALIASES: Record<string, string> = {
  esc: 'escape',
  return: 'enter',
  spacebar: ' ',
  space: ' ',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  del: 'delete',
};

/** "Alt+F2" / "ctrl + a" → canonical "alt+f2" / "ctrl+a". */
export function normalizeCombo(spec: string): string {
  const parts = spec
    .split('+')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const mods = { ctrl: false, alt: false, shift: false, meta: false };
  let key = '';
  for (const p of parts) {
    if (p === 'ctrl' || p === 'control') mods.ctrl = true;
    else if (p === 'alt') mods.alt = true;
    else if (p === 'shift') mods.shift = true;
    else if (p === 'meta' || p === 'cmd') mods.meta = true;
    else key = KEY_ALIASES[p] ?? p;
  }
  return (
    (mods.ctrl ? 'ctrl+' : '') +
    (mods.alt ? 'alt+' : '') +
    (mods.shift ? 'shift+' : '') +
    (mods.meta ? 'meta+' : '') +
    key
  );
}

function comboFromEvent(e: KeyboardEvent): string | null {
  const k = e.key;
  if (!k || k === 'Control' || k === 'Alt' || k === 'Shift' || k === 'Meta') return null;
  return (
    (e.ctrlKey ? 'ctrl+' : '') +
    (e.altKey ? 'alt+' : '') +
    (e.shiftKey && k.length > 1 ? 'shift+' : '') + // for printable keys, shift is already baked into e.key
    (e.metaKey ? 'meta+' : '') +
    k.toLowerCase()
  );
}

/** Is the element a text-entry target whose typing we must not hijack? */
export function isTypingTarget(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return !['button', 'submit', 'checkbox', 'radio', 'reset', 'file', 'range'].includes(type);
  }
  return false;
}

function defaultAllowInInputs(combo: string): boolean {
  if (/^f\d{1,2}$/.test(combo.replace(/^(ctrl\+|alt\+|shift\+|meta\+)+/, ''))) return true;
  return combo.includes('ctrl+') || combo.includes('alt+') || combo.includes('meta+');
}

function matchesCombo(binding: ShortcutBinding, combo: string): boolean {
  const specs = Array.isArray(binding.keys) ? binding.keys : [binding.keys];
  return specs.some((s) => normalizeCombo(s) === combo);
}

function dispatch(e: KeyboardEvent, phase: 'capture' | 'bubble') {
  if (e.defaultPrevented) return; // an element-level handler already claimed it
  const combo = comboFromEvent(e);
  if (!combo) return;

  const typing = isTypingTarget(document.activeElement);
  const target = e.target instanceof HTMLElement ? e.target : null;
  const inDialog = !!target?.closest('[role="dialog"]');

  const matches: { entry: RegistryEntry; binding: ShortcutBinding }[] = [];
  for (const entry of registry) {
    for (const binding of entry.getBindings()) {
      // Each binding is handled in exactly one phase; the other phase ignores it.
      if (!!binding.capture !== (phase === 'capture')) continue;
      if (matchesCombo(binding, combo)) matches.push({ entry, binding });
    }
  }
  if (matches.length === 0) return;
  matches.sort((a, b) => b.entry.priority - a.entry.priority || b.entry.seq - a.entry.seq);

  const deferred: ShortcutBinding[] = [];
  for (const { entry, binding } of matches) {
    if (typing && !(binding.allowInInputs ?? defaultAllowInInputs(combo))) continue;
    if (inDialog && !(binding.allowInDialogs ?? entry.priority >= PRIORITY.DIALOG)) continue;
    if (binding.defer) {
      deferred.push(binding);
      continue;
    }
    if (binding.handler(e) !== false) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
  }

  if (deferred.length > 0) {
    // Let legacy window listeners see the event first; only act if none claimed it.
    setTimeout(() => {
      if (e.defaultPrevented) return;
      for (const binding of deferred) {
        if (binding.handler(e) !== false) return;
      }
    }, 0);
  }
}

if (typeof window !== 'undefined') {
  // Capture pass runs before React's root handlers / element onKeyDown / legacy
  // window listeners — so `capture: true` bindings win unconditionally. Bubble
  // pass keeps the cooperative behaviour (element preventDefault wins, defer).
  window.addEventListener('keydown', (e) => dispatch(e, 'capture'), true);
  window.addEventListener('keydown', (e) => dispatch(e, 'bubble'), false);
}

/**
 * Register keyboard shortcuts for the lifetime of the component.
 *
 *   useShortcuts([{ keys: 'Escape', handler: close }], { priority: PRIORITY.PANEL });
 *
 * Bindings are read fresh on every keystroke — no need to memoize handlers.
 */
export function useShortcuts(
  bindings: ShortcutBinding[] | null | undefined,
  opts?: { priority?: number; enabled?: boolean },
): void {
  const { priority = PRIORITY.SCREEN, enabled = true } = opts ?? {};
  const ref = useRef(bindings);
  // Keep the latest bindings without re-subscribing. Updated in an effect (not
  // during render); keystrokes are async user events that always fire after
  // effects flush, so the registry never reads a stale set.
  useEffect(() => {
    ref.current = bindings;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const entry: RegistryEntry = {
      seq: ++seqCounter,
      priority,
      getBindings: () => ref.current ?? [],
    };
    registry.push(entry);
    return () => {
      const i = registry.indexOf(entry);
      if (i !== -1) registry.splice(i, 1);
    };
  }, [enabled, priority]);
}
