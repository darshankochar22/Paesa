import { useState, useEffect } from "react";

interface DispatchDetail {
  id: string;
  dispatch_date: string;
  place_of_dispatch: string;
  port_of_shipment?: string;
  port_of_destination?: string;
  shipping_mode: "Air" | "Sea" | "Rail" | "Road" | "Others";
  vehicle_number?: string;
  awb_or_bill_of_lading?: string;
  additional_notes?: string;
}

interface Props {
  partyName: string;
  totalAmount: number;
  initialDetails?: DispatchDetail | null;
  onClose: () => void;
  onSave: (details: DispatchDetail) => void;
}

export default function DispatchDetailsPopup({
  partyName,
  totalAmount,
  initialDetails,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<DispatchDetail>({
    id: initialDetails?.id ?? `dispatch_${Date.now()}`,
    dispatch_date: initialDetails?.dispatch_date ?? new Date().toISOString().split("T")[0],
    place_of_dispatch: initialDetails?.place_of_dispatch ?? "",
    port_of_shipment: initialDetails?.port_of_shipment ?? "",
    port_of_destination: initialDetails?.port_of_destination ?? "",
    shipping_mode: initialDetails?.shipping_mode ?? "Road",
    vehicle_number: initialDetails?.vehicle_number ?? "",
    awb_or_bill_of_lading: initialDetails?.awb_or_bill_of_lading ?? "",
    additional_notes: initialDetails?.additional_notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const set = (field: keyof DispatchDetail, value: any) => {
    setError(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.dispatch_date.trim()) {
      setError("Dispatch date is required.");
      return;
    }
    if (!form.place_of_dispatch.trim()) {
      setError("Place of dispatch is required.");
      return;
    }
    if (!form.shipping_mode) {
      setError("Shipping mode is required.");
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[550px] flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider">Dispatch Details</span>
            <span className="text-[10px] text-zinc-400 font-mono">Party: {partyName}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm">&times;</button>
        </div>

        {/* Amount Info */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2.5 flex justify-between items-center text-xs font-semibold text-zinc-700">
          <span>Invoice Amount:</span>
          <span className="font-mono text-zinc-900 text-sm">
            ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Form Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 min-h-0">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded flex justify-between items-center">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          {/* Dispatch Date */}
          <Field label="Dispatch Date *">
            <input
              type="date"
              value={form.dispatch_date}
              onChange={(e) => set("dispatch_date", e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* Place of Dispatch */}
          <Field label="Place of Dispatch *">
            <input
              type="text"
              value={form.place_of_dispatch}
              onChange={(e) => set("place_of_dispatch", e.target.value)}
              placeholder="e.g. Mumbai Warehouse"
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* Shipping Mode */}
          <Field label="Shipping Mode *">
            <select
              value={form.shipping_mode}
              onChange={(e) => set("shipping_mode", e.target.value as any)}
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            >
              <option value="Road">Road</option>
              <option value="Rail">Rail</option>
              <option value="Air">Air</option>
              <option value="Sea">Sea</option>
              <option value="Others">Others</option>
            </select>
          </Field>

          {/* Port of Shipment */}
          <Field label="Port of Shipment (Optional)">
            <input
              type="text"
              value={form.port_of_shipment ?? ""}
              onChange={(e) => set("port_of_shipment", e.target.value)}
              placeholder="e.g. Port of Mumbai"
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* Port of Destination */}
          <Field label="Port of Destination (Optional)">
            <input
              type="text"
              value={form.port_of_destination ?? ""}
              onChange={(e) => set("port_of_destination", e.target.value)}
              placeholder="e.g. Port of Shanghai"
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* Vehicle Number */}
          <Field label="Vehicle/Container Number (Optional)">
            <input
              type="text"
              value={form.vehicle_number ?? ""}
              onChange={(e) => set("vehicle_number", e.target.value)}
              placeholder="e.g. MH01AB1234 or CONT123456"
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* AWB or Bill of Lading */}
          <Field label="AWB / Bill of Lading (Optional)">
            <input
              type="text"
              value={form.awb_or_bill_of_lading ?? ""}
              onChange={(e) => set("awb_or_bill_of_lading", e.target.value)}
              placeholder="e.g. AWB123456 or BOL789"
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* Additional Notes */}
          <Field label="Additional Notes (Optional)">
            <textarea
              value={form.additional_notes ?? ""}
              onChange={(e) => set("additional_notes", e.target.value)}
              placeholder="Any special instructions or notes about the dispatch…"
              rows={3}
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white resize-none"
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500">Alt+A: Accept &nbsp;·&nbsp; Esc: Close</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 font-semibold shadow-sm active:scale-95"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</label>
      {children}
    </div>
  );
}
