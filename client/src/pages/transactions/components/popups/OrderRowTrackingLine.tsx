import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import type { BatchAllocation } from '../../types';
import { NA, EOL, fmtDate, focusSel } from './orderItemAllocationShared';

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
          onKeyDown={enter(() => afterTracking(i, (row.tracking_no || '').trim()))}
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  endOfList(i);
                }}
                className={optSpecial + ' border-b border-gray-100'}
              >
                {EOL}
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  afterTracking(i, NA);
                }}
                className={optSpecial + ' border-b border-gray-100'}
              >
                {NA}
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpenTrackRow(null);
                  setNewNumber({ row: i, field: 'tracking' });
                }}
                className={optNew}
              >
                New Number
              </button>
              {sessionTracking
                .filter((t) => t.no !== row.tracking_no)
                .map((t) => (
                  <button
                    key={t.no}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      afterTracking(i, t.no);
                    }}
                    className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100"
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
              onKeyDown={enter(() => {
                setOpenOrderRow(null);
                focusSel(`[data-oa-due="${i}"]`);
              })}
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
                    onMouseDown={(e) => {
                      e.preventDefault();
                      update(i, { order_no: NA });
                      setOpenOrderRow(null);
                      focusSel(`[data-oa-due="${i}"]`);
                    }}
                    className={optSpecial + ' border-b border-gray-100'}
                  >
                    {NA}
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setOpenOrderRow(null);
                      setNewNumber({ row: i, field: 'order' });
                    }}
                    className={optNew}
                  >
                    New Number
                  </button>
                  {sessionOrders
                    .filter((o) => o.no !== row.order_no)
                    .map((o) => (
                      <button
                        key={o.no}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectOrder(i, o);
                        }}
                        className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100"
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
