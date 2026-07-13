import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEnterFieldNav } from '@/pages/transactions/hooks/useVoucherEnterNav';
import { navigableFields } from '@/pages/transactions/lib/voucherNav';

// Delivery Note / Sales row: Party (left) and Price Level (top-right) share a
// visual row, with the Sales ledger on the next row. Because DOM order is the
// engine's source of truth, Price Level sits between Party and Sales ledger in
// the markup (even though it is positioned top-right), so a single Enter walks
// Party -> Price Level -> Sales ledger with no per-voucher wiring.
function mountSalesRow(): HTMLDivElement {
  const c = document.createElement('div');
  c.setAttribute('data-enter-nav', '');
  c.innerHTML = `
    <div class="relative">
      <input id="party" data-field-type="party" />
      <div class="absolute" style="top:0;right:0">
        <select id="priceLevel" data-price-level>
          <option value="">Not Applicable</option>
          <option value="Wholesale">Wholesale</option>
        </select>
      </div>
      <input id="sales" data-field-type="salesPurchase" />
    </div>
    <input id="item1" data-stock-item="1" />
  `;
  document.body.appendChild(c);
  return c;
}

function pressEnter(target: HTMLElement) {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
  );
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Delivery Note / Sales — Enter walks Party -> Price Level -> Sales ledger', () => {
  it('orders the navigable fields Party, Price Level, Sales ledger, Item', () => {
    const c = mountSalesRow();
    const ids = navigableFields(c).map((f) => f.id);
    expect(ids).toEqual(['party', 'priceLevel', 'sales', 'item1']);
  });

  it('a single Enter advances each field to the next, including the Price Level select', () => {
    const c = mountSalesRow();
    const ref = { current: c };
    renderHook(() => useEnterFieldNav(ref));

    c.querySelector<HTMLInputElement>('#party')!.focus();
    pressEnter(document.activeElement as HTMLElement);
    expect(document.activeElement?.id).toBe('priceLevel');

    pressEnter(document.activeElement as HTMLElement);
    expect(document.activeElement?.id).toBe('sales');

    pressEnter(document.activeElement as HTMLElement);
    expect(document.activeElement?.id).toBe('item1');
  });
});
