import { useState } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

export interface VatAdditionalDetails {
  point_of_sale?: string;
}

interface Props {
  initialDetails?: { point_of_sale?: string } | null;
  onClose: () => void;
  onSave: (details: VatAdditionalDetails) => void;
}

export default function VatAdditionalDetailsPopup({ initialDetails, onClose, onSave }: Props) {
  const [form, setForm] = useState<VatAdditionalDetails>({
    point_of_sale: initialDetails?.point_of_sale ?? "",
  });

  const handleSave = () => onSave(form);

  return (
    <VoucherPopupShell
      title="Additional Details"
      headerRight="Sales Taxable"
      onClose={onClose}
      onAccept={handleSave}
    >
      <div className="max-w-2xl">
        <div className="flex items-center gap-2">
          <span className="w-36 text-sm text-black shrink-0">Point of Sale</span>
          <span className="text-sm text-black shrink-0">:</span>
          <input
            type="text"
            className="w-72 shrink-0 text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black"
            value={form.point_of_sale ?? ""}
            onChange={(e) => setForm({ point_of_sale: e.target.value })}
            autoFocus
          />
        </div>
      </div>
    </VoucherPopupShell>
  );
}
