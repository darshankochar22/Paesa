import { useState } from "react";

const VOUCHERS: Record<string, { name: string; key: string }[]> = {
  "Accounting Vouchers": [
    { name: "Contra", key: "F4" },
    { name: "Credit Note", key: "Alt+F6" },
    { name: "Debit Note", key: "Alt+F5" },
    { name: "Journal", key: "F7" },
    { name: "Payment", key: "F5" },
    { name: "Purchase", key: "F9" },
    { name: "Receipt", key: "F6" },
    { name: "Sales", key: "F8" },
  ],
  "Inventory Vouchers": [
    { name: "Physical Stock", key: "Ctrl+F7" },
    { name: "Stock Journal", key: "Alt+F7" },
  ],
};

interface Props {
  currentType: string;
  onSelect: (type: string) => void;
  onClose: () => void;
}

export default function VoucherTypeModal({ currentType = "", onSelect, onClose }: Props) {
  const initialSearch = typeof currentType === "string" ? currentType : "";
  const [search, setSearch] = useState(initialSearch);
  const [highlighted, setHighlighted] = useState("");

  const filtered = Object.fromEntries(
    Object.entries(VOUCHERS).map(([sec, items]) => [
      sec,
      items.filter((i) => i.name.toLowerCase().includes((search || "").toLowerCase())),
    ]).filter(([, items]) => items.length > 0)
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 selective-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-zinc-400 w-[310px] select-none text-[12px]"
        style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif" }}
      >
        <div className="bg-black text-white text-center px-2 py-1 text-[13px] font-semibold flex justify-between items-center">
          <span className="flex-1 text-center">Change Voucher Type</span>
          <button
            onClick={onClose}
            className="bg-none border-none text-white cursor-pointer text-[14px] leading-none px-1 hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        <div className="p-2 border-b border-zinc-200 bg-zinc-50">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-zinc-400 px-2 py-0.5 text-[12px] font-sans outline-none bg-white focus:border-black"
          />
        </div>

        <div className="bg-zinc-800 text-white px-2 py-1 flex justify-between items-center">
          <span>List of Voucher Types</span>
          <div className="flex gap-4 text-[11px] text-zinc-300">
            <span className="cursor-pointer hover:text-white hover:underline">Create</span>
            <span className="cursor-pointer hover:text-white hover:underline">Show Inactive</span>
          </div>
        </div>

        <div className="py-1 max-h-[300px] overflow-y-auto">
          {Object.entries(filtered).map(([section, items]) => (
            <div key={section}>
              <div className="px-2 pt-2 pb-0.5 font-bold text-zinc-900 bg-zinc-100/50">
                {section}
              </div>
              {items.map((item) => {
                const isSelected = item.name === currentType;
                const isHovered = highlighted === item.name;

                return (
                  <div
                    key={item.name}
                    onMouseEnter={() => setHighlighted(item.name)}
                    onClick={() => {
                      if (typeof onSelect === "function") onSelect(item.name);
                      if (typeof onClose === "function") onClose();
                    }}
                    className={`flex justify-between items-center py-0.5 pr-2 pl-5 cursor-pointer transition-colors duration-100 ${
                      isHovered 
                        ? "bg-zinc-200 text-black font-medium" 
                        : isSelected 
                        ? "bg-zinc-900 text-white font-semibold" 
                        : "bg-transparent text-zinc-800"
                    }`}
                  >
                    <span>{item.name}</span>
                    <span className={`text-[11px] font-normal italic ${isSelected && !isHovered ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {item.key}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
