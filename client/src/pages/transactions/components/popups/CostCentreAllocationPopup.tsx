import { useState, useEffect } from "react";
import type { CostCentreType } from "@/types/api";

interface CostCentreAllocation {
  cost_centre_id: number;
  amount: number;
}

interface Props {
  companyId: number;
  ledgerName: string;
  totalAmount: number;
  initialAllocations?: CostCentreAllocation[];
  onClose: () => void;
  onSave: (allocations: CostCentreAllocation[]) => void;
}

export default function CostCentreAllocationPopup({
  companyId,
  ledgerName,
  totalAmount,
  initialAllocations = [],
  onClose,
  onSave,
}: Props) {
  const [costCentres, setCostCentres] = useState<CostCentreType[]>([]);
  const [allocations, setAllocations] = useState<CostCentreAllocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load cost centres list
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await window.api.costCentre.getAll(companyId);
        if (!active) return;
        if (res.success) {
          setCostCentres(res.costCentres || []);
        } else {
          setError(res.error || "Failed to load cost centres.");
        }
      } catch (err: any) {
        console.error("Failed to load cost centres", err);
        setError("Error loading cost centres.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [companyId]);

  // Initialize allocations state
  useEffect(() => {
    if (initialAllocations.length > 0) {
      setAllocations(initialAllocations.map(a => ({ ...a })));
    } else if (costCentres.length > 0) {
      // Setup a default split
      setAllocations([
        {
          cost_centre_id: costCentres[0].cc_id!,
          amount: totalAmount,
        },
      ]);
    }
  }, [costCentres, totalAmount, initialAllocations]);

  const allocatedTotal = allocations.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const remaining = totalAmount - allocatedTotal;

  // Shortcuts Alt+A and Escape
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
    if (costCentres.length === 0) {
      setError("No cost centres available.");
      return;
    }
    if (Math.abs(remaining) < 0.01) {
      setError("Voucher row amount is already fully allocated.");
      return;
    }
    setError(null);
    setAllocations(prev => [
      ...prev,
      {
        cost_centre_id: costCentres[0].cc_id!,
        amount: Math.abs(remaining),
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (allocations.length === 1) {
      setError("At least one cost centre allocation is required.");
      return;
    }
    setError(null);
    setAllocations(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof CostCentreAllocation, value: number) => {
    setError(null);
    setAllocations(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSave = () => {
    if (allocations.some(a => !a.cost_centre_id)) {
      setError("Please select a cost centre for all entries.");
      return;
    }

    // Check duplicate cost centres
    const ids = allocations.map(a => a.cost_centre_id);
    const hasDuplicates = ids.some((val, i) => ids.indexOf(val) !== i);
    if (hasDuplicates) {
      setError("Duplicate cost centre selections. Merge or remove duplicates.");
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
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[500px] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider">Cost Centre Allocations</span>
            <span className="text-[10px] text-zinc-400 font-mono">Ledger: {ledgerName}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm leading-none">&times;</button>
        </div>

        {/* Info panel */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2.5 flex justify-between items-center text-xs font-semibold text-zinc-700">
          <div>
            <span>Total Value: </span>
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

          {loading ? (
            <div className="text-center py-6 text-zinc-500 text-xs italic">Loading cost centres…</div>
          ) : costCentres.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-xs bg-zinc-50 rounded border border-zinc-200">
              No cost centres found. Go to Master Creation to add a Cost Centre first.
            </div>
          ) : (
            <>
              <div className="border border-zinc-200 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 bg-zinc-100 border-b border-zinc-200 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  <div className="col-span-7">Cost Centre</div>
                  <div className="col-span-4 text-right">Amount</div>
                  <div className="col-span-1" />
                </div>

                {/* Table Body */}
                <div className="divide-y divide-zinc-100">
                  {allocations.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 items-center px-3 py-2 bg-white gap-2">
                      <div className="col-span-7">
                        <select
                          value={item.cost_centre_id}
                          onChange={e => handleChange(index, "cost_centre_id", Number(e.target.value))}
                          className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 bg-white w-full font-semibold"
                        >
                          {costCentres.map(cc => (
                            <option key={cc.cc_id} value={cc.cc_id}>{cc.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-4">
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
                <span>+</span> Add Cost Centre Split
              </button>
            </>
          )}
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
              disabled={costCentres.length === 0}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50 font-semibold shadow-sm transition-all hover:shadow active:scale-95 duration-100"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
