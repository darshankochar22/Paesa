import { useState, useEffect } from "react";

const inputCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm placeholder:text-zinc-400 border-b border-transparent focus:border-zinc-300 transition-colors";
const selectCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm cursor-pointer border-b border-transparent focus:border-zinc-300 transition-colors";

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

  useEffect(() => {
    if (!isOpen) {
      setNatureOfTransaction("Undefined");
      setTaxRate("0");
      setTaxType("Unknown");
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
      <div className="bg-white border border-zinc-200 rounded shadow-xl w-[540px] max-h-[80vh] flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 text-center">
          <span className="text-sm font-semibold text-zinc-800">VAT Details</span>
        </div>

        <div className="p-5 overflow-y-auto">
          <div className="mb-5">
            <div className="text-sm font-medium text-zinc-800 mb-2">Transaction Info</div>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-zinc-600 w-40">Nature of transaction</span>
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
            <div className="text-sm font-medium text-zinc-800 mb-2">VAT Rate</div>
            <div className="flex items-center gap-2 mb-3 ml-4">
              <span className="text-sm text-zinc-600 w-40">Tax rate</span>
              <span className="text-zinc-400 mr-2">:</span>
              <input className={inputCls} type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
              <span className="text-sm text-zinc-500">%</span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-zinc-600 w-40">Tax type</span>
              <span className="text-zinc-400 mr-2">:</span>
              <select
                className={selectCls}
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
              >
                {TAX_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
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
