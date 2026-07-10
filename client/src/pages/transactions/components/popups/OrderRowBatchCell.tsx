import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import type { BatchAllocation } from '../../types';
import { fmtDate, parseExpiry, focusSel, type ActiveBatch } from './orderItemAllocationShared';

// One allocation row's Batch / Lot No. cell (+ stacked Mfg / Expiry inputs and
// the "List of Active Batches" portal dropdown). Extracted from
// OrderItemAllocationPopup.tsx; markup and behaviour unchanged.
interface Props {
  i: number;
  row: BatchAllocation;
  baseIso: string;
  cell: string;
  batchW: string;
  inputCls: string;
  listHeadCls: string;
  trackMfg: boolean;
  trackExpiry: boolean;
  update: (i: number, patch: Partial<BatchAllocation>) => void;
  enter: (fn: () => void) => (e: React.KeyboardEvent) => void;
  listRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  openListRow: number | null;
  setOpenListRow: Dispatch<SetStateAction<number | null>>;
  batchPos: { top: number; left: number; width: number } | null;
  batchDropdownRef: RefObject<HTMLDivElement>;
  setNewNumber: Dispatch<
    SetStateAction<{ row: number; field: 'tracking' | 'order' | 'batch' } | null>
  >;
  activeBatches: ActiveBatch[];
  typedBatches: string[];
}

export default function OrderRowBatchCell({
  i,
  row,
  baseIso,
  cell,
  batchW,
  inputCls,
  listHeadCls,
  trackMfg,
  trackExpiry,
  update,
  enter,
  listRefs,
  openListRow,
  setOpenListRow,
  batchPos,
  batchDropdownRef,
  setNewNumber,
  activeBatches,
  typedBatches,
}: Props) {
  return (
    <div
      className={`${cell} ${batchW} relative`}
      ref={(el) => {
        listRefs.current[i] = el;
      }}
    >
      <input
        type="text"
        data-oa-batch={i}
        value={row.batch_number}
        onChange={(e) => update(i, { batch_number: e.target.value })}
        onFocus={() => setOpenListRow(i)}
        onKeyDown={enter(() => {
          setOpenListRow(null);
          focusSel(`[data-oa-actual="${i}"]`);
        })}
        placeholder="Any / New Number…"
        className={`${inputCls} font-semibold`}
      />
      {(trackMfg || trackExpiry) && (
        <div className="flex gap-1 mt-1">
          <div className="flex-1">
            {trackMfg && (
              <input
                type="date"
                value={row.mfg_date ?? ''}
                onChange={(e) => update(i, { mfg_date: e.target.value })}
                className={`${inputCls} font-mono`}
              />
            )}
          </div>
          <div className="flex-1">
            {trackExpiry && (
              <input
                type="text"
                defaultValue={row.expiry_date ? fmtDate(row.expiry_date) : ''}
                onBlur={(e) => {
                  const iso = parseExpiry(e.target.value, baseIso);
                  update(i, { expiry_date: iso || undefined });
                  e.target.value = iso ? fmtDate(iso) : e.target.value;
                }}
                placeholder="date / 2 years"
                className={`${inputCls} font-mono`}
              />
            )}
          </div>
        </div>
      )}
      {openListRow === i &&
        batchPos &&
        createPortal(
          <div
            ref={batchDropdownRef}
            style={{
              position: 'fixed',
              top: batchPos.top,
              left: batchPos.left,
              width: batchPos.width,
            }}
            className="bg-white border border-gray-400 shadow-xl z-[60] max-h-44 overflow-y-auto"
          >
            <div className={`${listHeadCls} text-[10px] px-2 py-1 sticky top-0`}>
              List of Active Batches
            </div>
            <div className="flex text-[9px] font-bold text-gray-600 px-2 py-1 border-b border-gray-200">
              <div className="flex-1">Name</div>
              <div className="w-16">Expiry</div>
              <div className="w-14 text-right">Balance</div>
            </div>
            {/* New Number — opens the New Number popup. Always
          available (Tally shows it for outward too). */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setOpenListRow(null);
                setNewNumber({ row: i, field: 'batch' });
              }}
              className="flex w-full justify-end text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 font-semibold"
            >
              New Number
            </button>
            {/* Any — no specific lot. */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                update(i, { batch_number: 'Any' });
                setOpenListRow(null);
                focusSel(`[data-oa-actual="${i}"]`);
              }}
              className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100"
            >
              <div className="flex-1 font-semibold">&#9670; Any</div>
            </button>
            {activeBatches.map((b) => (
              <button
                key={b.name}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  update(i, {
                    batch_number: b.name,
                    mfg_date: b.mfg_date ?? undefined,
                    expiry_date: b.expiry_date ?? undefined,
                  });
                  setOpenListRow(null);
                  focusSel(`[data-oa-actual="${i}"]`);
                }}
                className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100"
              >
                <div className="flex-1 font-semibold">{b.name}</div>
                <div className="w-16 font-mono">{fmtDate(b.expiry_date)}</div>
                <div className="w-14 text-right font-mono">{b.balance}</div>
              </button>
            ))}
            {/* Lots created this session (New Number) show up too. */}
            {typedBatches.map((n) => (
              <button
                key={`t-${n}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  update(i, { batch_number: n });
                  setOpenListRow(null);
                  focusSel(`[data-oa-actual="${i}"]`);
                }}
                className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100"
              >
                <div className="flex-1 font-semibold">{n}</div>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
