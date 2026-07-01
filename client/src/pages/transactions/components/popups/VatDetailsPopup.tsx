import { useState } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

export interface VatDetails {
  date_time?: string;
}

interface Props {
  initialDetails?: VatDetails | null;
  onClose: () => void;
  onSave: (details: VatDetails) => void;
}

function defaultNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function VatDetailsPopup({ initialDetails, onClose, onSave }: Props) {
  const [form, setForm] = useState<VatDetails>({
    date_time: initialDetails?.date_time || defaultNow(),
  });

  const handleSave = () => onSave(form);

  return (
    <VoucherPopupShell title="VAT Details" onClose={onClose} onAccept={handleSave}>
      <div className="max-w-2xl">
        <div className="flex items-center gap-2">
          <span className="w-32 text-sm text-black shrink-0">Date &amp; Time</span>
          <span className="text-sm text-black shrink-0">:</span>
          <input
            type="datetime-local"
            className="w-64 shrink-0 text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black"
            value={form.date_time ?? ""}
            onChange={(e) => setForm({ date_time: e.target.value })}
            autoFocus
          />
        </div>
      </div>
    </VoucherPopupShell>
  );
}
