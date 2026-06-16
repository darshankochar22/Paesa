import { useState, useEffect } from "react";

const inputCls = "w-full bg-transparent text-[13px] outline-none py-1 px-1 placeholder:text-zinc-400 border-b border-transparent focus:border-zinc-400 transition-colors";

interface ServiceCategoryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ServiceCategoryDetailsModal({ isOpen, onClose }: ServiceCategoryDetailsModalProps) {
  const [name, setName] = useState("");
  const [serviceTax, setServiceTax] = useState("0");
  const [educationCess, setEducationCess] = useState("0");
  const [secondaryEducationCess, setSecondaryEducationCess] = useState("0");
  const [swachhBharatCess, setSwachhBharatCess] = useState("0");
  const [krishiKalyanCess, setKrishiKalyanCess] = useState("0");

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setServiceTax("0");
      setEducationCess("0");
      setSecondaryEducationCess("0");
      setSwachhBharatCess("0");
      setKrishiKalyanCess("0");
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="bg-white border border-zinc-300 shadow-2xl w-[500px] flex flex-col">
        {/* Tally-style title bar */}
        <div className="px-4 py-2 border-b border-zinc-300 bg-zinc-50 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-zinc-900">Service Category Details (Secondary)</span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 text-lg font-bold leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 bg-white">
          <div className="text-center text-[13px] font-semibold text-zinc-800 mb-3">Service Tax Details</div>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-[13px] text-zinc-700 w-40 shrink-0">Name</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input
              autoFocus
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=""
            />
          </div>

          <div className="text-center text-[13px] font-semibold text-zinc-800 mb-3">Rate Details</div>

          <div className="flex items-center gap-2 mb-3 ml-8">
            <span className="text-[13px] text-zinc-700 w-40 shrink-0">Service tax</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input
              className={inputCls}
              type="number"
              value={serviceTax}
              onChange={(e) => setServiceTax(e.target.value)}
              placeholder="0"
            />
            <span className="text-[13px] text-zinc-500">%</span>
          </div>
          <div className="flex items-center gap-2 mb-3 ml-8">
            <span className="text-[13px] text-zinc-700 w-40 shrink-0">Education cess</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input
              className={inputCls}
              type="number"
              value={educationCess}
              onChange={(e) => setEducationCess(e.target.value)}
              placeholder="0"
            />
            <span className="text-[13px] text-zinc-500">%</span>
          </div>
          <div className="flex items-center gap-2 mb-3 ml-8">
            <span className="text-[13px] text-zinc-700 w-40 shrink-0">Secondary education cess</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input
              className={inputCls}
              type="number"
              value={secondaryEducationCess}
              onChange={(e) => setSecondaryEducationCess(e.target.value)}
              placeholder="0"
            />
            <span className="text-[13px] text-zinc-500">%</span>
          </div>
          <div className="flex items-center gap-2 mb-3 ml-8">
            <span className="text-[13px] text-zinc-700 w-40 shrink-0">Swachh Bharat cess</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input
              className={inputCls}
              type="number"
              value={swachhBharatCess}
              onChange={(e) => setSwachhBharatCess(e.target.value)}
              placeholder="0"
            />
            <span className="text-[13px] text-zinc-500">%</span>
          </div>
          <div className="flex items-center gap-2 mb-3 ml-8">
            <span className="text-[13px] text-zinc-700 w-40 shrink-0">Krishi Kalyan cess</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input
              className={inputCls}
              type="number"
              value={krishiKalyanCess}
              onChange={(e) => setKrishiKalyanCess(e.target.value)}
              placeholder="0"
            />
            <span className="text-[13px] text-zinc-500">%</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-300 flex justify-end gap-2 bg-zinc-50">
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="text-xs px-6 py-1.5 bg-black text-white hover:bg-zinc-800 font-medium"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
