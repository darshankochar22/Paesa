import { useState } from 'react';
import { VoucherPopupShell } from '@/components/tally-ui/VoucherPopupShell';

// Per-stock-item line description ("extra details"), Tally-style: shown small and
// grey directly under the item name in the entry grid, and edited through a
// small popup that opens on click. Self-contained (owns its own popup state) so
// each voucher form just drops it under the item without any global popup wiring.
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
  const [draft, setDraft] = useState('');

  const openPopup = () => {
    setDraft(value ?? '');
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        onClick={openPopup}
        className="text-left text-xs leading-tight px-1 border border-transparent hover:border-gray-300 outline-none focus:border-black"
      >
        {value ? (
          <span className="text-zinc-500">{value}</span>
        ) : (
          <span className="text-zinc-300">+ Add description</span>
        )}
      </button>

      {open && (
        <VoucherPopupShell
          title="Item Description"
          headerRight={<span className="font-semibold text-black">{itemName}</span>}
          onClose={() => setOpen(false)}
          onAccept={() => {
            onChange(draft.trim());
            setOpen(false);
          }}
        >
          <div className="max-w-2xl">
            <label className="block text-sm text-black mb-1">
              Description / extra details for this item
            </label>
            <textarea
              rows={4}
              className="w-full text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black resize-none"
              value={draft}
              placeholder="e.g. 80 Red"
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Ctrl/Cmd+Enter accepts; plain Enter adds a newline.
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  onChange(draft.trim());
                  setOpen(false);
                }
              }}
            />
          </div>
        </VoucherPopupShell>
      )}
    </>
  );
}
