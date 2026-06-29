import { useState, useEffect, useCallback } from "react";

const TRANSACTION_TYPES = [
  "ATM",
  "Card",
  "Cheque",
  "ECS",
  "e-Fund Transfer",
  "Electronic Cheque",
  "Electronic DD/PO",
  "Cash",
  "Others",
] as const;

interface BankDetails {
  ledger_id: number;
  transaction_type: string;
  cheque_range?: string;
  instrument_number: string;
  instrument_date: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  payment_gateway?: string;
  amount: number;
}

interface Props {
  ledgerId: number;
  ledgerName: string;
  amount: number;
  initialDetails?: Partial<BankDetails> | null;
  onClose: () => void;
  onSave: (details: BankDetails) => void;
  allowCash?: boolean;
}

// Shared "label : input" row used across the allocation form.
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm italic text-black w-44 shrink-0">{label}</span>
      <span className="text-sm text-black">:</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 text-sm border border-zinc-300 px-2 py-1 outline-none focus:border-zinc-800 bg-white"
      />
    </div>
  );
}

export default function BankAllocationPopup({
  ledgerId,
  ledgerName,
  amount,
  initialDetails,
  onClose,
  onSave,
  allowCash = true,
}: Props) {
  const [form, setForm] = useState<BankDetails>({
    ledger_id: ledgerId,
    transaction_type: "Cheque",
    cheque_range: "",
    instrument_number: "",
    instrument_date: new Date().toISOString().split("T")[0],
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    payment_gateway: "",
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
        account_number: initialDetails.account_number ?? "",
        ifsc_code: initialDetails.ifsc_code ?? "",
        payment_gateway: initialDetails.payment_gateway ?? "",
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
  const isEFund = form.transaction_type === "e-Fund Transfer";
  const availableTypes = allowCash ? TRANSACTION_TYPES : TRANSACTION_TYPES.filter((t) => t !== "Cash");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[900px] max-w-[95vw] flex flex-col max-h-[85vh] overflow-hidden">

        {/* Header — white (no black bar) */}
        <div className="relative bg-white border-b border-zinc-200 px-4 py-3 text-center select-none">
          <button
            onClick={onClose}
            className="absolute right-3 top-2 text-black hover:opacity-60 font-bold text-base leading-none"
          >
            &times;
          </button>
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
                className="bg-transparent outline-none border border-zinc-300 px-1 py-0.5 text-sm text-black w-44"
              >
                {availableTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="text-right font-mono text-black">{formattedAmount}</div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="p-4 flex-1 overflow-y-auto min-h-0">
          {error && (
            <div className="mb-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded flex justify-between items-center">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          {isEFund ? (
            /* e-Fund Transfer — A/c No. · IFS Code · Bank/Payment Gateway · Inst No. · Inst Date */
            <div className="grid grid-cols-2 gap-x-10 gap-y-3">
              <Field label="A/c No." value={form.account_number ?? ""} onChange={(v) => set("account_number", v)} />
              <Field label="IFS Code" value={form.ifsc_code ?? ""} onChange={(v) => set("ifsc_code", v)} />
              <Field label="Inst No." value={form.instrument_number} onChange={(v) => set("instrument_number", v)} />
              <Field label="Inst Date" type="date" value={form.instrument_date} onChange={(v) => set("instrument_date", v)} />
            </div>
          ) : (
            <div className="space-y-3">
              {isCheque && (
                <Field label="Cheque range" value={form.cheque_range ?? ""} onChange={(v) => set("cheque_range", v)} />
              )}
              {isCash && (
                <Field label="Bank Name" value={form.bank_name ?? ""} onChange={(v) => set("bank_name", v)} />
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm italic text-black w-44 shrink-0">
                  {isCash ? "Ref No." : "Inst No."}
                </span>
                <span className="text-sm text-black">:</span>
                <input
                  type="text"
                  value={form.instrument_number}
                  onChange={(e) => set("instrument_number", e.target.value)}
                  className="text-sm border border-zinc-300 px-2 py-1 outline-none focus:border-zinc-800 w-40 bg-white"
                />
                <span className="text-sm italic text-black ml-6 shrink-0">Inst Date</span>
                <span className="text-sm text-black">:</span>
                <input
                  type="date"
                  value={form.instrument_date}
                  onChange={(e) => set("instrument_date", e.target.value)}
                  className="text-sm border border-zinc-300 px-2 py-1 outline-none focus:border-zinc-800 w-40 bg-white"
                />
              </div>
            </div>
          )}

          {/* Bank Payment Gateway — always shown, for every transaction type */}
          <div className="mt-3">
            <Field label="Bank Payment Gateway" value={form.payment_gateway ?? ""} onChange={(v) => set("payment_gateway", v)} />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500">
            Alt+A: Accept &nbsp;·&nbsp; Esc: Close{isCash && allowCash ? " → Will open Denomination" : ""}
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
