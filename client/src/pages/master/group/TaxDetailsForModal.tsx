import { useState, useEffect } from "react";

interface TaxDetailsForModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName?: string;
  onSetServiceTax: () => void;
  onSetTds: () => void;
}

export default function TaxDetailsForModal({
  isOpen,
  onClose,
  groupName,
  onSetServiceTax,
  onSetTds,
}: TaxDetailsForModalProps) {
  const [values, setValues] = useState({ serviceTax: false, tds: false });

  useEffect(() => {
    if (!isOpen) {
      setValues({ serviceTax: false, tds: false });
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const rows: { key: "serviceTax" | "tds"; label: string; open: () => void }[] = [
    { key: "serviceTax", label: "Set/Alter service tax details", open: onSetServiceTax },
    { key: "tds", label: "Set/Alter TDS details", open: onSetTds },
  ];

  const handleToggle = (key: "serviceTax" | "tds", opener: () => void) => {
    const newVal = !values[key];
    setValues((prev) => ({ ...prev, [key]: newVal }));
    if (newVal) {
      setTimeout(() => opener(), 0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-zinc-300 shadow-2xl w-[480px] flex flex-col">
        <div className="px-4 py-2 border-b border-zinc-300 text-center">
          <span className="text-[13px] font-semibold text-zinc-900">
            Tax Details for {groupName || "Group"}
          </span>
        </div>

        <div className="px-6 py-5 bg-white">
          {rows.map((row) => {
            const current = values[row.key];
            return (
              <div key={row.key} className="flex items-center gap-2 mb-3 last:mb-0">
                <span className="text-[13px] text-zinc-700 w-60 shrink-0">{row.label}</span>
                <span className="text-zinc-400 mr-3">:</span>
                <button
                  type="button"
                  onClick={() => handleToggle(row.key, row.open)}
                  className="text-[13px] py-0.5 px-2 min-w-[28px] text-center font-medium hover:bg-zinc-100"
                >
                  {current ? "Yes" : "No"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-zinc-300 flex justify-end gap-2 bg-zinc-50">
          <button
            onClick={onClose}
            className="text-xs px-5 py-1.5 border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
