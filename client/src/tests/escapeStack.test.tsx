import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { registerEscape, popEscape, escapeStackDepth } from '@/lib/escapeStack';
import { useEscape } from '@/hooks/useEscape';

const fireEscape = () =>
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
  );

describe('escapeStack', () => {
  beforeEach(() => {
    // drain anything a previous test left behind
    while (escapeStackDepth() > 0) popEscape();
  });

  it('pops layers one at a time, last-registered first', () => {
    const screen = vi.fn();
    const popup = vi.fn();
    const offScreen = registerEscape(screen);
    const offPopup = registerEscape(popup);

    fireEscape();
    expect(popup).toHaveBeenCalledTimes(1);
    expect(screen).not.toHaveBeenCalled();

    offPopup(); // popup closed → unregistered
    fireEscape();
    expect(screen).toHaveBeenCalledTimes(1);
    expect(popup).toHaveBeenCalledTimes(1);

    offScreen();
  });

  it('does nothing (and attaches no listener behavior) when the stack is empty', () => {
    expect(escapeStackDepth()).toBe(0);
    expect(() => fireEscape()).not.toThrow();
    expect(popEscape()).toBe(false);
  });

  it('a handler returning false declines without consuming the event', () => {
    const declined = vi.fn(() => false as const);
    const off = registerEscape(declined);

    const legacy = vi.fn();
    window.addEventListener('keydown', legacy);

    fireEscape();
    expect(declined).toHaveBeenCalledTimes(1);
    // event not swallowed — legacy listeners still see it
    expect(legacy).toHaveBeenCalledTimes(1);
    // the declining layer stays registered
    expect(escapeStackDepth()).toBe(1);

    window.removeEventListener('keydown', legacy);
    off();
  });

  it('a consuming handler swallows the event so legacy listeners never fire', () => {
    const consumer = vi.fn();
    const off = registerEscape(consumer);

    const legacy = vi.fn();
    window.addEventListener('keydown', legacy);

    fireEscape();
    expect(consumer).toHaveBeenCalledTimes(1);
    expect(legacy).not.toHaveBeenCalled();

    window.removeEventListener('keydown', legacy);
    off();
  });

  it('useEscape registers while enabled and unregisters on unmount', () => {
    const onEscape = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ enabled }: { enabled: boolean }) => useEscape(onEscape, enabled),
      { initialProps: { enabled: false } },
    );

    fireEscape();
    expect(onEscape).not.toHaveBeenCalled();

    rerender({ enabled: true });
    fireEscape();
    expect(onEscape).toHaveBeenCalledTimes(1);

    unmount();
    fireEscape();
    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(escapeStackDepth()).toBe(0);
  });
});
