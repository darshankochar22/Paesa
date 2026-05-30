import { useState, useEffect } from "react";

export interface ReceiptDetail {
  id: string;
  // Existing fields
  receipt_date?: string;
  receipt_reference_number?: string;
  supplier_invoice_number?: string;
  location_received?: string;
  quantity_received?: string;
  condition_status?: string;
  inspection_notes?: string;
  received_by?: string;

  // Tally fields
  receipt_note_no?: string;
  receipt_doc_no?: string;
  dispatched_through?: string;
  destination?: string;
  carrier_name?: string;
  bill_of_lading_no?: string;
  bill_of_lading_date?: string;
  motor_vehicle_no?: string;
}

interface Props {
  partyName: string;
  totalAmount: number;
  initialDetails?: ReceiptDetail | null;
  onClose: () => void;
  onSave: (details: ReceiptDetail) => void;
}

export default function ReceiptDetailsPopup({
  partyName,
  initialDetails,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<ReceiptDetail>({
    id: initialDetails?.id ?? `receipt_${Date.now()}`,
    receipt_date: initialDetails?.receipt_date ?? new Date().toISOString().split("T")[0],
    receipt_reference_number: initialDetails?.receipt_reference_number ?? "",
    supplier_invoice_number: initialDetails?.supplier_invoice_number ?? "",
    location_received: initialDetails?.location_received ?? "",
    quantity_received: initialDetails?.quantity_received ?? "",
    condition_status: initialDetails?.condition_status ?? "Good",
    inspection_notes: initialDetails?.inspection_notes ?? "",
    received_by: initialDetails?.received_by ?? "",

    // Tally fields initialization
    receipt_note_no: initialDetails?.receipt_note_no ?? "",
    receipt_doc_no: initialDetails?.receipt_doc_no ?? "",
    dispatched_through: initialDetails?.dispatched_through ?? "",
    destination: initialDetails?.destination ?? "",
    carrier_name: initialDetails?.carrier_name ?? "",
    bill_of_lading_no: initialDetails?.bill_of_lading_no ?? "",
    bill_of_lading_date: initialDetails?.bill_of_lading_date ?? "",
    motor_vehicle_no: initialDetails?.motor_vehicle_no ?? "",
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const set = (field: keyof ReceiptDetail, value: any) => {
    setError(null);
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-map Tally fields to existing fields for backward compatibility
      if (field === "receipt_note_no") updated.receipt_reference_number = value;
      if (field === "receipt_doc_no") updated.id = value;
      if (field === "motor_vehicle_no") updated.received_by = value; // Fallback mapping
      if (field === "bill_of_lading_no") updated.supplier_invoice_number = value; // Fallback mapping
      
      return updated;
    });
  };

  const handleSave = () => {
    onSave(form);
  };

  // Common styling for TallyPrime-like fields
  const fieldInputClass =
    "w-full text-xs font-bold font-mono px-2 py-0.5 border border-zinc-300 focus:border-amber-500/80 bg-white focus:bg-[#fffbeb] focus:ring-1 focus:ring-amber-500/40 outline-none rounded-sm transition-colors text-black";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
      <div className="bg-white border-2 border-zinc-400 shadow-2xl w-[720px] flex flex-col max-h-[90vh] overflow-hidden rounded-sm">
        
        {/* Header / Title */}
        <div className="pt-4 pb-2 text-center border-b border-zinc-100 select-none">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 border-b-2 border-zinc-800 pb-0.5">
            Receipt Details
          </span>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">Supplier: {partyName}</div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto min-h-0">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded flex justify-between items-center animate-slide-down mb-4">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          {/* Two Column Layout matching TallyPrime screenshot */}
          <div className="grid grid-cols-12 gap-6">
            
            {/* Left Column: Receipt Note */}
            <div className="col-span-5 space-y-2">
              <div className="flex justify-between items-center text-xs font-medium text-zinc-700 select-none">
                <span>Receipt Note No(s)</span>
                <span className="text-zinc-400">:</span>
              </div>
              <input
                type="text"
                value={form.receipt_note_no}
                onChange={(e) => set("receipt_note_no", e.target.value)}
                className={`${fieldInputClass} h-7`}
                autoFocus
              />
            </div>

            {/* Right Column: Other Receipt Details */}
            <div className="col-span-7 space-y-2.5">
              
              {/* Receipt Doc No. */}
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-5 text-xs font-medium text-zinc-700 select-none">
                  Receipt Doc No.
                </div>
                <div className="col-span-1 text-xs font-medium text-zinc-400 text-center select-none">:</div>
                <div className="col-span-6">
                  <input
                    type="text"
                    value={form.receipt_doc_no}
                    onChange={(e) => set("receipt_doc_no", e.target.value)}
                    className={fieldInputClass}
                  />
                </div>
              </div>

              {/* Dispatched through */}
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-5 text-xs font-medium text-zinc-700 select-none">
                  Dispatched through
                </div>
                <div className="col-span-1 text-xs font-medium text-zinc-400 text-center select-none">:</div>
                <div className="col-span-6">
                  <input
                    type="text"
                    value={form.dispatched_through}
                    onChange={(e) => set("dispatched_through", e.target.value)}
                    className={fieldInputClass}
                  />
                </div>
              </div>

              {/* Destination */}
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-5 text-xs font-medium text-zinc-700 select-none">
                  Destination
                </div>
                <div className="col-span-1 text-xs font-medium text-zinc-400 text-center select-none">:</div>
                <div className="col-span-6">
                  <input
                    type="text"
                    value={form.destination}
                    onChange={(e) => set("destination", e.target.value)}
                    className={fieldInputClass}
                  />
                </div>
              </div>

              {/* Carrier Name/Agent */}
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-5 text-xs font-medium text-zinc-700 select-none">
                  Carrier Name/Agent
                </div>
                <div className="col-span-1 text-xs font-medium text-zinc-400 text-center select-none">:</div>
                <div className="col-span-6">
                  <input
                    type="text"
                    value={form.carrier_name}
                    onChange={(e) => set("carrier_name", e.target.value)}
                    className={fieldInputClass}
                  />
                </div>
              </div>

              {/* Bill of Lading / LR-RR No. & Date inline */}
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-5 text-xs font-medium text-zinc-700 select-none whitespace-nowrap">
                  Bill of Lading/LR-RR No.
                </div>
                <div className="col-span-1 text-xs font-medium text-zinc-400 text-center select-none">:</div>
                <div className="col-span-6 flex gap-2 items-center">
                  <input
                    type="text"
                    value={form.bill_of_lading_no}
                    onChange={(e) => set("bill_of_lading_no", e.target.value)}
                    className={`${fieldInputClass} w-2/3`}
                  />
                  <span className="text-xs font-medium text-zinc-700 select-none">Date:</span>
                  <input
                    type="text"
                    value={form.bill_of_lading_date}
                    onChange={(e) => set("bill_of_lading_date", e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className={`${fieldInputClass} w-1/3`}
                  />
                </div>
              </div>

              {/* Motor Vehicle No. */}
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-5 text-xs font-medium text-zinc-700 select-none">
                  Motor Vehicle No.
                </div>
                <div className="col-span-1 text-xs font-medium text-zinc-400 text-center select-none">:</div>
                <div className="col-span-6">
                  <input
                    type="text"
                    value={form.motor_vehicle_no}
                    onChange={(e) => set("motor_vehicle_no", e.target.value)}
                    className={fieldInputClass}
                  />
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500 font-mono">
            <span className="underline">Alt+A</span>: Accept &nbsp;·&nbsp; <span className="underline">Esc</span>: Close
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 font-semibold shadow-sm active:scale-95 transition-all"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
