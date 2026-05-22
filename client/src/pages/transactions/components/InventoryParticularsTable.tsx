import type { StockEntryRow, ParticularRow, ActiveField } from "../hooks/useVoucherForm";
import type { GodownType, UnitType } from "../../../types/api";

interface Props {
  stockEntries: StockEntryRow[];
  additionalEntries: ParticularRow[];
  allGodowns: GodownType[];
  allUnits: UnitType[];
  activeField: ActiveField | null;
  searchTerm: string;
  stockSearchTerm: string;
  onFieldFocus: (field: ActiveField) => void;
  onSearchChange: (term: string) => void;
  onUpdateStockRow: (id: string, updates: Partial<Omit<StockEntryRow, 'id'>>) => void;
  onAddStockRow: () => void;
  onRemoveStockRow: (id: string) => void;
  onUpdateAdditionalRow: (id: string, updates: Partial<Omit<ParticularRow, 'id'>>) => void;
  onAddAdditionalRow: () => void;
  onRemoveAdditionalRow: (id: string) => void;
  onAmountConfirm?: (row: ParticularRow, index: number) => void;
}

export default function InventoryParticularsTable({
  stockEntries,
  additionalEntries,
  allGodowns,
  allUnits,
  activeField,
  searchTerm,
  stockSearchTerm,
  onFieldFocus,
  onSearchChange,
  onUpdateStockRow,
  onAddStockRow,
  onRemoveStockRow,
  onUpdateAdditionalRow,
  onAddAdditionalRow,
  onRemoveAdditionalRow,
  onAmountConfirm
}: Props) {

  // Key handlers to auto-add rows on Enter in stock grid
  const handleStockKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Enter" || e.key === "Tab") {
      const row = stockEntries[idx];
      if (row?.stockItem && Number(row.amountRaw) > 0 && idx === stockEntries.length - 1) {
        e.preventDefault();
        onAddStockRow();
        setTimeout(() => {
          const nextInput = document.querySelector(`[data-stock-item="${stockEntries.length + 1}"]`);
          (nextInput as HTMLInputElement)?.focus();
        }, 50);
      }
    }
  };

  const handleAdditionalKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Enter" || e.key === "Tab") {
      const row = additionalEntries[idx];
      if (row?.ledger) {
        if (onAmountConfirm) {
          e.preventDefault();
          onAmountConfirm(row, idx);
        } else if (Number(row.amountRaw) > 0 && idx === additionalEntries.length - 1) {
          e.preventDefault();
          onAddAdditionalRow();
          setTimeout(() => {
            const nextInput = document.querySelector(`[data-additional-ledger="${additionalEntries.length + 1}"]`);
            (nextInput as HTMLInputElement)?.focus();
          }, 50);
        }
      }
    }
  };

  const stockSubtotal = stockEntries.reduce((sum, r) => sum + (Number(r.amountRaw) || 0), 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white text-xs">
      {/* Header Grid */}
      <div className="grid grid-cols-12 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-600 font-bold uppercase tracking-wider select-none text-[10px]">
        <div className="col-span-5">Name of Item</div>
        <div className="col-span-2">Godown</div>
        <div className="col-span-1.5 text-right pr-2">Quantity</div>
        <div className="col-span-1.5 text-right pr-2">Rate</div>
        <div className="col-span-1">Unit</div>
        <div className="col-span-1 text-right">Amount</div>
      </div>

      {/* Main Stock entries */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 min-h-0">
        {stockEntries.map((row, idx) => {
          const isActive = activeField?.type === "stockItem" && activeField.rowId === row.id;
          return (
            <div key={row.id} className="grid grid-cols-12 items-center px-3 py-1.5 hover:bg-zinc-50/50 group transition-colors">
              
              {/* 1. Item Name */}
              <div className="col-span-5 relative flex items-center gap-1">
                <input
                  data-stock-item={idx + 1}
                  type="text"
                  className="w-full bg-transparent border-b border-transparent outline-none focus:border-zinc-800 text-zinc-900 placeholder-zinc-400 py-0.5"
                  placeholder="Select Stock Item..."
                  value={isActive ? stockSearchTerm : (row.stockItem ? row.stockItem.name : "")}
                  onFocus={() => onFieldFocus({ type: 'stockItem', rowId: row.id })}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    if (!row.stockItem) onFieldFocus({ type: 'stockItem', rowId: row.id });
                  }}
                />
                {stockEntries.length > 1 && (
                  <button
                    onClick={() => onRemoveStockRow(row.id)}
                    className="text-[10px] text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1 font-sans font-bold"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* 2. Godown Dropdown */}
              <div className="col-span-2 px-1">
                <select
                  className="w-full bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-zinc-800 outline-none py-0.5 text-zinc-800"
                  value={row.godown?.godown_id || ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const selected = allGodowns.find(g => g.godown_id === id) || null;
                    onUpdateStockRow(row.id, { godown: selected });
                  }}
                >
                  <option value="">Select Godown</option>
                  {allGodowns.map(g => (
                    <option key={g.godown_id} value={g.godown_id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* 3. Quantity */}
              <div className="col-span-1.5 px-1">
                <input
                  type="text"
                  className="w-full bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-zinc-800 outline-none text-right px-1 py-0.5 text-zinc-900"
                  placeholder="0.00"
                  value={row.quantityRaw}
                  onChange={(e) => onUpdateStockRow(row.id, { quantityRaw: e.target.value })}
                />
              </div>

              {/* 4. Rate */}
              <div className="col-span-1.5 px-1">
                <input
                  type="text"
                  className="w-full bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-zinc-800 outline-none text-right px-1 py-0.5 text-zinc-900"
                  placeholder="0.00"
                  value={row.rateRaw}
                  onChange={(e) => onUpdateStockRow(row.id, { rateRaw: e.target.value })}
                  onKeyDown={(e) => handleStockKeyDown(e, idx)}
                />
              </div>

              {/* 5. Unit Selector/Display */}
              <div className="col-span-1 px-1">
                <select
                  className="w-full bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-zinc-800 outline-none py-0.5 text-zinc-700"
                  value={row.unit?.unit_id || ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const selected = allUnits.find(u => u.unit_id === id) || null;
                    onUpdateStockRow(row.id, { unit: selected });
                  }}
                >
                  <option value="">—</option>
                  {allUnits.map(u => (
                    <option key={u.unit_id} value={u.unit_id}>{u.symbol}</option>
                  ))}
                </select>
              </div>

              {/* 6. Amount Display */}
              <div className="col-span-1 text-right font-bold text-zinc-900 pr-1 select-none">
                {row.amountRaw ? Number(row.amountRaw).toFixed(2) : "0.00"}
              </div>

            </div>
          );
        })}

        {/* Subtotal Row */}
        <div className="grid grid-cols-12 px-3 py-2 bg-zinc-50/50 border-t border-zinc-200 font-bold select-none text-zinc-700">
          <div className="col-span-7">Subtotal (Items)</div>
          <div className="col-span-4 text-right pr-2"></div>
          <div className="col-span-1 text-right font-bold text-zinc-800">
            {stockSubtotal.toFixed(2)}
          </div>
        </div>

        {/* Additional Tax ledger rows */}
        <div className="bg-white">
          <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-50/30 border-b border-zinc-100 flex justify-between items-center select-none">
            <span>Additional Ledgers (Taxes & Adjustments)</span>
            <button
              type="button"
              onClick={onAddAdditionalRow}
              className="text-[10px] bg-zinc-900 text-white px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors uppercase font-sans font-bold"
            >
              + Add Ledger Row
            </button>
          </div>

          <div className="divide-y divide-zinc-50">
            {additionalEntries.map((row, idx) => {
              const isAddActive = activeField?.type === "additional" && activeField.rowId === row.id;
              return (
                <div key={row.id} className="grid grid-cols-12 items-center px-3 py-1.5 hover:bg-zinc-50/30 group transition-colors">
                  
                  {/* Dr/Cr Toggle */}
                  <div className="col-span-1 text-center font-bold">
                    <select
                      className="bg-transparent font-bold outline-none text-zinc-900 cursor-pointer"
                      value={row.type}
                      onChange={(e) => onUpdateAdditionalRow(row.id, { type: e.target.value as 'Dr' | 'Cr' })}
                    >
                      <option value="Dr">Dr</option>
                      <option value="Cr">Cr</option>
                    </select>
                  </div>

                  {/* Ledger search */}
                  <div className="col-span-6 relative flex items-center gap-1">
                    <input
                      data-additional-ledger={idx + 1}
                      type="text"
                      className="w-full bg-transparent border-b border-transparent outline-none focus:border-zinc-800 text-zinc-900 placeholder-zinc-400 py-0.5"
                      placeholder="Select Ledger (GST, round off, discount...)"
                      value={isAddActive ? searchTerm : (row.ledger ? row.ledger.name : "")}
                      onFocus={() => onFieldFocus({ type: 'additional', rowId: row.id })}
                      onChange={(e) => {
                        onSearchChange(e.target.value);
                        if (!row.ledger) onFieldFocus({ type: 'additional', rowId: row.id });
                      }}
                    />
                    {row.ledgerBalance && (
                      <span className="text-[10px] text-zinc-400 font-sans italic absolute right-2 select-none">
                        (Bal: {row.ledgerBalance})
                      </span>
                    )}
                    <button
                      onClick={() => onRemoveAdditionalRow(row.id)}
                      className="text-[10px] text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1 font-sans font-bold"
                    >
                      &times;
                    </button>
                  </div>

                  {/* Empty spaces matching columns */}
                  <div className="col-span-4" />

                  {/* Amount input */}
                  <div className="col-span-1 px-1">
                    <input
                      data-additional-amount={idx + 1}
                      type="text"
                      className="w-full bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-zinc-800 outline-none text-right px-1 py-0.5 text-zinc-900 font-bold"
                      placeholder="0.00"
                      value={row.amountRaw}
                      onChange={(e) => onUpdateAdditionalRow(row.id, { amountRaw: e.target.value })}
                      onKeyDown={(e) => handleAdditionalKeyDown(e, idx)}
                    />
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
