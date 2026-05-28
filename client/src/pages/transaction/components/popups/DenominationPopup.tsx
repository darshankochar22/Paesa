import { useState, useEffect } from "react";

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

interface DenominationEntry {
  denomination: number;
  quantity: number;
  amount: number;
}

interface CashDenominationData {
  ledger_id: number;
  entries: DenominationEntry[];
  others: number;
  total: number;
}

interface Props {
  ledgerId: number;
  ledgerName: string;
  amount: number;
  initialDetails?: Partial<CashDenominationData> | null;
  onClose: () => void;
  onSave: (details: CashDenominationData) => void;
}

export default function DenominationPopup({
  ledgerId,
  ledgerName,
  amount,
  initialDetails,
  onClose,
  onSave,
}: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [others, setOthers] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDetails?.entries) {
      const q: Record<string, number> = {};
      initialDetails.entries.forEach((e) => {
        q[String(e.denomination)] = e.quantity;
      });
      setQuantities(q);
      setOthers(initialDetails.others ?? 0);
    } else {
      setQuantities({});
      setOthers(0);
    }
  }, [initialDetails]);

  const handleQtyChange = (denom: number, qty: string) => {
    setError(null);
    const num = Math.max(0, Math.floor(Number(qty) || 0));
    setQuantities((prev) => ({ ...prev, [String(denom)]: num }));
  };

  const computedTotal = DENOMINATIONS.reduce((sum, d) => {
    const qty = quantities[String(d)] || 0;
    return sum + d * qty;
  }, 0) + (others || 0);

  const difference = amount - computedTotal;

  const handleSave = () => {
    const entries: DenominationEntry[] = DENOMINATIONS.map((d) => ({
      denomination: d,
      quantity: quantities[String(d)] || 0,
      amount: d * (quantities[String(d)] || 0),
    })).filter((e) => e.quantity > 0);

    onSave({
      ledger_id: ledgerId,
      entries,
      others: others || 0,
      total: computedTotal,
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [quantities, others, handleSave]);

  const formattedAmount = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[420px] flex flex-col max-h-[85vh] overflow-hidden">

        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider">Cash Denominations</span>
            <span className="text-[10px] text-zinc-400 font-mono">Ledger: {ledgerName}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm">&times;</button>
        </div>

        {/* Title & Amount */}
        <div className="bg-white border-b border-zinc-200 px-4 py-3 text-center">
          <div className="text-sm text-black font-semibold">{ledgerName}</div>
          <div className="text-sm text-black mt-1">
            Denominations For: {formattedAmount}
          </div>
        </div>

        {/* Table Header */}
        <div className="px-4 py-0">
          <div className="grid grid-cols-2 border-b border-zinc-300 py-1 text-sm font-semibold text-black">
            <div>Denominations</div>
            <div className="text-right">Amount</div>
          </div>
        </div>

        {/* Denominations List */}
        <div className="px-4 flex-1 overflow-y-auto min-h-0 space-y-0.5 py-1">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded flex justify-between items-center">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          {DENOMINATIONS.map((denom) => {
            const qty = quantities[String(denom)] || 0;
            const amt = denom * qty;
            return (
              <div key={denom} className="grid grid-cols-2 items-center text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-black w-10 text-right">{denom}</span>
                  <span className="text-black">X</span>
                  <input
                    type="number"
                    min={0}
                    className="w-14 text-sm border border-zinc-300 px-1 py-0.5 outline-none focus:border-zinc-800 bg-white text-right"
                    value={qty || ""}
                    onChange={(e) => handleQtyChange(denom, e.target.value)}
                  />
                </div>
                <div className="text-right font-mono text-black">
                  {amt > 0 ? amt.toLocaleString("en-IN") : ""}
                </div>
              </div>
            );
          })}

          <div className="grid grid-cols-2 items-center text-sm pt-1 border-t border-zinc-200">
            <div className="text-black">Others</div>
            <div className="text-right">
              <input
                type="number"
                min={0}
                className="w-24 text-sm border border-zinc-300 px-1 py-0.5 outline-none focus:border-zinc-800 bg-white text-right"
                value={others || ""}
                onChange={(e) => {
                  setError(null);
                  setOthers(Math.max(0, Number(e.target.value) || 0));
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 items-center text-sm font-semibold pt-1 border-t border-zinc-300">
            <div className="text-black">Total</div>
            <div className="text-right font-mono text-black">
              {computedTotal > 0
                ? computedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })
                : ""}
            </div>
          </div>

          <div className="grid grid-cols-2 items-center text-sm pt-0.5">
            <div className="text-black">Difference</div>
            <div className="text-right font-mono text-black">
              {difference.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500">Alt+A: Accept &nbsp;·&nbsp; Esc: Close</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 font-semibold shadow-sm active:scale-95"
            >
              Accept
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}