import { useEffect, useMemo, useState } from 'react';
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
  // Keyboard highlight into the open "List of Active Batches" (arrows move it,
  // Enter picks it). Reset to 0 each time the list opens or its typed filter
  // changes — mirrors the Godown picker in OrderItemAllocationPopup.
  const [hi, setHi] = useState(0);

  // Navigable rows, in DOM order: ♦ Any, then existing lots, then this-session
  // lots. "New Number" stays a fixed mouse row (it opens a separate popup, not a
  // list pick). Each select() matches that row's existing click action exactly.
  const opts = useMemo(() => {
    const done = () => {
      setOpenListRow(null);
      focusSel(`[data-oa-actual="${i}"]`);
    };
    const list: { key: string; select: () => void }[] = [
      {
        key: 'any',
        select: () => {
          update(i, { batch_number: 'Any' });
          done();
        },
      },
    ];
    activeBatches.forEach((b) =>
      list.push({
        key: `b-${b.name}`,
        select: () => {
          update(i, {
            batch_number: b.name,
            mfg_date: b.mfg_date ?? undefined,
            expiry_date: b.expiry_date ?? undefined,
          });
          done();
        },
      }),
    );
    typedBatches.forEach((n) =>
      list.push({
        key: `t-${n}`,
        select: () => {
          update(i, { batch_number: n });
          done();
        },
      }),
    );
    return list;
  }, [activeBatches, typedBatches, i, update, setOpenListRow]);

  useEffect(() => {
    setHi(0);
  }, [openListRow, row.batch_number]);
  useEffect(() => {
    setHi((h) => Math.min(Math.max(h, 0), Math.max(opts.length - 1, 0)));
  }, [opts.length]);

  const batchBase = 1; // opts index of activeBatches[0]
  const typedBase = 1 + activeBatches.length; // opts index of typedBatches[0]

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
        onKeyDown={(e) => {
          const open = openListRow === i;
          if (open) {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHi((h) => Math.min(h + 1, opts.length - 1));
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHi((h) => Math.max(h - 1, 0));
              return;
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setOpenListRow(null);
              return;
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              const typed = (row.batch_number || '').trim();
              // Adopt the highlighted row when the user hasn't free-typed a lot:
              // empty / "Any", or they deliberately arrowed off the default (hi≠0).
              // Otherwise keep the typed value — never clobber a new lot number.
              const wantsHighlight = hi !== 0 || !typed || typed.toLowerCase() === 'any';
              if (wantsHighlight && opts[hi]) {
                opts[hi].select();
              } else {
                setOpenListRow(null);
                focusSel(`[data-oa-actual="${i}"]`);
              }
              return;
            }
          }
          enter(() => {
            setOpenListRow(null);
            focusSel(`[data-oa-actual="${i}"]`);
          })(e);
        }}
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
              onMouseEnter={() => setHi(0)}
              onMouseDown={(e) => {
                e.preventDefault();
                opts[0].select();
              }}
              className={`flex w-full text-left text-[11px] px-2 py-1 border-b border-gray-100 ${
                hi === 0 ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex-1 font-semibold">&#9670; Any</div>
            </button>
            {activeBatches.map((b, idx) => (
              <button
                key={b.name}
                type="button"
                onMouseEnter={() => setHi(batchBase + idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  opts[batchBase + idx]?.select();
                }}
                className={`flex w-full text-left text-[11px] px-2 py-1 border-b border-gray-100 ${
                  hi === batchBase + idx ? 'bg-gray-200' : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex-1 font-semibold">{b.name}</div>
                <div className="w-16 font-mono">{fmtDate(b.expiry_date)}</div>
                <div className="w-14 text-right font-mono">{b.balance}</div>
              </button>
            ))}
            {/* Lots created this session (New Number) show up too. */}
            {typedBatches.map((n, idx) => (
              <button
                key={`t-${n}`}
                type="button"
                onMouseEnter={() => setHi(typedBase + idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  opts[typedBase + idx]?.select();
                }}
                className={`flex w-full text-left text-[11px] px-2 py-1 border-b border-gray-100 ${
                  hi === typedBase + idx ? 'bg-gray-200' : 'hover:bg-gray-100'
                }`}
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
