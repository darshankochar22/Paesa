import { useState, useEffect } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

export interface ReceiptDetails {
  receipt_note_no?: string;
  receipt_doc_no?: string;
  /** Additive: date paired with receipt_doc_no (server column may need adding). */
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

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
    receipt_note_no: d?.receipt_note_no ?? "",
    receipt_doc_no: d?.receipt_doc_no ?? "",
    receipt_doc_date: d?.receipt_doc_date ?? "",
    dispatched_through: d?.dispatched_through ?? "",
    destination: d?.destination ?? "",
    carrier_name: d?.carrier_name ?? "",
    bill_of_lading_no: d?.bill_of_lading_no ?? "",
    bill_of_lading_date: d?.bill_of_lading_date ?? "",
    motor_vehicle_no: d?.motor_vehicle_no ?? "",
  });

  const [form, setForm] = useState<ReceiptDetails>(() => buildForm(initialDetails));
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>([]);
  const [showNoteList, setShowNoteList] = useState(false);

  // Reference numbers of the party's saved Receipt/Delivery Notes.
  useEffect(() => {
    if (!companyId || !partyLedgerId || !noteVoucherType) return;
    (window as any).api.report.partyTrackingNumbers?.(companyId, partyLedgerId, noteVoucherType)
      .then((res: any) => { if (res?.success) setSavedNotes(res.trackingNumbers ?? []); })
      .catch(() => {});
  }, [companyId, partyLedgerId, noteVoucherType]);

  // Order numbers on the party's saved Purchase/Sales Orders — Tally offers
  // those in the same "List of Tracking Numbers".
  useEffect(() => {
    if (!companyId || !partyLedgerId || !orderVoucherType) return;
    (window as any).api.report.partyOrders?.(companyId, partyLedgerId, orderVoucherType)
      .then((res: any) => { if (res?.success) setSavedOrders(res.orders ?? []); })
      .catch(() => {});
  }, [companyId, partyLedgerId, orderVoucherType]);

  // Close the "List of Tracking Numbers" dropdown on an outside click.
  useEffect(() => {
    if (!showNoteList) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-rd-dd]")) setShowNoteList(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showNoteList]);

  // Multiple notes can be referenced on one invoice — comma-separated (Tally).
  const appendNoteNo = (value: string) =>
    setForm((prev) => {
      const parts = (prev.receipt_note_no ?? "").split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.includes(value)) return prev;
      return { ...prev, receipt_note_no: [...parts, value].join(", ") };
    });

  const selectedNoteNos = (form.receipt_note_no ?? "").split(",").map((p) => p.trim()).filter(Boolean);

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
    <VoucherPopupShell
      title="Receipt Details"
      onClose={onClose}
      onAccept={handleSave}
    >
      <div className="max-w-2xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-48 text-sm text-black shrink-0">Receipt Note No(s)</span>
          <span className="text-sm text-black shrink-0">:</span>
          <div data-rd-dd className="relative flex-1 min-w-0">
            <input
              type="text"
              className="w-full text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
              value={form.receipt_note_no ?? ""}
              onFocus={() => setShowNoteList(true)}
              onChange={(e) => set("receipt_note_no", e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") setShowNoteList(false); }}
              placeholder="Not Applicable"
              autoFocus
            />
            {showNoteList && (savedNotes.length > 0 || savedOrders.length > 0) && (
              <div className="absolute left-0 top-full mt-0.5 w-64 bg-white border border-gray-400 shadow-xl z-40">
                <div className="bg-white text-black text-[10px] font-bold px-2 py-1 border-b border-gray-300">List of Tracking Numbers</div>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); set("receipt_note_no", ""); setShowNoteList(false); }}
                  className="block w-full text-left text-sm px-2 py-1 hover:bg-gray-100"
                >
                  Not Applicable
                </button>
                {savedNotes.filter((n) => !selectedNoteNos.includes(n.tracking_no)).map((n) => (
                  <button
                    key={`note-${n.voucher_id}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      appendNoteNo(n.tracking_no);
                      setShowNoteList(false);
                      onSelectSavedNote?.(n);
                    }}
                    className="flex w-full items-center text-sm px-2 py-1 hover:bg-gray-100 border-t border-gray-100"
                  >
                    <span className="flex-1 text-left font-semibold">{n.tracking_no}</span>
                    <span className="italic text-gray-600 text-xs">{fmtDate(n.date)}</span>
                  </button>
                ))}
                {savedOrders
                  .filter((o) => !selectedNoteNos.includes(o.order_no) && !savedNotes.some((n) => n.tracking_no === o.order_no))
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
                      className="flex w-full items-center text-sm px-2 py-1 hover:bg-gray-100 border-t border-gray-100"
                    >
                      <span className="flex-1 text-left font-semibold">{o.order_no}</span>
                      <span className="italic text-gray-600 text-xs">{fmtDate(o.date)}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-48 text-sm text-black shrink-0">Receipt Doc No.</span>
          <span className="text-sm text-black shrink-0">:</span>
          <input
            type="text"
            className="flex-1 min-w-0 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
            value={form.receipt_doc_no ?? ""}
            onChange={(e) => set("receipt_doc_no", e.target.value)}
          />
          <span className="text-sm text-black shrink-0">Date</span>
          <span className="text-sm text-black shrink-0">:</span>
          <input
            type="date"
            className="w-36 shrink-0 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
            value={form.receipt_doc_date ?? ""}
            onChange={(e) => set("receipt_doc_date", e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="w-48 text-sm text-black shrink-0">Dispatched through</span>
          <span className="text-sm text-black shrink-0">:</span>
          <input
            type="text"
            className="flex-1 min-w-0 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
            value={form.dispatched_through ?? ""}
            onChange={(e) => set("dispatched_through", e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="w-48 text-sm text-black shrink-0">Destination</span>
          <span className="text-sm text-black shrink-0">:</span>
          <input
            type="text"
            className="flex-1 min-w-0 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
            value={form.destination ?? ""}
            onChange={(e) => set("destination", e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="w-48 text-sm text-black shrink-0">Carrier Name/Agent</span>
          <span className="text-sm text-black shrink-0">:</span>
          <input
            type="text"
            className="flex-1 min-w-0 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
            value={form.carrier_name ?? ""}
            onChange={(e) => set("carrier_name", e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="w-48 text-sm text-black shrink-0">Bill of Lading/LR-RR No.</span>
          <span className="text-sm text-black shrink-0">:</span>
          <input
            type="text"
            className="flex-1 min-w-0 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
            value={form.bill_of_lading_no ?? ""}
            onChange={(e) => set("bill_of_lading_no", e.target.value)}
          />
          <span className="text-sm text-black shrink-0">Date</span>
          <span className="text-sm text-black shrink-0">:</span>
          <input
            type="date"
            className="w-36 shrink-0 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
            value={form.bill_of_lading_date ?? ""}
            onChange={(e) => set("bill_of_lading_date", e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="w-48 text-sm text-black shrink-0">Motor Vehicle No.</span>
          <span className="text-sm text-black shrink-0">:</span>
          <input
            type="text"
            className="flex-1 min-w-0 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
            value={form.motor_vehicle_no ?? ""}
            onChange={(e) => set("motor_vehicle_no", e.target.value)}
          />
        </div>
      </div>
    </VoucherPopupShell>
  );
}
