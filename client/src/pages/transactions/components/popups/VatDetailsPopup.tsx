import { useState } from 'react';
import { TallyFieldPopup } from '@/components/tally-ui/TallyFieldPopup';

export interface VatDetails {
  date_time?: string;
}

interface Props {
  initialDetails?: VatDetails | null;
  /** Voucher date ("YYYY-MM-DD"). When provided, an empty datetime defaults
   *  to the voucher date at 00:00 instead of the machine's current time. */
  voucherDate?: string;
  onClose: () => void;
  onSave: (details: VatDetails) => void;
}

function defaultNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default function VatDetailsPopup({ initialDetails, voucherDate, onClose, onSave }: Props) {
  const defaultDateTime = voucherDate ? `${voucherDate.slice(0, 10)}T00:00` : defaultNow();
  const [form, setForm] = useState<VatDetails>({
    date_time: initialDetails?.date_time || defaultDateTime,
  });

  const handleSave = () => onSave(form);

  return (
    <TallyFieldPopup title="VAT Details" onClose={onClose} onAccept={handleSave} width={420}>
      <div className="flex items-center gap-1">
        <span className="w-28 text-[13px] text-black shrink-0">Date &amp; Time</span>
        <span className="text-[13px] text-black shrink-0">:</span>
        <input
          type="datetime-local"
          className="flex-1 min-w-0 text-[13px] bg-transparent border-b border-gray-300 px-1 py-0 outline-none focus:bg-gray-200 focus:border-black"
          value={form.date_time ?? ''}
          onChange={(e) => setForm({ date_time: e.target.value })}
          autoFocus
        />
      </div>
    </TallyFieldPopup>
  );
}
