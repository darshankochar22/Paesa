import { useEffect } from "react";

const PRIMARY_VOUCHER_TYPES = [
  { key: "Contra", label: "Contra" },
  { key: "Payment", label: "Payment" },
  { key: "Receipt", label: "Receipt" },
  { key: "Journal", label: "Journal" },
  { key: "Sales", label: "Sales" },
  { key: "Purchase", label: "Purchase" },
];

const OTHER_VOUCHER_TYPES = [
  { key: "Attendance", label: "Attendance" },
  { key: "Credit Note", label: "Credit Note" },
  { key: "Debit Note", label: "Debit Note" },
  { key: "Delivery Note", label: "Delivery Note" },
  { key: "Job Work In Order", label: "Job Work In Order" },
  { key: "Job Work Out Order", label: "Job Work Out Order" },
  { key: "Material In", label: "Material In" },
  { key: "Material Out", label: "Material Out" },
  { key: "Memorandum", label: "Memorandum" },
  { key: "Payroll", label: "Payroll" },
  { key: "Physical Stock", label: "Physical Stock" },
  { key: "Purchase Order", label: "Purchase Order" },
  { key: "Receipt Note", label: "Receipt Note" },
  { key: "Rejections In", label: "Rejections In" },
  { key: "Rejections Out", label: "Rejections Out" },
  { key: "Reversing Journal", label: "Reversing Journal" },
  { key: "Sales Order", label: "Sales Order" },
  { key: "Stock Journal", label: "Stock Journal" },
];

interface Props {
  voucherType: string;
  onClose: () => void;
  onSelect: (type: string) => void;
}

export default function OtherVouchersPopup({
  voucherType,
  onClose,
  onSelect,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[360px] flex flex-col max-h-[85vh] overflow-hidden">
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <span className="text-xs font-bold uppercase tracking-wider">
            Other Vouchers
          </span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white font-bold text-sm"
          >
            &times;
          </button>
        </div>

        <div className="p-2 flex-1 overflow-y-auto min-h-0">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Primary Vouchers
          </div>
          {PRIMARY_VOUCHER_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => onSelect(t.key)}
              className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                voucherType === t.key
                  ? "bg-zinc-100 font-semibold text-black"
                  : "text-black hover:bg-zinc-50"
              }`}
            >
              {t.label}
            </button>
          ))}

          <div className="px-3 py-1 mt-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-t border-zinc-200 pt-3">
            Other Vouchers
          </div>
          {OTHER_VOUCHER_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => onSelect(t.key)}
              className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                voucherType === t.key
                  ? "bg-zinc-100 font-semibold text-black"
                  : "text-black hover:bg-zinc-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="border-t border-zinc-200 px-3 py-2 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500">Esc: Close</span>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
