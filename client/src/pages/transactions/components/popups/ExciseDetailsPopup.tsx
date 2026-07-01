import { useState } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

export interface ExciseDetails {
  inspection_document_no?: string;
  inspection_document_date?: string;
}

interface Props {
  initialDetails?: ExciseDetails | null;
  onClose: () => void;
  onSave: (details: ExciseDetails) => void;
}

export default function ExciseDetailsPopup({ initialDetails, onClose, onSave }: Props) {
  const [form, setForm] = useState<ExciseDetails>({
    inspection_document_no: initialDetails?.inspection_document_no ?? "",
    inspection_document_date: initialDetails?.inspection_document_date ?? "",
  });

  const set = (field: keyof ExciseDetails, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => onSave(form);

  return (
    <VoucherPopupShell
      title="Tax Details"
      headerRight="Excise Details"
      onClose={onClose}
      onAccept={handleSave}
    >
      <div className="max-w-2xl">
        <div className="flex items-center gap-2">
          <span className="w-56 text-sm text-black shrink-0">Inspection document no.</span>
          <span className="text-sm text-black shrink-0">:</span>
          <input
            type="text"
            className="min-w-0 flex-1 text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black"
            value={form.inspection_document_no ?? ""}
            onChange={(e) => set("inspection_document_no", e.target.value)}
            autoFocus
          />
          <span className="text-sm text-black shrink-0">Date</span>
          <span className="text-sm text-black shrink-0">:</span>
          <input
            type="date"
            className="w-40 shrink-0 text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black"
            value={form.inspection_document_date ?? ""}
            onChange={(e) => set("inspection_document_date", e.target.value)}
          />
        </div>
      </div>
    </VoucherPopupShell>
  );
}
