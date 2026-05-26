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
    amount,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDetails) {
      setForm({
        ledger_id: ledgerId,
        transaction_type: initialDetails.transaction_type ?? "Cheque",
        instrument_number: initialDetails.instrument_number ?? "",
        instrument_date: initialDetails.instrument_date ?? new Date().toISOString().split("T")[0],
        bank_name: initialDetails.bank_name ?? "",
        branch: initialDetails.branch ?? "",
        amount: initialDetails.amount ?? amount,
      });
    } else {
      setForm((prev) => ({ ...prev, ledger_id: ledgerId, amount }));
    }
  }, [ledgerId, amount, initialDetails]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const set = (field: keyof BankDetails, value: any) => {
    setError(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[450px] flex flex-col max-h-[85vh] overflow-hidden">

        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider">Bank Allocations</span>
            <span className="text-[10px] text-zinc-400 font-mono">Ledger: {ledgerName}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm">&times;</button>
        </div>

        {/* Amount */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2.5 flex justify-between items-center text-xs font-semibold text-zinc-700">
          <span>Allocation Amount:</span>
          <span className="font-mono text-zinc-900 text-sm">
            ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Form */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 min-h-0">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded flex justify-between items-center">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          <Field label="Transaction Type">
            <select value={form.transaction_type} onChange={(e) => set("transaction_type", e.target.value as any)} className={cls}>
              <option value="Cheque">Cheque</option>
              <option value="e-Fund Transfer">e-Fund Transfer</option>
              <option value="Card">Card</option>
              <option value="Others">Others</option>
            </select>
          </Field>

          <Field label={form.transaction_type === "Cheque" ? "Cheque Number" : "Transaction Ref Number"}>
            <input type="text" value={form.instrument_number}
              onChange={(e) => set("instrument_number", e.target.value)}
              placeholder="e.g. 104829"
              className={cls + " font-mono"} />
          </Field>

          <Field label="Instrument Date">
            <input type="date" value={form.instrument_date}
              onChange={(e) => set("instrument_date", e.target.value)}
              className={cls + " font-mono"} />
          </Field>

          <Field label="Bank Name">
            <input type="text" value={form.bank_name}
              onChange={(e) => set("bank_name", e.target.value)}
              placeholder="e.g. State Bank of India"
              className={cls} />
          </Field>

          <Field label="Branch Name">
            <input type="text" value={form.branch}
              onChange={(e) => set("branch", e.target.value)}
              placeholder="e.g. MG Road Branch"
              className={cls} />
          </Field>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500">Alt+A: Accept &nbsp;·&nbsp; Esc: Close</span>
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

const cls = "text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</label>
      {children}
    </div>
  );
}