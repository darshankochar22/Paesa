import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import {
  NOT_APPLICABLE,
  fmtDate,
  type TrackingOption,
  type OrderOption,
} from './batchAllocationShared';

// Tracking No. / Order No. / Due-on defaults header of the Stock Item
// Allocations popup (portal dropdowns). Extracted from BatchAllocationPopup.tsx;
// markup and behaviour unchanged.
interface Props {
  listHeadCls: string;
  showBatch: boolean;
  trackingRef: MutableRefObject<HTMLDivElement | null>;
  trackingDropRef: MutableRefObject<HTMLDivElement | null>;
  trackingPos: { top: number; left: number } | null;
  trackingNo: string;
  trackingList: TrackingOption[];
  showTrackingList: boolean;
  setShowTrackingList: Dispatch<SetStateAction<boolean>>;
  setTrackingNewNumber: Dispatch<SetStateAction<boolean>>;
  selectTracking: (name: string) => void;
  orderRef: MutableRefObject<HTMLDivElement | null>;
  orderDropRef: MutableRefObject<HTMLDivElement | null>;
  orderPos: { top: number; left: number } | null;
  orderNo: string;
  orderList: OrderOption[];
  showOrderList: boolean;
  setShowOrderList: Dispatch<SetStateAction<boolean>>;
  setOrderNewNumber: Dispatch<SetStateAction<boolean>>;
  selectOrder: (name: string) => void;
  dueOn: string;
  setDueOn: Dispatch<SetStateAction<string>>;
}

export default function OrderTrackingHeader({
  listHeadCls,
  showBatch,
  trackingRef,
  trackingDropRef,
  trackingPos,
  trackingNo,
  trackingList,
  showTrackingList,
  setShowTrackingList,
  setTrackingNewNumber,
  selectTracking,
  orderRef,
  orderDropRef,
  orderPos,
  orderNo,
  orderList,
  showOrderList,
  setShowOrderList,
  setOrderNewNumber,
  selectOrder,
  dueOn,
  setDueOn,
}: Props) {
  return (
    <div className="flex items-center bg-white px-3 py-1.5 text-[11px] border-b border-gray-200 gap-4">
      {/* Tracking No. */}
      <div className="flex items-center gap-1 relative" ref={trackingRef}>
        <span className="italic text-gray-600 shrink-0">Tracking No.</span>
        <span className="text-gray-400">:</span>
        <button
          type="button"
          onClick={() => {
            setShowOrderList(false);
            setShowTrackingList((s) => !s);
          }}
          className="min-w-[90px] text-left font-semibold text-black border-b border-dashed border-gray-400 hover:border-black px-1"
        >
          {trackingNo}
        </button>
        {showTrackingList &&
          trackingPos &&
          createPortal(
            <div
              ref={trackingDropRef}
              style={{
                position: 'fixed',
                top: trackingPos.top,
                left: trackingPos.left,
                width: 400,
              }}
              className="bg-white border border-gray-400 shadow-xl z-[60] max-h-56 overflow-y-auto"
            >
              <div
                className={`${listHeadCls} text-[10px] font-bold px-2 py-1 sticky top-0 flex justify-between items-center`}
              >
                <span>List of Tracking Numbers</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowTrackingList(false);
                    setTrackingNewNumber(true);
                  }}
                  className="underline font-semibold text-black hover:text-gray-700"
                >
                  New Number
                </button>
              </div>
              <div className="flex text-[9px] font-bold text-gray-600 px-2 py-1 border-b border-gray-200 gap-1">
                <div className="flex-1">Name</div>
                <div className="w-16">Batch</div>
                <div className="w-16">Godown</div>
                <div className="w-16">Date</div>
                <div className="w-14 text-right">Balance</div>
              </div>
              <button
                type="button"
                onClick={() => selectTracking(NOT_APPLICABLE)}
                className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 font-semibold"
              >
                {NOT_APPLICABLE}
              </button>
              {trackingList.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => selectTracking(t.name)}
                  className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 gap-1"
                >
                  <div className="flex-1 font-semibold">{t.name}</div>
                  <div className="w-16 font-mono truncate">{t.batch ?? ''}</div>
                  <div className="w-16 font-mono truncate">{t.godown ?? ''}</div>
                  <div className="w-16 font-mono">{fmtDate(t.date)}</div>
                  <div className="w-14 text-right font-mono">{t.balance ?? ''}</div>
                </button>
              ))}
            </div>,
            document.body,
          )}
      </div>

      {/* Order No. — batch items only */}
      {showBatch && (
        <div className="flex items-center gap-1 relative" ref={orderRef}>
          <span className="italic text-gray-600 shrink-0">Order No.</span>
          <span className="text-gray-400">:</span>
          <button
            type="button"
            onClick={() => {
              setShowTrackingList(false);
              setShowOrderList((s) => !s);
            }}
            className="min-w-[90px] text-left font-semibold text-black border-b border-dashed border-gray-400 hover:border-black px-1"
          >
            {orderNo}
          </button>
          {showOrderList &&
            orderPos &&
            createPortal(
              <div
                ref={orderDropRef}
                style={{
                  position: 'fixed',
                  top: orderPos.top,
                  left: orderPos.left,
                  width: 400,
                }}
                className="bg-white border border-gray-400 shadow-xl z-[60] max-h-56 overflow-y-auto"
              >
                <div
                  className={`${listHeadCls} text-[10px] font-bold px-2 py-1 sticky top-0 flex justify-between items-center`}
                >
                  <span>List of Orders</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOrderList(false);
                      setOrderNewNumber(true);
                    }}
                    className="underline font-semibold text-black hover:text-gray-700"
                  >
                    New Number
                  </button>
                </div>
                <div className="flex text-[9px] font-bold text-gray-600 px-2 py-1 border-b border-gray-200 gap-1">
                  <div className="flex-1">Name</div>
                  <div className="w-16">Batch</div>
                  <div className="w-16">Godown</div>
                  <div className="w-16">Due On</div>
                  <div className="w-14 text-right">Balance</div>
                </div>
                <button
                  type="button"
                  onClick={() => selectOrder(NOT_APPLICABLE)}
                  className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 font-semibold"
                >
                  {NOT_APPLICABLE}
                </button>
                {orderList.map((o) => (
                  <button
                    key={o.name}
                    type="button"
                    onClick={() => selectOrder(o.name)}
                    className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 gap-1"
                  >
                    <div className="flex-1 font-semibold">{o.name}</div>
                    <div className="w-16 font-mono truncate">{o.batch ?? ''}</div>
                    <div className="w-16 font-mono truncate">{o.godown ?? ''}</div>
                    <div className="w-16 font-mono truncate">{fmtDate(o.due_on)}</div>
                    <div className="w-14 text-right font-mono">{o.balance ?? ''}</div>
                  </button>
                ))}
              </div>,
              document.body,
            )}
        </div>
      )}

      {/* Due on — shown once an order is chosen */}
      {showBatch && orderNo !== NOT_APPLICABLE && (
        <div className="flex items-center gap-1">
          <span className="italic text-gray-600 shrink-0">Due on</span>
          <span className="text-gray-400">:</span>
          <input
            type="text"
            value={dueOn}
            onChange={(e) => setDueOn(e.target.value)}
            placeholder="e.g. 5 Days"
            className="w-24 text-xs border border-gray-400 bg-white px-1 py-0.5 outline-none focus:border-black font-mono"
          />
        </div>
      )}
    </div>
  );
}
