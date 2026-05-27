import { useState, useEffect } from "react";
import PopupShell from "./shared/PopupShell";

interface BillReference {
  ledger_id: number;
  bill_name: string;
  bill_type: "New Ref" | "Agst Ref" | "Advance" | "On Account";
  amount: number;
  credit_period?: string;
}

interface Props {
  ledgerId: number;
  ledgerName: string;
  totalAmount: number;
  initialAllocations?: BillReference[];
  onClose: () => void;
  onSave: (allocations: BillReference[]) => void;
}

export default function BillWiseAllocationPopup({
  ledgerId,
  ledgerName,
  totalAmount,
  initialAllocations = [],
  onClose,
  onSave,
}: Props) {
  const [allocations, setAllocations] = useState<BillReference[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAllocations.length > 0) {
      setAllocations(initialAllocations.map((a) => ({ ...a, ledger_id: ledgerId })));
    } else {
      setAllocations([{
        ledger_id: ledgerId,
        bill_name: "",
        bill_type: "New Ref",
        amount: totalAmount,
        credit_period: "",
      }]);
    }
  }, [ledgerId, totalAmount, initialAllocations]);

  const allocated = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const remaining = totalAmount - allocated;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocations, remaining]);

  const handleAdd = () => {
    if (Math.abs(remaining) < 0.01) { setError("Total is fully allocated."); return; }
    setError(null);
    setAllocations((prev) => [...prev, {
      ledger_id: ledgerId,
      bill_name: "",
      bill_type: remaining > 0 ? "New Ref" : "On Account",
      amount: Math.abs(remaining),
      credit_period: "",
    }]);
  };

  const handleRemove = (i: number) => {
    if (allocations.length === 1) { setError("At least one row is required."); return; }
    setError(null);
    setAllocations((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleChange = (i: number, field: keyof BillReference, value: any) => {
    setError(null);
    setAllocations((prev) =>
      prev.map((row, idx) => {
        if (idx !== i) return row;
        const updated = { ...row, [field]: value };
        if (field === "bill_type" && value === "On Account") {
          updated.bill_name = "On Account";
        }
        return updated;
      })
    );
  };

  const handleSave = () => {
    if (allocations.some((a) => !a.bill_name.trim())) {
      setError("Bill name is required for all references.");
      return;
    }
    if (Math.abs(remaining) >= 0.01) {
      setError(`Remaining ₹${remaining.toFixed(2)} must be zero.`);
      return;
    }
    onSave(allocations);
  };

  const infoBar = (
    <>
      <div>
        Total:{" "}
        <span className="font-mono text-zinc-900 text-sm">
          ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="flex gap-4">
        <span>
          Allocated:{" "}
          <span className="font-mono text-emerald-700">
            ₹{allocated.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </span>
        <span>
          Remaining:{" "}
          <span className={`font-mono ${Math.abs(remaining) < 0.01 ? "text-zinc-500" : remaining > 0 ? "text-amber-600" : "text-rose-600"}`}>
            ₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </span>
      </div>
    </>
  );

  return (
    <PopupShell
      title="Bill-wise Allocations"
      subtitle={`Ledger: ${ledgerName}`}
      infoBar={infoBar}
      onClose={onClose}
      onAccept={handleSave}
      className="w-[600px]"
    >
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded flex justify-between items-center">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="font-bold">&times;</button>
        </div>
      )}

      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 bg-zinc-100 border-b border-zinc-200 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
          <div className="col-span-3">Type of Ref</div>
          <div className="col-span-4">Name</div>
          <div className="col-span-2 text-center">Cr Days</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-1" />
        </div>
        <div className="divide-y divide-zinc-100">
          {allocations.map((row, i) => (
            <div key={i} className="grid grid-cols-12 items-center px-3 py-2 bg-white gap-2">
              <div className="col-span-3">
                <select
                  value={row.bill_type}
                  onChange={(e) => handleChange(i, "bill_type", e.target.value)}
                  className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 bg-white w-full font-medium"
                >
                  <option value="New Ref">New Ref</option>
                  <option value="Agst Ref">Agst Ref</option>
                  <option value="Advance">Advance</option>
                  <option value="On Account">On Account</option>
                </select>
              </div>
              <div className="col-span-4">
                <input
                  type="text"
                  value={row.bill_name}
                  disabled={row.bill_type === "On Account"}
                  onChange={(e) => handleChange(i, "bill_name", e.target.value)}
                  placeholder={row.bill_type === "On Account" ? "On Account" : "Ref name"}
                  className="text-xs px-2.5 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full disabled:bg-zinc-50 disabled:text-zinc-400 font-semibold"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  value={row.credit_period ?? ""}
                  disabled={row.bill_type === "On Account"}
                  onChange={(e) => handleChange(i, "credit_period", e.target.value)}
                  placeholder="e.g. 30"
                  className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 text-center w-full disabled:bg-zinc-50 font-mono font-medium"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  step="0.01"
                  value={row.amount || ""}
                  onChange={(e) => handleChange(i, "amount", Number(e.target.value) || 0)}
                  className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 text-right w-full font-mono font-semibold"
                />
              </div>
              <div className="col-span-1 text-center">
                <button
                  onClick={() => handleRemove(i)}
                  className="text-zinc-400 hover:text-rose-600 text-sm font-bold font-sans"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleAdd}
        className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded px-2.5 py-1 hover:bg-zinc-50 flex items-center gap-1 select-none"
      >
        + Add Split Row
      </button>
    </PopupShell>
  );
}