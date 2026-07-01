import { useState } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

export interface VatNatureOfReturn {
  nature_of_return?: string;
}

const NATURE_OPTIONS = ["♦ Not Applicable", "Other Adjustments"];

interface Props {
  initialDetails?: { nature_of_return?: string } | null;
  onClose: () => void;
  onSave: (details: VatNatureOfReturn) => void;
}

export default function VatNatureOfReturnPopup({ initialDetails, onClose, onSave }: Props) {
  const [form, setForm] = useState<VatNatureOfReturn>({
    nature_of_return: initialDetails?.nature_of_return || NATURE_OPTIONS[0],
  });

  const handleSave = () => onSave(form);

  return (
    <VoucherPopupShell title="Additional Details" onClose={onClose} onAccept={handleSave}>
      <div className="max-w-2xl">
        <div className="flex items-center gap-2">
          <span className="w-40 text-sm text-black shrink-0">Nature of Return</span>
          <span className="text-sm text-black shrink-0">:</span>
          <select
            className="w-72 shrink-0 text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black"
            value={form.nature_of_return ?? ""}
            onChange={(e) => setForm({ nature_of_return: e.target.value })}
            autoFocus
          >
            {NATURE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>
    </VoucherPopupShell>
  );
}
