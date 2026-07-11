import { useState, useEffect } from 'react';
import type { GodownType } from '@/types/entities/Godown';
import { inr, qty, type GodownAllocation, type StockRow } from './dealerExciseOpeningStockShared';

// ── Item (Godown) Allocations popup ────────────────────────────────────────
export default function GodownAllocationPopup({
  row,
  godowns,
  onClose,
  onSave,
}: {
  row: StockRow;
  godowns: GodownType[];
  onClose: () => void;
  onSave: (allocs: GodownAllocation[]) => void;
}) {
  const defaultActual = row.quantityRaw || '';
  const defaultBilled = row.billedQtyRaw || row.quantityRaw || '';
  const defaultRate = row.rateRaw || '';
  const defaultDisc = row.discPercentRaw || '';

  const [allocs, setAllocs] = useState<GodownAllocation[]>(
    row.godownAllocations.length
      ? row.godownAllocations
      : [
          {
            godown_id: godowns[0]?.godown_id ?? null,
            godown_name: godowns[0]?.name ?? '',
            actualRaw: defaultActual,
            billedRaw: defaultBilled,
            rateRaw: defaultRate,
            discPercentRaw: defaultDisc,
          },
        ],
  );

  const set = (idx: number, patch: Partial<GodownAllocation>) =>
    setAllocs((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));

  const addRow = () =>
    setAllocs((prev) => [
      ...prev,
      {
        godown_id: null,
        godown_name: '',
        actualRaw: '',
        billedRaw: '',
        rateRaw: defaultRate,
        discPercentRaw: defaultDisc,
      },
    ]);

  const removeRow = (idx: number) => setAllocs((prev) => prev.filter((_, i) => i !== idx));

  const allocAmount = (a: GodownAllocation) => {
    const q = Number(a.billedRaw || a.actualRaw) || 0;
    const rate = Number(a.rateRaw) || 0;
    const disc = Number(a.discPercentRaw) || 0;
    const gross = q * rate;
    return gross - (gross * disc) / 100;
  };

  const totalActual = allocs.reduce((s, a) => s + (Number(a.actualRaw) || 0), 0);
  const totalBilled = allocs.reduce((s, a) => s + (Number(a.billedRaw || a.actualRaw) || 0), 0);
  const totalAmount = allocs.reduce((s, a) => s + allocAmount(a), 0);
  const unitSymbol = row.unit?.symbol ?? '';

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        onSave(allocs);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-enter-nav>
      <div className="bg-white border border-black shadow-xl w-[820px] flex flex-col">
        <div className="bg-black text-white px-3 py-1 flex justify-between items-center select-none">
          <span className="text-sm font-bold">
            Item Allocations for&nbsp;&nbsp;{row.stockItem?.name ?? 'Item'}
          </span>
          <button
            onClick={onClose}
            className="text-white hover:text-zinc-300 font-bold text-sm leading-none"
          >
            &times;
          </button>
        </div>

        {/* header — two-line, mirrors the main grid */}
        <div className="border-b border-black bg-white">
          <div className="flex px-3 py-0.5">
            <div className="flex-1 text-sm font-semibold text-black">Godown</div>
            <div className="w-40 text-center text-sm font-semibold text-black">Quantity</div>
            <div className="w-24 text-right text-sm font-semibold text-black">Rate</div>
            <div className="w-10 text-center text-sm font-semibold text-black">per</div>
            <div className="w-16 text-right text-sm font-semibold text-black">Disc %</div>
            <div className="w-28 text-right text-sm font-semibold text-black">Amount</div>
            <div className="w-6" />
          </div>
          <div className="flex px-3 py-0.5 border-t border-zinc-200">
            <div className="flex-1" />
            <div className="w-40 flex">
              <div className="flex-1 text-center text-xs text-zinc-600">Actual</div>
              <div className="flex-1 text-center text-xs text-zinc-600">Billed</div>
            </div>
            <div className="w-24" />
            <div className="w-10" />
            <div className="w-16" />
            <div className="w-28" />
            <div className="w-6" />
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {allocs.map((a, idx) => (
            <div key={idx} className="flex items-center border-b border-zinc-100 px-3 py-0.5">
              <div className="flex-1 pr-2">
                <select
                  className="w-full text-sm border border-zinc-400 px-1 py-0 outline-none focus:border-black bg-white"
                  value={a.godown_id ?? ''}
                  onChange={(e) => {
                    const gid = e.target.value ? Number(e.target.value) : null;
                    const g = godowns.find((x) => x.godown_id === gid);
                    set(idx, { godown_id: gid, godown_name: g?.name ?? '' });
                  }}
                >
                  <option value="">Select Godown</option>
                  {godowns.map((g) => (
                    <option key={g.godown_id} value={g.godown_id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-40 flex">
                <div className="flex-1 text-right pr-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-sm border border-transparent focus:border-black outline-none px-1"
                    value={a.actualRaw}
                    onChange={(e) =>
                      set(idx, {
                        actualRaw: e.target.value,
                        billedRaw:
                          a.billedRaw === '' || a.billedRaw === a.actualRaw
                            ? e.target.value
                            : a.billedRaw,
                      })
                    }
                  />
                </div>
                <div className="flex-1 text-right pr-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-sm border border-transparent focus:border-black outline-none px-1"
                    value={a.billedRaw || a.actualRaw}
                    onChange={(e) => set(idx, { billedRaw: e.target.value })}
                  />
                </div>
              </div>
              <div className="w-24 text-right pr-1">
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-sm border border-transparent focus:border-black outline-none px-1"
                  value={a.rateRaw}
                  onChange={(e) => set(idx, { rateRaw: e.target.value })}
                />
              </div>
              <div className="w-10 text-center text-xs text-zinc-500">{unitSymbol}</div>
              <div className="w-16 text-right pr-1">
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-sm border border-transparent focus:border-black outline-none px-1"
                  value={a.discPercentRaw}
                  onChange={(e) => set(idx, { discPercentRaw: e.target.value })}
                />
              </div>
              <div className="w-28 text-right text-sm font-semibold text-black tabular-nums">
                {allocAmount(a) > 0 ? inr(allocAmount(a)) : ''}
              </div>
              <div className="w-6 text-center">
                {allocs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-xs text-zinc-400 hover:text-black"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-3 py-1 border-b border-zinc-100">
          <button
            type="button"
            onClick={addRow}
            className="text-xs text-zinc-600 hover:text-black border border-zinc-300 px-2 py-0.5"
          >
            + Add Godown
          </button>
        </div>

        {/* totals */}
        <div className="flex border-t border-black px-3 py-0.5 bg-white">
          <div className="flex-1 text-xs text-zinc-700 font-semibold">Total</div>
          <div className="w-40 flex">
            <div className="flex-1 text-right pr-1 text-sm font-semibold text-black tabular-nums">
              {qty(totalActual, unitSymbol)}
            </div>
            <div className="flex-1 text-right pr-1 text-sm font-semibold text-black tabular-nums">
              {qty(totalBilled, unitSymbol)}
            </div>
          </div>
          <div className="w-24" />
          <div className="w-10" />
          <div className="w-16" />
          <div className="w-28 text-right text-sm font-semibold text-black tabular-nums">
            {totalAmount > 0 ? inr(totalAmount) : ''}
          </div>
          <div className="w-6" />
        </div>

        <div className="border-t border-black px-3 py-2 flex justify-between items-center bg-white">
          <span className="text-[10px] text-zinc-600">
            Alt+A: Accept &nbsp;&middot;&nbsp; Esc: Close
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1 border border-black text-black hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              data-enter-accept
              onClick={() => onSave(allocs)}
              className="text-xs px-4 py-1 bg-black text-white hover:bg-zinc-800"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
