import { useState } from 'react';
import { TallyFieldPopup } from '@/components/tally-ui/TallyFieldPopup';

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
    inspection_document_no: initialDetails?.inspection_document_no ?? '',
    inspection_document_date: initialDetails?.inspection_document_date ?? '',
  });

  const set = (field: keyof ExciseDetails, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => onSave(form);

  return (
    <TallyFieldPopup title="Excise Details" onClose={onClose} onAccept={handleSave} width={420}>
      <div className="flex items-center gap-1">
        <span className="text-[13px] text-black shrink-0">Inspection document no.</span>
        <span className="text-[13px] text-black shrink-0">:</span>
        <input
          type="text"
          className="flex-1 min-w-0 text-[13px] bg-transparent border-b border-gray-300 px-1 py-0 outline-none focus:bg-gray-200 focus:border-black"
          value={form.inspection_document_no ?? ''}
          onChange={(e) => set('inspection_document_no', e.target.value)}
          autoFocus
        />
        <span className="text-[13px] text-black shrink-0 ml-1">Date</span>
        <span className="text-[13px] text-black shrink-0">:</span>
        <input
          type="date"
          className="w-24 shrink-0 text-[13px] bg-transparent border-b border-gray-300 px-1 py-0 outline-none focus:bg-gray-200 focus:border-black"
          value={form.inspection_document_date ?? ''}
          onChange={(e) => set('inspection_document_date', e.target.value)}
        />
      </div>
    </TallyFieldPopup>
  );
}
