import { useState } from 'react';
import type { useVoucherForm } from '../hooks/useVoucherForm';
import EInvoiceDetailsPopup from './popups/EInvoiceDetailsPopup';

// "Provide e-Invoice details : Yes/No" row — the Tally-style toggle shown on
// Sales / Credit Note / Debit Note, alongside "Provide GST/e-Way Bill details".
// Yes opens the e-Invoice Details (Statutory Details) popup; the choice + Place of
// Party are held on the form so the post-save flow can offer IRN generation.
export default function EInvoiceRow({ form }: { form: ReturnType<typeof useVoucherForm> }) {
  const [showPopup, setShowPopup] = useState(false);
  const provide = form.provideEInvoice;

  return (
    <>
      <div className="flex items-center border-t border-gray-200 shrink-0 px-3 py-1 bg-white gap-3">
        <span className="text-sm text-black">Provide e-Invoice details</span>
        <span className="text-sm text-black">:</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              form.setProvideEInvoice('Yes');
              setShowPopup(true);
            }}
            className={`text-sm px-2 py-0 border ${provide === 'Yes' ? 'bg-black text-white border-black' : 'border-gray-400 text-black'}`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => {
              form.setProvideEInvoice('No');
              setShowPopup(false);
            }}
            className={`text-sm px-2 py-0 border ${provide === 'No' ? 'bg-black text-white border-black' : 'border-gray-400 text-black'}`}
          >
            No
          </button>
        </div>
      </div>

      {showPopup && (
        <EInvoiceDetailsPopup
          initial={
            form.eInvoiceDetails ?? {
              bill_to_place: form.partyLedger?.city || form.partyLedger?.state || '',
              ship_to_place: form.partyLedger?.city || form.partyLedger?.state || '',
            }
          }
          onClose={() => setShowPopup(false)}
          onSave={(d) => {
            form.setEInvoiceDetails(d);
            setShowPopup(false);
          }}
        />
      )}
    </>
  );
}
