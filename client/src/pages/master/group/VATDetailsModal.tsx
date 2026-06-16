import { useState, useEffect } from "react";

const inputCls = "w-full bg-transparent text-[13px] outline-none py-1 px-1 placeholder:text-zinc-400 border-b border-transparent focus:border-zinc-400 transition-colors";
const selectCls = "w-full bg-transparent text-[13px] outline-none py-1 px-1 cursor-pointer border-b border-transparent focus:border-zinc-400 transition-colors";

const NATURE_OF_TRANSACTIONS = [
  "Imports",
  "Interstate Branch Transfer Inward",
  "Interstate Consignment Transfer Inward",
  "Interstate Purchase - Against Form C",
  "Interstate Purchase Deemed Export",
  "Interstate Purchase - E1",
  "Interstate Purchase - E2",
  "Interstate Purchase - Exempt",
  "Interstate Purchase Exempt - E1",
  "Interstate Purchase Exempt - With Form C",
  "Interstate Purchase - Taxable",
  "Interstate Purchase - Zero Rated",
  "Non Creditable Purchase - Special Goods",
  "Purchase Exempt",
  "Purchase from Unregistered Dealer",
  "Purchase Taxable",
  "Purchase Taxable - Capital Goods",
  "Purchase - Works Contract",
];

const TAX_TYPES = ["Unknown", "Exempt", "Tax Free"];

interface VATDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VATDetailsModal({ isOpen, onClose }: VATDetailsModalProps) {
  const [natureOfTransaction, setNatureOfTransaction] = useState("Undefined");
  const [taxRate, setTaxRate] = useState("0");
  const [taxType, setTaxType] = useState("Unknown");
  const [highlightedTaxType, setHighlightedTaxType] = useState<string>("Unknown");

  useEffect(() => {
    if (!isOpen) {
      setNatureOfTransaction("Undefined");
      setTaxRate("0");
      setTaxType("Unknown");
      setHighlightedTaxType("Unknown");
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

  const handleTaxTypeClick = (t: string) => {
    setHighlightedTaxType(t);
    setTaxType(t);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/30">
      {/* Main modal - centered horizontally, with right padding to leave room for the panel */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pr-72">
        <div className="bg-white border border-zinc-300 shadow-2xl w-[480px] flex flex-col">
          {/* Tally-style title bar */}
          <div className="px-4 py-2 border-b border-zinc-300 bg-zinc-50 text-center">
            <span className="text-[13px] font-semibold text-zinc-900">Tax/Rate details</span>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 bg-white">
            <div className="mb-5">
              <div className="text-[13px] font-semibold text-zinc-800 mb-2">Transaction Info</div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-[13px] text-zinc-700 w-44 shrink-0">Nature of transaction</span>
                <span className="text-zinc-400 mr-2">:</span>
                <select
                  className={selectCls}
                  value={natureOfTransaction}
                  onChange={(e) => setNatureOfTransaction(e.target.value)}
                >
                  <option value="Undefined">Undefined</option>
                  {NATURE_OF_TRANSACTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-zinc-800 mb-2">VAT Rate</div>
              <div className="flex items-center gap-2 mb-3 ml-4">
                <span className="text-[13px] text-zinc-700 w-44 shrink-0">Tax rate</span>
                <span className="text-zinc-400 mr-2">:</span>
                <input
                  className={inputCls}
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="0"
                />
                <span className="text-[13px] text-zinc-500">%</span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-[13px] text-zinc-700 w-44 shrink-0">Tax type</span>
                <span className="text-zinc-400 mr-2">:</span>
                <select
                  className={selectCls}
                  value={taxType}
                  onChange={(e) => { setTaxType(e.target.value); setHighlightedTaxType(e.target.value); }}
                >
                  {TAX_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
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

      {/* Right panel: sticks to extreme right edge */}
      <div className="absolute top-0 right-0 bottom-0 w-72 bg-white border-l border-zinc-300 flex flex-col shadow-2xl">
        <div className="px-3 py-2 border-b border-zinc-300 bg-zinc-50">
          <span className="text-[13px] font-semibold text-zinc-900">List of Taxability</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {TAX_TYPES.map((t) => (
            <div
              key={t}
              className={`px-3 py-1.5 text-[13px] cursor-pointer select-none ${
                highlightedTaxType === t ? "bg-zinc-200 text-zinc-900 font-medium" : "text-zinc-700 hover:bg-zinc-50"
              }`}
              onClick={() => handleTaxTypeClick(t)}
            >
              {t === "Unknown" ? "◆ " : ""}{t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
