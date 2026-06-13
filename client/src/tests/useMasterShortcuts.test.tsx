/**
 * Tests for client/src/hooks/useMasterShortcuts.ts
 *
 * The hook registers a keydown listener on `window`.
 * We fire synthetic KeyboardEvents and assert the correct callback fires.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMasterShortcuts } from '../hooks/useMasterShortcuts';

/** Helper: dispatch a KeyboardEvent on the window */
function fireKey(key: string, modifiers: { altKey?: boolean; ctrlKey?: boolean } = {}) {
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers })
  );
}

describe('useMasterShortcuts', () => {
  let onAccept: ReturnType<typeof vi.fn>;
  let onQuit: ReturnType<typeof vi.fn>;
  let onDelete: ReturnType<typeof vi.fn>;
  let onCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onAccept = vi.fn();
    onQuit   = vi.fn();
    onDelete = vi.fn();
    onCreate = vi.fn();
  });

  it('calls onQuit when Escape is pressed', () => {
    renderHook(() => useMasterShortcuts({ onQuit }));
    fireKey('Escape');
    expect(onQuit).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('does NOT call onQuit when Escape is pressed but onQuit is undefined', () => {
    // Should not throw
    renderHook(() => useMasterShortcuts({}));
    expect(() => fireKey('Escape')).not.toThrow();
  });

  it('calls onAccept when Alt+A is pressed', () => {
    renderHook(() => useMasterShortcuts({ onAccept }));
    fireKey('a', { altKey: true });
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('calls onAccept when Ctrl+A is pressed', () => {
    renderHook(() => useMasterShortcuts({ onAccept }));
    fireKey('a', { ctrlKey: true });
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when Alt+D is pressed', () => {
    renderHook(() => useMasterShortcuts({ onDelete }));
    fireKey('d', { altKey: true });
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onCreate when Alt+C is pressed', () => {
    renderHook(() => useMasterShortcuts({ onCreate }));
    fireKey('c', { altKey: true });
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('does not fire when a non-shortcut key is pressed', () => {
    renderHook(() => useMasterShortcuts({ onAccept, onQuit, onDelete, onCreate }));
    fireKey('f');
    fireKey('x', { altKey: true });
    expect(onAccept).not.toHaveBeenCalled();
    expect(onQuit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('removes the keydown listener on unmount so callbacks no longer fire', () => {
    const { unmount } = renderHook(() => useMasterShortcuts({ onQuit }));
    unmount();
    fireKey('Escape');
    expect(onQuit).not.toHaveBeenCalled();
  });

  it('re-registers the listener when a callback reference changes', () => {
    const firstQuit  = vi.fn();
    const secondQuit = vi.fn();

    const { rerender } = renderHook(
      ({ cb }: { cb: () => void }) => useMasterShortcuts({ onQuit: cb }),
      { initialProps: { cb: firstQuit } }
    );

    fireKey('Escape');
    expect(firstQuit).toHaveBeenCalledTimes(1);

    rerender({ cb: secondQuit });

    fireKey('Escape');
    expect(secondQuit).toHaveBeenCalledTimes(1);
    // firstQuit should NOT fire again after the listener was re-registered
    expect(firstQuit).toHaveBeenCalledTimes(1);
  });
});
