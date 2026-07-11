// Central escape/back stack — the single authority for "quit one level".
//
// Every open UI layer (popup, dialog, drill level, full-screen panel/screen)
// registers a handler on mount and unregisters on unmount. Registration order
// mirrors visual stacking order (a screen mounts before the popup it opens),
// so each Escape press — or the footer Quit/Cancel button — pops exactly the
// topmost layer, like releasing a stack one frame at a time.
//
// A handler may return `false` to mean "not handled here" (e.g. the layer
// wants to ignore Escape while the user is typing in a field); the event then
// falls through untouched to any legacy per-screen listeners.

export type EscapeHandler = () => boolean | void;

interface EscapeEntry {
  id: number;
  handler: EscapeHandler;
}

let nextId = 1;
const stack: EscapeEntry[] = [];

// A single capture-phase listener, attached only while the stack is
// non-empty. Capture means it runs before every legacy per-screen bubble
// listener, and stopImmediatePropagation keeps them from double-firing.
// When the stack is empty there is no listener at all, so unmigrated
// screens keep their existing Escape behavior untouched.
function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  if (popEscape()) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}

let listening = false;

function syncListener() {
  if (typeof window === 'undefined') return;
  if (stack.length > 0 && !listening) {
    window.addEventListener('keydown', onKeyDown, true);
    listening = true;
  } else if (stack.length === 0 && listening) {
    window.removeEventListener('keydown', onKeyDown, true);
    listening = false;
  }
}

/** Push a layer onto the stack. Returns its unregister function. */
export function registerEscape(handler: EscapeHandler): () => void {
  const entry: EscapeEntry = { id: nextId++, handler };
  stack.push(entry);
  syncListener();
  return () => {
    const i = stack.findIndex((e) => e.id === entry.id);
    if (i !== -1) stack.splice(i, 1);
    syncListener();
  };
}

export function escapeStackDepth(): number {
  return stack.length;
}

/**
 * Pop the topmost layer. Returns true if a handler consumed the escape;
 * false if the stack is empty or the top layer declined (returned false).
 * The entry unregisters itself when its layer unmounts — popping only
 * invokes the handler, it never removes the entry directly.
 */
export function popEscape(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  return top.handler() !== false;
}
