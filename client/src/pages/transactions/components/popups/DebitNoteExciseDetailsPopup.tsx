import { useState } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

export interface DebitNoteExciseDetails {
  date_time_of_invoice?: string;
  date_time_of_removal?: string;
}

function defaultNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

interface Props {
  initialDetails?: DebitNoteExciseDetails | null;
  onClose: () => void;
  onSave: (details: DebitNoteExciseDetails) => void;
}

export default function DebitNoteExciseDetailsPopup({ initialDetails, onClose, onSave }: Props) {
  const [form, setForm] = useState<DebitNoteExciseDetails>({
    date_time_of_invoice: initialDetails?.date_time_of_invoice || defaultNow(),
    date_time_of_removal: initialDetails?.date_time_of_removal || defaultNow(),
  });

  const handleSave = () => onSave(form);

  const labelCls = "w-56 text-sm text-black shrink-0";
  const colonCls = "text-sm text-black shrink-0";
  const inputCls =
    "w-64 shrink-0 text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black";

  return (
    <VoucherPopupShell title="Excise Details" onClose={onClose} onAccept={handleSave}>
      <div className="max-w-2xl space-y-3">
        <div className="flex items-center gap-2">
          <span className={labelCls}>Date &amp; Time of Invoice</span>
          <span className={colonCls}>:</span>
          <input
            type="datetime-local"
            className={inputCls}
            value={form.date_time_of_invoice ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, date_time_of_invoice: e.target.value }))}
            autoFocus
          />
        </div>
        <div className="flex items-center gap-2">
          <span className={labelCls}>Date &amp; Time of Removal</span>
          <span className={colonCls}>:</span>
          <input
            type="datetime-local"
            className={inputCls}
            value={form.date_time_of_removal ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, date_time_of_removal: e.target.value }))}
          />
        </div>
      </div>
    </VoucherPopupShell>
  );
}
