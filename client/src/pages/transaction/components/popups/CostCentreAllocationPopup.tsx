import { useState, useEffect } from "react";
import type { CostCentreType } from "@/types/api";
import type { CostCentreAllocation } from "../../types";
import PopupShell from "./shared/PopupShell";

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
      } catch {
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

  const handleSave = () => {
    if (allocations.some((a) => !a.cost_centre_id)) {
      setError("Select a cost centre for all entries."); return;
    }
    const ids = allocations.map((a) => a.cost_centre_id);
    if (ids.some((v, i) => ids.indexOf(v) !== i)) {
      setError("Duplicate cost centre selections. Merge or remove duplicates."); return;
    }
    if (Math.abs(remaining) >= 0.01) {
      setError(`Remaining ₹${remaining.toFixed(2)} must be zero.`); return;
    }
    onSave(allocations);
  };

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
    if (!costCentres.length) { setError("No cost centres available."); return; }
    if (Math.abs(remaining) < 0.01) { setError("Amount fully allocated."); return; }
    setError(null);
    setAllocations((prev) => [
      ...prev,
      { cost_centre_id: costCentres[0].cc_id!, amount: Math.abs(remaining) },
    ]);
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

  return (
    <PopupShell
      title="Cost Centre Allocations"
      subtitle={`Ledger: ${ledgerName}`}
      width="w-[500px]"
      onClose={onClose}
      onAccept={handleSave}
      acceptDisabled={costCentres.length === 0}
      infoBar={
        <div className="flex justify-between items-center text-xs font-semibold text-zinc-700">
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
        </div>
      }
    >
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded flex justify-between items-center">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="font-bold">&times;</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-6 text-zinc-500 text-xs italic">
          Loading cost centres…
        </div>
      ) : costCentres.length === 0 ? (
        <div className="text-center py-6 text-zinc-500 text-xs bg-zinc-50 rounded border border-zinc-200">
          No cost centres found. Create one under Master Creation first.
        </div>
      ) : (
        <>
          <div className="border border-zinc-200 rounded-lg overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 bg-zinc-100 border-b border-zinc-200 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
              <div className="col-span-7">Cost Centre</div>
              <div className="col-span-4 text-right">Amount</div>
              <div className="col-span-1" />
            </div>

            {/* Rows */}
            <div className="divide-y divide-zinc-100">
              {allocations.map((row, i) => (
                <div key={i} className="grid grid-cols-12 items-center px-3 py-2 bg-white gap-2">
                  <div className="col-span-7">
                    <select
                      value={row.cost_centre_id}
                      onChange={(e) => handleChange(i, "cost_centre_id", Number(e.target.value))}
                      className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 bg-white w-full font-semibold"
                    >
                      {costCentres.map((cc) => (
                        <option key={cc.cc_id} value={cc.cc_id}>{cc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4">
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
                      className="text-zinc-400 hover:text-rose-600 text-sm font-bold"
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
            + Add Cost Centre Split
          </button>
        </>
      )}
    </PopupShell>
  );
}