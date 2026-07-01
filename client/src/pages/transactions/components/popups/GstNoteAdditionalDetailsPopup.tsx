import { useState } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

export interface GstNoteAdditionalDetails {
  reason_for_issuing_note?: string;
  supplier_note_no?: string;
  supplier_note_date?: string;
}

const REASON_OPTIONS = [
  "♦ Not Applicable",
  "04-Correction in Invoice",
  "05-Change in POS",
  "06-Finalization of Provisional assessment",
  "07-Others",
];

interface Props {
  initialDetails?: GstNoteAdditionalDetails | null;
  onClose: () => void;
  onSave: (details: GstNoteAdditionalDetails) => void;
}

export default function GstNoteAdditionalDetailsPopup({ initialDetails, onClose, onSave }: Props) {
  const [form, setForm] = useState<GstNoteAdditionalDetails>({
    reason_for_issuing_note: initialDetails?.reason_for_issuing_note || REASON_OPTIONS[0],
    supplier_note_no: initialDetails?.supplier_note_no ?? "",
    supplier_note_date: initialDetails?.supplier_note_date ?? "",
  });

  const handleSave = () => onSave(form);

  const labelCls = "w-64 text-sm text-black shrink-0";
  const colonCls = "text-sm text-black shrink-0";

  return (
    <VoucherPopupShell title="Additional Details" onClose={onClose} onAccept={handleSave}>
      <div className="max-w-2xl space-y-3">
        <div className="flex items-center gap-2">
          <span className={labelCls}>Reason for Issuing Note</span>
          <span className={colonCls}>:</span>
          <select
            className="min-w-0 flex-1 text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black"
            value={form.reason_for_issuing_note ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, reason_for_issuing_note: e.target.value }))}
            autoFocus
          >
            {REASON_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className={labelCls}>Supplier's Debit/Credit Note No.</span>
          <span className={colonCls}>:</span>
          <input
            type="text"
            className="min-w-0 flex-1 text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black"
            value={form.supplier_note_no ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, supplier_note_no: e.target.value }))}
          />
          <span className={colonCls}>Date</span>
          <span className={colonCls}>:</span>
          <input
            type="date"
            className="w-40 shrink-0 text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black"
            value={form.supplier_note_date ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, supplier_note_date: e.target.value }))}
          />
        </div>
      </div>
    </VoucherPopupShell>
  );
}
