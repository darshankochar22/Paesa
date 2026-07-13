import { useState } from 'react';
import { TallyFieldPopup } from '@/components/tally-ui/TallyFieldPopup';

export interface DebitNoteExciseDetails {
  date_time_of_invoice?: string;
  date_time_of_removal?: string;
}

function defaultNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

interface Props {
  initialDetails?: DebitNoteExciseDetails | null;
  /** Voucher date ("YYYY-MM-DD"). When provided, empty datetimes default to
   *  the voucher date at 00:00 instead of the machine's current time. */
  voucherDate?: string;
  onClose: () => void;
  onSave: (details: DebitNoteExciseDetails) => void;
}

export default function DebitNoteExciseDetailsPopup({
  initialDetails,
  voucherDate,
  onClose,
  onSave,
}: Props) {
  const defaultDateTime = voucherDate ? `${voucherDate.slice(0, 10)}T00:00` : defaultNow();
  const [form, setForm] = useState<DebitNoteExciseDetails>({
    date_time_of_invoice: initialDetails?.date_time_of_invoice || defaultDateTime,
    date_time_of_removal: initialDetails?.date_time_of_removal || defaultDateTime,
  });

  const handleSave = () => onSave(form);

  const labelCls = 'w-52 text-[13px] text-black shrink-0';
  const colonCls = 'text-[13px] text-black shrink-0';
  const inputCls =
    'flex-1 min-w-0 text-[13px] bg-transparent border-b border-gray-300 px-1 py-0 outline-none focus:bg-gray-200 focus:border-black';

  return (
    <TallyFieldPopup title="Excise Details" onClose={onClose} onAccept={handleSave} width={480}>
      <div className="space-y-1.5">
        <div className="flex items-center gap-1">
          <span className={labelCls}>Date &amp; Time of Invoice</span>
          <span className={colonCls}>:</span>
          <input
            type="datetime-local"
            className={inputCls}
            value={form.date_time_of_invoice ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, date_time_of_invoice: e.target.value }))}
            autoFocus
          />
        </div>
        <div className="flex items-center gap-1">
          <span className={labelCls}>Date &amp; Time of Removal</span>
          <span className={colonCls}>:</span>
          <input
            type="datetime-local"
            className={inputCls}
            value={form.date_time_of_removal ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, date_time_of_removal: e.target.value }))}
          />
        </div>
      </div>
    </TallyFieldPopup>
  );
}
