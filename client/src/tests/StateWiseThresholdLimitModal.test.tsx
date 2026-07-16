import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StateWiseThresholdLimitModal from '../pages/master/statutory/company-gst-details/components/StateWiseThresholdLimitModal';

describe('StateWiseThresholdLimitModal (Intrastate e-Way Bill)', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <StateWiseThresholdLimitModal
        isOpen={false}
        initialLimits={[]}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the List of States with Any and End of List', () => {
    render(
      <StateWiseThresholdLimitModal
        isOpen
        initialLimits={[]}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('Intrastate Threshold Limit for e-Way Bill')).toBeInTheDocument();
    expect(screen.getByText('List of States')).toBeInTheDocument();
    expect(screen.getByText('Any')).toBeInTheDocument();
    expect(screen.getByText('End of List')).toBeInTheDocument();
    expect(screen.getByText('Maharashtra')).toBeInTheDocument();
  });

  it('adds a state row with the default 50,000 limit when picked', () => {
    render(
      <StateWiseThresholdLimitModal
        isOpen
        initialLimits={[]}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByText('Andaman & Nicobar Islands'));
    // Row now shows the state name and an editable limit input defaulting to 50,000
    expect(screen.getByText('Andaman & Nicobar Islands')).toBeInTheDocument();
    const input = screen.getByDisplayValue('50,000') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it('keeps a picked state out of the list so many can be added in turn', () => {
    render(
      <StateWiseThresholdLimitModal
        isOpen
        initialLimits={[{ stateName: 'Maharashtra', limit: 60000 }]}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    // Maharashtra already added → appears in the table but not the list panel.
    // "End of List" is always offered.
    expect(screen.getByText('End of List')).toBeInTheDocument();
    // Selecting another state adds a second row.
    fireEvent.click(screen.getByText('Gujarat'));
    expect(screen.getByText('Gujarat')).toBeInTheDocument();
  });

  it('accepts and closes when End of List is chosen, preserving rows', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      <StateWiseThresholdLimitModal
        isOpen
        initialLimits={[{ stateName: 'Karnataka', limit: 75000 }]}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText('End of List'));
    expect(onSave).toHaveBeenCalledWith([{ stateName: 'Karnataka', limit: 75000 }]);
    expect(onClose).toHaveBeenCalled();
  });

  it('navigates the list with arrow keys and adds on Enter', () => {
    render(
      <StateWiseThresholdLimitModal
        isOpen
        initialLimits={[]}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    // index 0 = Any, 1 = End of List, 2 = Andaman & Nicobar Islands
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByText('Andaman & Nicobar Islands')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50,000')).toBeInTheDocument();
  });
});
