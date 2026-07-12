import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import TallyConfirm from '@/components/ui/TallyConfirm';

function press(key: string) {
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
}

afterEach(cleanup);

describe('TallyConfirm (Cancel? prompt)', () => {
  it('Y confirms', () => {
    const onYes = vi.fn();
    const onNo = vi.fn();
    render(<TallyConfirm open message="Cancel ?" onYes={onYes} onNo={onNo} />);
    press('y');
    expect(onYes).toHaveBeenCalledTimes(1);
    expect(onNo).not.toHaveBeenCalled();
  });

  it('N dismisses', () => {
    const onYes = vi.fn();
    const onNo = vi.fn();
    render(<TallyConfirm open message="Cancel ?" onYes={onYes} onNo={onNo} />);
    press('n');
    expect(onNo).toHaveBeenCalledTimes(1);
    expect(onYes).not.toHaveBeenCalled();
  });

  it('Escape and Enter both take the safe default (No)', () => {
    const onYes = vi.fn();
    const onNo = vi.fn();
    render(<TallyConfirm open message="Cancel ?" onYes={onYes} onNo={onNo} />);
    press('Escape');
    press('Enter');
    expect(onNo).toHaveBeenCalledTimes(2);
    expect(onYes).not.toHaveBeenCalled();
  });

  it('does not listen while closed', () => {
    const onYes = vi.fn();
    const onNo = vi.fn();
    render(<TallyConfirm open={false} onYes={onYes} onNo={onNo} />);
    press('y');
    press('n');
    expect(onYes).not.toHaveBeenCalled();
    expect(onNo).not.toHaveBeenCalled();
  });
});
