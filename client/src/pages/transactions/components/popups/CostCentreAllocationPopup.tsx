import { useState, useEffect } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";
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

  // Load cost centres
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await window.api.costCentre.getAll(companyId);
        if (!active) return;
        if (res.success) setCostCentres(res.costCentres ?? []);
        else setError(res.error || "Failed to load cost centres.");
      } catch (err: any) {
        if (active) setError("Error loading cost centres.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [companyId]);

  // Seed allocations once cost centres are loaded
  useEffect(() => {
    if (initialAllocations.length > 0) {
      setAllocations(initialAllocations.map((a) => ({ ...a })));
    } else if (costCentres.length > 0) {
      setAllocations([{ cost_centre_id: costCentres[0].cc_id!, amount: totalAmount }]);
    }
  }, [costCentres, totalAmount, initialAllocations]);

  const allocated = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const remaining = totalAmount - allocated;

  const handleAdd = () => {
    if (!costCentres.length) { setError("No cost centres available."); return; }
    if (Math.abs(remaining) < 0.01) { setError("Amount fully allocated."); return; }
    setError(null);
    setAllocations((prev) => [...prev, { cost_centre_id: costCentres[0].cc_id!, amount: Math.abs(remaining) }]);
  };

  const handleRemove = (i: number) => {
    if (allocations.length === 1) { setError("At least one entry is required."); return; }
    setError(null);
    setAllocations((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleChange = (i: number, field: keyof CostCentreAllocation, value: number) => {
    setError(null);
    setAllocations((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row))
    );
  };

  const handleSave = () => {
    if (allocations.some((a) => !a.cost_centre_id)) {
      setError("Select a cost centre for all entries.");
      return;
    }
    const ids = allocations.map((a) => a.cost_centre_id);
    if (ids.some((v, i) => ids.indexOf(v) !== i)) {
      setError("Duplicate cost centre selections. Merge or remove duplicates.");
      return;
    }
    if (Math.abs(remaining) >= 0.01) {
      setError(`Remaining ₹${remaining.toFixed(2)} must be zero.`);
      return;
    }
    onSave(allocations);
  };

  return (
    <VoucherPopupShell
      title="Cost Centre Allocations"
      headerRight={<span>Ledger: <span className="font-bold text-black">{ledgerName}</span></span>}
      onClose={onClose}
      onAccept={handleSave}
    >
      <div className="max-w-2xl">
        {/* Summary bar */}
        <div className="flex justify-between items-center text-sm text-black border-b border-black pb-2 mb-4">
          <div>
            Total:{" "}
            <span className="font-mono font-bold">
              ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex gap-6">
            <span>
              Allocated:{" "}
              <span className="font-mono">
                ₹{allocated.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </span>
            <span>
              Remaining:{" "}
              <span className={`font-mono ${Math.abs(remaining) < 0.01 ? "" : "font-bold"}`}>
                ₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </span>
          </div>
        </div>

        {error && (
          <div className="border border-black text-black text-sm font-bold px-3 py-2 mb-4 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold px-1">&times;</button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-6 text-gray-500 text-sm italic">Loading cost centres…</div>
        ) : costCentres.length === 0 ? (
          <div className="text-center py-6 text-gray-600 text-sm border border-gray-300">
            No cost centres found. Create one under Master Creation first.
          </div>
        ) : (
          <>
            <div className="border border-gray-300">
              <div className="grid grid-cols-12 border-b border-gray-400 px-3 py-2 text-sm font-bold text-black bg-white">
                <div className="col-span-7">Cost Centre</div>
                <div className="col-span-4 text-right">Amount</div>
                <div className="col-span-1" />
              </div>
              <div className="divide-y divide-gray-200">
                {allocations.map((row, i) => (
                  <div key={i} className="grid grid-cols-12 items-center px-3 py-2 bg-white gap-2">
                    <div className="col-span-7">
                      <select value={row.cost_centre_id}
                        onChange={(e) => handleChange(i, "cost_centre_id", Number(e.target.value))}
                        className="text-sm px-2 py-1 border border-gray-400 outline-none focus:border-black bg-white w-full">
                        {costCentres.map((cc) => (
                          <option key={cc.cc_id} value={cc.cc_id}>{cc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4">
                      <input type="number" step="0.01" value={row.amount || ""}
                        onChange={(e) => handleChange(i, "amount", Number(e.target.value) || 0)}
                        className="text-sm px-2 py-1 border border-gray-400 outline-none focus:border-black bg-white text-right w-full font-mono" />
                    </div>
                    <div className="col-span-1 text-center">
                      <button onClick={() => handleRemove(i)}
                        className="text-gray-500 hover:text-black text-sm font-bold">&times;</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={handleAdd}
              className="mt-4 text-sm font-bold text-black border border-black px-3 py-1 bg-white hover:bg-gray-100 select-none">
              + Add Cost Centre Split
            </button>
          </>
        )}
      </div>
    </VoucherPopupShell>
  );
}
