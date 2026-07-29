import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRIORITY, useShortcuts } from '@/lib/shortcuts';

// TallyPrime-style menu keyboard navigation, shared by every report/menu list.
//
// Tally marks one letter of each menu item as its hotkey — a capital placed
// mid-word ("Cash/Bank BooK(s)" → K, "Group VoucHers" → H), else the first
// letter ("Ledger" → L). Pressing that letter opens the item directly; arrow
// keys walk the list and Enter opens the highlighted one. Every report menu was
// a plain link list with none of this, so a Tally user pressing "L" for Ledger
// got nothing.
//
// One hook so a new menu inherits the whole behaviour by passing its items.

export interface MenuHotkeyItem {
  label: string;
  route?: string;
  onClick?: () => void;
  disabled?: boolean;
}

// The hotkey letter for a label + where it sits, so the UI can highlight it.
export function menuHotkey(label: string): { char: string; index: number } {
  const mid = label.match(/\B[A-Z]/); // a capital that isn't the first letter
  if (mid && mid.index !== undefined) return { char: mid[0], index: mid.index };
  const first = label.match(/[A-Za-z]/);
  return first && first.index !== undefined
    ? { char: first[0], index: first.index }
    : { char: '', index: -1 };
}

/**
 * Wire arrow/Enter/Escape + per-item letter hotkeys for a menu list.
 * `items` must be in the same visual order they are rendered.
 * Returns the selected index and a helper to resolve an item's hotkey letter.
 */
export function useMenuHotkeys(
  items: MenuHotkeyItem[],
  opts?: { onBack?: () => void; enabled?: boolean },
) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(0);
  const enabled = opts?.enabled ?? true;

  // Keep the cursor valid as the list changes (feature-gated items appear/vanish).
  useEffect(() => {
    setSelected((p) => (p >= items.length ? 0 : p));
  }, [items.length]);

  const activate = (item: MenuHotkeyItem | undefined) => {
    if (!item || item.disabled) return;
    if (item.route) navigate(item.route);
    else item.onClick?.();
  };

  // One binding per distinct hotkey letter; a letter shared by two enabled items
  // opens the first (matching Tally, which never assigns a letter twice per menu).
  const letters = Array.from(
    new Set(
      items
        .filter((it) => !it.disabled)
        .map((it) => menuHotkey(it.label).char.toLowerCase())
        .filter(Boolean),
    ),
  );

  useShortcuts(
    [
      { keys: 'ArrowDown', handler: () => setSelected((p) => (p + 1) % items.length) },
      { keys: 'ArrowUp', handler: () => setSelected((p) => (p - 1 + items.length) % items.length) },
      {
        keys: 'Enter',
        handler: () => {
          // Let a focused link/button keep its native Enter.
          const el = document.activeElement;
          if (el instanceof HTMLAnchorElement || el instanceof HTMLButtonElement) return false;
          activate(items[selected]);
        },
      },
      {
        keys: 'Escape',
        handler: () => {
          if (!opts?.onBack) return false; // let the global Escape-back take over
          opts.onBack();
        },
      },
      ...letters.map((char) => ({
        keys: char,
        handler: () => {
          const item = items.find(
            (it) => !it.disabled && menuHotkey(it.label).char.toLowerCase() === char,
          );
          if (!item) return;
          setSelected(items.indexOf(item));
          activate(item);
        },
      })),
    ],
    { priority: PRIORITY.SCREEN, enabled },
  );

  return { selected, setSelected, activate, menuHotkey };
}
