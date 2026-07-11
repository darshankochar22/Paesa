import { useState } from 'react';
import { VoucherPopupShell } from '@/components/tally-ui/VoucherPopupShell';

// Small Tally-style "New Number" entry popup. Opened when the user picks
// "New Number" from a Tracking No. / Order No. / Batch-Lot list — a single
// text field to type the new number, Accept/Cancel. Renders above the parent
// allocation popup.
interface Props {
  title?: string;
  label?: string;
  initial?: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

export default function NewNumberPopup({
  title = 'New Number',
  label = 'Number',
  initial = '',
  onConfirm,
  onClose,
}: Props) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');

  const confirm = () => {
    const v = value.trim();
    if (!v) {
      setError('Enter a number');
      return;
    }
    onConfirm(v);
  };

  // Escape: handled by VoucherPopupShell via the central escape stack —
  // this popup registers above the parent allocation popup, so one Escape
  // closes only this layer.
  return (
    <VoucherPopupShell size="compact" title={title} onClose={onClose} onAccept={confirm}>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-black shrink-0">{label}</span>
          <span className="text-sm text-black shrink-0">:</span>
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                confirm();
              }
            }}
            className="flex-1 min-w-0 text-sm font-mono bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black"
          />
        </div>
        {error && (
          <div className="mt-1 text-xs font-bold text-black border-l-2 border-black pl-2">
            {error}
          </div>
        )}
      </div>
    </VoucherPopupShell>
  );
}
