import { useState, useEffect, useCallback } from 'react';
import { VoucherPopupShell } from '@/components/tally-ui/VoucherPopupShell';

const DENOMINATIONS = [2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

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

// No native number-spinner arrows — Tally's grid has none, and they clutter the
// strict B&W look.
const qtyInputBase =
  'h-6 text-xs text-right px-1 border border-gray-300 bg-white outline-none focus:border-black ' +
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
const qtyInputCls = 'w-16 ' + qtyInputBase;
const othersInputCls = 'w-24 ' + qtyInputBase;

const fmt2 = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  // A negative voucher amount (cash paid out) can never be matched by qty-clamped
  // positive denominations — balance against the absolute value and flag the
  // header as "Cash Out".
  const isCashOut = amount < 0;
  const targetAmount = Math.abs(amount);

  const computedTotal =
    DENOMINATIONS.reduce((sum, d) => sum + d * (quantities[String(d)] || 0), 0) + (others || 0);

  const difference = targetAmount - computedTotal;
  const hasAnyInput = DENOMINATIONS.some((d) => (quantities[String(d)] || 0) > 0) || others > 0;
  const isBalanced = hasAnyInput && Math.abs(difference) < 0.01;

  // Sum of everything EXCEPT one denomination — used to cap that denomination so
  // the running total can never exceed the voucher amount.
  const baseExcluding = (denom: number) =>
    DENOMINATIONS.reduce((s, d) => (d === denom ? s : s + d * (quantities[String(d)] || 0)), 0) +
    (others || 0);

  // Once the denominations add up to the voucher amount, drop focus onto Accept
  // (Tally skips the remaining rows and lands on the bottom) so Enter accepts.
  const focusAccept = () => {
    requestAnimationFrame(() => {
      (document.querySelector('[data-popup-accept]') as HTMLElement | null)?.focus();
    });
  };

  const handleQtyChange = (denom: number, qtyStr: string) => {
    setError(null);
    const raw = Math.max(0, Math.floor(Number(qtyStr) || 0));
    const base = baseExcluding(denom);
    // Never let this denomination push the total past the voucher amount.
    const maxQty = targetAmount > 0 ? Math.max(0, Math.floor((targetAmount - base) / denom)) : raw;
    const clamped = Math.min(raw, maxQty);
    setQuantities((prev) => ({ ...prev, [String(denom)]: clamped }));
    if (targetAmount > 0 && Math.abs(targetAmount - (base + denom * clamped)) < 0.01) focusAccept();
  };

  const handleOthersChange = (v: string) => {
    setError(null);
    const raw = Math.max(0, Number(v) || 0);
    const base = DENOMINATIONS.reduce((s, d) => s + d * (quantities[String(d)] || 0), 0);
    const maxOthers = targetAmount > 0 ? Math.max(0, targetAmount - base) : raw;
    const clamped = Math.min(raw, maxOthers);
    setOthers(clamped);
    if (targetAmount > 0 && Math.abs(targetAmount - (base + clamped)) < 0.01) focusAccept();
  };

  const handleSave = useCallback(() => {
    if (!hasAnyInput && targetAmount !== 0) {
      setError('Enter denominations before accepting — the amount is not zero.');
      return;
    }
    if (hasAnyInput && Math.abs(difference) >= 0.01) {
      setError(`Denominations do not balance. Difference: ${fmt2(difference)}`);
      return;
    }

    const entries: DenominationEntry[] = DENOMINATIONS.map((d) => ({
      denomination: d,
      quantity: quantities[String(d)] || 0,
      amount: d * (quantities[String(d)] || 0),
    })).filter((e) => e.quantity > 0);

    onSave({ ledger_id: ledgerId, entries, others: others || 0, total: computedTotal });
  }, [hasAnyInput, targetAmount, difference, quantities, others, computedTotal, ledgerId, onSave]);

  return (
    <VoucherPopupShell
      title="Cash Denominations"
      size="compact"
      headerVariant="stacked"
      headerRight={
        <span>
          {ledgerName} &middot; Denominations For:{' '}
          <span className="font-bold text-black">{fmt2(targetAmount)}</span>
          {isCashOut && <span className="font-bold text-black"> (Cash Out)</span>}
        </span>
      }
      onClose={onClose}
      onAccept={handleSave}
      hint={hasAnyInput && !isBalanced ? 'Balance denominations to accept' : undefined}
    >
      <div className="w-full max-w-sm mx-auto">
        {error && (
          <div className="border border-black text-black text-xs font-bold px-2 py-1.5 mb-2 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold px-1">
              &times;
            </button>
          </div>
        )}

        {/* Header */}
        <div className="grid grid-cols-[1fr_auto] border-b border-black pb-1 text-xs font-bold text-black">
          <div>Denominations</div>
          <div className="text-right">Amount</div>
        </div>

        {/* Denomination rows */}
        <div>
          {DENOMINATIONS.map((denom) => {
            const qty = quantities[String(denom)] || 0;
            const amt = denom * qty;
            return (
              <div key={denom} className="grid grid-cols-[1fr_auto] items-center py-[2px] text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-12 text-right text-black tabular-nums">
                    {denom.toLocaleString('en-IN')}
                  </span>
                  <span className="text-gray-500">X</span>
                  <input
                    type="number"
                    min={0}
                    className={qtyInputCls}
                    value={qty || ''}
                    onChange={(e) => handleQtyChange(denom, e.target.value)}
                  />
                </div>
                <div className="text-right tabular-nums text-black min-w-[96px]">
                  {amt > 0 ? amt.toLocaleString('en-IN') : ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* Others */}
        <div className="grid grid-cols-[1fr_auto] items-center py-[2px] text-xs border-t border-gray-300 mt-0.5 pt-1">
          <div className="text-black">Others</div>
          <div className="text-right">
            <input
              type="number"
              min={0}
              className={othersInputCls}
              value={others || ''}
              onChange={(e) => handleOthersChange(e.target.value)}
            />
          </div>
        </div>

        {/* Total */}
        <div className="grid grid-cols-[1fr_auto] items-center py-1 text-xs font-bold border-t border-black mt-0.5">
          <div className="text-black">Total</div>
          <div className="text-right tabular-nums text-black min-w-[96px]">
            {computedTotal > 0 ? fmt2(computedTotal) : ''}
          </div>
        </div>

        {/* Difference */}
        <div
          className={`grid grid-cols-[1fr_auto] items-center py-[2px] text-xs ${
            !isBalanced && hasAnyInput ? 'font-bold' : ''
          }`}
        >
          <div className="text-black">Difference</div>
          <div className="text-right tabular-nums text-black min-w-[96px]">{fmt2(difference)}</div>
        </div>
      </div>
    </VoucherPopupShell>
  );
}
