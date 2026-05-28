import { useState, useEffect } from "react";
import type { ReceiptDetail } from "../../types";
import PopupShell from "./shared/PopupShell";
import Field from "./shared/Field";

interface Props {
  partyName: string;
  totalAmount: number;
  initialDetails?: ReceiptDetail | null;
  onClose: () => void;
  onSave: (details: ReceiptDetail) => void;
}

const cls =
  "text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white";

export default function ReceiptDetailsPopup({
  partyName,
  totalAmount,
  initialDetails,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<ReceiptDetail>(() => ({
    id: initialDetails?.id ?? `receipt_${Date.now()}`,
    receipt_date: initialDetails?.receipt_date ?? new Date().toISOString().split("T")[0],
    receipt_reference_number: initialDetails?.receipt_reference_number ?? "",
    supplier_invoice_number: initialDetails?.supplier_invoice_number ?? "",
    location_received: initialDetails?.location_received ?? "",
    quantity_received: initialDetails?.quantity_received ?? "",
    condition_status: initialDetails?.condition_status ?? "Good",
    inspection_notes: initialDetails?.inspection_notes ?? "",
    received_by: initialDetails?.received_by ?? "",
  }));
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof ReceiptDetail, value: any) => {
    setError(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.receipt_date.trim()) { setError("Receipt date is required."); return; }
    if (!form.receipt_reference_number.trim()) { setError("Receipt reference number is required."); return; }
    if (!form.condition_status) { setError("Condition status is required."); return; }
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
      title="Receipt Details"
      subtitle={`Supplier: ${partyName}`}
      width="w-[550px]"
      onClose={onClose}
      onAccept={handleSave}
      infoBar={
        <div className="flex justify-between items-center text-xs font-semibold text-zinc-700">
          <span>Purchase Amount:</span>
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

      <Field label="Receipt Date *">
        <input
          type="date"
          value={form.receipt_date}
          onChange={(e) => set("receipt_date", e.target.value)}
          className={cls}
        />
      </Field>

      <Field label="Receipt Reference Number / GRN *">
        <input
          type="text"
          value={form.receipt_reference_number}
          onChange={(e) => set("receipt_reference_number", e.target.value)}
          placeholder="e.g. GRN-2024-001"
          className={cls}
        />
      </Field>

      <Field label="Supplier Invoice Number (Optional)">
        <input
          type="text"
          value={form.supplier_invoice_number ?? ""}
          onChange={(e) => set("supplier_invoice_number", e.target.value)}
          placeholder="e.g. INV-2024-5678"
          className={cls}
        />
      </Field>

      <Field label="Location / Godown (Optional)">
        <input
          type="text"
          value={form.location_received ?? ""}
          onChange={(e) => set("location_received", e.target.value)}
          placeholder="e.g. Warehouse A, Shelf 5"
          className={cls}
        />
      </Field>

      <Field label="Quantity Received (Optional)">
        <input
          type="text"
          value={form.quantity_received ?? ""}
          onChange={(e) => set("quantity_received", e.target.value)}
          placeholder="e.g. 100 units / 50 boxes"
          className={cls}
        />
      </Field>

      <Field label="Condition Status *">
        <select
          value={form.condition_status}
          onChange={(e) => set("condition_status", e.target.value as ReceiptDetail["condition_status"])}
          className={cls}
        >
          <option value="Good">Good</option>
          <option value="Damaged">Damaged</option>
          <option value="Partial">Partial Damage</option>
          <option value="Others">Others</option>
        </select>
      </Field>

      <Field label="Inspection / Quality Notes (Optional)">
        <textarea
          value={form.inspection_notes ?? ""}
          onChange={(e) => set("inspection_notes", e.target.value)}
          placeholder="Note any defects, quality issues, or inspection findings…"
          rows={3}
          className={cls + " resize-none"}
        />
      </Field>

      <Field label="Received By / Inspector (Optional)">
        <input
          type="text"
          value={form.received_by ?? ""}
          onChange={(e) => set("received_by", e.target.value)}
          placeholder="e.g. John Doe / QC Inspector"
          className={cls}
        />
      </Field>
    </PopupShell>
  );
}