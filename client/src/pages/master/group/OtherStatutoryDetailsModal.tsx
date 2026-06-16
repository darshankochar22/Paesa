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

const ALL_FIELDS: {
  key: StatutoryField;
  label: string;
  open: keyof Omit<OtherStatutoryDetailsModalProps, "isOpen" | "onClose" | "groupName" | "showFields">;
}[] = [
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

  const handleToggle = (key: StatutoryField, opener: () => void) => {
    const newVal = !values[key];
    setValues((prev) => ({ ...prev, [key]: newVal }));
    if (newVal) {
      setTimeout(() => opener(), 0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-zinc-300 shadow-2xl w-[480px] flex flex-col">
        {/* Tally-style title bar */}
        <div className="px-4 py-2 border-b border-zinc-300 text-center">
          <span className="text-[13px] font-semibold text-zinc-900">
            Statutory Details for {groupName || "Group"} Creation (Secondary)
          </span>
        </div>

        {/* Body */}
        <div className="px-6 py-5 bg-white">
          {visibleFields.length === 0 ? (
            <div className="text-sm text-zinc-500 text-center py-4">
              No statutory fields available
            </div>
          ) : (
            visibleFields.map((f) => {
              const current = values[f.key];
              return (
                <div key={f.key} className="flex items-center gap-2 mb-3 last:mb-0">
                  <span className="text-[13px] text-zinc-700 w-60 shrink-0">{f.label}</span>
                  <span className="text-zinc-400 mr-3">:</span>
                  <button
                    type="button"
                    onClick={() => handleToggle(f.key, openers[f.open]!)}
                    className="text-[13px] py-0.5 px-2 min-w-[28px] text-center font-medium hover:bg-zinc-100"
                  >
                    {current ? "Yes" : "No"}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
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
