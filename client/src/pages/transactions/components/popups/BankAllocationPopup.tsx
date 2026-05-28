import { useState, useEffect, useCallback } from "react";

const TRANSACTION_TYPES = ["Cheque", "e-Fund Transfer", "Card", "Cash", "Others"] as const;

interface BankDetails {
  ledger_id: number;
  transaction_type: string;
  cheque_range?: string;
  instrument_number: string;
  instrument_date: string;
  bank_name?: string;
  amount: number;
}

interface Props {
  ledgerId: number;
  ledgerName: string;
  amount: number;
  initialDetails?: Partial<BankDetails> | null;
  onClose: () => void;
  onSave: (details: BankDetails) => void;
}

export default function BankAllocationPopup({
  ledgerId,
  ledgerName,
  amount,
  initialDetails,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<BankDetails>({
    ledger_id: ledgerId,
    transaction_type: "Cheque",
    cheque_range: "",
    instrument_number: "",
    instrument_date: new Date().toISOString().split("T")[0],
    bank_name: "",
    amount,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDetails) {
      setForm({
        ledger_id: ledgerId,
        transaction_type: initialDetails.transaction_type ?? "Cheque",
        cheque_range: initialDetails.cheque_range ?? "",
        instrument_number: initialDetails.instrument_number ?? "",
        instrument_date: initialDetails.instrument_date ?? new Date().toISOString().split("T")[0],
        bank_name: initialDetails.bank_name ?? "",
        amount: initialDetails.amount ?? amount,
      });
    } else {
      setForm((prev) => ({ ...prev, ledger_id: ledgerId, amount }));
    }
  }, [ledgerId, amount, initialDetails]);

  const handleSave = useCallback(() => {
    onSave(form);
  }, [form, onSave]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, handleSave]);

  const set = (field: keyof BankDetails, value: any) => {
    setError(null);
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "transaction_type") {
        if (value === "Cheque") {
          next.instrument_date = new Date().toISOString().split("T")[0];
        }
      }
      return next;
    });
  };

  const formattedAmount = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const isCheque = form.transaction_type === "Cheque";
  const isCash = form.transaction_type === "Cash";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[480px] flex flex-col max-h-[85vh] overflow-hidden">

        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider">Bank Allocations</span>
            <span className="text-[10px] text-zinc-400 font-mono">Ledger: {ledgerName}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm">&times;</button>
        </div>

        {/* Title & Amount */}
        <div className="bg-white border-b border-zinc-200 px-4 py-3 text-center">
          <div className="text-sm text-black">
            Bank Allocations for: <span className="font-bold">{ledgerName}</span>
          </div>
          <div className="text-sm text-black font-semibold mt-1">
            For: {formattedAmount}
          </div>
        </div>

        {/* Transaction Type Table */}
        <div className="px-4 py-0">
          <div className="grid grid-cols-2 border-b border-zinc-300 py-1 text-sm font-semibold text-black">
            <div>Transaction Type</div>
            <div className="text-right">Amount</div>
          </div>
          <div className="grid grid-cols-2 border-b border-zinc-200 py-1 text-sm items-center bg-yellow-50">
            <div>
              <select
                value={form.transaction_type}
                onChange={(e) => set("transaction_type", e.target.value)}
                className="bg-transparent outline-none border border-zinc-300 px-1 py-0.5 text-sm text-black w-36"
              >
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="text-right font-mono text-black">{formattedAmount}</div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 min-h-0">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded flex justify-between items-center">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          {isCheque && (
            <div className="flex items-center gap-2">
              <span className="text-sm italic text-black w-28 shrink-0">Cheque range</span>
              <span className="text-sm text-black">:</span>
              <input
                type="text"
                value={form.cheque_range ?? ""}
                onChange={(e) => set("cheque_range", e.target.value)}
                className="flex-1 text-sm border border-zinc-300 px-2 py-1 outline-none focus:border-zinc-800 bg-white"
              />
            </div>
          )}

          {isCash && (
            <div className="flex items-center gap-2">
              <span className="text-sm italic text-black w-28 shrink-0">Bank Name</span>
              <span className="text-sm text-black">:</span>
              <input
                type="text"
                value={form.bank_name ?? ""}
                onChange={(e) => set("bank_name", e.target.value)}
                className="flex-1 text-sm border border-zinc-300 px-2 py-1 outline-none focus:border-zinc-800 bg-white"
                placeholder="Enter bank name"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm italic text-black w-28 shrink-0">
              {isCheque ? "Inst No." : isCash ? "Ref No." : "Inst No."}
            </span>
            <span className="text-sm text-black">:</span>
            <input
              type="text"
              value={form.instrument_number}
              onChange={(e) => set("instrument_number", e.target.value)}
              className="text-sm border border-zinc-300 px-2 py-1 outline-none focus:border-zinc-800 w-32 bg-white"
            />
            <span className="text-sm italic text-black ml-4 shrink-0">Inst Date</span>
            <span className="text-sm text-black">:</span>
            <input
              type="date"
              value={form.instrument_date}
              onChange={(e) => set("instrument_date", e.target.value)}
              className="text-sm border border-zinc-300 px-2 py-1 outline-none focus:border-zinc-800 w-32 bg-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500">
            Alt+A: Accept &nbsp;·&nbsp; Esc: Close{isCash ? " → Will open Denomination" : ""}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold">
              Cancel
            </button>
            <button onClick={handleSave}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 font-semibold shadow-sm active:scale-95">
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
