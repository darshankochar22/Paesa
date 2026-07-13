import { useState, useEffect } from 'react';
import { TallyFieldPopup } from '@/components/tally-ui/TallyFieldPopup';

// Tally sub-form field: borderless resting state, active field gets a gray fill
// (theme substitute for Tally's yellow) + underline. Compact row height.
const inputCls =
  'flex-1 min-w-0 text-[13px] bg-transparent border-b border-gray-300 px-1 py-0 outline-none focus:bg-gray-200 focus:border-black';
const labelCls = 'w-40 text-[13px] text-black shrink-0';
const dateInputCls =
  'w-24 shrink-0 text-[13px] bg-transparent border-b border-gray-300 px-1 py-0 outline-none focus:bg-gray-200 focus:border-black';

export interface DebitNoteDetails {
  tracking_no?: string;
  dispatch_doc_no?: string;
  dispatched_through?: string;
  destination?: string;
  carrier_name?: string;
  bill_of_lading_no?: string;
  bill_of_lading_date?: string;
  motor_vehicle_no?: string;
  original_invoice_no?: string;
  original_invoice_date?: string;
}

interface Props {
  initialDetails?: DebitNoteDetails | null;
  onClose: () => void;
  onSave: (details: DebitNoteDetails) => void;
}

export default function DebitNoteDetailsPopup({ initialDetails, onClose, onSave }: Props) {
  // Initialize EVERY interface key — dispatch_doc_no / dispatched_through /
  // destination were previously never initialized (and had no inputs), so a
  // re-save silently dropped them from the payload.
  const buildForm = (d?: DebitNoteDetails | null): DebitNoteDetails => ({
    tracking_no: d?.tracking_no ?? '',
    dispatch_doc_no: d?.dispatch_doc_no ?? '',
    dispatched_through: d?.dispatched_through ?? '',
    destination: d?.destination ?? '',
    carrier_name: d?.carrier_name ?? '',
    bill_of_lading_no: d?.bill_of_lading_no ?? '',
    bill_of_lading_date: d?.bill_of_lading_date ?? '',
    motor_vehicle_no: d?.motor_vehicle_no ?? '',
    original_invoice_no: d?.original_invoice_no ?? '',
    original_invoice_date: d?.original_invoice_date ?? '',
  });

  const [form, setForm] = useState<DebitNoteDetails>(() => buildForm(initialDetails));

  // Re-sync when the caller supplies a new initialDetails reference while the
  // popup stays mounted (e.g. voucher hydration arriving after open).
  useEffect(() => {
    setForm(buildForm(initialDetails));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDetails]);

  const set = (field: keyof DebitNoteDetails, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

  return (
    <TallyFieldPopup title="Dispatch Details" onClose={onClose} onAccept={handleSave} width={620}>
      {/* Two-column layout matching TallyPrime: Tracking No(s) left,
          dispatch/transport fields right. */}
      <div className="flex gap-6">
        {/* Left column — Tracking No(s) with the ♦ Not Applicable value */}
        <div className="w-52 shrink-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[13px] text-black shrink-0">Tracking No(s)</span>
            <span className="text-[13px] text-black shrink-0">:</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[13px] font-semibold text-black shrink-0">♦</span>
            <input
              type="text"
              className="flex-1 min-w-0 text-[13px] font-semibold text-black bg-transparent px-0.5 py-0 outline-none focus:bg-gray-200 placeholder:font-semibold placeholder:text-black"
              value={form.tracking_no ?? ''}
              onChange={(e) => set('tracking_no', e.target.value)}
              placeholder="Not Applicable"
              autoFocus
            />
          </div>
        </div>

        {/* Right column — dispatch / transport fields (labels left-aligned, Tally) */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1">
            <span className={labelCls}>Dispatch Doc No.</span>
            <span className="text-[13px] text-black shrink-0">:</span>
            <input
              type="text"
              className={inputCls}
              value={form.dispatch_doc_no ?? ''}
              onChange={(e) => set('dispatch_doc_no', e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1">
            <span className={labelCls}>Dispatched through</span>
            <span className="text-[13px] text-black shrink-0">:</span>
            <input
              type="text"
              className={inputCls}
              value={form.dispatched_through ?? ''}
              onChange={(e) => set('dispatched_through', e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1">
            <span className={labelCls}>Destination</span>
            <span className="text-[13px] text-black shrink-0">:</span>
            <input
              type="text"
              className={inputCls}
              value={form.destination ?? ''}
              onChange={(e) => set('destination', e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1">
            <span className={labelCls}>Carrier Name/Agent</span>
            <span className="text-[13px] text-black shrink-0">:</span>
            <input
              type="text"
              className={inputCls}
              value={form.carrier_name ?? ''}
              onChange={(e) => set('carrier_name', e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1">
            <span className={labelCls}>Bill of Lading/LR-RR No.</span>
            <span className="text-[13px] text-black shrink-0">:</span>
            <input
              type="text"
              className={inputCls}
              value={form.bill_of_lading_no ?? ''}
              onChange={(e) => set('bill_of_lading_no', e.target.value)}
            />
            <span className="text-[13px] text-black shrink-0 ml-1">Date</span>
            <span className="text-[13px] text-black shrink-0">:</span>
            <input
              type="date"
              className={dateInputCls}
              value={form.bill_of_lading_date ?? ''}
              onChange={(e) => set('bill_of_lading_date', e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1">
            <span className={labelCls}>Motor Vehicle No.</span>
            <span className="text-[13px] text-black shrink-0">:</span>
            <input
              type="text"
              className={inputCls}
              value={form.motor_vehicle_no ?? ''}
              onChange={(e) => set('motor_vehicle_no', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Section: Original Invoice Details (bold, centred header — Tally) */}
      <div className="mt-4 mb-2 text-center text-[13px] font-bold text-black">
        Original Invoice Details
      </div>

      <div className="flex gap-6">
        <div className="flex-1 flex items-center gap-1">
          <span className="text-[13px] text-black shrink-0">Original Invoice No.</span>
          <span className="text-[13px] text-black shrink-0">:</span>
          <input
            type="text"
            className={inputCls}
            value={form.original_invoice_no ?? ''}
            onChange={(e) => set('original_invoice_no', e.target.value)}
          />
        </div>
        <div className="flex-1 flex items-center gap-1">
          <span className="text-[13px] text-black shrink-0">Date</span>
          <span className="text-[13px] text-black shrink-0">:</span>
          <input
            type="date"
            className={inputCls}
            value={form.original_invoice_date ?? ''}
            onChange={(e) => set('original_invoice_date', e.target.value)}
          />
        </div>
      </div>
    </TallyFieldPopup>
  );
}
