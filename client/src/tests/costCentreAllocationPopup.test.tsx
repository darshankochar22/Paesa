import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import CostCentreAllocationPopup from '../pages/transactions/components/popups/CostCentreAllocationPopup';

afterEach(cleanup);

// The popup must mirror TallyPrime: open EMPTY (one blank line, nothing
// pre-populated), then drive Cost Category → Name of Cost Centre → Amount, each
// picked from a "List of …" panel.

const categories = [
  { cc_cat_id: 1, name: 'Appliances', is_active: 1 },
  { cc_cat_id: 2, name: 'Department', is_active: 1 },
];
const centres = [
  { cc_id: 10, name: 'AC', cost_category_id: 1 },
  { cc_id: 11, name: 'Factories', cost_category_id: 1 },
  { cc_id: 20, name: 'HR', cost_category_id: 2 },
];

beforeEach(() => {
  (window.api as any).costCentre = {
    getAll: vi.fn().mockResolvedValue({ success: true, costCentres: centres }),
  };
  (window.api as any).costCategory = {
    getAll: vi.fn().mockResolvedValue({ success: true, costCategories: categories }),
  };
});

function renderPopup(onSave = vi.fn()) {
  const { container } = render(
    <CostCentreAllocationPopup
      companyId={1}
      ledgerName="rent paid"
      totalAmount={900}
      dcType="Dr"
      onClose={() => {}}
      onSave={onSave}
    />,
  );
  const cell = (suffix: 'cat' | 'centre' | 'amt') =>
    container.querySelector(`[data-cc$=":${suffix}"]`) as HTMLInputElement;
  const scope = within(container);
  return { onSave, container, cell, scope };
}

describe('CostCentreAllocationPopup — Tally row-by-row flow', () => {
  it('opens empty with Tally header/columns and no pre-populated splits', async () => {
    const { container, cell, scope } = renderPopup();
    await scope.findByText('Name of Cost Centre');

    expect(scope.getAllByText('Cost Allocations for : rent paid').length).toBeGreaterThan(0);
    expect(scope.getByText(/Up to:/).textContent).toContain('₹900.00 Dr');
    expect(scope.getByText('Cost Category')).toBeTruthy();
    // Old grouped UI is gone.
    expect(scope.queryByText('Add Cost Centre Split')).toBeNull();
    // Exactly one blank line, both pickers empty.
    expect(container.querySelectorAll('[data-cc$=":centre"]').length).toBe(1);
    expect(cell('cat').value).toBe('');
    expect(cell('centre').value).toBe('');
  });

  it('picks Category → Cost Centre → Amount and saves the allocation', async () => {
    const { onSave, cell, scope } = renderPopup();
    await scope.findByText('Name of Cost Centre');

    // Focusing the Cost Category cell opens the right-hand "List of Categories".
    fireEvent.focus(cell('cat'));
    await scope.findByText('List of Categories');
    fireEvent.click(scope.getByText('Appliances'));

    // Cost Centre list opens (filtered to Appliances — HR is under Department).
    await scope.findByText('List of Cost Centres');
    expect(scope.queryByText('HR')).toBeNull();
    fireEvent.click(scope.getByText('AC'));

    // Amount.
    fireEvent.change(cell('amt'), { target: { value: '900' } });

    fireEvent.click(scope.getByRole('button', { name: 'Accept' }));
    expect(onSave).toHaveBeenCalledWith([{ cost_centre_id: 10, amount: 900, cost_category_id: 1 }]);
  });

  it('selects Category then Cost Centre with Enter (keyboard flow)', async () => {
    const { onSave, cell, scope } = renderPopup();
    await scope.findByText('Name of Cost Centre');

    // Enter on the highlighted "List of Categories" row selects it (no click).
    fireEvent.focus(cell('cat'));
    await scope.findByText('List of Categories');
    fireEvent.keyDown(window, { key: 'Enter' });

    // Cost Centre list opens; Enter selects the first highlighted centre.
    await scope.findByText('List of Cost Centres');
    fireEvent.keyDown(window, { key: 'Enter' });

    fireEvent.change(cell('amt'), { target: { value: '900' } });
    fireEvent.click(scope.getByRole('button', { name: 'Accept' }));
    expect(onSave).toHaveBeenCalledWith([{ cost_centre_id: 10, amount: 900, cost_category_id: 1 }]);
  });

  it('blocks accept until each category fully allocates its amount', async () => {
    const { onSave, cell, scope } = renderPopup();
    await scope.findByText('Name of Cost Centre');

    fireEvent.focus(cell('cat'));
    await scope.findByText('List of Categories');
    fireEvent.click(scope.getByText('Appliances'));
    await scope.findByText('List of Cost Centres');
    fireEvent.click(scope.getByText('AC'));
    fireEvent.change(cell('amt'), { target: { value: '500' } }); // leaves ₹400

    fireEvent.click(scope.getByRole('button', { name: 'Accept' }));
    expect(onSave).not.toHaveBeenCalled();
    await waitFor(() => expect(scope.getByText(/must be zero/i)).toBeTruthy());
  });
});
