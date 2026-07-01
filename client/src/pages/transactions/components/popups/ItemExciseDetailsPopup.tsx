import { useState } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

export interface ExciseItemDetails {
  sales_invoice_number?: string;
  sales_invoice_date?: string;
  excise_sales_invoice?: string;
  rate_of_duty?: string;
  rate_per_unit?: string;
  supplier_duty_amount?: string;
  mfgr_importer_duty_amount?: string;
}

interface Props {
  itemName: string;
  initialDetails?: ExciseItemDetails | null;
  onClose: () => void;
  onSave: (details: ExciseItemDetails) => void;
}

const DUTY_FIELDS: [string, keyof ExciseItemDetails][] = [
  ["Rate of Duty", "rate_of_duty"],
  ["Rate per Unit", "rate_per_unit"],
  ["Supplier Duty Amount", "supplier_duty_amount"],
  ["Mfgr/Importer Duty Amount", "mfgr_importer_duty_amount"],
];

export default function ItemExciseDetailsPopup({ itemName, initialDetails, onClose, onSave }: Props) {
  const [form, setForm] = useState<ExciseItemDetails>({
    sales_invoice_number: initialDetails?.sales_invoice_number ?? "",
    sales_invoice_date: initialDetails?.sales_invoice_date ?? "",
    excise_sales_invoice: initialDetails?.excise_sales_invoice ?? "",
    rate_of_duty: initialDetails?.rate_of_duty ?? "",
    rate_per_unit: initialDetails?.rate_per_unit ?? "",
    supplier_duty_amount: initialDetails?.supplier_duty_amount ?? "",
    mfgr_importer_duty_amount: initialDetails?.mfgr_importer_duty_amount ?? "",
  });

  const set = (field: keyof ExciseItemDetails, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => onSave(form);

  const labelCls = "w-56 text-sm text-black shrink-0";
  const colonCls = "text-sm text-black shrink-0";
  const inputCls =
    "min-w-0 flex-1 text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black";

  return (
    <VoucherPopupShell
      title="Excise Details"
      headerRight={<span className="font-semibold text-black">{itemName}</span>}
      onClose={onClose}
      onAccept={handleSave}
    >
      <div className="max-w-2xl space-y-3">
        <div className="flex items-center gap-2">
          <span className={labelCls}>Sales Invoice Number</span>
          <span className={colonCls}>:</span>
          <input
            type="text"
            className={inputCls}
            value={form.sales_invoice_number ?? ""}
            onChange={(e) => set("sales_invoice_number", e.target.value)}
            autoFocus
          />
          <span className={colonCls}>Date</span>
          <span className={colonCls}>:</span>
          <input
            type="date"
            className="w-40 shrink-0 text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black"
            value={form.sales_invoice_date ?? ""}
            onChange={(e) => set("sales_invoice_date", e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className={labelCls}>Excise Sales Invoice</span>
          <span className={colonCls}>:</span>
          <input
            type="text"
            className={inputCls}
            value={form.excise_sales_invoice ?? ""}
            onChange={(e) => set("excise_sales_invoice", e.target.value)}
          />
        </div>

        {/* Duty Details section */}
        <div className="pt-5 pb-1 border-b border-gray-300">
          <span className="text-sm font-semibold text-black">Duty Details</span>
        </div>

        {DUTY_FIELDS.map(([label, key]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={labelCls}>{label}</span>
            <span className={colonCls}>:</span>
            <input
              type="text"
              inputMode="decimal"
              className={inputCls}
              value={form[key] ?? ""}
              onChange={(e) => set(key, e.target.value)}
            />
          </div>
        ))}
      </div>
    </VoucherPopupShell>
  );
}
