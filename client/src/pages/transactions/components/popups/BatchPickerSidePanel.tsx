import type { RefObject, Dispatch, SetStateAction } from 'react';
import { fmtDate, fmtQty, type ActiveBatch, type GodownOption } from './batchAllocationShared';

// Side panel of the Stock Item Allocations popup — "List of Godowns" or
// "List of Active Batches" for the active row. Extracted from
// BatchAllocationPopup.tsx; markup and behaviour unchanged.
interface Props {
  activePanel: 'godown' | 'batch';
  activePanelRow: number | null;
  listHeadCls: string;
  closePanel: () => void;
  godownSearch: string;
  setGodownSearch: Dispatch<SetStateAction<string>>;
  godownSearchRef: RefObject<HTMLInputElement>;
  panelListRef: RefObject<HTMLDivElement>;
  panelHi: number;
  setPanelHi: Dispatch<SetStateAction<number>>;
  filteredGodowns: GodownOption[];
  pickGodown: (row: number, name: string) => void;
  parentName: (g: GodownOption) => string;
  godownBal: Record<number, number>;
  unitSymbol?: string;
  isInward: boolean;
  setBatchNumberRow: Dispatch<SetStateAction<number | null>>;
  filteredBatches: ActiveBatch[];
  pickBatch: (row: number, b: ActiveBatch) => void;
}

export default function BatchPickerSidePanel({
  activePanel,
  activePanelRow,
  listHeadCls,
  closePanel,
  godownSearch,
  setGodownSearch,
  godownSearchRef,
  panelListRef,
  panelHi,
  setPanelHi,
  filteredGodowns,
  pickGodown,
  parentName,
  godownBal,
  unitSymbol,
  isInward,
  setBatchNumberRow,
  filteredBatches,
  pickBatch,
}: Props) {
  return (
    <div className="w-64 shrink-0 border-l border-gray-300 flex flex-col bg-white">
      {activePanel === 'godown' ? (
        <>
          {/* Godown panel header */}
          <div
            className={`${listHeadCls} text-xs font-bold px-2 py-1 flex justify-between items-center shrink-0`}
          >
            <span>List of Godowns</span>
            <button
              onClick={closePanel}
              className="text-gray-500 hover:text-black font-bold leading-none"
            >
              &times;
            </button>
          </div>

          {/* Search */}
          <div className="border-b border-gray-300 shrink-0">
            <input
              ref={godownSearchRef}
              type="text"
              className="w-full text-xs outline-none px-2 py-1 bg-white"
              value={godownSearch}
              onChange={(e) => setGodownSearch(e.target.value)}
              placeholder="Search..."
            />
          </div>

          {/* Godown items */}
          <div ref={panelListRef} className="flex-1 overflow-y-auto min-h-0">
            {/* Any */}
            <div
              data-panel-item
              className={`px-2 py-0.5 text-xs cursor-pointer select-none flex items-center justify-between ${panelHi === 0 ? 'bg-gray-200 font-semibold' : 'hover:bg-gray-50'}`}
              onClick={() => activePanelRow !== null && pickGodown(activePanelRow, '')}
              onMouseEnter={() => setPanelHi(0)}
            >
              <span>&#9670; Any</span>
            </div>

            {filteredGodowns.map((g, idx) => (
              <div
                key={g.godown_id ?? g.name}
                data-panel-item
                className={`px-2 py-0.5 text-xs cursor-pointer select-none flex items-center justify-between ${panelHi === idx + 1 ? 'bg-gray-200 font-semibold' : 'hover:bg-gray-50'}`}
                onClick={() => activePanelRow !== null && pickGodown(activePanelRow, g.name)}
                onMouseEnter={() => setPanelHi(idx + 1)}
              >
                <span className="truncate">{g.name}</span>
                <span className="text-gray-500 text-[10px] shrink-0 ml-2 flex items-center gap-2">
                  <span>&#9670; {parentName(g)}</span>
                  <span className="font-mono text-gray-600 w-12 text-right">
                    {g.godown_id != null ? fmtQty(godownBal[g.godown_id], unitSymbol) : ''}
                  </span>
                </span>
              </div>
            ))}

            {filteredGodowns.length === 0 && (
              <div className="px-2 py-2 text-xs text-gray-400 italic">No godowns</div>
            )}
          </div>

          <div className="border-t border-gray-200 px-2 py-1 text-[10px] text-gray-500 select-none shrink-0">
            ↑↓ Navigate &nbsp;·&nbsp; Enter Select
          </div>
        </>
      ) : (
        <>
          {/* Batch panel header — "New Number" on the right */}
          <div
            className={`${listHeadCls} text-xs font-bold px-2 py-1 flex justify-between items-center shrink-0`}
          >
            <span>List of Active Batches</span>
            {/* New Number — always available (Tally shows it for outward too). */}
            <button
              type="button"
              title={isInward ? 'Create a new lot' : 'Type a batch number to issue'}
              className="text-black hover:text-gray-700 font-semibold text-[10px] underline"
              onClick={() => {
                if (activePanelRow !== null) {
                  setBatchNumberRow(activePanelRow);
                  closePanel();
                }
              }}
            >
              New Number
            </button>
          </div>

          {/* Column headers */}
          <div className="flex px-2 py-1 border-b border-gray-300 text-[9px] font-bold uppercase tracking-wide text-gray-600 shrink-0">
            <div className="flex-1">Name</div>
            <div className="w-16 text-center">Expiry</div>
            <div className="w-14 text-right">Balance</div>
          </div>

          {/* Items — New Number (header) + existing batches only, no "Any". */}
          <div ref={panelListRef} className="flex-1 overflow-y-auto min-h-0">
            {filteredBatches.map((b, idx) => (
              <div
                key={b.name}
                data-panel-item
                className={`px-2 py-0.5 text-xs cursor-pointer select-none flex items-center ${panelHi === idx ? 'bg-gray-200 font-semibold' : 'hover:bg-gray-50'}`}
                onClick={() => activePanelRow !== null && pickBatch(activePanelRow, b)}
                onMouseEnter={() => setPanelHi(idx)}
              >
                <span className="flex-1 font-mono truncate">{b.name}</span>
                <span className="w-16 text-center font-mono text-gray-600">
                  {fmtDate(b.expiry_date)}
                </span>
                <span className="w-14 text-right font-mono text-gray-600">
                  {b.balance ? `${b.balance}${unitSymbol ? ` ${unitSymbol}` : ''}` : ''}
                </span>
              </div>
            ))}

            {filteredBatches.length === 0 && (
              <div className="px-2 py-2 text-xs text-gray-400 italic">No batches yet</div>
            )}
          </div>

          <div className="border-t border-gray-200 px-2 py-1 text-[10px] text-gray-500 select-none shrink-0">
            ↑↓ Navigate &nbsp;·&nbsp; Enter Select
          </div>
        </>
      )}
    </div>
  );
}
