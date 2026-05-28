import { useState, useEffect } from "react";
import type { DispatchDetail } from "../../types";
import PopupShell from "./shared/PopupShell";
import Field from "./shared/Field";

interface Props {
  partyName: string;
  totalAmount: number;
  initialDetails?: DispatchDetail | null;
  onClose: () => void;
  onSave: (details: DispatchDetail) => void;
}

const cls =
  "text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white";

export default function DispatchDetailsPopup({
  partyName,
  totalAmount,
  initialDetails,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<DispatchDetail>({
    id: "",
    dispatch_date: "",
    place_of_dispatch: initialDetails?.place_of_dispatch ?? "",
    port_of_dispatch: initialDetails?.port_of_dispatch ?? "",
    port_of_shipment: initialDetails?.port_of_shipment ?? "",
    port_of_destination: initialDetails?.port_of_destination ?? "",
    shipping_mode: initialDetails?.shipping_mode ?? "Road",
    vehicle_number: initialDetails?.vehicle_number ?? "",
    awb_or_bill_of_lading: initialDetails?.awb_or_bill_of_lading ?? "",
    additional_notes: initialDetails?.additional_notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      id: initialDetails?.id ?? `dispatch_${Date.now()}`,
      dispatch_date: initialDetails?.dispatch_date ?? new Date().toISOString().split("T")[0],
    }));
  }, [initialDetails]);

  const set = (field: keyof DispatchDetail, value: any) => {
    setError(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.dispatch_date.trim()) { setError("Dispatch date is required."); return; }
    if (!form.place_of_dispatch.trim()) { setError("Place of dispatch is required."); return; }
    if (!form.shipping_mode) { setError("Shipping mode is required."); return; }
    onSave(form);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);

  }, [form]);

  return (
    <PopupShell
      title="Dispatch Details"
      subtitle={`Party: ${partyName}`}
      width="w-[550px]"
      onClose={onClose}
      onAccept={handleSave}
      infoBar={
        <div className="flex justify-between items-center text-xs font-semibold text-zinc-700">
          <span>Invoice Amount:</span>
          <span className="font-mono text-zinc-900 text-sm">
            ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      }
    >
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded flex justify-between items-center">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="font-bold">&times;</button>
        </div>
      )}

      <Field label="Dispatch Date *">
        <input
          type="date"
          value={form.dispatch_date}
          onChange={(e) => set("dispatch_date", e.target.value)}
          className={cls}
        />
      </Field>

      <Field label="Place of Dispatch *">
        <input
          type="text"
          value={form.place_of_dispatch}
          onChange={(e) => set("place_of_dispatch", e.target.value)}
          placeholder="e.g. Mumbai Warehouse"
          className={cls}
        />
      </Field>

      <Field label="Shipping Mode *">
        <select
          value={form.shipping_mode}
          onChange={(e) => set("shipping_mode", e.target.value as DispatchDetail["shipping_mode"])}
          className={cls}
        >
          <option value="Road">Road</option>
          <option value="Rail">Rail</option>
          <option value="Air">Air</option>
          <option value="Sea">Sea</option>
          <option value="Others">Others</option>
        </select>
      </Field>

      <Field label="Port of Shipment (Optional)">
        <input
          type="text"
          value={form.port_of_shipment ?? ""}
          onChange={(e) => set("port_of_shipment", e.target.value)}
          placeholder="e.g. Port of Mumbai"
          className={cls}
        />
      </Field>

      <Field label="Port of Destination (Optional)">
        <input
          type="text"
          value={form.port_of_destination ?? ""}
          onChange={(e) => set("port_of_destination", e.target.value)}
          placeholder="e.g. Port of Shanghai"
          className={cls}
        />
      </Field>

      <Field label="Vehicle / Container Number (Optional)">
        <input
          type="text"
          value={form.vehicle_number ?? ""}
          onChange={(e) => set("vehicle_number", e.target.value)}
          placeholder="e.g. MH01AB1234"
          className={cls}
        />
      </Field>

      <Field label="AWB / Bill of Lading (Optional)">
        <input
          type="text"
          value={form.awb_or_bill_of_lading ?? ""}
          onChange={(e) => set("awb_or_bill_of_lading", e.target.value)}
          placeholder="e.g. AWB123456"
          className={cls}
        />
      </Field>

      <Field label="Additional Notes (Optional)">
        <textarea
          value={form.additional_notes ?? ""}
          onChange={(e) => set("additional_notes", e.target.value)}
          placeholder="Any special instructions or notes…"
          rows={3}
          className={cls + " resize-none"}
        />
      </Field>
    </PopupShell>
  );
}