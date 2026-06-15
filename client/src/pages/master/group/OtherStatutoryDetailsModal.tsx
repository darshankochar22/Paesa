import { useState, useEffect } from "react";

interface OtherStatutoryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName?: string;
  openServiceTaxModal: () => void;
  openTdsModal: () => void;
  openVatModal: () => void;
  openExciseModal: () => void;
}

export default function OtherStatutoryDetailsModal({
  isOpen,
  onClose,
  groupName,
  openServiceTaxModal,
  openTdsModal,
  openVatModal,
  openExciseModal,
}: OtherStatutoryDetailsModalProps) {
  const [serviceTax, setServiceTax] = useState(false);
  const [tds, setTds] = useState(false);
  const [vat, setVat] = useState(false);
  const [excise, setExcise] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setServiceTax(false);
      setTds(false);
      setVat(false);
      setExcise(false);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-zinc-200 rounded shadow-xl w-[460px] flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 text-center">
          <span className="text-sm font-semibold text-zinc-800">
            Tax Details for {groupName || "Group"}
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-zinc-600 w-56">Set/Alter service tax details</span>
            <span className="text-zinc-400 mr-2">:</span>
            <button
              onClick={() => {
                setServiceTax(!serviceTax);
                if (!serviceTax) setTimeout(() => openServiceTaxModal(), 0);
              }}
              className={`text-sm py-0.5 px-2 rounded font-medium ${serviceTax ? "bg-zinc-800 text-white" : "text-zinc-800"}`}
            >
              {serviceTax ? "Yes" : "No"}
            </button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-zinc-600 w-56">Set/Alter TDS details</span>
            <span className="text-zinc-400 mr-2">:</span>
            <button
              onClick={() => {
                setTds(!tds);
                if (!tds) setTimeout(() => openTdsModal(), 0);
              }}
              className={`text-sm py-0.5 px-2 rounded font-medium ${tds ? "bg-zinc-800 text-white" : "text-zinc-800"}`}
            >
              {tds ? "Yes" : "No"}
            </button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-zinc-600 w-56">Set/Alter VAT Details</span>
            <span className="text-zinc-400 mr-2">:</span>
            <button
              onClick={() => {
                setVat(!vat);
                if (!vat) setTimeout(() => openVatModal(), 0);
              }}
              className={`text-sm py-0.5 px-2 rounded font-medium ${vat ? "bg-zinc-800 text-white" : "text-zinc-800"}`}
            >
              {vat ? "Yes" : "No"}
            </button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-zinc-600 w-56">Set/Alter excise details</span>
            <span className="text-zinc-400 mr-2">:</span>
            <button
              onClick={() => {
                setExcise(!excise);
                if (!excise) setTimeout(() => openExciseModal(), 0);
              }}
              className={`text-sm py-0.5 px-2 rounded font-medium ${excise ? "bg-zinc-800 text-white" : "text-zinc-800"}`}
            >
              {excise ? "Yes" : "No"}
            </button>
          </div>
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
