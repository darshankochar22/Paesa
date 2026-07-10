import { useState } from 'react';
import { VoucherPopupShell } from '@/components/tally-ui/VoucherPopupShell';

export interface EInvoicePlaceDetails {
  bill_to_place: string;
  ship_to_place: string;
}

interface Props {
  initial: EInvoicePlaceDetails;
  onClose: () => void;
  onSave: (details: EInvoicePlaceDetails) => void;
}

// The Tally "Statutory Details → e-Invoice Details" sub-screen shown when
// "Provide e-Invoice details" = Yes on a Sales/Credit/Debit Note. Ack No./Ack
// Date/IRN are blank until the IRN is generated (read-only here); Place of Party
// is auto-filled from the party ledger and editable.
export default function EInvoiceDetailsPopup({ initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<EInvoicePlaceDetails>({
    bill_to_place: initial.bill_to_place ?? '',
    ship_to_place: initial.ship_to_place ?? '',
  });
  const set = (patch: Partial<EInvoicePlaceDetails>) => setForm((p) => ({ ...p, ...patch }));

  const labelCls = 'w-40 text-sm text-black shrink-0';
  const colonCls = 'text-sm text-black shrink-0';
  const inputCls =
    'min-w-0 flex-1 text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black';
  const roCls = 'min-w-0 flex-1 text-sm text-black px-2 py-1 border-b border-gray-300';
  const sectionCls = 'text-sm font-semibold text-black border-b border-gray-300 pb-1 pt-1';

  return (
    <VoucherPopupShell title="Statutory Details" onClose={onClose} onAccept={() => onSave(form)}>
      <div className="max-w-3xl space-y-4">
        <div className="text-center text-sm font-semibold text-black">e-Invoice Details</div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={labelCls}>Ack No.</span>
            <span className={colonCls}>:</span>
            <span className={roCls} />
            <span className={labelCls}>Ack Date</span>
            <span className={colonCls}>:</span>
            <span className={roCls} />
          </div>
          <div className="flex items-center gap-2">
            <span className={labelCls}>IRN</span>
            <span className={colonCls}>:</span>
            <span className={roCls} />
          </div>
        </div>

        <div className="space-y-3">
          <div className={sectionCls}>Place of Party</div>
          <div className="flex items-center gap-2">
            <span className={labelCls}>Bill to place</span>
            <span className={colonCls}>:</span>
            <input
              autoFocus
              type="text"
              className={inputCls}
              value={form.bill_to_place}
              onChange={(e) => set({ bill_to_place: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className={labelCls}>Ship to place</span>
            <span className={colonCls}>:</span>
            <input
              type="text"
              className={inputCls}
              value={form.ship_to_place}
              onChange={(e) => set({ ship_to_place: e.target.value })}
            />
          </div>
        </div>
      </div>
    </VoucherPopupShell>
  );
}
