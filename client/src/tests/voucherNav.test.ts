import { describe, it, expect, afterEach } from 'vitest';
import {
  isNavigable,
  navigableFields,
  nextIndex,
  focusNextField,
  focusPrevField,
  focusFirstField,
  focusBySelector,
  registerNavContainer,
  rememberFocusedField,
  advanceFromLastField,
} from '@/pages/transactions/lib/voucherNav';

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('nextIndex (pure clamping)', () => {
  it('advances and clamps at the end', () => {
    expect(nextIndex(0, 3, 1)).toBe(1);
    expect(nextIndex(2, 3, 1)).toBe(2); // stays put at the last field
    expect(nextIndex(0, 3, -1)).toBe(0); // stays put at the first field
    expect(nextIndex(1, 3, -1)).toBe(0);
  });
  it('enters at the near end when focus is outside the list', () => {
    expect(nextIndex(-1, 3, 1)).toBe(0);
    expect(nextIndex(-1, 3, -1)).toBe(2);
  });
  it('returns -1 for an empty list', () => {
    expect(nextIndex(0, 0, 1)).toBe(-1);
  });
});

describe('isNavigable', () => {
  it('accepts enabled inputs/selects and rejects disabled/readonly/hidden/untabbable', () => {
    const root = mount(`
      <input id="a" />
      <input id="b" disabled />
      <input id="c" readonly />
      <input id="d" type="hidden" />
      <input id="e" tabindex="-1" />
      <select id="f"><option>x</option></select>
      <input id="g" hidden />
      <div data-nav-ignore><input id="h" /></div>
    `);
    const get = (id: string) => root.querySelector(`#${id}`)!;
    expect(isNavigable(get('a'))).toBe(true);
    expect(isNavigable(get('f'))).toBe(true);
    expect(isNavigable(get('b'))).toBe(false);
    expect(isNavigable(get('c'))).toBe(false);
    expect(isNavigable(get('d'))).toBe(false);
    expect(isNavigable(get('e'))).toBe(false);
    expect(isNavigable(get('g'))).toBe(false);
    expect(isNavigable(get('h'))).toBe(false); // inside data-nav-ignore island
  });
});

describe('navigableFields (DOM order, skips non-applicable)', () => {
  it('lists only navigable controls in document order', () => {
    const root = mount(`
      <input id="party" />
      <input id="ledger" disabled />
      <input id="qty" />
      <textarea id="narration"></textarea>
    `);
    expect(navigableFields(root).map((el) => el.id)).toEqual(['party', 'qty', 'narration']);
  });
});

describe('focus movement across rows', () => {
  const layout = `
    <input id="r1_item" />
    <input id="r1_qty" />
    <input id="r1_rate" />
    <input id="r2_item" />
    <input id="r2_qty" />
  `;

  it('moves to the next field on the same row, then to the first field of the next row', () => {
    const root = mount(layout);
    const item = root.querySelector<HTMLInputElement>('#r1_item')!;
    item.focus();
    focusNextField(root); // uses activeElement
    expect(document.activeElement?.id).toBe('r1_qty');
    focusNextField(root, document.activeElement);
    expect(document.activeElement?.id).toBe('r1_rate');
    // end of row 1 → first field of row 2
    focusNextField(root, document.activeElement);
    expect(document.activeElement?.id).toBe('r2_item');
  });

  it('does not move (returns false) past the last field', () => {
    const root = mount(layout);
    const lastEl = root.querySelector<HTMLInputElement>('#r2_qty')!;
    lastEl.focus();
    expect(focusNextField(root, lastEl)).toBe(false);
    expect(document.activeElement?.id).toBe('r2_qty');
  });

  it('skips a conditionally-hidden middle field automatically', () => {
    // Disc column hidden (as when the F11 discount flag is off) → qty jumps to rate.
    const root = mount(`
      <input id="qty" />
      <input id="disc" disabled />
      <input id="rate" />
    `);
    const qty = root.querySelector<HTMLInputElement>('#qty')!;
    qty.focus();
    focusNextField(root, qty);
    expect(document.activeElement?.id).toBe('rate');
  });

  it('moves backwards and focuses the first field', () => {
    const root = mount(layout);
    const rate = root.querySelector<HTMLInputElement>('#r1_rate')!;
    rate.focus();
    focusPrevField(root, rate);
    expect(document.activeElement?.id).toBe('r1_qty');
    focusFirstField(root);
    expect(document.activeElement?.id).toBe('r1_item');
  });
});

describe('focus tracker (generic popup-selection hand-off)', () => {
  afterEach(() => registerNavContainer(null));

  it('advances from the last field focused inside the registered body', () => {
    // Mimics: ledger field opens a picker, user selects, handler advances.
    const root = mount(`
      <input id="ledger" data-particular-ledger="1" />
      <input id="amount" data-particular-debit="1" />
    `);
    registerNavContainer(root);
    const ledger = root.querySelector<HTMLInputElement>('#ledger')!;
    rememberFocusedField(ledger); // recorded when the field was focused
    expect(advanceFromLastField()).toBe(true);
    expect(document.activeElement?.id).toBe('amount');
  });

  it('ignores focus that lands outside the body (e.g. the picker search box)', () => {
    const root = mount(`<input id="ledger" /><input id="amount" />`);
    const outside = mount(`<input id="search" />`);
    registerNavContainer(root);
    rememberFocusedField(root.querySelector('#ledger'));
    rememberFocusedField(outside.querySelector('#search')); // outside → not remembered
    advanceFromLastField();
    expect(document.activeElement?.id).toBe('amount'); // still advances from #ledger
  });

  it('no-ops when no container is registered', () => {
    registerNavContainer(null);
    expect(advanceFromLastField()).toBe(false);
  });
});

describe('focusBySelector (popup return hand-off)', () => {
  it('focuses a known anchor field, ignoring a non-navigable target', () => {
    const root = mount(`
      <input data-field-type="salesPurchase" />
      <input data-field-type="disabled" disabled />
    `);
    expect(focusBySelector(root, '[data-field-type="salesPurchase"]')).toBe(true);
    expect((document.activeElement as HTMLElement).getAttribute('data-field-type')).toBe(
      'salesPurchase',
    );
    expect(focusBySelector(root, '[data-field-type="disabled"]')).toBe(false);
    expect(focusBySelector(root, '[data-field-type="missing"]')).toBe(false);
  });
});
