import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { useGlobalEnterNavigation } from '@/hooks/useEnterNavigation';

// jsdom has no layout: offsetParent is always null, which the hook uses as its
// visibility check. Approximate it so visible elements pass the filter.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    get() {
      let el: HTMLElement | null = this as HTMLElement;
      while (el) {
        if (el.style?.display === 'none' || el.hasAttribute?.('hidden')) return null;
        el = el.parentElement;
      }
      return (this as HTMLElement).parentElement;
    },
  });
});

function Harness({ children }: { children: React.ReactNode }) {
  useGlobalEnterNavigation();
  return <>{children}</>;
}

const pressEnter = (el: Element) => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
};

describe('useGlobalEnterNavigation', () => {
  it('moves focus to the next field on Enter', () => {
    const { getByTestId } = render(
      <Harness>
        <div data-enter-nav>
          <input data-testid="a" />
          <input data-testid="b" />
        </div>
      </Harness>,
    );
    const a = getByTestId('a');
    a.focus();
    pressEnter(a);
    expect(document.activeElement).toBe(getByTestId('b'));
  });

  it('walks through selects and skips data-enter-skip and disabled fields', () => {
    const { getByTestId } = render(
      <Harness>
        <div data-enter-nav>
          <select data-testid="a">
            <option>x</option>
          </select>
          <input data-enter-skip data-testid="skipped" />
          <input disabled data-testid="disabled" />
          <input data-testid="b" />
        </div>
      </Harness>,
    );
    const a = getByTestId('a');
    a.focus();
    pressEnter(a);
    expect(document.activeElement).toBe(getByTestId('b'));
  });

  it('clicks (not advances) elements marked data-enter-click', () => {
    const onClick = vi.fn();
    const { getByTestId } = render(
      <Harness>
        <div data-enter-nav>
          <div tabIndex={0} data-enter-click data-testid="under" onClick={onClick}>
            Under
          </div>
          <input data-testid="b" />
        </div>
      </Harness>,
    );
    const under = getByTestId('under');
    under.focus();
    pressEnter(under);
    expect(onClick).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(under);
  });

  it('clicks the data-enter-accept button on Enter at the last field', () => {
    const onAccept = vi.fn();
    const { getByTestId } = render(
      <Harness>
        <div data-enter-nav>
          <input data-testid="a" />
          <input data-testid="last" />
          <button data-enter-accept onClick={onAccept}>
            Accept
          </button>
        </div>
      </Harness>,
    );
    const last = getByTestId('last');
    last.focus();
    pressEnter(last);
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it('ignores Enter inside data-enter-nav-ignore zones', () => {
    const { getByTestId } = render(
      <Harness>
        <div data-enter-nav>
          <div data-enter-nav-ignore>
            <input data-testid="panel-search" />
          </div>
          <input data-testid="b" />
        </div>
      </Harness>,
    );
    const search = getByTestId('panel-search');
    search.focus();
    pressEnter(search);
    expect(document.activeElement).toBe(search);
  });

  it('defers to field handlers that preventDefault', () => {
    const { getByTestId } = render(
      <Harness>
        <div data-enter-nav>
          <input
            data-testid="a"
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault();
            }}
          />
          <input data-testid="b" />
        </div>
      </Harness>,
    );
    const a = getByTestId('a');
    a.focus();
    pressEnter(a);
    expect(document.activeElement).toBe(a);
  });

  it('does nothing outside a data-enter-nav container', () => {
    const { getByTestId } = render(
      <Harness>
        <div>
          <input data-testid="a" />
          <input data-testid="b" />
        </div>
      </Harness>,
    );
    const a = getByTestId('a');
    a.focus();
    pressEnter(a);
    expect(document.activeElement).toBe(a);
  });

  it('allows newlines in textareas marked data-enter-newline', () => {
    const { getByTestId } = render(
      <Harness>
        <div data-enter-nav>
          <textarea data-testid="notes" data-enter-newline />
          <input data-testid="b" />
        </div>
      </Harness>,
    );
    const notes = getByTestId('notes');
    notes.focus();
    pressEnter(notes);
    expect(document.activeElement).toBe(notes);
  });
});
