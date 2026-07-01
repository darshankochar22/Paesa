import { useState } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

export interface DispatchDetails {
  delivery_note_nos?: string;
  dispatch_doc_no?: string;
  dispatched_through?: string;
  mode_terms_of_payment?: string;
  destination?: string;
  carrier_name?: string;
  bill_of_lading_no?: string;
  bill_of_lading_date?: string;
  motor_vehicle_no?: string;
  duration_of_process?: string;
  nature_of_processing?: string;
}

interface Props {
  initialDetails?: DispatchDetails | null;
  onClose: () => void;
  onSave: (details: DispatchDetails) => void;
  /** "jobWork" = Job Work In/Out Order layout (no delivery note nos, adds mode/terms + process instruction) */
  variant?: "jobWork";
}

const inputCls =
  "flex-1 min-w-0 text-sm bg-white border border-gray-400 px-1 py-0 outline-none focus:border-black";

export default function DispatchDetailsPopup({
  initialDetails,
  onClose,
  onSave,
  variant,
}: Props) {
  const [form, setForm] = useState<DispatchDetails>({
    delivery_note_nos: initialDetails?.delivery_note_nos ?? "",
    dispatch_doc_no: initialDetails?.dispatch_doc_no ?? "",
    dispatched_through: initialDetails?.dispatched_through ?? "",
    mode_terms_of_payment: initialDetails?.mode_terms_of_payment ?? "",
    destination: initialDetails?.destination ?? "",
    carrier_name: initialDetails?.carrier_name ?? "",
    bill_of_lading_no: initialDetails?.bill_of_lading_no ?? "",
    bill_of_lading_date: initialDetails?.bill_of_lading_date ?? "",
    motor_vehicle_no: initialDetails?.motor_vehicle_no ?? "",
    duration_of_process: initialDetails?.duration_of_process ?? "",
    nature_of_processing: initialDetails?.nature_of_processing ?? "",
  });

  const set = (field: keyof DispatchDetails, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // No mandatory fields - user can skip by clicking Accept
    onSave(form);
  };

  return (
    <VoucherPopupShell
      title="Dispatch Details"
      onClose={onClose}
      onAccept={handleSave}
    >
      {variant === "jobWork" ? (
        /* Job Work In/Out Order layout */
        <div className="max-w-[960px] space-y-3">
          {/* Row 1: Dispatched through | Mode/Terms of Payment */}
          <div className="flex gap-8">
            <div className="flex items-center gap-2 flex-1">
              <span className="w-36 text-sm text-black shrink-0">Dispatched through</span>
              <span className="text-sm text-black shrink-0">:</span>
              <input
                type="text"
                className={inputCls}
                value={form.dispatched_through ?? ""}
                onChange={(e) => set("dispatched_through", e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <span className="w-44 text-sm text-black shrink-0">Mode/Terms of Payment</span>
              <span className="text-sm text-black shrink-0">:</span>
              <input
                type="text"
                className={inputCls}
                value={form.mode_terms_of_payment ?? ""}
                onChange={(e) => set("mode_terms_of_payment", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-48 text-sm text-black shrink-0">Destination</span>
            <span className="text-sm text-black shrink-0">:</span>
            <input
              type="text"
              className={inputCls}
              value={form.destination ?? ""}
              onChange={(e) => set("destination", e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="w-48 text-sm text-black shrink-0">Carrier Name/Agent</span>
            <span className="text-sm text-black shrink-0">:</span>
            <input
              type="text"
              className={inputCls}
              value={form.carrier_name ?? ""}
              onChange={(e) => set("carrier_name", e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="w-48 text-sm text-black shrink-0">Bill of Lading/LR-RR No.</span>
            <span className="text-sm text-black shrink-0">:</span>
            <input
              type="text"
              className={inputCls}
              value={form.bill_of_lading_no ?? ""}
              onChange={(e) => set("bill_of_lading_no", e.target.value)}
            />
            <span className="text-sm text-black shrink-0 ml-4">Date</span>
            <span className="text-sm text-black shrink-0">:</span>
            <input
              type="date"
              className="w-36 shrink-0 text-sm bg-white border border-gray-400 px-1 py-0 outline-none focus:border-black"
              value={form.bill_of_lading_date ?? ""}
              onChange={(e) => set("bill_of_lading_date", e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="w-48 text-sm text-black shrink-0">Motor Vehicle No.</span>
            <span className="text-sm text-black shrink-0">:</span>
            <input
              type="text"
              className={inputCls}
              value={form.motor_vehicle_no ?? ""}
              onChange={(e) => set("motor_vehicle_no", e.target.value)}
            />
          </div>

          {/* Process Instruction section — white sub-header, bold + divider */}
          <div className="mt-6 pb-1 border-b border-gray-300 text-sm font-bold text-black">
            Process Instruction
          </div>

          <div className="flex items-center gap-2">
            <span className="w-48 text-sm text-black shrink-0">Duration of Process</span>
            <span className="text-sm text-black shrink-0">:</span>
            <input
              type="text"
              className={inputCls}
              value={form.duration_of_process ?? ""}
              onChange={(e) => set("duration_of_process", e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="w-48 text-sm text-black shrink-0">Nature of Processing</span>
            <span className="text-sm text-black shrink-0">:</span>
            <input
              type="text"
              className={inputCls}
              value={form.nature_of_processing ?? ""}
              onChange={(e) => set("nature_of_processing", e.target.value)}
            />
          </div>
        </div>
      ) : (
        /* Default (Sales / Delivery Note) layout */
        <div className="max-w-[960px] flex gap-8">
          {/* Left column */}
          <div className="w-56 shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-black shrink-0">Delivery Note No(s)</span>
              <span className="text-sm text-black shrink-0">:</span>
            </div>
            <input
              type="text"
              className="w-full text-sm bg-white border border-gray-400 px-1 py-0 outline-none focus:border-black"
              value={form.delivery_note_nos ?? ""}
              onChange={(e) => set("delivery_note_nos", e.target.value)}
              autoFocus
            />
          </div>

          {/* Right column */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-48 text-right text-sm text-black shrink-0">Dispatch Doc No.</span>
              <span className="text-sm text-black shrink-0">:</span>
              <input
                type="text"
                className={inputCls}
                value={form.dispatch_doc_no ?? ""}
                onChange={(e) => set("dispatch_doc_no", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-48 text-right text-sm text-black shrink-0">Dispatched through</span>
              <span className="text-sm text-black shrink-0">:</span>
              <input
                type="text"
                className={inputCls}
                value={form.dispatched_through ?? ""}
                onChange={(e) => set("dispatched_through", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-48 text-right text-sm text-black shrink-0">Destination</span>
              <span className="text-sm text-black shrink-0">:</span>
              <input
                type="text"
                className={inputCls}
                value={form.destination ?? ""}
                onChange={(e) => set("destination", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-48 text-right text-sm text-black shrink-0">Carrier Name/Agent</span>
              <span className="text-sm text-black shrink-0">:</span>
              <input
                type="text"
                className={inputCls}
                value={form.carrier_name ?? ""}
                onChange={(e) => set("carrier_name", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-48 text-right text-sm text-black shrink-0">Bill of Lading/LR-RR No.</span>
              <span className="text-sm text-black shrink-0">:</span>
              <input
                type="text"
                className={inputCls}
                value={form.bill_of_lading_no ?? ""}
                onChange={(e) => set("bill_of_lading_no", e.target.value)}
              />
              <span className="text-sm text-black shrink-0">Date</span>
              <span className="text-sm text-black shrink-0">:</span>
              <input
                type="date"
                className="w-36 shrink-0 text-sm bg-white border border-gray-400 px-1 py-0 outline-none focus:border-black"
                value={form.bill_of_lading_date ?? ""}
                onChange={(e) => set("bill_of_lading_date", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-48 text-right text-sm text-black shrink-0">Motor Vehicle No.</span>
              <span className="text-sm text-black shrink-0">:</span>
              <input
                type="text"
                className={inputCls}
                value={form.motor_vehicle_no ?? ""}
                onChange={(e) => set("motor_vehicle_no", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </VoucherPopupShell>
  );
}
