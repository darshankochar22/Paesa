import { useState, useEffect } from "react";

export type StatutoryField = "serviceTax" | "tds" | "vat" | "excise";

interface OtherStatutoryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName?: string;
  showFields?: StatutoryField[];
  openServiceTaxModal: () => void;
  openTdsModal: () => void;
  openVatModal: () => void;
  openExciseModal: () => void;
}

const ALL_FIELDS: { key: StatutoryField; label: string; open: keyof Omit<OtherStatutoryDetailsModalProps, "isOpen" | "onClose" | "groupName" | "showFields"> }[] = [
  { key: "serviceTax", label: "Set/Alter service tax details", open: "openServiceTaxModal" },
  { key: "tds", label: "Set/Alter TDS details", open: "openTdsModal" },
  { key: "vat", label: "Set/Alter VAT Details", open: "openVatModal" },
  { key: "excise", label: "Set/Alter excise details", open: "openExciseModal" },
];

export default function OtherStatutoryDetailsModal({
  isOpen,
  onClose,
  groupName,
  showFields,
  openServiceTaxModal,
  openTdsModal,
  openVatModal,
  openExciseModal,
}: OtherStatutoryDetailsModalProps) {
  const [values, setValues] = useState<Record<StatutoryField, boolean>>({
    serviceTax: false,
    tds: false,
    vat: false,
    excise: false,
  });

  useEffect(() => {
    if (!isOpen) {
      setValues({ serviceTax: false, tds: false, vat: false, excise: false });
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

  const visibleFields = showFields
    ? ALL_FIELDS.filter((f) => showFields.includes(f.key))
    : ALL_FIELDS;

  const openers: Record<string, () => void> = {
    openServiceTaxModal,
    openTdsModal,
    openVatModal,
    openExciseModal,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-zinc-200 rounded shadow-xl w-[460px] flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 text-center">
          <span className="text-sm font-semibold text-zinc-800">
            Tax Details for {groupName || "Group"}
          </span>
        </div>

        <div className="p-5">
          {visibleFields.map((f) => {
            const current = values[f.key];
            return (
              <div key={f.key} className="flex items-center gap-2 mb-3">
                <span className="text-sm text-zinc-600 w-56">{f.label}</span>
                <span className="text-zinc-400 mr-2">:</span>
                <button
                  onClick={() => {
                    const newVal = !current;
                    setValues((prev) => ({ ...prev, [f.key]: newVal }));
                    if (newVal) {
                      setTimeout(() => openers[f.open]?.(), 0);
                    }
                  }}
                  className={`text-sm py-0.5 px-2 rounded font-medium ${current ? "bg-zinc-800 text-white" : "text-zinc-800"}`}
                >
                  {current ? "Yes" : "No"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-zinc-200 flex justify-end bg-zinc-50 shrink-0">
          <button
            onClick={onClose}
            className="text-xs px-5 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
