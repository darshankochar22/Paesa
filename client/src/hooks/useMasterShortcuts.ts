import { PRIORITY, useShortcuts, type ShortcutBinding } from '@/lib/shortcuts';

interface ShortcutConfig {
  onAccept?: () => void;
  onQuit?: () => void;
  onDelete?: () => void;
  onCreate?: () => void;
}

/**
 * Standard TallyPrime master-screen shortcuts, on the central registry:
 * Ctrl+A / Alt+A Accept · Esc Quit · Alt+D Delete · Alt+C Create.
 */
export function useMasterShortcuts({ onAccept, onQuit, onDelete, onCreate }: ShortcutConfig) {
  const bindings: ShortcutBinding[] = [];
  if (onQuit) bindings.push({ keys: 'Escape', handler: onQuit, allowInInputs: true });
  if (onAccept) bindings.push({ keys: ['Ctrl+A', 'Alt+A'], handler: onAccept });
  if (onDelete) bindings.push({ keys: 'Alt+D', handler: onDelete });
  if (onCreate) bindings.push({ keys: 'Alt+C', handler: onCreate });
  useShortcuts(bindings, { priority: PRIORITY.SCREEN });
}
