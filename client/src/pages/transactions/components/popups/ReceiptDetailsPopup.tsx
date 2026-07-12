import { useState, useEffect } from 'react';
import { TallyFieldPopup } from '@/components/tally-ui/TallyFieldPopup';

export interface ReceiptDetails {
  receipt_note_no?: string;
  receipt_doc_no?: string;
  /** Additive: date paired with receipt_doc_no (kept for round-trip; Tally's
   *  Receipt Details form shows no date beside Receipt Doc No., so it's not rendered). */
  receipt_doc_date?: string;
  dispatched_through?: string;
  destination?: string;
  carrier_name?: string;
  bill_of_lading_no?: string;
  bill_of_lading_date?: string;
  motor_vehicle_no?: string;
}

export interface SavedNote {
  voucher_id: number;
  tracking_no: string;
  date: string;
}

export interface SavedOrder {
  voucher_id: number;
  order_no: string;
  date: string;
}

interface Props {
  initialDetails?: ReceiptDetails | null;
  onClose: () => void;
  onSave: (details: ReceiptDetails) => void;
  /** When set (with partyLedgerId + noteVoucherType), the Receipt Note No(s)
   *  field offers the party's saved note reference numbers ("List of Tracking
   *  Numbers"); picking one lets the caller import that note's items. */
  companyId?: number;
  partyLedgerId?: number;
  /** "Receipt Note" for Purchase, "Delivery Note" for Sales. */
  noteVoucherType?: string;
  /** "Purchase Order" / "Sales Order" — its order numbers appear in the same
   *  list too (Tally). */
  orderVoucherType?: string;
  onSelectSavedNote?: (note: SavedNote) => void;
  onSelectSavedOrder?: (order: SavedOrder) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

// Tally sub-form field: borderless resting state, active field gets a gray fill
// (theme substitute for Tally's yellow) + underline. Compact row height.
const inputCls =
  'flex-1 min-w-0 text-[13px] bg-transparent border-b border-gray-300 px-1 py-0 outline-none focus:bg-gray-200 focus:border-black';
const labelCls = 'w-40 text-[13px] text-black shrink-0';
const dateInputCls =
  'w-24 shrink-0 text-[13px] bg-transparent border-b border-gray-300 px-1 py-0 outline-none focus:bg-gray-200 focus:border-black';

export default function ReceiptDetailsPopup({
  initialDetails,
  onClose,
  onSave,
  companyId,
  partyLedgerId,
  noteVoucherType,
  orderVoucherType,
  onSelectSavedNote,
  onSelectSavedOrder,
}: Props) {
  const buildForm = (d?: ReceiptDetails | null): ReceiptDetails => ({
    receipt_note_no: d?.receipt_note_no ?? '',
    receipt_doc_no: d?.receipt_doc_no ?? '',
    receipt_doc_date: d?.receipt_doc_date ?? '',
    dispatched_through: d?.dispatched_through ?? '',
    destination: d?.destination ?? '',
    carrier_name: d?.carrier_name ?? '',
    bill_of_lading_no: d?.bill_of_lading_no ?? '',
    bill_of_lading_date: d?.bill_of_lading_date ?? '',
    motor_vehicle_no: d?.motor_vehicle_no ?? '',
  });

  const [form, setForm] = useState<ReceiptDetails>(() => buildForm(initialDetails));
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>([]);
  const [showNoteList, setShowNoteList] = useState(false);

  // Reference numbers of the party's saved Receipt/Delivery Notes.
  useEffect(() => {
    if (!companyId || !partyLedgerId || !noteVoucherType) return;
    (window as any).api.report
      .partyTrackingNumbers?.(companyId, partyLedgerId, noteVoucherType)
      .then((res: any) => {
        if (res?.success) setSavedNotes(res.trackingNumbers ?? []);
      })
      .catch(() => {});
  }, [companyId, partyLedgerId, noteVoucherType]);

  // Order numbers on the party's saved Purchase/Sales Orders — Tally offers
  // those in the same "List of Tracking Numbers".
  useEffect(() => {
    if (!companyId || !partyLedgerId || !orderVoucherType) return;
    (window as any).api.report
      .partyOrders?.(companyId, partyLedgerId, orderVoucherType)
      .then((res: any) => {
        if (res?.success) setSavedOrders(res.orders ?? []);
      })
      .catch(() => {});
  }, [companyId, partyLedgerId, orderVoucherType]);

  // Close the "List of Tracking Numbers" dropdown on an outside click.
  useEffect(() => {
    if (!showNoteList) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-rd-dd]')) setShowNoteList(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showNoteList]);

  // Multiple notes can be referenced on one invoice — comma-separated (Tally).
  const appendNoteNo = (value: string) =>
    setForm((prev) => {
      const parts = (prev.receipt_note_no ?? '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.includes(value)) return prev;
      return { ...prev, receipt_note_no: [...parts, value].join(', ') };
    });

  const selectedNoteNos = (form.receipt_note_no ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  // Re-sync when the caller supplies a new initialDetails reference while the
  // popup stays mounted (e.g. voucher hydration arriving after open).
  useEffect(() => {
    setForm(buildForm(initialDetails));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDetails]);

  const set = (field: keyof ReceiptDetails, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

  return (
    <TallyFieldPopup title="Receipt Details" onClose={onClose} onAccept={handleSave} width={600}>
      {/* Two-column layout matching TallyPrime: Receipt Note No(s) left,
          receipt/transport fields right. */}
      <div className="flex gap-6">
        {/* Left column — Receipt Note No(s) with the ♦ selected value */}
        <div className="w-52 shrink-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[13px] text-black shrink-0">Receipt Note No(s)</span>
            <span className="text-[13px] text-black shrink-0">:</span>
          </div>
          <div data-rd-dd className="relative flex items-baseline gap-1">
            <span className="text-[13px] font-semibold text-black shrink-0">♦</span>
            <input
              type="text"
              className="flex-1 min-w-0 text-[13px] font-semibold text-black bg-transparent px-0.5 py-0 outline-none focus:bg-gray-200 placeholder:font-semibold placeholder:text-black"
              value={form.receipt_note_no ?? ''}
              onFocus={() => setShowNoteList(true)}
              onChange={(e) => set('receipt_note_no', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setShowNoteList(false);
              }}
              placeholder="Not Applicable"
              autoFocus
            />
            {showNoteList && (savedNotes.length > 0 || savedOrders.length > 0) && (
              <div className="absolute left-0 top-full mt-0.5 w-64 bg-white border border-gray-400 shadow-xl z-40 max-h-56 overflow-y-auto">
                <div className="bg-white text-black text-[10px] font-bold px-2 py-1 border-b border-gray-300">
                  List of Tracking Numbers
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    set('receipt_note_no', '');
                    setShowNoteList(false);
                  }}
                  className="block w-full text-left text-[13px] px-2 py-1 hover:bg-gray-100"
                >
                  Not Applicable
                </button>
                {savedNotes
                  .filter((n) => !selectedNoteNos.includes(n.tracking_no))
                  .map((n) => (
                    <button
                      key={`note-${n.voucher_id}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        appendNoteNo(n.tracking_no);
                        setShowNoteList(false);
                        onSelectSavedNote?.(n);
                      }}
                      className="flex w-full items-center text-[13px] px-2 py-1 hover:bg-gray-100 border-t border-gray-100"
                    >
                      <span className="flex-1 text-left font-semibold">{n.tracking_no}</span>
                      <span className="italic text-gray-600 text-xs">{fmtDate(n.date)}</span>
                    </button>
                  ))}
                {savedOrders
                  .filter(
                    (o) =>
                      !selectedNoteNos.includes(o.order_no) &&
                      !savedNotes.some((n) => n.tracking_no === o.order_no),
                  )
                  .map((o) => (
                    <button
                      key={`order-${o.voucher_id}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        appendNoteNo(o.order_no);
                        setShowNoteList(false);
                        onSelectSavedOrder?.(o);
                      }}
                      className="flex w-full items-center text-[13px] px-2 py-1 hover:bg-gray-100 border-t border-gray-100"
                    >
                      <span className="flex-1 text-left font-semibold">{o.order_no}</span>
                      <span className="italic text-gray-600 text-xs">{fmtDate(o.date)}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — receipt / transport fields (labels left-aligned, Tally) */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1">
            <span className={labelCls}>Receipt Doc No.</span>
            <span className="text-[13px] text-black shrink-0">:</span>
            <input
              type="text"
              className={inputCls}
              value={form.receipt_doc_no ?? ''}
              onChange={(e) => set('receipt_doc_no', e.target.value)}
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
    </TallyFieldPopup>
  );
}
