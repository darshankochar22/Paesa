import { useEffect } from 'react';
import { useEscape } from './useEscape';

interface ShortcutConfig {
  onAccept?: () => void;
  onQuit?: () => void;
  onDelete?: () => void;
  onCreate?: () => void;
}

export function useMasterShortcuts({ onAccept, onQuit, onDelete, onCreate }: ShortcutConfig) {
  // Escape goes through the central escape stack so popups above this
  // screen pop first; only register when the screen provides a quit action.
  useEscape(() => onQuit?.(), Boolean(onQuit));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'a') {
        if (onAccept) {
          e.preventDefault();
          onAccept();
        }
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        if (onAccept) {
          e.preventDefault();
          onAccept();
        }
      }
      if (e.altKey && e.key.toLowerCase() === 'd') {
        if (onDelete) {
          e.preventDefault();
          onDelete();
        }
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        if (onCreate) {
          e.preventDefault();
          onCreate();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onAccept, onDelete, onCreate]);
}
