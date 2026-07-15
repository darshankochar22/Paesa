import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { BatchAllocation } from '../../types';
import { NA, EOL, fmtDate, focusSel, hasTracking } from './orderItemAllocationShared';

// One allocation row's "Tracking No. / Order No. / Due on" header line with its
// portal dropdowns. Extracted from OrderItemAllocationPopup.tsx; markup and
// behaviour unchanged.
interface Props {
  i: number;
  row: BatchAllocation;
  listHeadCls: string;
  smallInputCls: string;
  optSpecial: string;
  optNew: string;
  update: (i: number, patch: Partial<BatchAllocation>) => void;
  enter: (fn: () => void) => (e: React.KeyboardEvent) => void;
  afterTracking: (i: number, value: string) => void;
  endOfList: (i: number) => void;
  selectOrder: (i: number, o: any) => void;
  setNewNumber: Dispatch<
    SetStateAction<{ row: number; field: 'tracking' | 'order' | 'batch' } | null>
  >;
  openTrackRow: number | null;
  setOpenTrackRow: Dispatch<SetStateAction<number | null>>;
  openOrderRow: number | null;
  setOpenOrderRow: Dispatch<SetStateAction<number | null>>;
  setOpenGodownRow: Dispatch<SetStateAction<number | null>>;
  trackPos: { top: number; left: number; width: number } | null;
  orderPos: { top: number; left: number; width: number } | null;
  trackDropdownRef: RefObject<HTMLDivElement>;
  orderDropdownRef: RefObject<HTMLDivElement>;
  trackAnchorRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  orderAnchorRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  sessionTracking: Array<{ no: string; godown?: string; balance?: number | string }>;
  sessionOrders: Array<{
    no: string;
    godown?: string;
    due?: string | null;
    balance?: number | string;
  }>;
}

