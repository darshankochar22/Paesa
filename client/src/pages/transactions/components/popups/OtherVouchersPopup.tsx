import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

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
  { key: "Manufacturing Journal", label: "Manufacturing Journal" },
  { key: "Memorandum", label: "Memorandum" },
  { key: "Payroll", label: "Payroll" },
  { key: "Physical Stock", label: "Physical Stock" },
  { key: "Purchase Order", label: "Purchase Order" },
  { key: "Receipt Note", label: "Receipt Note" },
  { key: "Rejection In", label: "Rejection In" },
  { key: "Rejection Out", label: "Rejection Out" },
  { key: "Reversing Journal", label: "Reversing Journal" },
  { key: "Sales Order", label: "Sales Order" },
  { key: "Stock Journal", label: "Stock Journal" },
];

interface Props {
  voucherType: string;
  onClose: () => void;
  onSelect: (type: string) => void;
  voucherTypeChildren: Record<string, string[]>;
}

export default function OtherVouchersPopup({
  voucherType,
  onClose,
  onSelect,
  voucherTypeChildren,
}: Props) {
  const renderTypeItems = (items: { key: string; label: string }[]) => {
    return items.map((t) => {
      const children = voucherTypeChildren[t.key];
      const hasChildren = children && children.length > 0;
      return (
        <div key={t.key}>
          <button
            onClick={() => onSelect(t.key)}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              voucherType === t.key
                ? "bg-gray-100 font-bold text-black"
                : "text-black hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
          {hasChildren &&
            children.map((child) => (
              <button
                key={child}
                onClick={() => onSelect(child)}
                className={`w-full text-left pl-6 pr-3 py-1.5 text-sm transition-colors ${
                  voucherType === child
                    ? "bg-gray-100 font-bold text-black"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {child}
              </button>
            ))}
        </div>
      );
    });
  };

  return (
    <VoucherPopupShell title="Other Vouchers" onClose={onClose}>
      <div className="max-w-md">
        <div className="px-3 pb-1 text-sm font-bold text-black border-b border-gray-400 select-none">
          Primary Vouchers
        </div>
        <div className="py-1">{renderTypeItems(PRIMARY_VOUCHER_TYPES)}</div>

        <div className="px-3 pb-1 mt-4 text-sm font-bold text-black border-b border-gray-400 select-none">
          Other Vouchers
        </div>
        <div className="py-1">{renderTypeItems(OTHER_VOUCHER_TYPES)}</div>
      </div>
    </VoucherPopupShell>
  );
}
