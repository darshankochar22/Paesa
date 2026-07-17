import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DownloadSettingsModal from '../pages/master/statutory/company-gst-details/components/DownloadSettingsModal';

describe('DownloadSettingsModal Component Tests', () => {
  const registrations = [
    { gst_id: 1, state_id: 'Chhattisgarh Registration', gstin: '22AAAAA0000A1Z1' },
    { gst_id: 2, state_id: 'Maharashtra Registration', gstin: '27BBBBB1111B2Z2' },
  ];

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <DownloadSettingsModal
        isOpen={false}
        registrations={registrations}
        initialRegistration=""
        initialReturnType="All Returns"
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render correct initial state and lists when open', () => {
    render(
      <DownloadSettingsModal
        isOpen={true}
        registrations={registrations}
        initialRegistration="Chhattisgarh Registration"
        initialReturnType="All Returns"
        onSave={() => {}}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('Download Settings')).toBeInTheDocument();
    expect(screen.getAllByText('Chhattisgarh Registration').length).toBeGreaterThan(0);
    expect(screen.getByText('All Returns')).toBeInTheDocument();

    // The registrations list panel should be visible for selection initially
    expect(screen.getByText('List of GST Registrations')).toBeInTheDocument();
    expect(screen.getByText('Maharashtra Registration')).toBeInTheDocument();
  });

  it('should trigger onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <DownloadSettingsModal
        isOpen={true}
        registrations={registrations}
        initialRegistration="Chhattisgarh Registration"
        initialReturnType="All Returns"
        onSave={() => {}}
        onClose={handleClose}
      />,
    );

    const closeBtn = screen.getByRole('button');
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('should add a single return type and save it on End of List', async () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <DownloadSettingsModal
        isOpen={true}
        registrations={registrations}
        initialRegistration="Chhattisgarh Registration"
        initialReturnType="All Returns"
        onSave={handleSave}
        onClose={handleClose}
      />,
    );

    // Cursor starts on the existing "Chhattisgarh Registration" row. Enter keeps
    // it and steps to the trailing new-entry row (anchored on "End of List");
    // a second Enter finishes the field and moves to Return Type.
    await user.keyboard('{Enter}');
    await user.keyboard('{Enter}');
    expect(screen.getByText('Types of Return')).toBeInTheDocument();

    // ArrowDown off "All Returns" onto "GSTR-1", Enter adds it (multi-select stays open).
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    // Enter again lands on "End of List", committing the selection and closing.
    await user.keyboard('{Enter}');

    expect(handleSave).toHaveBeenCalledWith('Chhattisgarh Registration', 'GSTR-1');
    expect(handleClose).toHaveBeenCalled();
  });

  it('should support multi-selecting several return types', async () => {
    const handleSave = vi.fn();
    const user = userEvent.setup();

    render(
      <DownloadSettingsModal
        isOpen={true}
        registrations={registrations}
        initialRegistration="Chhattisgarh Registration"
        initialReturnType="All Returns"
        onSave={handleSave}
        onClose={() => {}}
      />,
    );

    // Keep the existing registration (Enter), then End of List (Enter) → Return Type.
    await user.keyboard('{Enter}');
    await user.keyboard('{Enter}');

    // Return field starts on "All Returns"; replace it with GSTR-1, then add GSTR-2A.
    // On the new-entry row the list leads with End of List, then All Returns, then items.
    await user.keyboard('{ArrowDown}'); // All Returns -> GSTR-1
    await user.keyboard('{Enter}'); // row 0: All Returns -> GSTR-1
    await user.keyboard('{ArrowDown}'); // new row: End of List -> All Returns
    await user.keyboard('{ArrowDown}'); // All Returns -> GSTR-2A
    await user.keyboard('{Enter}'); // add GSTR-2A
    await user.keyboard('{Enter}'); // End of List -> commit

    expect(handleSave).toHaveBeenCalledWith('Chhattisgarh Registration', 'GSTR-1, GSTR-2A');
  });

  it('should default GST Registration to All Registrations when none preselected', () => {
    render(
      <DownloadSettingsModal
        isOpen={true}
        registrations={registrations}
        initialRegistration=""
        initialReturnType="All Returns"
        onSave={() => {}}
        onClose={() => {}}
      />,
    );

    // The active GST Registration field shows the "All Registrations" default,
    // and it also heads the options list.
    expect(screen.getAllByText('All Registrations').length).toBeGreaterThan(0);
  });
});
