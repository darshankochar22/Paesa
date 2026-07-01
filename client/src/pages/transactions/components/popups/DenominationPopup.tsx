import { useState, useEffect, useCallback } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

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

  const hasAnyInput = DENOMINATIONS.some((d) => (quantities[String(d)] || 0) > 0) || others > 0;

  const isValidForAccept = !hasAnyInput || Math.abs(difference) < 0.01;

  const handleSave = useCallback(() => {
    if (!isValidForAccept) {
      setError(`Denominations do not balance. Difference: ${difference.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      return;
    }

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
  }, [isValidForAccept, difference, quantities, others, computedTotal, ledgerId, onSave]);

  const formattedAmount = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <VoucherPopupShell
      title="Cash Denominations"
      headerRight={
        <span>
          {ledgerName} &middot; Denominations For:{" "}
          <span className="font-bold text-black">{formattedAmount}</span>
        </span>
      }
      onClose={onClose}
      onAccept={handleSave}
      hint={
        hasAnyInput && !isValidForAccept
          ? "Balance denominations to accept"
          : undefined
      }
    >
      <div className="max-w-md">
        {error && (
          <div className="border border-black text-black text-sm font-bold px-3 py-2 mb-4 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold px-1">&times;</button>
          </div>
        )}

        {/* Table Header */}
        <div className="grid grid-cols-2 border-b border-black py-2 text-sm font-bold text-black">
          <div>Denominations</div>
          <div className="text-right">Amount</div>
        </div>

        {/* Denominations List */}
        <div className="divide-y divide-gray-200">
          {DENOMINATIONS.map((denom) => {
            const qty = quantities[String(denom)] || 0;
            const amt = denom * qty;
            return (
              <div key={denom} className="grid grid-cols-2 items-center text-sm py-1">
                <div className="flex items-center gap-2">
                  <span className="text-black w-10 text-right">{denom}</span>
                  <span className="text-black">X</span>
                  <input
                    type="number"
                    min={0}
                    className="w-16 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white text-right"
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
        </div>

        <div className="grid grid-cols-2 items-center text-sm py-2 border-t border-gray-400">
          <div className="text-black">Others</div>
          <div className="text-right">
            <input
              type="number"
              min={0}
              className="w-24 text-sm border border-gray-400 px-2 py-1 outline-none focus:border-black bg-white text-right"
              value={others || ""}
              onChange={(e) => {
                setError(null);
                setOthers(Math.max(0, Number(e.target.value) || 0));
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 items-center text-sm font-bold py-2 border-t border-black">
          <div className="text-black">Total</div>
          <div className="text-right font-mono text-black">
            {computedTotal > 0 ? computedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}
          </div>
        </div>

        <div className={`grid grid-cols-2 items-center text-sm py-1 ${!isValidForAccept && hasAnyInput ? "font-bold" : ""}`}>
          <div className="text-black">Difference</div>
          <div className="text-right font-mono text-black">
            {difference.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </VoucherPopupShell>
  );
}
