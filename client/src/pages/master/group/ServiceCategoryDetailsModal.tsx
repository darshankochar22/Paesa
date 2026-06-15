import { useState, useEffect } from "react";

const inputCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm placeholder:text-zinc-400 border-b border-transparent focus:border-zinc-300 transition-colors";

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
      <div className="bg-white border border-zinc-200 rounded shadow-xl w-[480px] flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 text-center">
          <span className="text-sm font-semibold text-zinc-800">
            Service Category Details (Secondary)
          </span>
        </div>

        <div className="p-5">
          <div className="mb-4">
            <div className="text-sm font-medium text-zinc-800 mb-2">Service Tax Details</div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-zinc-600 w-40">Name</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input
              autoFocus
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=""
            />
          </div>
          <div className="text-center text-sm font-semibold text-zinc-800 mb-2">Rate Details</div>
          <div className="flex items-center gap-2 mb-3 ml-8">
            <span className="text-sm text-zinc-600 w-36">Service tax</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input className={inputCls} type="number" value={serviceTax} onChange={(e) => setServiceTax(e.target.value)} />
            <span className="text-sm text-zinc-500">%</span>
          </div>
          <div className="flex items-center gap-2 mb-3 ml-8">
            <span className="text-sm text-zinc-600 w-36">Education cess</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input className={inputCls} type="number" value={educationCess} onChange={(e) => setEducationCess(e.target.value)} />
            <span className="text-sm text-zinc-500">%</span>
          </div>
          <div className="flex items-center gap-2 mb-3 ml-8">
            <span className="text-sm text-zinc-600 w-36">Secondary education cess</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input className={inputCls} type="number" value={secondaryEducationCess} onChange={(e) => setSecondaryEducationCess(e.target.value)} />
            <span className="text-sm text-zinc-500">%</span>
          </div>
          <div className="flex items-center gap-2 mb-3 ml-8">
            <span className="text-sm text-zinc-600 w-36">Swachh Bharat cess</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input className={inputCls} type="number" value={swachhBharatCess} onChange={(e) => setSwachhBharatCess(e.target.value)} />
            <span className="text-sm text-zinc-500">%</span>
          </div>
          <div className="flex items-center gap-2 mb-3 ml-8">
            <span className="text-sm text-zinc-600 w-36">Krishi Kalyan cess</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input className={inputCls} type="number" value={krishiKalyanCess} onChange={(e) => setKrishiKalyanCess(e.target.value)} />
            <span className="text-sm text-zinc-500">%</span>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
          <button
            onClick={onClose}
            className="text-xs px-5 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 transition-colors font-medium"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
