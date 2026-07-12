import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEnterFieldNav } from '@/pages/transactions/hooks/useVoucherEnterNav';

function mountContainer(html: string): HTMLDivElement {
  const c = document.createElement('div');
  c.setAttribute('data-enter-nav', '');
  c.innerHTML = html;
  document.body.appendChild(c);
  return c;
}

function pressEnter(target: HTMLElement): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  target.dispatchEvent(e);
  return e;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useEnterFieldNav (popup/body Enter-to-advance)', () => {
  it('advances focus to the next field and claims the key', () => {
    const c = mountContainer('<input id="a" /><input id="b" />');
    const ref = { current: c };
    renderHook(() => useEnterFieldNav(ref));
    const a = c.querySelector<HTMLInputElement>('#a')!;
    a.focus();
    const e = pressEnter(a);
    expect(document.activeElement?.id).toBe('b');
    expect(e.defaultPrevented).toBe(true);
  });

  it('does nothing when a field already handled Enter (defaultPrevented)', () => {
    const c = mountContainer('<input id="a" /><input id="b" />');
    const a = c.querySelector<HTMLInputElement>('#a')!;
    a.addEventListener('keydown', (ev) => ev.preventDefault()); // field owns Enter
    const ref = { current: c };
    renderHook(() => useEnterFieldNav(ref));
    a.focus();
    pressEnter(a);
    expect(document.activeElement?.id).toBe('a'); // stayed put
  });

  it('leaves the key alone on the last field (so Accept can fire)', () => {
    const c = mountContainer('<input id="a" /><input id="b" />');
    const ref = { current: c };
    renderHook(() => useEnterFieldNav(ref));
    const b = c.querySelector<HTMLInputElement>('#b')!;
    b.focus();
    const e = pressEnter(b);
    expect(e.defaultPrevented).toBe(false);
  });

  it('ignores TEXTAREA (Enter = newline) and events outside the container', () => {
    const c = mountContainer('<textarea id="t"></textarea><input id="a" />');
    const outside = document.createElement('input');
    document.body.appendChild(outside);
    const ref = { current: c };
    renderHook(() => useEnterFieldNav(ref));
    const t = c.querySelector<HTMLTextAreaElement>('#t')!;
    t.focus();
    expect(pressEnter(t).defaultPrevented).toBe(false); // textarea kept its newline
    outside.focus();
    expect(pressEnter(outside).defaultPrevented).toBe(false); // outside the container
  });

  it('innermost nested container wins (no double advance)', () => {
    // outer[data-enter-nav] > inner[data-enter-nav] > 3 inputs
    const outer = mountContainer(
      '<div data-enter-nav id="inner"><input id="x"/><input id="y"/><input id="z"/></div>',
    );
    const inner = outer.querySelector<HTMLDivElement>('#inner')!;
    const outerRef = { current: outer };
    const innerRef = { current: inner };
    renderHook(() => useEnterFieldNav(outerRef));
    renderHook(() => useEnterFieldNav(innerRef));
    const x = inner.querySelector<HTMLInputElement>('#x')!;
    x.focus();
    pressEnter(x);
    // Only the inner engine acts → advances exactly one step (x → y), not two.
    expect(document.activeElement?.id).toBe('y');
  });
});
