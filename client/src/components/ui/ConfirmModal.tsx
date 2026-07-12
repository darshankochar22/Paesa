import * as React from 'react';
import Button from './Button';
import { useEscape } from '@/hooks/useEscape';

import { PRIORITY, useShortcuts } from '@/lib/shortcuts';

// The Tally "Accept? Yes/No" prompt repeated across ~70% of Create/Alter forms.
// Y / Enter confirms, N / Esc cancels — registered at DIALOG priority so no
// underlying panel/screen shortcut can react while the prompt is open.

export interface ConfirmModalProps {
  open: boolean;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  message = 'Accept?',
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEscape(onCancel, open);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'y' || e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      } else if (k === 'n') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onConfirm, onCancel]);
  useShortcuts(
    [
      { keys: ['Y', 'Enter'], handler: onConfirm, allowInInputs: true },
      { keys: ['N', 'Escape'], handler: onCancel, allowInInputs: true },
    ],
    { priority: PRIORITY.DIALOG, enabled: open },
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={onCancel}
      role="dialog"
    >
      <div
        className="bg-white border-2 border-gray-200 shadow-lg min-w-[200px]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 text-xs font-bold text-black border-b border-gray-200">
          {message}
        </div>
        <div className="flex gap-2 px-4 py-3 justify-end">
          <Button variant="primary" size="sm" onClick={onConfirm}>
            <u>{confirmLabel.charAt(0)}</u>
            {confirmLabel.slice(1)}
          </Button>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            <u>{cancelLabel.charAt(0)}</u>
            {cancelLabel.slice(1)}
          </Button>
        </div>
      </div>
    </div>
  );
}
