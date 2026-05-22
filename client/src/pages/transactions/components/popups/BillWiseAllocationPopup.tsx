import { useState, useEffect } from "react";

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

  // Initialize allocations
  useEffect(() => {
    if (initialAllocations.length > 0) {
      setAllocations(initialAllocations.map(a => ({ ...a, ledger_id: ledgerId })));
    } else {
      // Create a default single allocation matching the total amount
      setAllocations([
        {
          ledger_id: ledgerId,
          bill_name: "",
          bill_type: "New Ref",
          amount: totalAmount,
          credit_period: "",
        },
      ]);
    }
  }, [ledgerId, totalAmount, initialAllocations]);

  const allocatedTotal = allocations.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const remaining = totalAmount - allocatedTotal;

  // Alt+A and Escape keyboard shortcuts
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
  }, [allocations, remaining]);

  const handleAddRow = () => {
    if (Math.abs(remaining) < 0.01) {
      setError("Total amount is already fully allocated.");
      return;
    }
    setError(null);
    setAllocations(prev => [
      ...prev,
      {
        ledger_id: ledgerId,
        bill_name: "",
        bill_type: remaining > 0 ? "New Ref" : "On Account",
        amount: Math.abs(remaining),
        credit_period: "",
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (allocations.length === 1) {
      setError("At least one allocation row is required.");
      return;
    }
    setError(null);
    setAllocations(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof BillReference, value: any) => {
    setError(null);
    setAllocations(prev =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const updated = { ...item, [field]: value };
        // If changing type to 'On Account', usually the bill name is empty or 'On Account'
        if (field === "bill_type" && value === "On Account") {
          updated.bill_name = "On Account";
        }
        return updated;
      })
    );
  };

  const handleSave = () => {
    if (allocations.some(a => !a.bill_name.trim())) {
      setError("Bill name is required for all references.");
      return;
    }

    if (Math.abs(remaining) >= 0.01) {
      setError(`Allocation mismatch. Remaining: ₹${remaining.toFixed(2)}. Sum must equal ₹${totalAmount.toFixed(2)}.`);
      return;
    }

    onSave(allocations);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[600px] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider">Bill-wise Allocations</span>
            <span className="text-[10px] text-zinc-400 font-mono">Ledger: {ledgerName}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm leading-none">&times;</button>
        </div>

        {/* Info panel */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2.5 flex justify-between items-center text-xs font-semibold text-zinc-700">
          <div>
            <span>Total Bill Value: </span>
            <span className="font-mono text-zinc-900 text-sm">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex gap-4">
            <div>
              <span className="text-zinc-500">Allocated: </span>
              <span className="font-mono text-emerald-700">₹{allocatedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-zinc-500">Remaining: </span>
              <span className={`font-mono ${Math.abs(remaining) < 0.01 ? "text-zinc-500" : remaining > 0 ? "text-amber-600" : "text-rose-600"}`}>
                ₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Table & Form */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 min-h-0">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded flex justify-between items-center font-medium animate-slide-down">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="text-rose-500 font-bold">&times;</button>
            </div>
          )}

          <div className="border border-zinc-200 rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 bg-zinc-100 border-b border-zinc-200 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
              <div className="col-span-3">Type of Ref</div>
              <div className="col-span-4">Name</div>
              <div className="col-span-2 text-center">Cr Days</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-1" />
            </div>

            {/* Table Body */}
            <div className="divide-y divide-zinc-100">
              {allocations.map((item, index) => (
                <div key={index} className="grid grid-cols-12 items-center px-3 py-2 bg-white gap-2">
                  <div className="col-span-3">
                    <select
                      value={item.bill_type}
                      onChange={e => handleChange(index, "bill_type", e.target.value)}
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
                      value={item.bill_name}
                      disabled={item.bill_type === "On Account"}
                      onChange={e => handleChange(index, "bill_name", e.target.value)}
                      placeholder={item.bill_type === "On Account" ? "On Account" : "Ref name"}
                      className="text-xs px-2.5 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full disabled:bg-zinc-50 disabled:text-zinc-400 font-semibold"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="text"
                      value={item.credit_period || ""}
                      disabled={item.bill_type === "On Account"}
                      onChange={e => handleChange(index, "credit_period", e.target.value)}
                      placeholder="e.g. 30"
                      className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 text-center w-full disabled:bg-zinc-50 disabled:text-zinc-400 font-mono font-medium"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      value={item.amount || ""}
                      onChange={e => handleChange(index, "amount", Number(e.target.value) || 0)}
                      className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 text-right w-full font-mono font-semibold"
                    />
                  </div>

                  <div className="col-span-1 text-center">
                    <button
                      onClick={() => handleRemoveRow(index)}
                      className="text-zinc-400 hover:text-rose-600 text-sm font-bold font-sans transition-colors"
                      title="Remove Row"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleAddRow}
            className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded px-2.5 py-1 hover:bg-zinc-50 transition-colors flex items-center gap-1 select-none"
          >
            <span>+</span> Add Split Row
          </button>
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