export default function OrderRowTrackingLine({
  i,
  row,
  listHeadCls,
  smallInputCls,
  optSpecial,
  optNew,
  update,
  enter,
  afterTracking,
  endOfList,
  selectOrder,
  setNewNumber,
  openTrackRow,
  setOpenTrackRow,
  openOrderRow,
  setOpenOrderRow,
  setOpenGodownRow,
  trackPos,
  orderPos,
  trackDropdownRef,
  orderDropdownRef,
  trackAnchorRefs,
  orderAnchorRefs,
  sessionTracking,
  sessionOrders,
}: Props) {
  // Order No. / Due on always show — order tracking works with or without a
  // tracking number (Tally shows both side by side).
  const showOrder = true;

  // Keyboard highlight into whichever dropdown is open (only one at a time).
  // Arrow keys move it, Enter picks the highlighted row, Esc closes — Tally
  // flow, no mouse needed. Mirrors LedgerListPanel / InventoryAllocationPopup.
  const [hi, setHi] = useState(0);

  // Selectable rows in DOM order, each with the exact action its onMouseDown runs.
  const trackList = useMemo(
    () => sessionTracking.filter((t) => t.no !== row.tracking_no),
    [sessionTracking, row.tracking_no],
  );
  const orderList = useMemo(
    () => sessionOrders.filter((o) => o.no !== row.order_no),
    [sessionOrders, row.order_no],
  );
  const trackOptions = useMemo<Array<() => void>>(
    () => [
      () => endOfList(i),
      () => afterTracking(i, NA),
      () => {
        setOpenTrackRow(null);
        setNewNumber({ row: i, field: 'tracking' });
      },
      ...trackList.map((t) => () => afterTracking(i, t.no)),
    ],
    [i, trackList, endOfList, afterTracking, setOpenTrackRow, setNewNumber],
  );
  const orderOptions = useMemo<Array<() => void>>(
    () => [
      () => {
        update(i, { order_no: NA });
        setOpenOrderRow(null);
        focusSel(`[data-oa-due="${i}"]`);
      },
      () => {
        setOpenOrderRow(null);
        setNewNumber({ row: i, field: 'order' });
      },
      ...orderList.map((o) => () => selectOrder(i, o)),
    ],
    [i, orderList, update, setOpenOrderRow, setNewNumber, selectOrder],
  );

  // Reset the highlight whenever a list opens or its filter (typed value) changes.
  useEffect(() => {
    setHi(0);
  }, [openTrackRow, openOrderRow, row.tracking_no, row.order_no]);

  // Keep the highlighted option scrolled into view while arrowing / paging. The
  // option <button>s render in the same order as the `hi` index, so the hi-th
  // button is the highlighted one.
  useEffect(() => {
    const dd =
      openTrackRow === i
        ? trackDropdownRef.current
        : openOrderRow === i
          ? orderDropdownRef.current
          : null;
    dd?.querySelectorAll<HTMLElement>('button')[hi]?.scrollIntoView({ block: 'nearest' });
  }, [hi, openTrackRow, openOrderRow, i, trackDropdownRef, orderDropdownRef]);

  // A blank allocation line — no godown / qty / batch / tracking / order yet.
  // Tally: Enter on such a line accepts the sub-screen (keeping the filled rows)
  // and returns to the voucher; it must NOT walk this empty row's fields, which
  // would append yet another blank line on every Enter.
  const rowEmpty =
    !(row.godown && String(row.godown).trim()) &&
    !(Number(row.quantity) > 0) &&
    !(Number(row.actual_quantity) > 0) &&
    !(row.batch_number || '').trim() &&
    !hasTracking(row) &&
    !(row.tracking_no || '').trim() &&
    !(row.order_no && row.order_no !== NA);

  const listKeyDown =
    (open: boolean, options: Array<() => void>, close: () => void, fallback: () => void) =>
    (open: boolean, options: Array<() => void>, close: () => void, fallback: () => void) =>
    (e: React.KeyboardEvent) => {
      if (open && options.length) {
        const last = options.length - 1;
        const PAGE = 10; // rows per PgUp/PgDn jump (TallyPrime-style)
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHi((h) => Math.min(h + 1, last));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHi((h) => Math.max(h - 1, 0));
          return;
        }
        if (e.key === 'PageDown') {
          e.preventDefault();
          setHi((h) => Math.min(h + PAGE, last));
          return;
        }
        if (e.key === 'PageUp') {
          e.preventDefault();
          setHi((h) => Math.max(h - PAGE, 0));
          return;
        }
        if (e.key === 'Home') {
          e.preventDefault();
          setHi(0);
          return;
        }
        if (e.key === 'End') {
          e.preventDefault();
          setHi(last);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          close();
          return;
        }
        if (e.key === 'Enter') {
          const action = options[hi];
          if (action) {
            e.preventDefault();
            action();
            return;
          }
        }
      }
      // List closed or nothing highlighted → existing Enter behaviour.
      enter(fallback)(e);
    };

  return (
    <div className="flex items-center px-3 pt-1.5 gap-2 text-[11px]">
      <span className="italic text-gray-600 shrink-0">Tracking No. :</span>
      <div
        data-oa-dd
        className="relative shrink-0"
        ref={(el) => {
          trackAnchorRefs.current[i] = el;
        }}
      >
        <input
          type="text"
          data-oa-track={i}
          autoFocus={i === 0}
          value={row.tracking_no ?? ''}
          onFocus={() => {
            setOpenTrackRow(i);
            setOpenOrderRow(null);
            setOpenGodownRow(null);
          }}
          onChange={(e) => update(i, { tracking_no: e.target.value })}
          onKeyDown={(e) => {
            // Blank line → "End of List": endOfList accepts the sub-screen when
            // an allocation already exists, but on a FRESH sub-screen (nothing
            // allocated yet) it now advances into this row (Godown → Qty → Rate)
            // instead of closing, so the user can actually key the quantity. The
            // ONLY exception: the list is open AND the user arrowed onto a
            // specific entry (hi > 0) to pick a real tracking number — then defer
            // to listKeyDown so selection still works.
            if (e.key === 'Enter' && rowEmpty && !(openTrackRow === i && hi > 0)) {
              e.preventDefault();
              endOfList(i);
              return;
            }
            listKeyDown(
              openTrackRow === i,
              trackOptions,
              () => setOpenTrackRow(null),
              () => afterTracking(i, (row.tracking_no || '').trim()),
            )(e);
          }}
          placeholder="New Number…"
          className={`w-28 ${smallInputCls}`}
        />
        {openTrackRow === i &&
          trackPos &&
          createPortal(
            <div
              ref={trackDropdownRef}
              style={{
                position: 'fixed',
                top: trackPos.top,
                left: trackPos.left,
                width: trackPos.width,
              }}
              className="bg-white border border-gray-400 shadow-xl z-[60] max-h-52 overflow-y-auto"
            >
              <div className={`${listHeadCls} text-[10px] px-2 py-0.5`}>
                List of Tracking Numbers
              </div>
              <div className="flex text-[9px] font-bold text-gray-600 px-2 py-0.5 border-b border-gray-200">
                <div className="flex-1">Number</div>
                <div className="w-16">Godown</div>
                <div className="w-12 text-right">Balance</div>
              </div>
              <button
                type="button"
                onMouseEnter={() => setHi(0)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  endOfList(i);
                }}
                className={
                  optSpecial + ' border-b border-gray-100' + (hi === 0 ? ' bg-gray-200' : '')
                }
                className={
                  optSpecial + ' border-b border-gray-100' + (hi === 0 ? ' bg-gray-200' : '')
                }
              >
                {EOL}
              </button>
              <button
                type="button"
                onMouseEnter={() => setHi(1)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  afterTracking(i, NA);
                }}
                className={
                  optSpecial + ' border-b border-gray-100' + (hi === 1 ? ' bg-gray-200' : '')
                }
                className={
                  optSpecial + ' border-b border-gray-100' + (hi === 1 ? ' bg-gray-200' : '')
                }
              >
                {NA}
              </button>
              <button
                type="button"
                onMouseEnter={() => setHi(2)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpenTrackRow(null);
                  setNewNumber({ row: i, field: 'tracking' });
                }}
                className={optNew + (hi === 2 ? ' bg-gray-200' : '')}
              >
                New Number
              </button>
              {trackList.map((t, k) => (
                <button
                  key={t.no}
                  type="button"
                  onMouseEnter={() => setHi(3 + k)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    afterTracking(i, t.no);
                  }}
                  className={`flex w-full text-left text-[11px] px-2 py-1 border-b border-gray-100 ${
                    hi === 3 + k ? 'bg-gray-200' : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex-1 font-semibold">{t.no}</div>
                  <div className="w-16 truncate">{t.godown}</div>
                  <div className="w-12 text-right font-mono">{t.balance || ''}</div>
                </button>
              ))}
            </div>,
            document.body,
          )}
      </div>

      {showOrder && (
        <>
          <span className="italic text-gray-600 shrink-0 ml-3">Order No.:</span>
          <div
            data-oa-dd
            className="relative shrink-0"
            ref={(el) => {
              orderAnchorRefs.current[i] = el;
            }}
          >
            <input
              type="text"
              data-oa-order={i}
              value={row.order_no ?? ''}
              onFocus={() => {
                setOpenOrderRow(i);
                setOpenTrackRow(null);
                setOpenGodownRow(null);
              }}
              onChange={(e) => update(i, { order_no: e.target.value })}
              onKeyDown={listKeyDown(
                openOrderRow === i,
                orderOptions,
                () => setOpenOrderRow(null),
                () => {
                  setOpenOrderRow(null);
                  focusSel(`[data-oa-due="${i}"]`);
                },
              )}
              placeholder="New Number…"
              className={`w-24 ${smallInputCls}`}
            />
            {openOrderRow === i &&
              orderPos &&
              createPortal(
                <div
                  ref={orderDropdownRef}
                  style={{
                    position: 'fixed',
                    top: orderPos.top,
                    left: orderPos.left,
                    width: orderPos.width,
                  }}
                  className="bg-white border border-gray-400 shadow-xl z-[60] max-h-52 overflow-y-auto"
                >
                  <div className={`${listHeadCls} text-[10px] px-2 py-0.5`}>List of Orders</div>
                  <div className="flex text-[9px] font-bold text-gray-600 px-2 py-0.5 border-b border-gray-200">
                    <div className="flex-1">Order No.</div>
                    <div className="w-14">Godown</div>
                    <div className="w-14">Due On</div>
                    <div className="w-12 text-right">Balance</div>
                  </div>
                  <button
                    type="button"
                    onMouseEnter={() => setHi(0)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      update(i, { order_no: NA });
                      setOpenOrderRow(null);
                      focusSel(`[data-oa-due="${i}"]`);
                    }}
                    className={
                      optSpecial + ' border-b border-gray-100' + (hi === 0 ? ' bg-gray-200' : '')
                    }
                    className={
                      optSpecial + ' border-b border-gray-100' + (hi === 0 ? ' bg-gray-200' : '')
                    }
                  >
                    {NA}
                  </button>
                  <button
                    type="button"
                    onMouseEnter={() => setHi(1)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setOpenOrderRow(null);
                      setNewNumber({ row: i, field: 'order' });
                    }}
                    className={optNew + (hi === 1 ? ' bg-gray-200' : '')}
                  >
                    New Number
                  </button>
                  {orderList.map((o, k) => (
                    <button
                      key={o.no}
                      type="button"
                      onMouseEnter={() => setHi(2 + k)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectOrder(i, o);
                      }}
                      className={`flex w-full text-left text-[11px] px-2 py-1 border-b border-gray-100 ${
                        hi === 2 + k ? 'bg-gray-200' : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex-1 font-semibold">{o.no}</div>
                      <div className="w-14 truncate">{o.godown}</div>
                      <div className="w-14 truncate">{fmtDate(o.due)}</div>
                      <div className="w-12 text-right font-mono">{o.balance || ''}</div>
                    </button>
                  ))}
                </div>,
                document.body,
              )}
          </div>

          <span className="italic text-gray-600 shrink-0 ml-3">Due on</span>
          <input
            type="text"
            data-oa-due={i}
            value={row.due_on ?? ''}
            onChange={(e) => update(i, { due_on: e.target.value })}
            onKeyDown={enter(() => focusSel(`[data-oa-godown="${i}"]`))}
            placeholder="2-Apr-27 / 500 Days / 2 Years"
            className={`w-40 ${smallInputCls}`}
          />
        </>
      )}
    </div>
  );
}
