// NOTE: This component is no longer used in Vouchers.tsx — the voucher type
// switcher is now the inline RightSidebar (F4–F9 buttons). Keep this file
// only if other screens still import it; otherwise safe to delete.

interface Props {
  activeType: string;
  onChange: (type: string) => void;
}

const TYPES = ["Receipt", "Payment", "Contra", "Journal", "Sales", "Purchase"];

export default function VoucherTypeTabs({ activeType, onChange }: Props) {
  return (
    <div className="flex border-b border-black">
      {TYPES.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-4 py-1 text-sm font-medium border-r border-gray-300 transition-colors ${
            activeType === t
              ? "bg-black text-white"
              : "bg-white text-black hover:bg-gray-100"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}