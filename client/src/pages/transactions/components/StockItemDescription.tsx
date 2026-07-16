import { useState } from 'react';
import ItemDescriptionPopup from './popups/ItemDescriptionPopup';

// Per-stock-item line description ("extra details"), Tally-style: shown small and
// grey directly under the item name in the entry grid — one description per line,
// listed one under another — and edited through the multi-line Description(s)
// popup that opens on click. Self-contained so each voucher form just drops it
// under the item without any global popup wiring.
export default function StockItemDescription({
  itemName,
  value,
  onChange,
}: {
  itemName: string;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const lines = (value ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen(true)}
        className="text-left text-xs leading-tight px-1 border border-transparent hover:border-gray-300 outline-none focus:border-black"
      >
        {lines.length ? (
          <span className="text-gray-500 whitespace-pre-line block">{lines.join('\n')}</span>
        ) : (
          <span className="text-gray-400">+ Add description</span>
        )}
      </button>

      {open && (
        <ItemDescriptionPopup
          itemName={itemName}
          initial={value}
          onClose={() => setOpen(false)}
          onSave={onChange}
        />
      )}
    </>
  );
}
