import { useState } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

export interface ReceiptDetails {
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
  initialDetails?: ReceiptDetails | null;
  onClose: () => void;
  onSave: (details: ReceiptDetails) => void;
}

export default function ReceiptDetailsPopup({
  initialDetails,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<ReceiptDetails>({
    receipt_note_no: initialDetails?.receipt_note_no ?? "",
    receipt_doc_no: initialDetails?.receipt_doc_no ?? "",
    dispatched_through: initialDetails?.dispatched_through ?? "",
    destination: initialDetails?.destination ?? "",
    carrier_name: initialDetails?.carrier_name ?? "",
    bill_of_lading_no: initialDetails?.bill_of_lading_no ?? "",
    bill_of_lading_date: initialDetails?.bill_of_lading_date ?? "",
    motor_vehicle_no: initialDetails?.motor_vehicle_no ?? "",
  });

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
          <input
            type="text"
            className="flex-1 min-w-0 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white"
            value={form.receipt_note_no ?? ""}
            onChange={(e) => set("receipt_note_no", e.target.value)}
            autoFocus
          />
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
