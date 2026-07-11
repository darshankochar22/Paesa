import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { PRIORITY, useShortcuts, normalizeCombo, isTypingTarget } from '@/lib/shortcuts';

function press(
  key: string,
  opts: { ctrl?: boolean; alt?: boolean; target?: HTMLElement } = {},
): KeyboardEvent {
  const e = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ctrlKey: opts.ctrl ?? false,
    altKey: opts.alt ?? false,
  });
  (opts.target ?? document.body).dispatchEvent(e);
  return e;
}

afterEach(() => {
  document.body.innerHTML = '';
  (document.activeElement as HTMLElement | null)?.blur?.();
});

describe('normalizeCombo', () => {
  it('canonicalizes order, case and aliases', () => {
    expect(normalizeCombo('ALT + f2')).toBe('alt+f2');
    expect(normalizeCombo('Ctrl+A')).toBe('ctrl+a');
    expect(normalizeCombo('Esc')).toBe('escape');
    expect(normalizeCombo('Alt+Ctrl+X')).toBe('ctrl+alt+x');
  });
});

describe('isTypingTarget', () => {
  it('flags text entry but not buttons/checkboxes', () => {
    const text = document.createElement('input');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const button = document.createElement('button');
    expect(isTypingTarget(text)).toBe(true);
    expect(isTypingTarget(checkbox)).toBe(false);
    expect(isTypingTarget(button)).toBe(false);
  });
});

describe('useShortcuts registry', () => {
  it('dispatches to a registered binding and prevents default', () => {
    const fn = vi.fn();
    const { unmount } = renderHook(() => useShortcuts([{ keys: 'F5', handler: fn }]));
    const e = press('F5');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
    unmount();
    press('F5');
    expect(fn).toHaveBeenCalledTimes(1); // unregistered after unmount
  });

  it('higher priority wins; only one handler runs', () => {
    const screen = vi.fn();
    const dialog = vi.fn();
    const h1 = renderHook(() =>
      useShortcuts([{ keys: 'Escape', handler: screen }], { priority: PRIORITY.SCREEN }),
    );
    const h2 = renderHook(() =>
      useShortcuts([{ keys: 'Escape', handler: dialog }], { priority: PRIORITY.DIALOG }),
    );
    press('Escape');
    expect(dialog).toHaveBeenCalledTimes(1);
    expect(screen).not.toHaveBeenCalled();
    h1.unmount();
    h2.unmount();
  });

  it('on equal priority the most recent registration wins (stacked panels)', () => {
    const lower = vi.fn();
    const upper = vi.fn();
    const h1 = renderHook(() =>
      useShortcuts([{ keys: 'Escape', handler: lower }], { priority: PRIORITY.PANEL }),
    );
    const h2 = renderHook(() =>
      useShortcuts([{ keys: 'Escape', handler: upper }], { priority: PRIORITY.PANEL }),
    );
    press('Escape');
    expect(upper).toHaveBeenCalledTimes(1);
    expect(lower).not.toHaveBeenCalled();
    h1.unmount();
    h2.unmount();
  });

  it('a handler returning false falls through to the next binding', () => {
    const declined = vi.fn(() => false as const);
    const fallback = vi.fn();
    const h1 = renderHook(() =>
      useShortcuts([{ keys: 'Escape', handler: fallback }], { priority: PRIORITY.SCREEN }),
    );
    const h2 = renderHook(() =>
      useShortcuts([{ keys: 'Escape', handler: declined }], { priority: PRIORITY.PANEL }),
    );
    press('Escape');
    expect(declined).toHaveBeenCalledTimes(1);
    expect(fallback).toHaveBeenCalledTimes(1);
    h1.unmount();
    h2.unmount();
  });

  it('suppresses bare keys while typing, but allows F-keys and modifier combos', () => {
    const letter = vi.fn();
    const fkey = vi.fn();
    const combo = vi.fn();
    const h = renderHook(() =>
      useShortcuts([
        { keys: 'V', handler: letter },
        { keys: 'F2', handler: fkey },
        { keys: 'Ctrl+A', handler: combo },
      ]),
    );
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    press('v', { target: input });
    press('F2', { target: input });
    press('a', { ctrl: true, target: input });
    expect(letter).not.toHaveBeenCalled();
    expect(fkey).toHaveBeenCalledTimes(1);
    expect(combo).toHaveBeenCalledTimes(1);
    h.unmount();
  });

  it('skips events already claimed by an element-level handler', () => {
    const fn = vi.fn();
    const h = renderHook(() => useShortcuts([{ keys: 'Escape', handler: fn }]));
    const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    e.preventDefault();
    document.body.dispatchEvent(e);
    expect(fn).not.toHaveBeenCalled();
    h.unmount();
  });

  it('skips non-DIALOG bindings when the event comes from inside a dialog', () => {
    const panel = vi.fn();
    const h = renderHook(() =>
      useShortcuts([{ keys: 'Escape', handler: panel }], { priority: PRIORITY.PANEL }),
    );
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const btn = document.createElement('button');
    dialog.appendChild(btn);
    document.body.appendChild(dialog);
    press('Escape', { target: btn });
    expect(panel).not.toHaveBeenCalled();
    h.unmount();
  });

  it('blocks legacy window listeners once a binding handles the key', () => {
    const legacy = vi.fn();
    const fn = vi.fn();
    const h = renderHook(() => useShortcuts([{ keys: 'F4', handler: fn }]));
    window.addEventListener('keydown', legacy);
    press('F4');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(legacy).not.toHaveBeenCalled();
    window.removeEventListener('keydown', legacy);
    h.unmount();
  });

  it('defer: lets a legacy handler win, fires only when unclaimed', async () => {
    const deferred = vi.fn();
    const h = renderHook(() =>
      useShortcuts([{ keys: 'Alt+G', handler: deferred, defer: true }], {
        priority: PRIORITY.GLOBAL,
      }),
    );
    // legacy screen claims Alt+G
    const legacy = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'g') e.preventDefault();
    };
    window.addEventListener('keydown', legacy);
    press('g', { alt: true });
    await new Promise((r) => setTimeout(r, 5));
    expect(deferred).not.toHaveBeenCalled();

    // no legacy claim → deferred handler runs
    window.removeEventListener('keydown', legacy);
    press('g', { alt: true });
    await new Promise((r) => setTimeout(r, 5));
    expect(deferred).toHaveBeenCalledTimes(1);
    h.unmount();
  });

  it('does not register when disabled', () => {
    const fn = vi.fn();
    const h = renderHook(() => useShortcuts([{ keys: 'F6', handler: fn }], { enabled: false }));
    press('F6');
    expect(fn).not.toHaveBeenCalled();
    h.unmount();
  });
});
