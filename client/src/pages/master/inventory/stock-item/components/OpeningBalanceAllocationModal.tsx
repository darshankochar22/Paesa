import { useState, useEffect } from "react";
import type { AllocationEntry } from "../types";
import type { GodownType } from "@/types/api";

interface OpeningBalanceAllocationModalProps {
  itemName: string;
  totalQuantity: number;
  defaultRate: number;
  trackBatches: boolean;
  trackExpiry: boolean;
  godowns: GodownType[];
  initialAllocations: AllocationEntry[];
  onAccept: (allocations: AllocationEntry[]) => void;
  onClose: () => void;
}

export default function OpeningBalanceAllocationModal({
  itemName,
  totalQuantity,
  defaultRate,
  trackBatches,
  trackExpiry,
  godowns,
  initialAllocations,
  onAccept,
  onClose,
}: OpeningBalanceAllocationModalProps) {
  const [rows, setRows] = useState<AllocationEntry[]>([]);

  useEffect(() => {
    if (initialAllocations && initialAllocations.length > 0) {
      setRows(initialAllocations.map(a => ({ ...a })));
    } else {
      // Default to one row with the first godown, or "Main Location" if available
      const defaultGodown = godowns.find(g => !!g.is_main_location || !!g.is_predefined) || godowns[0];
      setRows([
        {
          godown_id: defaultGodown ? String(defaultGodown.godown_id) : "",
          batch_number: "",
          mfg_date: "",
          expiry_date: "",
          quantity: String(totalQuantity || ""),
          rate: String(defaultRate || ""),
        },
      ]);
    }
  }, [initialAllocations, godowns, totalQuantity, defaultRate]);

  const handleAddRow = () => {
    const defaultGodown = godowns.find(g => !!g.is_main_location || !!g.is_predefined) || godowns[0];
    
    // Auto-calculate remaining quantity to fill in the next row
    const allocatedQty = rows.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
    const remainingQty = Math.max(0, totalQuantity - allocatedQty);

    setRows([
      ...rows,
      {
        godown_id: defaultGodown ? String(defaultGodown.godown_id) : "",
        batch_number: "",
        mfg_date: "",
        expiry_date: "",
        quantity: remainingQty > 0 ? String(remainingQty) : "",
        rate: String(defaultRate || ""),
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) {
      // Keep at least one row
      setRows([
        {
          godown_id: rows[0].godown_id,
          batch_number: "",
          mfg_date: "",
          expiry_date: "",
          quantity: "",
          rate: "",
        },
      ]);
      return;
    }
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleUpdateRow = (index: number, fields: Partial<AllocationEntry>) => {
    setRows(prev =>
      prev.map((r, i) => (i === index ? { ...r, ...fields } : r))
    );
  };

  const totalAllocatedQty = rows.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
  const totalAllocatedValue = rows.reduce((sum, r) => {
    const q = parseFloat(r.quantity) || 0;
    const rt = parseFloat(r.rate) || 0;
    return sum + (q * rt);
  }, 0);

  const isQtyMatch = Math.abs(totalAllocatedQty - totalQuantity) < 0.0001;

  const handleAccept = () => {
    // Validate rows
    const validRows = rows.filter(r => {
      const q = parseFloat(r.quantity) || 0;
      return q > 0 && r.godown_id;
    });

    if (validRows.length === 0) {
      alert("Please allocate quantity to at least one valid godown.");
      return;
    }

    if (!isQtyMatch) {
      if (!window.confirm(`Total allocated quantity (${totalAllocatedQty}) does not match the entered opening quantity (${totalQuantity}). Do you want to accept anyway?`)) {
        return;
      }
    }

    onAccept(validRows);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
    if (e.ctrlKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      handleAccept();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white border border-zinc-400 w-[780px] max-w-full flex flex-col shadow-2xl rounded" style={{ minHeight: 300, maxHeight: "85vh" }}>
        {/* Header */}
        <div className="bg-zinc-900 text-white text-xs font-bold px-4 py-2 uppercase tracking-wide shrink-0">
          Allocations for: <span className="text-yellow-400 font-mono">{itemName || "New Stock Item"}</span>
        </div>

        {/* Info Banner */}
        <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center text-xs text-zinc-600 font-sans">
          <span>Target Opening Qty: <strong className="text-zinc-900 font-mono text-sm">{totalQuantity}</strong></span>
          <span>Target Rate: <strong className="text-zinc-900 font-mono text-sm">{defaultRate.toFixed(2)}</strong></span>
          <span>Target Value: <strong className="text-zinc-900 font-mono text-sm">{(totalQuantity * defaultRate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span>
        </div>

        {/* Allocations Table Grid */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col min-h-[150px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-300 text-zinc-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-2 pl-1">Godown</th>
                {trackBatches && <th className="py-2 px-2">Batch / Lot No.</th>}
                {trackBatches && <th className="py-2 px-2">Mfg Date</th>}
                {trackExpiry && <th className="py-2 px-2">Expiry Date</th>}
                <th className="py-2 px-2 text-right">Quantity</th>
                <th className="py-2 px-2 text-right">Rate</th>
                <th className="py-2 px-2 text-right">Amount</th>
                <th className="py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const qty = parseFloat(row.quantity) || 0;
                const rate = parseFloat(row.rate) || 0;
                const amt = qty * rate;

                return (
                  <tr key={idx} className="border-b border-zinc-100 hover:bg-zinc-50 align-middle">
                    {/* Godown Selection */}
                    <td className="py-1.5 pl-1">
                      <select
                        className="w-full bg-zinc-100 border border-zinc-300 rounded px-1.5 py-1 text-xs outline-none focus:border-zinc-500 font-sans"
                        value={row.godown_id}
                        onChange={e => handleUpdateRow(idx, { godown_id: e.target.value })}
                      >
                        <option value="">Select Godown...</option>
                        {godowns.map(g => (
                          <option key={g.godown_id} value={g.godown_id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Batch Number */}
                    {trackBatches && (
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          className="w-full bg-transparent border border-zinc-300 rounded px-1.5 py-1 text-xs outline-none focus:border-zinc-500 font-mono"
                          value={row.batch_number}
                          onChange={e => handleUpdateRow(idx, { batch_number: e.target.value })}
                          placeholder="e.g. B-01"
                        />
                      </td>
                    )}

                    {/* Manufacturing Date */}
                    {trackBatches && (
                      <td className="py-1.5 px-2">
                        <input
                          type="date"
                          className="w-full bg-transparent border border-zinc-300 rounded px-1.5 py-0.5 text-xs outline-none focus:border-zinc-500 font-mono"
                          value={row.mfg_date}
                          onChange={e => handleUpdateRow(idx, { mfg_date: e.target.value })}
                        />
                      </td>
                    )}

                    {/* Expiry Date */}
                    {trackExpiry && (
                      <td className="py-1.5 px-2">
                        <input
                          type="date"
                          className="w-full bg-transparent border border-zinc-300 rounded px-1.5 py-0.5 text-xs outline-none focus:border-zinc-500 font-mono"
                          value={row.expiry_date}
                          onChange={e => handleUpdateRow(idx, { expiry_date: e.target.value })}
                        />
                      </td>
                    )}

                    {/* Quantity */}
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="w-24 bg-transparent border border-zinc-300 rounded px-1.5 py-1 text-xs text-right outline-none focus:border-zinc-500 font-mono"
                        value={row.quantity}
                        onChange={e => handleUpdateRow(idx, { quantity: e.target.value })}
                        placeholder="0"
                      />
                    </td>

                    {/* Rate */}
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="w-20 bg-transparent border border-zinc-300 rounded px-1.5 py-1 text-xs text-right outline-none focus:border-zinc-500 font-mono"
                        value={row.rate}
                        onChange={e => handleUpdateRow(idx, { rate: e.target.value })}
                        placeholder="0.00"
                      />
                    </td>

                    {/* Amount */}
                    <td className="py-1.5 px-2 text-right font-mono text-zinc-700">
                      {amt > 0 ? amt.toFixed(2) : "0.00"}
                    </td>

                    {/* Remove Row */}
                    <td className="py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="text-red-500 hover:text-red-700 font-sans text-sm font-bold"
                        title="Remove row"
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Add Row Button */}
          <div className="mt-3">
            <button
              type="button"
              onClick={handleAddRow}
              className="text-xs px-3 py-1 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 rounded transition-colors font-medium font-sans"
            >
              + Add Item Allocation Row
            </button>
          </div>
        </div>

        {/* Validation Check Warning */}
        {!isQtyMatch && totalQuantity > 0 && (
          <div className="px-4 py-1.5 bg-red-50 border-t border-red-100 text-[11px] text-red-600 font-sans font-medium flex justify-between items-center shrink-0">
            <span>• Allocated quantity ({totalAllocatedQty}) does not match opening quantity ({totalQuantity})!</span>
            <span>Difference: {(totalQuantity - totalAllocatedQty).toFixed(3)}</span>
          </div>
        )}

        {/* Summary Footer */}
        <div className="px-4 py-2 border-t border-zinc-300 bg-zinc-50 flex justify-between items-center text-xs font-semibold shrink-0">
          <span className="text-zinc-500 font-sans">Total Allocated Quantity:</span>
          <div className="flex items-center gap-6 font-mono text-zinc-900">
            <span>{totalAllocatedQty.toFixed(3)}</span>
            <span className="text-zinc-500 font-sans">Total Value:</span>
            <span>{totalAllocatedValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-zinc-300 p-3 flex justify-between bg-zinc-100 text-xs shrink-0 rounded-b">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-600 rounded transition-colors font-medium font-sans"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className={`px-6 py-1.5 text-white rounded transition-colors font-medium font-sans ${isQtyMatch ? 'bg-black hover:bg-zinc-800' : 'bg-yellow-600 hover:bg-yellow-700'}`}
          >
            Accept (Ctrl+A)
          </button>
        </div>
      </div>
    </div>
  );
}
