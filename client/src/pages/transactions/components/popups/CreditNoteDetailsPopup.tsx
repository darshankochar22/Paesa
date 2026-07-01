import { useState } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

export interface CreditNoteDetails {
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
  initialDetails?: CreditNoteDetails | null;
  onClose: () => void;
  onSave: (details: CreditNoteDetails) => void;
}

export default function CreditNoteDetailsPopup({
  initialDetails,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<CreditNoteDetails>({
    tracking_no: initialDetails?.tracking_no ?? "",
    dispatch_doc_no: initialDetails?.dispatch_doc_no ?? "",
    dispatched_through: initialDetails?.dispatched_through ?? "",
    destination: initialDetails?.destination ?? "",
    carrier_name: initialDetails?.carrier_name ?? "",
    bill_of_lading_no: initialDetails?.bill_of_lading_no ?? "",
    bill_of_lading_date: initialDetails?.bill_of_lading_date ?? "",
    motor_vehicle_no: initialDetails?.motor_vehicle_no ?? "",
    original_invoice_no: initialDetails?.original_invoice_no ?? "",
    original_invoice_date: initialDetails?.original_invoice_date ?? "",
  });

  const set = (field: keyof CreditNoteDetails, value: string) => {
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
      <div className="max-w-3xl">
        {/* Two-column layout matching Tally */}
        <div className="flex gap-8">
          {/* Left column */}
          <div className="w-56 shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-black shrink-0">Tracking No(s)</span>
              <span className="text-sm text-black shrink-0">:</span>
            </div>
            <input
              type="text"
              className="w-full text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
              value={form.tracking_no ?? ""}
              onChange={(e) => set("tracking_no", e.target.value)}
              autoFocus
            />
          </div>

          {/* Right column */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-48 text-right text-sm text-black shrink-0">Dispatch Doc No.</span>
              <span className="text-sm text-black shrink-0">:</span>
              <input
                type="text"
                className="flex-1 min-w-0 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
                value={form.dispatch_doc_no ?? ""}
                onChange={(e) => set("dispatch_doc_no", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-48 text-right text-sm text-black shrink-0">Dispatched through</span>
              <span className="text-sm text-black shrink-0">:</span>
              <input
                type="text"
                className="flex-1 min-w-0 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
                value={form.dispatched_through ?? ""}
                onChange={(e) => set("dispatched_through", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-48 text-right text-sm text-black shrink-0">Destination</span>
              <span className="text-sm text-black shrink-0">:</span>
              <input
                type="text"
                className="flex-1 min-w-0 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
                value={form.destination ?? ""}
                onChange={(e) => set("destination", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-48 text-right text-sm text-black shrink-0">Carrier Name/Agent</span>
              <span className="text-sm text-black shrink-0">:</span>
              <input
                type="text"
                className="flex-1 min-w-0 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
                value={form.carrier_name ?? ""}
                onChange={(e) => set("carrier_name", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-48 text-right text-sm text-black shrink-0">Bill of Lading/LR-RR No.</span>
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
              <span className="w-48 text-right text-sm text-black shrink-0">Motor Vehicle No.</span>
              <span className="text-sm text-black shrink-0">:</span>
              <input
                type="text"
                className="flex-1 min-w-0 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
                value={form.motor_vehicle_no ?? ""}
                onChange={(e) => set("motor_vehicle_no", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section: Original Invoice Details */}
        <div className="mt-6 pb-1 border-b border-gray-400 select-none">
          <span className="text-sm font-bold text-black">Original Invoice Details</span>
        </div>

        <div className="pt-4 flex gap-6">
          <div className="w-1/2 flex items-center gap-2">
            <span className="text-sm text-black shrink-0">Original Invoice No.</span>
            <span className="text-sm text-black shrink-0">:</span>
            <input
              type="text"
              className="flex-1 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
              value={form.original_invoice_no ?? ""}
              onChange={(e) => set("original_invoice_no", e.target.value)}
            />
          </div>
          <div className="w-1/2 flex items-center gap-2">
            <span className="w-16 text-sm text-black shrink-0">Date</span>
            <span className="text-sm text-black shrink-0">:</span>
            <input
              type="date"
              className="flex-1 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
              value={form.original_invoice_date ?? ""}
              onChange={(e) => set("original_invoice_date", e.target.value)}
            />
          </div>
        </div>
      </div>
    </VoucherPopupShell>
  );
}
