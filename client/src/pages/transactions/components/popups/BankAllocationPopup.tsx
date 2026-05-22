import { useState, useEffect } from "react";

interface BankDetails {
  ledger_id: number;
  transaction_type: "Cheque" | "e-Fund Transfer" | "Card" | "Others";
  instrument_number: string;
  instrument_date: string;
  bank_name: string;
  branch: string;
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
    instrument_number: "",
    instrument_date: new Date().toISOString().split("T")[0],
    bank_name: "",
    branch: "",
    amount: amount,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDetails) {
      setForm({
        ledger_id: ledgerId,
        transaction_type: initialDetails.transaction_type || "Cheque",
        instrument_number: initialDetails.instrument_number || "",
        instrument_date: initialDetails.instrument_date || new Date().toISOString().split("T")[0],
        bank_name: initialDetails.bank_name || "",
        branch: initialDetails.branch || "",
        amount: initialDetails.amount ?? amount,
      });
    } else {
      setForm(prev => ({
        ...prev,
        ledger_id: ledgerId,
        amount: amount,
      }));
    }
  }, [ledgerId, amount, initialDetails]);

  // Alt+A and Escape shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [form]);

  const handleChange = (field: keyof BankDetails, value: any) => {
    setError(null);
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // If cheque, let's validate instrument number is entered for quality check, or allow empty
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[450px] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider">Bank Allocations</span>
            <span className="text-[10px] text-zinc-400 font-mono">Ledger: {ledgerName}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm leading-none">&times;</button>
        </div>

        {/* Info panel */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2.5 flex justify-between items-center text-xs font-semibold text-zinc-700">
          <span>Allocation Amount:</span>
          <span className="font-mono text-zinc-900 text-sm">₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>

        {/* Form Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 min-h-0">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded flex justify-between items-center font-medium animate-slide-down">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="text-rose-500 font-bold">&times;</button>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Transaction Type</label>
              <select
                value={form.transaction_type}
                onChange={e => handleChange("transaction_type", e.target.value as any)}
                className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 bg-white w-full font-semibold"
              >
                <option value="Cheque">Cheque</option>
                <option value="e-Fund Transfer">e-Fund Transfer</option>
                <option value="Card">Card</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {form.transaction_type === "Cheque" ? "Cheque Number" : "Transaction Ref Number"}
              </label>
              <input
                type="text"
                value={form.instrument_number}
                onChange={e => handleChange("instrument_number", e.target.value)}
                placeholder="e.g. 104829"
                className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-mono font-semibold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Instrument Date</label>
              <input
                type="date"
                value={form.instrument_date}
                onChange={e => handleChange("instrument_date", e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-mono font-semibold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Bank Name</label>
              <input
                type="text"
                value={form.bank_name}
                onChange={e => handleChange("bank_name", e.target.value)}
                placeholder="e.g. State Bank of India"
                className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Branch Name</label>
              <input
                type="text"
                value={form.branch}
                onChange={e => handleChange("branch", e.target.value)}
                placeholder="e.g. MG Road Branch"
                className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500 font-medium">Shortcuts: Alt+A Accept / Esc Close</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 font-semibold shadow-sm transition-all hover:shadow active:scale-95 duration-100"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
