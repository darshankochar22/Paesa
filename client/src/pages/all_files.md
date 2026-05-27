## File: `transactions/components/AccountSection.tsx`

```
import { useRef, useEffect } from "react";
import type { LedgerType } from "../../../types/api";
import type { ActiveField } from "../hooks/useVoucherForm";

interface Props {
  ledger: LedgerType | null;
  balance: string;
  searchTerm: string;
  onFieldFocus: (field: ActiveField) => void;
  onSearchChange: (term: string) => void;
  // When true the input is focused automatically (e.g. on voucher type change)
  autoFocus?: boolean;
}

export default function AccountSection({
  ledger,
  balance,
  searchTerm,
  onFieldFocus,
  onSearchChange,
  autoFocus = false,
}: Props) {
  // FIX — inputRef is now actually used for autoFocus management
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  return (
    <div className="px-3 py-1">
      {/* Account : [input] */}
      <div className="flex items-center min-h-[22px]">
        <span className="w-40 text-sm text-black shrink-0">Account</span>
        <span className="text-sm text-black mr-2 shrink-0">:</span>
        <input
          ref={inputRef}
          type="text"
          className="w-64 text-sm border border-gray-400 bg-yellow-50 px-1 py-0 outline-none focus:border-black"
          value={ledger ? ledger.name : searchTerm}
          onFocus={() => onFieldFocus({ type: "account" })}
          onChange={(e) => {
            onSearchChange(e.target.value);
            if (!ledger) onFieldFocus({ type: "account" });
          }}
          placeholder="Select Cash / Bank account…"
          autoComplete="off"
        />
      </div>

      {/* Current balance line */}
      <div className="flex items-center min-h-[18px]">
        <span className="w-40 text-xs text-gray-500 shrink-0 italic">
          Current balance
        </span>
        <span className="text-xs text-gray-500 mr-2 shrink-0">:</span>
        <span className="text-xs text-gray-500 italic">{balance}</span>
      </div>
    </div>
  );
}
```

---

## File: `transactions/components/ActionFooter.tsx`

```

interface Props {
  onAccept: () => void;
  onCancelVch: () => void;
  onQuit: () => void;
  isSubmitting: boolean;
  canAccept: boolean;
}

export default function ActionFooter({
  onAccept,
  onCancelVch,
  onQuit,
  isSubmitting,
  canAccept,
}: Props) {
  return (
    <div className="border-t border-black bg-white px-4 py-2 flex items-center justify-between shrink-0">
      <button
        onClick={onQuit}
        className="text-sm px-3 py-1 text-gray-600 hover:text-black hover:underline"
      >
        <span className="underline decoration-dotted">Q</span>: Quit
      </button>
      <div className="flex items-center gap-3">
        <button
          onClick={onAccept}
          disabled={isSubmitting || !canAccept}
          className="text-sm px-5 py-1 bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="underline decoration-dotted">A</span>: Accept
        </button>
        <button
          onClick={onCancelVch}
          className="text-sm px-3 py-1 text-gray-600 hover:text-black"
        >
          Cancel Vch
        </button>
      </div>
    </div>
  );
}
```

---

## File: `transactions/components/ContraDoubleEntryTable.tsx`

```
import { useRef } from "react";
import type { ParticularRow, ActiveField } from "../hooks/useVoucherForm";

interface Props {
  rows: ParticularRow[];
  onUpdateRow: (id: string, updates: Partial<Omit<ParticularRow, "id">>) => void;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onFieldFocus: (field: ActiveField) => void;
  onSearchChange: (term: string) => void;
  searchTerm: string;
  activeRowId: string | null;
  onAmountConfirm?: (row: ParticularRow, index: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatAmount = (n: number): string =>
  n > 0
    ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";

// ─────────────────────────────────────────────────────────────────────────────

export default function ContraDoubleEntryTable({
  rows,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
  onFieldFocus,
  onSearchChange,
  searchTerm,
  activeRowId,
  onAmountConfirm,
}: Props) {
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  // ── Amount handlers ────────────────────────────────────────────────────────

  const handleAmountChange = (rowId: string, value: string) => {
    onUpdateRow(rowId, { amountRaw: value });
  };

  const handleAmountKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
    if (e.key !== "Enter") return;

    const row = rowsRef.current[idx];
    if (!row?.ledger) return;

    e.preventDefault();

    if (onAmountConfirm) {
      onAmountConfirm(row, idx);
    } else if (Number(row.amountRaw) > 0) {
      if (idx === rowsRef.current.length - 1) {
        onAddRow();
      }
      setTimeout(() => {
        const nextIdx = idx + 1;
        const next = document.querySelector(
          `[data-particular-ledger="${nextIdx + 1}"]`
        ) as HTMLInputElement | null;
        next?.focus();
      }, 50);
    }
  };

  // ── Totals ────────────────────────────────────────────────────────────────

  const drTotal = rows.reduce(
    (s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0),
    0
  );
  const crTotal = rows.reduce(
    (s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0),
    0
  );

  const isBalanced = Math.abs(drTotal - crTotal) < 0.01;

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white text-xs">

      {/* ── Table header ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 border-b border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="col-span-1" />
        <div className="col-span-7 text-sm font-semibold text-black">Particulars</div>
        <div className="col-span-2 text-right text-sm font-semibold text-black">Debit</div>
        <div className="col-span-2 text-right text-sm font-semibold text-black">Credit</div>
      </div>

      {/* ── Rows ──────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {rows.map((row, idx) => {
          const isActive = activeRowId === row.id;

          return (
            <div
              key={row.id}
              className="grid grid-cols-12 items-center border-b border-gray-100 min-h-[22px] group px-3 py-0"
            >
              {/* ── Column 1: Dr / Cr selector ─────────────────────────────── */}
              <div className="col-span-1 text-center">
                <select
                  className="bg-transparent font-bold outline-none text-black text-xs"
                  value={row.type}
                  onChange={(e) =>
                    onUpdateRow(row.id, { type: e.target.value as "Dr" | "Cr" })
                  }
                >
                  <option value="Dr">Dr</option>
                  <option value="Cr">Cr</option>
                </select>
              </div>

              {/* ── Column 2: Ledger name / search input ──────────────────── */}
              <div className="col-span-7 flex items-center gap-1">
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <input
                    data-particular-ledger={idx + 1}
                    type="text"
                    className="w-full bg-transparent outline-none px-1 border border-transparent focus:border-black text-sm text-black"
                    value={isActive ? searchTerm : (row.ledger?.name ?? "")}
                    placeholder={idx === 0 ? "Select Ledger…" : ""}
                    onFocus={() => onFieldFocus({ type: "particular", rowId: row.id })}
                    onChange={(e) => {
                      onSearchChange(e.target.value);
                      if (!row.ledger) onFieldFocus({ type: "particular", rowId: row.id });
                    }}
                    autoComplete="off"
                  />
                  {row.ledgerBalance && (
                    <span className="text-[10px] text-gray-500 italic select-none">
                      Current Bal: {row.ledgerBalance}
                    </span>
                  )}
                  {(row.billReferences?.length || row.costCentres?.length) ? (
                    <span className="text-[9px] text-gray-500 select-none flex gap-2">
                      {row.billReferences?.length ? (
                        <span className="text-teal-600">
                          ✓ {row.billReferences.length} bill ref{row.billReferences.length > 1 ? "s" : ""}
                        </span>
                      ) : null}
                      {row.costCentres?.length ? (
                        <span className="text-blue-600">
                          ✓ {row.costCentres.length} cost centre{row.costCentres.length > 1 ? "s" : ""}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </div>

                {rows.length > 2 && (
                  <button
                    onClick={() => onRemoveRow(row.id)}
                    className="text-[10px] text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1 font-bold shrink-0"
                    tabIndex={-1}
                    aria-label="Remove row"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* ── Column 3: Debit amount ─────────────────────────────────── */}
              <div className="col-span-2 text-right pr-1">
                {row.type === "Dr" ? (
                  <input
                    data-particular-debit={idx + 1}
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                    value={row.amountRaw}
                    placeholder=""
                    onChange={(e) => handleAmountChange(row.id, e.target.value)}
                    onKeyDown={(e) => handleAmountKeyDown(e, idx)}
                  />
                ) : (
                  <span className="block text-right px-1 py-0.5 text-gray-300 select-none text-sm">
                    —
                  </span>
                )}
              </div>

              {/* ── Column 4: Credit amount ────────────────────────────────── */}
              <div className="col-span-2 text-right">
                {row.type === "Cr" ? (
                  <input
                    data-particular-credit={idx + 1}
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                    value={row.amountRaw}
                    placeholder=""
                    onChange={(e) => handleAmountChange(row.id, e.target.value)}
                    onKeyDown={(e) => handleAmountKeyDown(e, idx)}
                  />
                ) : (
                  <span className="block text-right px-1 py-0.5 text-gray-300 select-none text-sm">
                    —
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Filler rows */}
        {Array.from({ length: Math.max(0, 10 - rows.length) }).map((_, i) => (
          <div
            key={`ec-${i}`}
            className="grid grid-cols-12 border-b border-gray-50 min-h-[22px]"
          />
        ))}
      </div>

      {/* ── Totals row ────────────────────────────────────────────────────────── */}
      <div
        className={`border-t border-black shrink-0 px-3 py-0.5 bg-white ${
          isBalanced && drTotal > 0 ? "" : drTotal > 0 ? "" : ""
        }`}
      >
        <div className="grid grid-cols-12 items-center">
          <div className="col-span-8 text-xs text-gray-600">
            {drTotal > 0 && crTotal > 0 && !isBalanced && (
              <span className="text-red-700">
                ⚠ Diff: {Math.abs(drTotal - crTotal).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            )}
            {isBalanced && drTotal > 0 && (
              <span className="text-gray-500">✓ Balanced</span>
            )}
          </div>
          <div className="col-span-2 text-right text-sm font-semibold text-black">
            {formatAmount(drTotal)}
          </div>
          <div className="col-span-2 text-right text-sm font-semibold text-black">
            {formatAmount(crTotal)}
          </div>
        </div>
      </div>
    </div>
  );
}

```

---

## File: `transactions/components/InventoryParticularsTable.tsx`

```
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

```

---

## File: `transactions/components/LedgerPanel.tsx`

```
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { LedgerType, StockItemType, GodownType } from "../../../types/api";
import type { ActiveField } from "../hooks/useVoucherForm";
import { SearchInput } from "../../../components/ui";

interface Props {
  isOpen: boolean;
  activeField: ActiveField | null;
  ledgers: LedgerType[];
  stockItems: StockItemType[];
  godowns: GodownType[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSelect: (item: any) => void;
  onClose: () => void;
  checkIsCashOrBank: (ledger: LedgerType | null) => boolean;
  checkLedgerGroup: (ledger: LedgerType | null, targetGroupNames: string[]) => boolean;
  voucherType: string;
  onInlineCreate?: (type: "ledger" | "stockItem" | "godown") => void;
}

export default function LedgerPanel({
  isOpen,
  activeField,
  ledgers,
  stockItems,
  godowns,
  loading,
  searchTerm,
  onSearchChange,
  onSelect,
  onClose,
  checkIsCashOrBank,
  checkLedgerGroup,
  voucherType,
  onInlineCreate
}: Props) {
  const navigate = useNavigate();
  const [highlightIndex, setHighlightIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  // 1. Determine what content we are listing
  const isStockItem = activeField?.type === "stockItem";
  const isGodown = activeField?.type === "stockGodown";

  // 2. Filter the items list based on search and context-aware business rules
  let itemsList: any[] = [];
  let title = "List of Ledger Accounts";
  let createPath = "/master/create/ledger";
  let createLabel = "+ Create Ledger";

  if (isStockItem) {
    title = "List of Stock Items";
    createPath = "/master/create/stock-item";
    createLabel = "+ Create Stock Item";
    itemsList = stockItems.filter(item =>
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.alias && item.alias.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  } else if (isGodown) {
    title = "List of Godowns";
    createPath = "/master/create/godown";
    createLabel = "+ Create Godown";
    itemsList = godowns.filter(godown =>
      !searchTerm ||
      godown.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } else {
    // Ledgers filtering logic
    let tempLedgers = ledgers;

    if (activeField?.type === "particular") {
      if (voucherType === "Contra") {
        tempLedgers = ledgers.filter(l => checkIsCashOrBank(l));
      }
    } else if (activeField?.type === "party") {
      title = "List of Party Ledgers";
      tempLedgers = ledgers.filter(l => checkLedgerGroup(l, ["bank accounts", "bank od accounts", "bank od a/c", "bank od account", "cash-in-hand", "sundry debtors", "sundry creditors"]));
    } else if (activeField?.type === "salesPurchase") {
      title = `List of ${voucherType} Ledgers`;
      tempLedgers = ledgers.filter(l => checkLedgerGroup(l, voucherType === "Sales" ? ["sales accounts"] : ["purchase accounts"]));
    }

    itemsList = tempLedgers.filter(l =>
      !searchTerm ||
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.alias && l.alias.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  useEffect(() => {
    setHighlightIndex(0);
  }, [searchTerm, activeField]);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, activeField]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex(i => Math.min(i + 1, itemsList.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex(i => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (itemsList.length > 0 && highlightIndex < itemsList.length) {
          onSelect(itemsList[highlightIndex]);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, itemsList, highlightIndex, onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-zinc-200 flex flex-col shrink-0 bg-white shadow-lg animate-fade-in font-sans">
      <div className="bg-zinc-900 text-white px-3 py-2 text-xs font-semibold uppercase tracking-wider flex justify-between items-center select-none">
        <span>{title}</span>
        <button onClick={onClose} className="text-sm font-bold hover:text-zinc-300 transition-colors">&times;</button>
      </div>

      <div className="p-2 border-b border-zinc-100 bg-zinc-50/50">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder={`Search ${isStockItem ? 'items' : isGodown ? 'godowns' : 'accounts'}...`}
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-zinc-100">
        <div
          className="px-3 py-2 text-xs cursor-pointer hover:bg-zinc-50 text-zinc-900 font-semibold flex items-center gap-1.5 transition-colors"
          onClick={() => {
            if (onInlineCreate) {
              const targetType = isStockItem ? "stockItem" : isGodown ? "godown" : "ledger";
              onInlineCreate(targetType);
            } else {
              navigate(createPath);
            }
          }}
        >
          <span className="text-zinc-400 font-normal">+</span> {createLabel}
        </div>
        {loading && (
          <div className="px-3 py-3 text-xs text-zinc-400 italic">Loading list...</div>
        )}
        {!loading && itemsList.length === 0 && (
          <div className="px-3 py-3 text-xs text-zinc-400 italic">No matching items found</div>
        )}
          {!loading && itemsList.map((item, idx) => {
            const isSelected = idx === highlightIndex;
            const balance = (item as LedgerType).closing_balance || (item as LedgerType).opening_balance;
            const balanceDisplay = balance ? (balance > 0 ? `${Math.abs(balance).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Dr` : `${Math.abs(balance).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`) : '';
            return (
              <div
                key={item.ledger_id || item.item_id || item.godown_id}
                className={`px-3 py-2 text-xs cursor-pointer flex justify-between items-center transition-colors ${
                  isSelected ? "bg-zinc-900 text-white font-medium" : "hover:bg-zinc-50 text-zinc-800"
                }`}
                onClick={() => onSelect(item)}
                onMouseEnter={() => setHighlightIndex(idx)}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate text-xs">{item.name}</span>
                  {item.alias && (
                    <span className={`text-[10px] truncate ${isSelected ? "text-zinc-300" : "text-zinc-400"}`}>
                      ({item.alias})
                    </span>
                  )}
                  {!isStockItem && !isGodown && balanceDisplay && (
                    <span className={`text-[10px] ${isSelected ? "text-zinc-300" : "text-zinc-500"} font-sans italic`}>
                      Bal: {balanceDisplay}
                    </span>
                  )}
                </div>
                {/* Extra context metadata based on type */}
                {!isStockItem && !isGodown && item.group_name && (
                  <span className={`text-[10px] shrink-0 ml-2 font-sans px-1.5 py-0.5 rounded ${
                    isSelected ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-600"
                  }`}>
                    {item.group_name}
                  </span>
                )}
                {isStockItem && item.part_number && (
                  <span className={`text-[10px] shrink-0 ml-2 font-sans px-1.5 py-0.5 rounded ${
                    isSelected ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-600"
                  }`}>
                    {item.part_number}
                  </span>
                )}
              </div>
            );
          })}
      </div>

      <div className="px-3 py-1.5 text-[10px] text-zinc-400 border-t border-zinc-100 bg-zinc-50 select-none uppercase tracking-wider font-semibold">
        &bull; End of List
      </div>
    </div>
  );
}

```

---

## File: `transactions/components/NarrationSection.tsx`

```
import { formatIndianCurrency } from "../utils/formatCurrency";

interface Props {
  value: string;
  totalAmount: number;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function NarrationSection({
  value,
  totalAmount,
  onChange,
  placeholder = "Enter narration…",
}: Props) {
  return (
    <div className="flex items-center border-t border-black shrink-0 px-3 py-1 bg-white">
      <span className="text-sm text-black shrink-0 w-24">Narration</span>
      <span className="text-sm text-black shrink-0 mr-2">:</span>
      <input
        type="text"
        className="flex-1 text-sm bg-transparent outline-none border-b border-transparent focus:border-black px-1 py-0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {totalAmount > 0 && (
        <span className="text-sm font-semibold text-black ml-4 shrink-0 tabular-nums">
          {formatIndianCurrency(totalAmount)}
        </span>
      )}
    </div>
  );
}
```

---

## File: `transactions/components/ParticularsTable.tsx`

```
import { useRef } from "react";
import type { ParticularRow, ActiveField } from "../hooks/useVoucherForm";

interface Props {
  rows: ParticularRow[];
  onUpdateRow: (id: string, updates: Partial<Omit<ParticularRow, "id">>) => void;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onFieldFocus: (field: ActiveField) => void;
  onSearchChange: (term: string) => void;
  searchTerm: string;
  activeRowId: string | null;
  onAmountConfirm?: (row: ParticularRow, index: number) => void;
  voucherType?: string;
  // FIX #1 — accept pre-computed totals from the hook instead of recalculating
  debitTotal?: number;
  creditTotal?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatAmount = (n: number): string =>
  n > 0
    ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";

// ─────────────────────────────────────────────────────────────────────────────

export default function ParticularsTable({
  rows,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
  onFieldFocus,
  onSearchChange,
  searchTerm,
  activeRowId,
  onAmountConfirm,
  voucherType,
  debitTotal,
  creditTotal,
}: Props) {
  // FIX #3 — keep a ref to `rows` so the setTimeout inside handleAmountKeyDown
  // always reads the current length even after state has updated.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  // FIX #9 — for Receipt/Payment the hook auto-assigns Dr/Cr, so we render a
  // static badge instead of an editable dropdown.  Journal and Contra still
  // show the full dropdown so the user can change the side.
  const isSingleEntry = ["Receipt", "Payment"].includes(voucherType ?? "");

  // ── Amount handlers ────────────────────────────────────────────────────────

  const handleAmountChange = (rowId: string, value: string) => {
    onUpdateRow(rowId, { amountRaw: value });
  };

  // FIX #5 — only Enter confirms; Tab lets the browser move focus naturally.
  const handleAmountKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
    if (e.key !== "Enter") return;

    const row = rowsRef.current[idx];
    if (!row?.ledger) return;

    e.preventDefault();

    if (onAmountConfirm) {
      // Delegate to parent — may open bill-wise / cost-centre popup
      onAmountConfirm(row, idx);
    } else if (Number(row.amountRaw) > 0) {
      // Plain progression: add a new row if we are on the last one
      if (idx === rowsRef.current.length - 1) {
        onAddRow();
      }
      // FIX #3 — use ref so the length is fresh inside the setTimeout
      setTimeout(() => {
        const nextIdx = idx + 1;
        const next = document.querySelector(
          `[data-particular-ledger="${nextIdx + 1}"]`
        ) as HTMLInputElement | null;
        next?.focus();
      }, 50);
    }
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  // FIX #1 — prefer pre-computed props; fall back to local reduce only when
  // the parent hasn't wired them up yet (defensive).
  const drTotal =
    debitTotal ??
    rows.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
  const crTotal =
    creditTotal ??
    rows.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);

  const isBalanced = Math.abs(drTotal - crTotal) < 0.01;

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white text-xs">

      {/* ── Table header ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-600 font-bold uppercase tracking-wider select-none text-[10px]">
        <div className="col-span-1" />
        <div className="col-span-7">Particulars</div>
        <div className="col-span-2 text-right">Debit</div>
        <div className="col-span-2 text-right">Credit</div>
      </div>

      {/* ── Rows ──────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 min-h-0">
        {rows.map((row, idx) => {
          const isActive = activeRowId === row.id;

          return (
            <div
              key={row.id}
              className="grid grid-cols-12 items-center px-3 py-1.5 hover:bg-zinc-50/50 group transition-colors min-h-[42px]"
            >
              {/* ── Column 1: Dr / Cr indicator ─────────────────────────────── */}
              <div className="col-span-1 flex items-center justify-center">
                {isSingleEntry ? (
                  // FIX #9 — static badge: hook auto-assigns the correct side
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded select-none ${
                      row.type === "Dr"
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {row.type}
                  </span>
                ) : (
                  // Journal / Contra — user picks the side
                  <select
                    className="bg-transparent font-bold outline-none text-zinc-900 cursor-pointer text-xs"
                    value={row.type}
                    onChange={(e) =>
                      onUpdateRow(row.id, { type: e.target.value as "Dr" | "Cr" })
                    }
                  >
                    <option value="Dr">Dr</option>
                    <option value="Cr">Cr</option>
                  </select>
                )}
              </div>

              {/* ── Column 2: Ledger name / search input ──────────────────── */}
              <div className="col-span-7 relative flex items-center gap-1">
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <input
                    data-particular-ledger={idx + 1}
                    type="text"
                    className="w-full bg-transparent border-b border-transparent outline-none focus:border-zinc-800 text-zinc-900 placeholder-zinc-400 py-0.5 font-semibold"
                    value={isActive ? searchTerm : (row.ledger?.name ?? "")}
                    placeholder={idx === 0 ? "Select Particular Ledger…" : ""}
                    onFocus={() => onFieldFocus({ type: "particular", rowId: row.id })}
                    onChange={(e) => {
                      onSearchChange(e.target.value);
                      if (!row.ledger) onFieldFocus({ type: "particular", rowId: row.id });
                    }}
                  />
                  {row.ledgerBalance && (
                    <span className="text-[10px] text-zinc-400 font-sans italic select-none">
                      Current Bal: {row.ledgerBalance}
                    </span>
                  )}
                  {/* Bill-wise / cost-centre allocation indicators */}
                  {(row.billReferences?.length || row.costCentres?.length) ? (
                    <span className="text-[9px] text-zinc-400 font-sans select-none flex gap-2">
                      {row.billReferences?.length ? (
                        <span className="text-teal-600">
                          ✓ {row.billReferences.length} bill ref{row.billReferences.length > 1 ? "s" : ""}
                        </span>
                      ) : null}
                      {row.costCentres?.length ? (
                        <span className="text-blue-600">
                          ✓ {row.costCentres.length} cost centre{row.costCentres.length > 1 ? "s" : ""}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </div>

                {rows.length > 1 && (
                  <button
                    onClick={() => onRemoveRow(row.id)}
                    className="text-[10px] text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1 font-sans font-bold shrink-0"
                    tabIndex={-1}
                    aria-label="Remove row"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* ── Column 3: Debit amount ─────────────────────────────────── */}
              <div className="col-span-2 px-1">
                {row.type === "Dr" ? (
                  // Active side — editable
                  <input
                    data-particular-debit={idx + 1}
                    type="text"
                    inputMode="decimal"
                    className="w-full bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-zinc-800 outline-none text-right px-1 py-0.5 text-zinc-900 font-bold"
                    value={row.amountRaw}
                    placeholder="0.00"
                    onChange={(e) => handleAmountChange(row.id, e.target.value)}
                    onKeyDown={(e) => handleAmountKeyDown(e, idx)}
                  />
                ) : (
                  // FIX #2 — inactive side: read-only display so switching
                  // type doesn't make the entered amount silently disappear
                  <span className="block text-right px-1 py-0.5 text-zinc-300 select-none">
                    —
                  </span>
                )}
              </div>

              {/* ── Column 4: Credit amount ────────────────────────────────── */}
              <div className="col-span-2 px-1">
                {row.type === "Cr" ? (
                  // Active side — editable
                  <input
                    data-particular-credit={idx + 1}
                    type="text"
                    inputMode="decimal"
                    className="w-full bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-zinc-800 outline-none text-right px-1 py-0.5 text-zinc-900 font-bold"
                    value={row.amountRaw}
                    placeholder="0.00"
                    onChange={(e) => handleAmountChange(row.id, e.target.value)}
                    onKeyDown={(e) => handleAmountKeyDown(e, idx)}
                  />
                ) : (
                  // FIX #2 — inactive side: read-only
                  <span className="block text-right px-1 py-0.5 text-zinc-300 select-none">
                    —
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Totals row ────────────────────────────────────────────────────────── */}
      <div
        className={`border-t-2 px-3 py-2 ${
          isBalanced && drTotal > 0
            ? "border-zinc-300 bg-zinc-50"
            : drTotal > 0
            ? "border-amber-300 bg-amber-50/40"
            : "border-zinc-300 bg-zinc-50"
        }`}
      >
        <div className="grid grid-cols-12 items-center">
          <div className="col-span-8 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider select-none">
            {drTotal > 0 && crTotal > 0 && !isBalanced && (
              <span className="text-amber-600">
                ⚠ Difference: {Math.abs(drTotal - crTotal).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            )}
            {isBalanced && drTotal > 0 && (
              <span className="text-zinc-500">✓ Balanced</span>
            )}
          </div>
          {/* FIX #1 — uses pre-computed totals from props */}
          <div className="col-span-2 text-right font-bold text-zinc-900">
            {formatAmount(drTotal)}
          </div>
          <div className="col-span-2 text-right font-bold text-zinc-900">
            {formatAmount(crTotal)}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## File: `transactions/components/popups/BankAllocationPopup.tsx`

```
import { useState, useEffect } from "react";

interface BankDetails {
  ledger_id: number;
  transaction_type: "Cheque" | "e-Fund Transfer" | "Card" | "Others";
  cheque_range?: string;
  instrument_number: string;
  instrument_date: string;
  amount: number;
}

interface Props {
  ledgerId: number;
  ledgerName: string;
  amount: number;
  initialDetails?: Partial<BankDetails> | null;
  onClose: () => void;
  onSave: (details: BankDetails) => void;
}

export default function BankAllocationPopup({
  ledgerId,
  ledgerName,
  amount,
  initialDetails,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<BankDetails>({
    ledger_id: ledgerId,
    transaction_type: "Cheque",
    cheque_range: "",
    instrument_number: "",
    instrument_date: new Date().toISOString().split("T")[0],
    amount,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDetails) {
      setForm({
        ledger_id: ledgerId,
        transaction_type: initialDetails.transaction_type ?? "Cheque",
        cheque_range: initialDetails.cheque_range ?? "",
        instrument_number: initialDetails.instrument_number ?? "",
        instrument_date: initialDetails.instrument_date ?? new Date().toISOString().split("T")[0],
        amount: initialDetails.amount ?? amount,
      });
    } else {
      setForm((prev) => ({ ...prev, ledger_id: ledgerId, amount }));
    }
  }, [ledgerId, amount, initialDetails]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const set = (field: keyof BankDetails, value: any) => {
    setError(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

  const formattedAmount = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[480px] flex flex-col max-h-[85vh] overflow-hidden">

        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider">Bank Allocations</span>
            <span className="text-[10px] text-zinc-400 font-mono">Ledger: {ledgerName}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm">&times;</button>
        </div>

        {/* Title & Amount */}
        <div className="bg-white border-b border-zinc-200 px-4 py-3 text-center">
          <div className="text-sm text-black">
            Bank Allocations for: <span className="font-bold">{ledgerName}</span>
          </div>
          <div className="text-sm text-black font-semibold mt-1">
            For: {formattedAmount}
          </div>
        </div>

        {/* Transaction Type Table */}
        <div className="px-4 py-0">
          <div className="grid grid-cols-2 border-b border-zinc-300 py-1 text-sm font-semibold text-black">
            <div>Transaction Type</div>
            <div className="text-right">Amount</div>
          </div>
          <div className="grid grid-cols-2 border-b border-zinc-200 py-1 text-sm items-center bg-yellow-50">
            <div>
              <select
                value={form.transaction_type}
                onChange={(e) => set("transaction_type", e.target.value as any)}
                className="bg-transparent outline-none border border-zinc-300 px-1 py-0.5 text-sm text-black w-36"
              >
                <option value="Cheque">Cheque</option>
                <option value="e-Fund Transfer">e-Fund Transfer</option>
                <option value="Card">Card</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div className="text-right font-mono text-black">{formattedAmount}</div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 min-h-0">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded flex justify-between items-center">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm italic text-black w-28 shrink-0">Cheque range</span>
            <span className="text-sm text-black">:</span>
            <input
              type="text"
              value={form.cheque_range}
              onChange={(e) => set("cheque_range", e.target.value)}
              className="flex-1 text-sm border border-zinc-300 px-2 py-1 outline-none focus:border-zinc-800 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm italic text-black w-28 shrink-0">Inst No.</span>
            <span className="text-sm text-black">:</span>
            <input
              type="text"
              value={form.instrument_number}
              onChange={(e) => set("instrument_number", e.target.value)}
              className="text-sm border border-zinc-300 px-2 py-1 outline-none focus:border-zinc-800 w-32 bg-white"
            />
            <span className="text-sm italic text-black ml-4 shrink-0">Inst Date</span>
            <span className="text-sm text-black">:</span>
            <input
              type="date"
              value={form.instrument_date}
              onChange={(e) => set("instrument_date", e.target.value)}
              className="text-sm border border-zinc-300 px-2 py-1 outline-none focus:border-zinc-800 w-32 bg-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500">Alt+A: Accept &nbsp;·&nbsp; Esc: Close</span>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold">
              Cancel
            </button>
            <button onClick={handleSave}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 font-semibold shadow-sm active:scale-95">
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

```

---

## File: `transactions/components/popups/BillWiseAllocationPopup.tsx`

```
import { useState, useEffect } from "react";

interface BillReference {
  ledger_id: number;
  bill_name: string;
  bill_type: "New Ref" | "Agst Ref" | "Advance" | "On Account";
  amount: number;
  credit_period?: string;
}

interface Props {
  ledgerId: number;
  ledgerName: string;
  totalAmount: number;
  initialAllocations?: BillReference[];
  onClose: () => void;
  onSave: (allocations: BillReference[]) => void;
}

export default function BillWiseAllocationPopup({
  ledgerId,
  ledgerName,
  totalAmount,
  initialAllocations = [],
  onClose,
  onSave,
}: Props) {
  const [allocations, setAllocations] = useState<BillReference[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAllocations.length > 0) {
      setAllocations(initialAllocations.map((a) => ({ ...a, ledger_id: ledgerId })));
    } else {
      setAllocations([{
        ledger_id: ledgerId,
        bill_name: "",
        bill_type: "New Ref",
        amount: totalAmount,
        credit_period: "",
      }]);
    }
  }, [ledgerId, totalAmount, initialAllocations]);

  const allocated = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const remaining = totalAmount - allocated;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocations, remaining]);

  const handleAdd = () => {
    if (Math.abs(remaining) < 0.01) { setError("Total is fully allocated."); return; }
    setError(null);
    setAllocations((prev) => [...prev, {
      ledger_id: ledgerId,
      bill_name: "",
      bill_type: remaining > 0 ? "New Ref" : "On Account",
      amount: Math.abs(remaining),
      credit_period: "",
    }]);
  };

  const handleRemove = (i: number) => {
    if (allocations.length === 1) { setError("At least one row is required."); return; }
    setError(null);
    setAllocations((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleChange = (i: number, field: keyof BillReference, value: any) => {
    setError(null);
    setAllocations((prev) =>
      prev.map((row, idx) => {
        if (idx !== i) return row;
        const updated = { ...row, [field]: value };
        if (field === "bill_type" && value === "On Account") {
          updated.bill_name = "On Account";
        }
        return updated;
      })
    );
  };

  const handleSave = () => {
    if (allocations.some((a) => !a.bill_name.trim())) {
      setError("Bill name is required for all references.");
      return;
    }
    if (Math.abs(remaining) >= 0.01) {
      setError(`Remaining ₹${remaining.toFixed(2)} must be zero.`);
      return;
    }
    onSave(allocations);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[600px] flex flex-col max-h-[85vh] overflow-hidden">

        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider">Bill-wise Allocations</span>
            <span className="text-[10px] text-zinc-400 font-mono">Ledger: {ledgerName}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm">&times;</button>
        </div>

        {/* Info bar */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 flex justify-between items-center text-xs font-semibold text-zinc-700">
          <div>
            Total:{" "}
            <span className="font-mono text-zinc-900 text-sm">
              ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex gap-4">
            <span>
              Allocated:{" "}
              <span className="font-mono text-emerald-700">
                ₹{allocated.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </span>
            <span>
              Remaining:{" "}
              <span className={`font-mono ${Math.abs(remaining) < 0.01 ? "text-zinc-500" : remaining > 0 ? "text-amber-600" : "text-rose-600"}`}>
                ₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 min-h-0">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded flex justify-between items-center">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          <div className="border border-zinc-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 bg-zinc-100 border-b border-zinc-200 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
              <div className="col-span-3">Type of Ref</div>
              <div className="col-span-4">Name</div>
              <div className="col-span-2 text-center">Cr Days</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-1" />
            </div>
            <div className="divide-y divide-zinc-100">
              {allocations.map((row, i) => (
                <div key={i} className="grid grid-cols-12 items-center px-3 py-2 bg-white gap-2">
                  <div className="col-span-3">
                    <select value={row.bill_type} onChange={(e) => handleChange(i, "bill_type", e.target.value)}
                      className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 bg-white w-full font-medium">
                      <option value="New Ref">New Ref</option>
                      <option value="Agst Ref">Agst Ref</option>
                      <option value="Advance">Advance</option>
                      <option value="On Account">On Account</option>
                    </select>
                  </div>
                  <div className="col-span-4">
                    <input type="text" value={row.bill_name}
                      disabled={row.bill_type === "On Account"}
                      onChange={(e) => handleChange(i, "bill_name", e.target.value)}
                      placeholder={row.bill_type === "On Account" ? "On Account" : "Ref name"}
                      className="text-xs px-2.5 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full disabled:bg-zinc-50 disabled:text-zinc-400 font-semibold" />
                  </div>
                  <div className="col-span-2">
                    <input type="text" value={row.credit_period ?? ""}
                      disabled={row.bill_type === "On Account"}
                      onChange={(e) => handleChange(i, "credit_period", e.target.value)}
                      placeholder="e.g. 30"
                      className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 text-center w-full disabled:bg-zinc-50 font-mono font-medium" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" step="0.01" value={row.amount || ""}
                      onChange={(e) => handleChange(i, "amount", Number(e.target.value) || 0)}
                      className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 text-right w-full font-mono font-semibold" />
                  </div>
                  <div className="col-span-1 text-center">
                    <button onClick={() => handleRemove(i)}
                      className="text-zinc-400 hover:text-rose-600 text-sm font-bold font-sans">&times;</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleAdd}
            className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded px-2.5 py-1 hover:bg-zinc-50 flex items-center gap-1 select-none">
            + Add Split Row
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500">Alt+A: Accept &nbsp;·&nbsp; Esc: Close</span>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold">
              Cancel
            </button>
            <button onClick={handleSave}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 font-semibold shadow-sm active:scale-95">
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## File: `transactions/components/popups/CostCentreAllocationPopup.tsx`

```
import { useState, useEffect } from "react";
import type { CostCentreType } from "@/types/api";

interface CostCentreAllocation {
  cost_centre_id: number;
  amount: number;
}

interface Props {
  companyId: number;
  ledgerName: string;
  totalAmount: number;
  initialAllocations?: CostCentreAllocation[];
  onClose: () => void;
  onSave: (allocations: CostCentreAllocation[]) => void;
}

export default function CostCentreAllocationPopup({
  companyId,
  ledgerName,
  totalAmount,
  initialAllocations = [],
  onClose,
  onSave,
}: Props) {
  const [costCentres, setCostCentres] = useState<CostCentreType[]>([]);
  const [allocations, setAllocations] = useState<CostCentreAllocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load cost centres
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await window.api.costCentre.getAll(companyId);
        if (!active) return;
        if (res.success) setCostCentres(res.costCentres ?? []);
        else setError(res.error || "Failed to load cost centres.");
      } catch (err: any) {
        if (active) setError("Error loading cost centres.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [companyId]);

  // Seed allocations once cost centres are loaded
  useEffect(() => {
    if (initialAllocations.length > 0) {
      setAllocations(initialAllocations.map((a) => ({ ...a })));
    } else if (costCentres.length > 0) {
      setAllocations([{ cost_centre_id: costCentres[0].cc_id!, amount: totalAmount }]);
    }
  }, [costCentres, totalAmount, initialAllocations]);

  const allocated = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const remaining = totalAmount - allocated;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocations, remaining]);

  const handleAdd = () => {
    if (!costCentres.length) { setError("No cost centres available."); return; }
    if (Math.abs(remaining) < 0.01) { setError("Amount fully allocated."); return; }
    setError(null);
    setAllocations((prev) => [...prev, { cost_centre_id: costCentres[0].cc_id!, amount: Math.abs(remaining) }]);
  };

  const handleRemove = (i: number) => {
    if (allocations.length === 1) { setError("At least one entry is required."); return; }
    setError(null);
    setAllocations((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleChange = (i: number, field: keyof CostCentreAllocation, value: number) => {
    setError(null);
    setAllocations((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row))
    );
  };

  const handleSave = () => {
    if (allocations.some((a) => !a.cost_centre_id)) {
      setError("Select a cost centre for all entries.");
      return;
    }
    const ids = allocations.map((a) => a.cost_centre_id);
    if (ids.some((v, i) => ids.indexOf(v) !== i)) {
      setError("Duplicate cost centre selections. Merge or remove duplicates.");
      return;
    }
    if (Math.abs(remaining) >= 0.01) {
      setError(`Remaining ₹${remaining.toFixed(2)} must be zero.`);
      return;
    }
    onSave(allocations);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[500px] flex flex-col max-h-[85vh] overflow-hidden">

        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider">Cost Centre Allocations</span>
            <span className="text-[10px] text-zinc-400 font-mono">Ledger: {ledgerName}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm">&times;</button>
        </div>

        {/* Info bar */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 flex justify-between items-center text-xs font-semibold text-zinc-700">
          <div>
            Total:{" "}
            <span className="font-mono text-zinc-900 text-sm">
              ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex gap-4">
            <span>
              Allocated:{" "}
              <span className="font-mono text-emerald-700">
                ₹{allocated.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </span>
            <span>
              Remaining:{" "}
              <span className={`font-mono ${Math.abs(remaining) < 0.01 ? "text-zinc-500" : remaining > 0 ? "text-amber-600" : "text-rose-600"}`}>
                ₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 min-h-0">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded flex justify-between items-center">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-6 text-zinc-500 text-xs italic">Loading cost centres…</div>
          ) : costCentres.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-xs bg-zinc-50 rounded border border-zinc-200">
              No cost centres found. Create one under Master Creation first.
            </div>
          ) : (
            <>
              <div className="border border-zinc-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 bg-zinc-100 border-b border-zinc-200 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  <div className="col-span-7">Cost Centre</div>
                  <div className="col-span-4 text-right">Amount</div>
                  <div className="col-span-1" />
                </div>
                <div className="divide-y divide-zinc-100">
                  {allocations.map((row, i) => (
                    <div key={i} className="grid grid-cols-12 items-center px-3 py-2 bg-white gap-2">
                      <div className="col-span-7">
                        <select value={row.cost_centre_id}
                          onChange={(e) => handleChange(i, "cost_centre_id", Number(e.target.value))}
                          className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 bg-white w-full font-semibold">
                          {costCentres.map((cc) => (
                            <option key={cc.cc_id} value={cc.cc_id}>{cc.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-4">
                        <input type="number" step="0.01" value={row.amount || ""}
                          onChange={(e) => handleChange(i, "amount", Number(e.target.value) || 0)}
                          className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 text-right w-full font-mono font-semibold" />
                      </div>
                      <div className="col-span-1 text-center">
                        <button onClick={() => handleRemove(i)}
                          className="text-zinc-400 hover:text-rose-600 text-sm font-bold">&times;</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleAdd}
                className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded px-2.5 py-1 hover:bg-zinc-50 flex items-center gap-1 select-none">
                + Add Cost Centre Split
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500">Alt+A: Accept &nbsp;·&nbsp; Esc: Close</span>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold">
              Cancel
            </button>
            <button onClick={handleSave} disabled={costCentres.length === 0}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50 font-semibold shadow-sm active:scale-95">
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## File: `transactions/components/popups/DatePickerPopup.tsx`

```
import { useEffect, useState, useCallback } from "react";

interface Props {
  initialDate: string;
  onClose: () => void;
  onConfirm: (date: string) => void;
  label?: string;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function DatePickerPopup({
  initialDate,
  onClose,
  onConfirm,
  label = "Date",
}: Props) {
  const parsed = new Date(initialDate || Date.now());
  const safeDate = isNaN(parsed.getTime()) ? new Date() : parsed;

  const [viewYear, setViewYear] = useState(safeDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(safeDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(safeDate);
  // highlightedDay is 0-based index within the current month (0 = day 1)
  const [highlightedDay, setHighlightedDay] = useState(safeDate.getDate() - 1);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

  const today = new Date();

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  const isSelected = (day: number) =>
    day === selectedDate.getDate() &&
    viewMonth === selectedDate.getMonth() &&
    viewYear === selectedDate.getFullYear();

  // FIX #10 — when navigating months, reset highlightedDay to 0 (first day)
  const handlePrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
    setHighlightedDay(0);
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
    setHighlightedDay(0);
  }, []);

  // Select a day in the currently-viewed month and keep highlight in sync
  const selectDay = useCallback(
    (day: number) => {
      setSelectedDate(new Date(viewYear, viewMonth, day));
      setHighlightedDay(day - 1);
    },
    [viewYear, viewMonth]
  );

  const handleConfirm = useCallback(() => {
    const iso = selectedDate.toISOString().split("T")[0];
    onConfirm(iso);
    onClose();
  }, [selectedDate, onConfirm, onClose]);

  // FIX #10 — arrow keys update BOTH highlightedDay AND selectedDate so
  // pressing Enter immediately after navigating always confirms the right day
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "Enter") { e.preventDefault(); handleConfirm(); return; }
      if (e.key === "PageUp") { e.preventDefault(); handlePrevMonth(); return; }
      if (e.key === "PageDown") { e.preventDefault(); handleNextMonth(); return; }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setHighlightedDay((prev) => {
          const next = Math.min(prev + 1, daysInMonth - 1);
          setSelectedDate(new Date(viewYear, viewMonth, next + 1));
          return next;
        });
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setHighlightedDay((prev) => {
          const next = Math.max(prev - 1, 0);
          setSelectedDate(new Date(viewYear, viewMonth, next + 1));
          return next;
        });
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedDay((prev) => {
          const next = Math.min(prev + 7, daysInMonth - 1);
          setSelectedDate(new Date(viewYear, viewMonth, next + 1));
          return next;
        });
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedDay((prev) => {
          const next = Math.max(prev - 7, 0);
          setSelectedDate(new Date(viewYear, viewMonth, next + 1));
          return next;
        });
      }
      if (e.key === "Home") {
        e.preventDefault();
        setHighlightedDay(0);
        setSelectedDate(new Date(viewYear, viewMonth, 1));
      }
      if (e.key === "End") {
        e.preventDefault();
        setHighlightedDay(daysInMonth - 1);
        setSelectedDate(new Date(viewYear, viewMonth, daysInMonth));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, handleConfirm, handlePrevMonth, handleNextMonth, daysInMonth, viewYear, viewMonth]);

  // Build the calendar grid weeks
  const renderCalendar = () => {
    const weeks: React.ReactElement[] = [];
    let dayCounter = 1;
    let nextMonthDay = 1;
    let weekIndex = 0;

    while (dayCounter <= daysInMonth) {
      const week: React.ReactElement[] = [];

      for (let col = 0; col < 7; col++) {
        if (weekIndex === 0 && col < firstWeekday) {
          // Previous month overflow
          const prevDay = daysInPrevMonth - firstWeekday + col + 1;
          week.push(
            <div key={`prev-${col}`} className="h-8 w-8 flex items-center justify-center text-xs text-zinc-400">
              {prevDay}
            </div>
          );
        } else if (dayCounter > daysInMonth) {
          // Next month overflow
          week.push(
            <div key={`next-${nextMonthDay}`} className="h-8 w-8 flex items-center justify-center text-xs text-zinc-400">
              {nextMonthDay++}
            </div>
          );
        } else {
          const d = dayCounter;
          const isHi = highlightedDay === d - 1;
          const isSel = isSelected(d);
          const isTod = isToday(d);

          week.push(
            <div
              key={`day-${d}`}
              className={`h-8 w-8 flex items-center justify-center text-xs cursor-pointer rounded transition-colors ${
                isHi
                  ? "bg-zinc-900 text-white font-bold"
                  : isSel
                  ? "bg-blue-600 text-white font-bold"
                  : isTod
                  ? "bg-blue-100 text-blue-700 font-bold border border-blue-300"
                  : "hover:bg-zinc-100 text-zinc-800"
              }`}
              onClick={() => selectDay(d)}
              onMouseEnter={() => setHighlightedDay(d - 1)}
            >
              {d}
            </div>
          );
          dayCounter++;
        }
      }

      weeks.push(
        <div key={`week-${weekIndex}`} className="flex">
          {week}
        </div>
      );
      weekIndex++;
      if (dayCounter > daysInMonth) break;
    }
    return weeks;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl border border-zinc-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-zinc-900 text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider flex justify-between items-center">
          <span>{label} Selection</span>
          <button
            onClick={onClose}
            className="text-sm font-bold hover:text-zinc-300 transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="p-4">
          {/* Month / Year navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-zinc-100 rounded transition-colors"
              aria-label="Previous month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-sm font-bold text-zinc-800">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-zinc-100 rounded transition-colors"
              aria-label="Next month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day name headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map((day) => (
              <div
                key={day}
                className="h-8 flex items-center justify-center text-[10px] font-bold text-zinc-500 uppercase"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex flex-col">{renderCalendar()}</div>

          {/* Selected date display + actions */}
          <div className="mt-4 pt-3 border-t border-zinc-200">
            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-600">
                Selected:{" "}
                <span className="font-bold text-zinc-900">
                  {selectedDate.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-1 text-xs bg-zinc-900 text-white hover:bg-zinc-800 rounded transition-colors font-semibold"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-200">
          <div className="text-[10px] text-zinc-500 flex justify-between">
            <span>↑↓←→ Navigate</span>
            <span>PgUp/Dn: Month</span>
            <span>Enter: Accept</span>
            <span>Esc: Cancel</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## File: `transactions/components/popups/DenominationPopup.tsx`

```
import { useState, useEffect } from "react";

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantities, others]);

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

  const handleSave = () => {
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
  };

  const formattedAmount = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[420px] flex flex-col max-h-[85vh] overflow-hidden">

        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider">Cash Denominations</span>
            <span className="text-[10px] text-zinc-400 font-mono">Ledger: {ledgerName}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm">&times;</button>
        </div>

        {/* Title & Amount */}
        <div className="bg-white border-b border-zinc-200 px-4 py-3 text-center">
          <div className="text-sm text-black font-semibold">
            {ledgerName}
          </div>
          <div className="text-sm text-black mt-1">
            Denominations For: {formattedAmount}
          </div>
        </div>

        {/* Table Header */}
        <div className="px-4 py-0">
          <div className="grid grid-cols-2 border-b border-zinc-300 py-1 text-sm font-semibold text-black">
            <div>Denominations</div>
            <div className="text-right">Amount</div>
          </div>
        </div>

        {/* Denominations List */}
        <div className="px-4 flex-1 overflow-y-auto min-h-0 space-y-0.5 py-1">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded flex justify-between items-center">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          {DENOMINATIONS.map((denom) => {
            const qty = quantities[String(denom)] || 0;
            const amt = denom * qty;
            return (
              <div key={denom} className="grid grid-cols-2 items-center text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-black w-10 text-right">{denom}</span>
                  <span className="text-black">X</span>
                  <input
                    type="number"
                    min={0}
                    className="w-14 text-sm border border-zinc-300 px-1 py-0.5 outline-none focus:border-zinc-800 bg-white text-right"
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

          <div className="grid grid-cols-2 items-center text-sm pt-1 border-t border-zinc-200">
            <div className="text-black">Others</div>
            <div className="text-right">
              <input
                type="number"
                min={0}
                className="w-24 text-sm border border-zinc-300 px-1 py-0.5 outline-none focus:border-zinc-800 bg-white text-right"
                value={others || ""}
                onChange={(e) => {
                  setError(null);
                  setOthers(Math.max(0, Number(e.target.value) || 0));
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 items-center text-sm font-semibold pt-1 border-t border-zinc-300">
            <div className="text-black">Total</div>
            <div className="text-right font-mono text-black">
              {computedTotal > 0 ? computedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}
            </div>
          </div>

          <div className="grid grid-cols-2 items-center text-sm pt-0.5">
            <div className="text-black">Difference</div>
            <div className="text-right font-mono text-black">
              {difference.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500">Alt+A: Accept &nbsp;·&nbsp; Esc: Close</span>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold">
              Cancel
            </button>
            <button onClick={handleSave}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 font-semibold shadow-sm active:scale-95">
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

```

---

## File: `transactions/components/popups/DispatchDetailsPopup.tsx`

```
import { useState, useEffect } from "react";

interface DispatchDetail {
  id: string;
  dispatch_date: string;
  place_of_dispatch: string;
  port_of_shipment?: string;
  port_of_destination?: string;
  shipping_mode: "Air" | "Sea" | "Rail" | "Road" | "Others";
  vehicle_number?: string;
  awb_or_bill_of_lading?: string;
  additional_notes?: string;
}

interface Props {
  partyName: string;
  totalAmount: number;
  initialDetails?: DispatchDetail | null;
  onClose: () => void;
  onSave: (details: DispatchDetail) => void;
}

export default function DispatchDetailsPopup({
  partyName,
  totalAmount,
  initialDetails,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<DispatchDetail>({
    id: initialDetails?.id ?? `dispatch_${Date.now()}`,
    dispatch_date: initialDetails?.dispatch_date ?? new Date().toISOString().split("T")[0],
    place_of_dispatch: initialDetails?.place_of_dispatch ?? "",
    port_of_shipment: initialDetails?.port_of_shipment ?? "",
    port_of_destination: initialDetails?.port_of_destination ?? "",
    shipping_mode: initialDetails?.shipping_mode ?? "Road",
    vehicle_number: initialDetails?.vehicle_number ?? "",
    awb_or_bill_of_lading: initialDetails?.awb_or_bill_of_lading ?? "",
    additional_notes: initialDetails?.additional_notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const set = (field: keyof DispatchDetail, value: any) => {
    setError(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.dispatch_date.trim()) {
      setError("Dispatch date is required.");
      return;
    }
    if (!form.place_of_dispatch.trim()) {
      setError("Place of dispatch is required.");
      return;
    }
    if (!form.shipping_mode) {
      setError("Shipping mode is required.");
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[550px] flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider">Dispatch Details</span>
            <span className="text-[10px] text-zinc-400 font-mono">Party: {partyName}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm">&times;</button>
        </div>

        {/* Amount Info */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2.5 flex justify-between items-center text-xs font-semibold text-zinc-700">
          <span>Invoice Amount:</span>
          <span className="font-mono text-zinc-900 text-sm">
            ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Form Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 min-h-0">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded flex justify-between items-center">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          {/* Dispatch Date */}
          <Field label="Dispatch Date *">
            <input
              type="date"
              value={form.dispatch_date}
              onChange={(e) => set("dispatch_date", e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* Place of Dispatch */}
          <Field label="Place of Dispatch *">
            <input
              type="text"
              value={form.place_of_dispatch}
              onChange={(e) => set("place_of_dispatch", e.target.value)}
              placeholder="e.g. Mumbai Warehouse"
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* Shipping Mode */}
          <Field label="Shipping Mode *">
            <select
              value={form.shipping_mode}
              onChange={(e) => set("shipping_mode", e.target.value as any)}
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            >
              <option value="Road">Road</option>
              <option value="Rail">Rail</option>
              <option value="Air">Air</option>
              <option value="Sea">Sea</option>
              <option value="Others">Others</option>
            </select>
          </Field>

          {/* Port of Shipment */}
          <Field label="Port of Shipment (Optional)">
            <input
              type="text"
              value={form.port_of_shipment ?? ""}
              onChange={(e) => set("port_of_shipment", e.target.value)}
              placeholder="e.g. Port of Mumbai"
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* Port of Destination */}
          <Field label="Port of Destination (Optional)">
            <input
              type="text"
              value={form.port_of_destination ?? ""}
              onChange={(e) => set("port_of_destination", e.target.value)}
              placeholder="e.g. Port of Shanghai"
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* Vehicle Number */}
          <Field label="Vehicle/Container Number (Optional)">
            <input
              type="text"
              value={form.vehicle_number ?? ""}
              onChange={(e) => set("vehicle_number", e.target.value)}
              placeholder="e.g. MH01AB1234 or CONT123456"
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* AWB or Bill of Lading */}
          <Field label="AWB / Bill of Lading (Optional)">
            <input
              type="text"
              value={form.awb_or_bill_of_lading ?? ""}
              onChange={(e) => set("awb_or_bill_of_lading", e.target.value)}
              placeholder="e.g. AWB123456 or BOL789"
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* Additional Notes */}
          <Field label="Additional Notes (Optional)">
            <textarea
              value={form.additional_notes ?? ""}
              onChange={(e) => set("additional_notes", e.target.value)}
              placeholder="Any special instructions or notes about the dispatch…"
              rows={3}
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white resize-none"
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500">Alt+A: Accept &nbsp;·&nbsp; Esc: Close</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 font-semibold shadow-sm active:scale-95"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

```

---

## File: `transactions/components/popups/InlineMasterPopup.tsx`

```
import { useState, useEffect, useRef } from "react";
import type { GroupType } from "@/types/api";

interface Props {
  companyId: number;
  initialType?: "ledger" | "stockItem" | "godown";
  onClose: () => void;
  onSuccess: (type: "ledger" | "stockItem" | "godown", created: any) => void;
}

export default function InlineMasterPopup({
  companyId,
  initialType = "ledger",
  onClose,
  onSuccess,
}: Props) {
  const [type, setType] = useState<"ledger" | "stockItem" | "godown">(initialType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Master data for dropdowns
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [stockGroups, setStockGroups] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Form states ────────────────────────────────────────────────────────────

  const [ledgerForm, setLedgerForm] = useState({
    name: "",
    alias: "",
    group_id: "",
    opening_balance: 0,
    is_bill_wise: 0,
    allow_cost_centres: 0,
  });

  const [stockItemForm, setStockItemForm] = useState({
    name: "",
    alias: "",
    // FIX — use sg_id (not group_id) for stock groups
    sg_id: "",
    unit_id: "",
    opening_qty: 0,
    opening_rate: 0,
    opening_value: 0,
  });

  const [godownForm, setGodownForm] = useState({
    name: "",
    alias: "",
    address: "",
  });

  // ── Load dropdown data ─────────────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [gRes, sgRes, uRes] = await Promise.all([
          window.api.group.getAll(companyId),
          window.api.stockGroup.getAll(companyId),
          window.api.unit.getAll(companyId),
        ]);
        if (!active) return;

        if (gRes.success) {
          const grps: GroupType[] = gRes.groups ?? [];
          setGroups(grps);
          const defaultGroup =
            grps.find((g: any) => g.name === "Capital Account") ?? grps[0];
          if (defaultGroup) {
            setLedgerForm((prev) => ({
              ...prev,
              group_id: String(defaultGroup.group_id),
            }));
          }
        }

        if (sgRes.success) {
          const sgs: any[] = sgRes.stockGroups ?? [];
          setStockGroups(sgs);
          // FIX — set sg_id, not group_id
          if (sgs[0]) {
            setStockItemForm((prev) => ({ ...prev, sg_id: String(sgs[0].sg_id) }));
          }
        }

        if (uRes.success) {
          const us: any[] = uRes.units ?? [];
          setUnits(us);
          if (us[0]) {
            setStockItemForm((prev) => ({
              ...prev,
              unit_id: String(us[0].unit_id),
            }));
          }
        }
      } catch (err) {
        console.error("InlineMasterPopup: failed to load options", err);
      }
    })();
    return () => { active = false; };
  }, [companyId]);

  // Autofocus name input whenever type changes
  useEffect(() => {
    nameInputRef.current?.focus();
  }, [type]);

  // Alt+A → submit, Escape → close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, ledgerForm, stockItemForm, godownForm]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (type === "ledger") {
        if (!ledgerForm.name.trim()) { setError("Name is required."); setLoading(false); return; }
        const res = await window.api.ledger.create({
          company_id: companyId,
          name: ledgerForm.name.trim(),
          alias: ledgerForm.alias.trim() || undefined,
          group_id: ledgerForm.group_id ? Number(ledgerForm.group_id) : undefined,
          opening_balance: Number(ledgerForm.opening_balance) || 0,
          is_bill_wise: ledgerForm.is_bill_wise,
          allow_cost_centres: ledgerForm.allow_cost_centres,
          ledger_type: "General",
          registration_type: "Unregistered",
        });
        if (res.success && res.ledger) onSuccess("ledger", res.ledger);
        else setError(res.error || "Failed to create ledger.");

      } else if (type === "stockItem") {
        if (!stockItemForm.name.trim()) { setError("Name is required."); setLoading(false); return; }
        const res = await window.api.stockItem.create({
          company_id: companyId,
          name: stockItemForm.name.trim(),
          alias: stockItemForm.alias.trim() || undefined,
          // FIX — pass sg_id as group_id (API field name) using the corrected state key
          group_id: stockItemForm.sg_id ? Number(stockItemForm.sg_id) : undefined,
          unit_id: stockItemForm.unit_id ? Number(stockItemForm.unit_id) : undefined,
          opening_quantity: Number(stockItemForm.opening_qty) || 0,
          opening_rate: Number(stockItemForm.opening_rate) || 0,
          opening_value: Number(stockItemForm.opening_value) || 0,
        });
        if (res.success && res.item) onSuccess("stockItem", res.item);
        else setError(res.error || "Failed to create stock item.");

      } else if (type === "godown") {
        if (!godownForm.name.trim()) { setError("Name is required."); setLoading(false); return; }
        const res = await window.api.godown.create({
          company_id: companyId,
          name: godownForm.name.trim(),
          alias: godownForm.alias.trim() || undefined,
          address: godownForm.address.trim() || undefined,
        });
        if (res.success && res.godown) onSuccess("godown", res.godown);
        else setError(res.error || "Failed to create godown.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-xl w-[480px] overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <span className="text-xs font-bold uppercase tracking-wider">
            Inline Master Creation
          </span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white font-bold text-sm leading-none"
          >
            &times;
          </button>
        </div>

        {/* Type selector */}
        <div className="bg-zinc-100 border-b border-zinc-200 px-4 py-2 flex gap-4 select-none">
          {(["ledger", "stockItem", "godown"] as const).map((t) => (
            <label key={t} className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-zinc-700">
              <input
                type="radio"
                checked={type === t}
                onChange={() => { setType(t); setError(null); }}
                className="accent-zinc-900"
              />
              {t === "ledger" ? "Ledger" : t === "stockItem" ? "Stock Item" : "Godown"}
            </label>
          ))}
        </div>

        {/* Form content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 min-h-0">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-1.5 rounded flex justify-between items-center font-medium">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="text-red-500 font-bold">&times;</button>
            </div>
          )}

          {/* ── LEDGER ── */}
          {type === "ledger" && (
            <div className="space-y-3">
              <Field label="Name">
                <input ref={nameInputRef} type="text" value={ledgerForm.name}
                  onChange={(e) => setLedgerForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Sales Account" className={inputCls} />
              </Field>
              <Field label="Alias">
                <input type="text" value={ledgerForm.alias}
                  onChange={(e) => setLedgerForm((p) => ({ ...p, alias: e.target.value }))}
                  placeholder="Optional alias" className={inputCls} />
              </Field>
              <Field label="Under Group">
                <select value={ledgerForm.group_id}
                  onChange={(e) => setLedgerForm((p) => ({ ...p, group_id: e.target.value }))}
                  className={inputCls}>
                  {groups.map((g) => (
                    <option key={g.group_id} value={g.group_id}>{g.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Opening Balance">
                <input type="number" step="0.01" value={ledgerForm.opening_balance}
                  onChange={(e) => setLedgerForm((p) => ({ ...p, opening_balance: Number(e.target.value) || 0 }))}
                  className={inputCls + " text-right"} />
              </Field>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <ToggleField
                  label="Bill-wise Details?"
                  value={ledgerForm.is_bill_wise}
                  onChange={(v) => setLedgerForm((p) => ({ ...p, is_bill_wise: v }))}
                />
                <ToggleField
                  label="Cost Centres?"
                  value={ledgerForm.allow_cost_centres}
                  onChange={(v) => setLedgerForm((p) => ({ ...p, allow_cost_centres: v }))}
                />
              </div>
            </div>
          )}

          {/* ── STOCK ITEM ── */}
          {type === "stockItem" && (
            <div className="space-y-3">
              <Field label="Item Name">
                <input ref={nameInputRef} type="text" value={stockItemForm.name}
                  onChange={(e) => setStockItemForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Dell Monitor 24" className={inputCls} />
              </Field>
              <Field label="Alias">
                <input type="text" value={stockItemForm.alias}
                  onChange={(e) => setStockItemForm((p) => ({ ...p, alias: e.target.value }))}
                  placeholder="Optional alias" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Stock Group">
                  {/* FIX — key and value use sg_id */}
                  <select value={stockItemForm.sg_id}
                    onChange={(e) => setStockItemForm((p) => ({ ...p, sg_id: e.target.value }))}
                    className={inputCls}>
                    {stockGroups.map((sg) => (
                      <option key={sg.sg_id} value={sg.sg_id}>{sg.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Unit">
                  <select value={stockItemForm.unit_id}
                    onChange={(e) => setStockItemForm((p) => ({ ...p, unit_id: e.target.value }))}
                    className={inputCls}>
                    {units.map((u) => (
                      <option key={u.unit_id} value={u.unit_id}>{u.symbol} ({u.formal_name})</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="pt-2 border-t border-zinc-100" />
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Opening Balance
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Qty">
                  <input type="number" value={stockItemForm.opening_qty}
                    onChange={(e) => {
                      const qty = Number(e.target.value) || 0;
                      setStockItemForm((p) => ({
                        ...p,
                        opening_qty: qty,
                        opening_value: qty * p.opening_rate,
                      }));
                    }}
                    className={inputCls + " text-right"} />
                </Field>
                <Field label="Rate">
                  <input type="number" value={stockItemForm.opening_rate}
                    onChange={(e) => {
                      const rate = Number(e.target.value) || 0;
                      setStockItemForm((p) => ({
                        ...p,
                        opening_rate: rate,
                        opening_value: p.opening_qty * rate,
                      }));
                    }}
                    className={inputCls + " text-right"} />
                </Field>
                <Field label="Value">
                  <input type="number" value={stockItemForm.opening_value}
                    onChange={(e) =>
                      setStockItemForm((p) => ({ ...p, opening_value: Number(e.target.value) || 0 }))
                    }
                    className={inputCls + " text-right"} />
                </Field>
              </div>
            </div>
          )}

          {/* ── GODOWN ── */}
          {type === "godown" && (
            <div className="space-y-3">
              <Field label="Godown Name">
                <input ref={nameInputRef} type="text" value={godownForm.name}
                  onChange={(e) => setGodownForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Warehouse A" className={inputCls} />
              </Field>
              <Field label="Alias">
                <input type="text" value={godownForm.alias}
                  onChange={(e) => setGodownForm((p) => ({ ...p, alias: e.target.value }))}
                  placeholder="Optional alias" className={inputCls} />
              </Field>
              <Field label="Address">
                <textarea value={godownForm.address}
                  onChange={(e) => setGodownForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Street, city, etc." rows={3}
                  className={inputCls + " resize-none"} />
              </Field>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500 font-medium">
            Alt+A: Accept &nbsp;·&nbsp; Esc: Close
          </span>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50 font-semibold shadow-sm transition-all active:scale-95">
              {loading ? "Creating…" : "Accept"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small sub-components ───────────────────────────────────────────────────

const inputCls =
  "text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-medium bg-white transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border border-zinc-200 rounded p-2 bg-zinc-50">
      <span className="text-xs font-semibold text-zinc-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="text-xs outline-none bg-transparent font-bold text-zinc-800 cursor-pointer"
      >
        <option value={0}>No</option>
        <option value={1}>Yes</option>
      </select>
    </div>
  );
}
```

---

## File: `transactions/components/popups/ReceiptDetailsPopup.tsx`

```
import { useState, useEffect } from "react";

interface ReceiptDetail {
  id: string;
  receipt_date: string;
  receipt_reference_number: string;
  supplier_invoice_number?: string;
  location_received?: string;
  quantity_received?: string;
  condition_status: "Good" | "Damaged" | "Partial" | "Others";
  inspection_notes?: string;
  received_by?: string;
}

interface Props {
  partyName: string;
  totalAmount: number;
  initialDetails?: ReceiptDetail | null;
  onClose: () => void;
  onSave: (details: ReceiptDetail) => void;
}

export default function ReceiptDetailsPopup({
  partyName,
  totalAmount,
  initialDetails,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<ReceiptDetail>({
    id: initialDetails?.id ?? `receipt_${Date.now()}`,
    receipt_date: initialDetails?.receipt_date ?? new Date().toISOString().split("T")[0],
    receipt_reference_number: initialDetails?.receipt_reference_number ?? "",
    supplier_invoice_number: initialDetails?.supplier_invoice_number ?? "",
    location_received: initialDetails?.location_received ?? "",
    quantity_received: initialDetails?.quantity_received ?? "",
    condition_status: initialDetails?.condition_status ?? "Good",
    inspection_notes: initialDetails?.inspection_notes ?? "",
    received_by: initialDetails?.received_by ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const set = (field: keyof ReceiptDetail, value: any) => {
    setError(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.receipt_date.trim()) {
      setError("Receipt date is required.");
      return;
    }
    if (!form.receipt_reference_number.trim()) {
      setError("Receipt reference number is required.");
      return;
    }
    if (!form.condition_status) {
      setError("Condition status is required.");
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[550px] flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider">Receipt Details</span>
            <span className="text-[10px] text-zinc-400 font-mono">Supplier: {partyName}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm">&times;</button>
        </div>

        {/* Amount Info */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2.5 flex justify-between items-center text-xs font-semibold text-zinc-700">
          <span>Purchase Amount:</span>
          <span className="font-mono text-zinc-900 text-sm">
            ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Form Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 min-h-0">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded flex justify-between items-center">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          {/* Receipt Date */}
          <Field label="Receipt Date *">
            <input
              type="date"
              value={form.receipt_date}
              onChange={(e) => set("receipt_date", e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* Receipt Reference Number */}
          <Field label="Receipt Reference Number / GRN *">
            <input
              type="text"
              value={form.receipt_reference_number}
              onChange={(e) => set("receipt_reference_number", e.target.value)}
              placeholder="e.g. GRN-2024-001"
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* Supplier Invoice Number */}
          <Field label="Supplier Invoice Number (Optional)">
            <input
              type="text"
              value={form.supplier_invoice_number ?? ""}
              onChange={(e) => set("supplier_invoice_number", e.target.value)}
              placeholder="e.g. INV-2024-5678"
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* Location Received */}
          <Field label="Location / Godown (Optional)">
            <input
              type="text"
              value={form.location_received ?? ""}
              onChange={(e) => set("location_received", e.target.value)}
              placeholder="e.g. Warehouse A, Shelf 5"
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* Quantity Received */}
          <Field label="Quantity Received (Optional)">
            <input
              type="text"
              value={form.quantity_received ?? ""}
              onChange={(e) => set("quantity_received", e.target.value)}
              placeholder="e.g. 100 units / 50 boxes"
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>

          {/* Condition Status */}
          <Field label="Condition Status *">
            <select
              value={form.condition_status}
              onChange={(e) => set("condition_status", e.target.value as any)}
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            >
              <option value="Good">Good</option>
              <option value="Damaged">Damaged</option>
              <option value="Partial">Partial Damage</option>
              <option value="Others">Others</option>
            </select>
          </Field>

          {/* Inspection Notes */}
          <Field label="Inspection / Quality Notes (Optional)">
            <textarea
              value={form.inspection_notes ?? ""}
              onChange={(e) => set("inspection_notes", e.target.value)}
              placeholder="Note any defects, quality issues, or inspection findings…"
              rows={3}
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white resize-none"
            />
          </Field>

          {/* Received By */}
          <Field label="Received By / Inspector (Optional)">
            <input
              type="text"
              value={form.received_by ?? ""}
              onChange={(e) => set("received_by", e.target.value)}
              placeholder="e.g. John Doe / QC Inspector"
              className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold bg-white"
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500">Alt+A: Accept &nbsp;·&nbsp; Esc: Close</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 font-semibold shadow-sm active:scale-95"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

```

---

## File: `transactions/components/StatusDropdown.tsx`

```
import { useEffect, useState, useRef } from "react";

interface Props {
  status: "Regular" | "Post-Dated";
  onChange: (status: "Regular" | "Post-Dated") => void;
  disabled?: boolean;
}

export default function StatusDropdown({ status, onChange, disabled = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(status === "Regular" ? 0 : 1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options: Array<"Regular" | "Post-Dated"> = ["Regular", "Post-Dated"];

  const handleSelect = (option: "Regular" | "Post-Dated") => {
    onChange(option);
    setIsOpen(false);
  };

  useEffect(() => {
    setHighlightedIndex(status === "Regular" ? 0 : 1);
  }, [status]);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect(options[highlightedIndex]);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, options.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, highlightedIndex, options]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</span>
        <span className="text-zinc-400">:</span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`text-xs px-2 py-0.5 rounded transition-colors font-semibold ${
            status === "Post-Dated"
              ? "bg-white text-zinc-700 hover:bg-zinc-50"
              : "bg-white text-zinc-700 hover:bg-zinc-50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {status}
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded shadow-lg z-50 min-w-[140px] overflow-hidden">
          <div className="bg-zinc-100 px-3 py-1.5 text-[10px] font-bold text-zinc-600 uppercase tracking-wider border-b border-zinc-200">
            Select Status
          </div>
          {options.map((option, idx) => (
            <div
              key={option}
              className={`px-3 py-2 text-xs cursor-pointer transition-colors ${
                idx === highlightedIndex
                  ? "bg-zinc-900 text-white font-semibold"
                  : "hover:bg-zinc-50 text-zinc-800"
              }`}
              onClick={() => handleSelect(option)}
              onMouseEnter={() => setHighlightedIndex(idx)}
            >
              {option}
            </div>
          ))}
          <div className="px-3 py-1.5 text-[10px] text-zinc-400 bg-zinc-50 border-t border-zinc-100">
            ↑↓ Navigate • Enter: Select
          </div>
        </div>
      )}
    </div>
  );
}

```

---

## File: `transactions/components/VoucherHeader.tsx`

```
import { useState } from "react";
import DatePickerPopup from "./popups/DatePickerPopup";

interface Props {
  voucherType: string;
  voucherNumber: string;        // FIX #4 — was `number`, hook returns string
  dateDisplay: string;
  date: string;
  onDateChange: (date: string) => void;
  supplierInvoiceNo?: string;
  onSupplierInvoiceNoChange?: (value: string) => void;
  supplierInvoiceDate?: string;
  onSupplierInvoiceDateChange?: (date: string) => void;
}

export default function VoucherHeader({
  voucherType,
  voucherNumber,
  dateDisplay,
  date,
  onDateChange,
  supplierInvoiceNo,
  onSupplierInvoiceNoChange,
  supplierInvoiceDate,
  onSupplierInvoiceDateChange,
}: Props) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSupplierDatePicker, setShowSupplierDatePicker] = useState(false);

  const isPurchase = voucherType === "Purchase";

  return (
    <>
      {/* Voucher type badge + number + date */}
      <div className="flex items-center justify-between px-3 py-1 bg-white border-b border-gray-300">
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-black text-white px-2 py-0.5 text-xs font-medium uppercase">
            {voucherType}
          </span>
          <span className="text-gray-600">No.</span>
          <span className="font-semibold text-black">{voucherNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-sm">Date</span>
          <span className="text-gray-400 text-sm">:</span>
          <button
            onClick={() => setShowDatePicker(true)}
            className="text-xs px-1 py-0.5 hover:bg-zinc-100 transition-colors font-semibold text-zinc-800 bg-transparent border-none cursor-pointer"
            title="Click to change date (F2)"
          >
            {dateDisplay}
          </button>
        </div>
      </div>

      {/* Supplier Invoice fields — Purchase only */}
      {isPurchase && (
        <div className="flex items-center gap-6 px-3 py-2 bg-zinc-50 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Supplier Invoice No.
            </span>
            <span className="text-zinc-400">:</span>
            <input
              type="text"
              value={supplierInvoiceNo ?? ""}
              onChange={(e) => onSupplierInvoiceNoChange?.(e.target.value)}
              className="text-xs px-2 py-0.5 border border-zinc-300 rounded focus:border-zinc-800 outline-none bg-white w-40 font-semibold"
              placeholder="Invoice Number"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Date
            </span>
            <span className="text-zinc-400">:</span>
            <button
              onClick={() => setShowSupplierDatePicker(true)}
              className="text-xs px-1 py-0.5 hover:bg-zinc-100 transition-colors font-semibold text-zinc-800 bg-transparent border-none cursor-pointer w-32 text-left"
            >
              {supplierInvoiceDate
                ? new Date(supplierInvoiceDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Select Date"}
            </button>
          </div>
        </div>
      )}

      {showDatePicker && (
        <DatePickerPopup
          initialDate={date}
          onClose={() => setShowDatePicker(false)}
          onConfirm={onDateChange}
          label="Voucher Date"
        />
      )}

      {showSupplierDatePicker && (
        <DatePickerPopup
          initialDate={supplierInvoiceDate ?? new Date().toISOString().split("T")[0]}
          onClose={() => setShowSupplierDatePicker(false)}
          onConfirm={onSupplierInvoiceDateChange!}
          label="Supplier Invoice Date"
        />
      )}
    </>
  );
}
```

---

## File: `transactions/components/VoucherTypeTabs.tsx`

```
// NOTE: This component is no longer used in Vouchers.tsx — the voucher type
// switcher is now the inline RightSidebar (F4–F9 buttons). Keep this file
// only if other screens still import it; otherwise safe to delete.

interface Props {
  activeType: string;
  onChange: (type: string) => void;
}

const TYPES = ["Receipt", "Payment", "Contra", "Journal", "Sales", "Purchase"];

export default function VoucherTypeTabs({ activeType, onChange }: Props) {
  return (
    <div className="flex border-b border-black">
      {TYPES.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-4 py-1 text-sm font-medium border-r border-gray-300 transition-colors ${
            activeType === t
              ? "bg-black text-white"
              : "bg-white text-black hover:bg-gray-100"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
```

---

## File: `transactions/Daybook.tsx`

```
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useCompany } from "../../context/CompanyContext";
import type { VoucherRecordType } from "../../types/api";
import { PageTitleBar, RightActionPanel } from "../../components/ui";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatDateDisplay = (dateStr: string | undefined): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}-${monthNames[d.getMonth()]}-${String(d.getFullYear())}`;
};

export default function Daybook() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const [entries, setEntries] = useState<VoucherRecordType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Selected Voucher details drawer
  const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);
  const [, setLoadingVoucher] = useState<boolean>(false);

  // Metadata for mapping IDs to names
  const [allGodowns, setAllGodowns] = useState<any[]>([]);
  const [allUnits, setAllUnits] = useState<any[]>([]);

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const fetchDaybook = useCallback(async () => {
    if (!companyId || !fyId) return;
    setLoading(true);
    try {
      const data = await window.api.voucher.getDaybook(companyId, fyId);
      const vouchers = (data as any)?.vouchers || data || [];
      const list = Array.isArray(vouchers) ? vouchers : [];
      setEntries(list);
    } catch (err) {
      console.error("Failed to fetch daybook:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId]);

  useEffect(() => {
    fetchDaybook();
  }, [fetchDaybook]);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        navigate("/transactions/vouchers");
      }
      if (e.altKey && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        navigate("/transactions/voucher-list");
      }
      if (e.altKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        navigate("/utilities/banking");
      }
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/");
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [navigate]);

  const daybookActions = [
    { key: "Alt+C", label: "New Voucher", onClick: () => navigate("/transactions/vouchers") },
    { key: "Alt+V", label: "Voucher Reg", onClick: () => navigate("/transactions/voucher-list") },
    { key: "Alt+B", label: "Banking", onClick: () => navigate("/utilities/banking") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/") },
  ];

  // Load godowns & units metadata
  useEffect(() => {
    if (!companyId) return;
    async function loadMetadata() {
      try {
        const [godRes, unitRes] = await Promise.all([
          window.api.godown.getAll(companyId),
          window.api.unit.getAll(companyId),
        ]);
        if (godRes.success) setAllGodowns(godRes.godowns || []);
        if (unitRes.success) setAllUnits(unitRes.units || []);
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    }
    loadMetadata();
  }, [companyId]);

  const handleRowClick = async (voucherId: number) => {
    setLoadingVoucher(true);
    try {
      const res = await window.api.voucher.getById(voucherId);
      if (res.success && res.voucher) {
        setSelectedVoucher(res.voucher);
      } else {
        alert(res.error || "Failed to load voucher details");
      }
    } catch (err) {
      console.error("Failed to fetch voucher by ID:", err);
    } finally {
      setLoadingVoucher(false);
    }
  };

  const handleCancelVoucher = async (voucherId: number) => {
    if (!window.confirm("Are you sure you want to cancel this voucher? This cannot be undone.")) return;
    try {
      const res = await window.api.voucher.cancel(voucherId);
      if (res.success) {
        setSelectedVoucher(null);
        fetchDaybook();
      } else {
        alert(res.error || "Failed to cancel voucher");
      }
    } catch (err) {
      console.error("Failed to cancel voucher:", err);
    }
  };

  const grandTotal = useMemo(() => {
    if (!selectedVoucher) return 0;
    // For single entry or journal, total is the sum of Dr entries
    if (selectedVoucher.entries && selectedVoucher.entries.length > 0) {
      if (["Sales", "Purchase"].includes(selectedVoucher.voucher_type)) {
        const partyEntry = selectedVoucher.entries.find((e: any) =>
          selectedVoucher.voucher_type === "Sales" ? e.type === "Dr" : e.type === "Cr"
        );
        if (partyEntry) return partyEntry.amount;
      }
      return selectedVoucher.entries.reduce((sum: number, e: any) => {
        if (selectedVoucher.voucher_type === "Payment") {
          return e.type === "Dr" ? sum + e.amount : sum;
        } else if (selectedVoucher.voucher_type === "Receipt") {
          return e.type === "Cr" ? sum + e.amount : sum;
        } else if (selectedVoucher.voucher_type === "Contra") {
          return e.type === "Cr" ? sum + e.amount : sum;
        }
        return e.type === "Dr" ? sum + e.amount : sum;
      }, 0);
    }
    return 0;
  }, [selectedVoucher]);

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 select-none text-xs relative overflow-hidden">
      
      {/* Title Bar */}
      <PageTitleBar title="Day Book" subtitle={selectedCompany?.name} />

      {/* Main Body Layout */}
      <div className="flex-1 flex min-h-0">
        
        {/* Left Side: Daybook list */}
        <div className="flex-1 flex flex-col min-w-0 p-4 overflow-y-auto">
          <div className="max-w-6xl w-full mx-auto flex flex-col h-full">
          
          <div className="mb-3 flex justify-between items-center">
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              Daily Transactions List
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">Financial Period</span>
              <span className="text-xs font-bold text-zinc-800">
                {activeFY?.start_date ? formatDateDisplay(activeFY.start_date) : "—"} to {activeFY?.end_date ? formatDateDisplay(activeFY.end_date) : "—"}
              </span>
            </div>
          </div>

          <div className="bg-white rounded border border-zinc-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
            {/* Table Header */}
            <div className="grid grid-cols-12 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-zinc-500 font-bold uppercase tracking-wider text-[10px] select-none shrink-0">
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Voucher Type</div>
              <div className="col-span-2">Voucher No.</div>
              <div className="col-span-3">Particulars (Party Name)</div>
              <div className="col-span-3 text-right">Narration</div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 min-h-0 bg-white">
              {loading && (
                <div className="p-8 text-center text-zinc-400 italic">Loading daybook entries...</div>
              )}
              {!loading && entries.length === 0 && (
                <div className="p-12 text-center text-zinc-400 italic flex flex-col items-center justify-center gap-2">
                  <span>No vouchers found in this financial year.</span>
                  <Link to="/transactions/vouchers" className="text-xs text-zinc-900 font-bold underline hover:text-zinc-700">Create Voucher</Link>
                </div>
              )}
              {!loading && entries.map((entry) => (
                <div
                  key={entry.voucher_id}
                  onClick={() => entry.voucher_id && handleRowClick(entry.voucher_id)}
                  className="grid grid-cols-12 items-center px-4 py-2 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors min-h-[36px]"
                >
                  <div className="col-span-2">{formatDateDisplay(entry.date)}</div>
                  <div className="col-span-2 font-semibold">{entry.voucher_type}</div>
                  <div className="col-span-2 font-bold">{entry.voucher_number}</div>
                  <div className="col-span-3 truncate font-semibold">{entry.party_name || "—"}</div>
                  <div className="col-span-3 text-right truncate opacity-75">{entry.narration || "—"}</div>
                </div>
              ))}
            </div>

            {/* Footer Summary */}
            <div className="px-4 py-2 border-t border-zinc-200 bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between items-center select-none shrink-0">
              <span>Total Transactions: {entries.length}</span>
              <span>&bull; End of Daybook</span>
            </div>
          </div>

        </div>
      </div>

      {/* Right Side: Action Panel */}
      <RightActionPanel actions={daybookActions} />
    </div>

      {/* Glassmorphism Backdrop Overlay for Drawer */}
      {selectedVoucher && (
        <div
          className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs z-40 transition-opacity animate-fade-in"
          onClick={() => setSelectedVoucher(null)}
        />
      )}

      {/* Premium Slide-Over Details Drawer */}
      {selectedVoucher && (
        <div className="fixed inset-y-0 right-0 w-[550px] bg-white shadow-2xl border-l border-zinc-200 z-50 flex flex-col animate-slide-left text-xs text-zinc-800">
          
          {/* Drawer Header */}
          <div className="bg-zinc-900 text-white px-4 py-3 flex justify-between items-center shadow-md shrink-0 select-none">
            <div className="flex flex-col">
              <span className="uppercase tracking-wider font-bold text-xs">{selectedVoucher.voucher_type} Voucher Details</span>
              <span className="text-[10px] text-zinc-400 mt-0.5">Voucher No. {selectedVoucher.voucher_number}</span>
            </div>
            <button
              onClick={() => setSelectedVoucher(null)}
              className="text-zinc-400 hover:text-white text-lg font-bold font-sans transition-colors"
            >
              &times;
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-white">
            
            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 gap-3 p-3 border border-zinc-100 bg-zinc-50/50 rounded">
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-20 text-zinc-400">Date</span>
                  <span className="font-semibold">{formatDateDisplay(selectedVoucher.date)}</span>
                </div>
                <div className="flex">
                  <span className="w-20 text-zinc-400">Ref No.</span>
                  <span>{selectedVoucher.reference_number || "—"}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-20 text-zinc-400">Supply State</span>
                  <span className="font-semibold">{selectedVoucher.place_of_supply || "—"}</span>
                </div>
                {selectedVoucher.party_name && (
                  <div className="flex">
                    <span className="w-20 text-zinc-400">Party</span>
                    <span className="font-semibold truncate">{selectedVoucher.party_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Inventory Stock Entries (If applicable) */}
            {selectedVoucher.stock_entries && selectedVoucher.stock_entries.length > 0 && (
              <div className="border border-zinc-200 rounded overflow-hidden">
                <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-1.5 font-bold uppercase text-[9px] text-zinc-500 tracking-wider">
                  Inventory Stock Particulars
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50/40 border-b border-zinc-100 text-[9px] uppercase text-zinc-400 font-bold font-sans">
                      <th className="px-3 py-1.5">Item Name</th>
                      <th className="px-2 py-1.5">Godown</th>
                      <th className="px-2 py-1.5 text-right">Quantity</th>
                      <th className="px-2 py-1.5 text-right">Rate</th>
                      <th className="px-3 py-1.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {selectedVoucher.stock_entries.map((item: any, idx: number) => {
                      const godownName = allGodowns.find(g => g.godown_id === item.godown_id)?.name || "Main Location";
                      const unitSymbol = allUnits.find(u => u.unit_id === item.unit_id)?.symbol || "Nos";
                      return (
                        <tr key={idx} className="hover:bg-zinc-50/30">
                          <td className="px-3 py-2 font-semibold text-zinc-900">{item.item_name}</td>
                          <td className="px-2 py-2 text-zinc-500">{godownName}</td>
                          <td className="px-2 py-2 text-right">{item.quantity.toFixed(2)} {unitSymbol}</td>
                          <td className="px-2 py-2 text-right">{(item.rate || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-bold">{(item.amount || 0).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Accounting Ledger Entries (Double-Entry matrix) */}
            <div className="border border-zinc-200 rounded overflow-hidden">
              <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-1.5 font-bold uppercase text-[9px] text-zinc-500 tracking-wider">
                Accounting Double-Entry Details
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50/40 border-b border-zinc-100 text-[9px] uppercase text-zinc-400 font-bold font-sans">
                    <th className="px-3 py-1.5 text-center w-12">Dr/Cr</th>
                    <th className="px-3 py-1.5">Ledger Name</th>
                    <th className="px-3 py-1.5 text-right">Debit (Dr)</th>
                    <th className="px-3 py-1.5 text-right">Credit (Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {selectedVoucher.entries && selectedVoucher.entries.map((entry: any, idx: number) => (
                    <tr key={idx} className="hover:bg-zinc-50/30">
                      <td className={`px-3 py-2 text-center font-bold ${entry.type === 'Dr' ? 'text-blue-700 bg-blue-50/10' : 'text-red-700 bg-red-50/10'}`}>
                        {entry.type}
                      </td>
                      <td className="px-3 py-2 font-semibold text-zinc-900">{entry.ledger_name}</td>
                      <td className="px-3 py-2 text-right font-bold text-zinc-800">
                        {entry.type === 'Dr' ? (entry.amount || 0).toFixed(2) : ""}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-zinc-800">
                        {entry.type === 'Cr' ? (entry.amount || 0).toFixed(2) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Grand Total & Narration block */}
            <div className="space-y-2 border-t border-zinc-100 pt-3">
              <div className="flex justify-between items-center p-3 border border-zinc-200 rounded bg-zinc-50">
                <span className="font-bold text-zinc-600 uppercase tracking-wider">Grand Total (INR) :</span>
                <span className="text-sm font-bold text-zinc-950">
                  {grandTotal.toFixed(2)}
                </span>
              </div>

              <div className="p-3 border border-zinc-100 rounded bg-zinc-50/20">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">Narration Remarks</span>
                <p className="text-zinc-700 italic font-medium break-words">
                  {selectedVoucher.narration || "No narration remarks recorded for this transaction."}
                </p>
              </div>
            </div>

          </div>

          {/* Drawer Footer Actions */}
          <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center gap-2 shrink-0 select-none">
            <button
              onClick={() => handleCancelVoucher(selectedVoucher.voucher_id)}
              className="text-xs text-red-600 hover:text-red-800 font-bold bg-red-50 hover:bg-red-100 border border-red-200 px-4 py-2 rounded transition-colors uppercase font-sans tracking-wide"
            >
              Cancel Voucher
            </button>
            <button
              onClick={() => setSelectedVoucher(null)}
              className="text-xs text-zinc-700 hover:text-zinc-950 font-bold bg-white hover:bg-zinc-100 border border-zinc-300 px-5 py-2 rounded transition-colors uppercase font-sans tracking-wide shadow-sm"
            >
              Close Details
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
```

---

## File: `transactions/hooks/useVoucherForm.ts`

```
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useCompany } from "../../../context/CompanyContext";
import { loadFormState, saveFormState, clearFormState } from "../../../utils/formPersistence";
import type { LedgerType, GroupType, StockItemType, GodownType, UnitType } from "../../../types/api";

// ─── ID factory ───────────────────────────────────────────────────────────────

let idCounter = 0;
const nextId = () => `row_${++idCounter}_${Date.now()}`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParticularRow {
  id: string;
  type: "Dr" | "Cr";
  ledger: LedgerType | null;
  ledgerBalance: string;
  amountRaw: string;
  costCentres?: { cost_centre_id: number; amount: number }[];
  billReferences?: {
    bill_name: string;
    bill_type: "New Ref" | "Agst Ref" | "Advance" | "On Account";
    amount: number;
    credit_period?: string;
  }[];
}

export interface StockEntryRow {
  id: string;
  stockItem: StockItemType | null;
  godown: GodownType | null;
  unit: UnitType | null;
  quantityRaw: string;
  rateRaw: string;
  amountRaw: string;
}

export type ActiveField =
  | { type: "account" }
  | { type: "party" }
  | { type: "salesPurchase" }
  | { type: "particular"; rowId: string }
  | { type: "additional"; rowId: string }
  | { type: "stockItem"; rowId: string }
  | { type: "stockGodown"; rowId: string };

export type ActiveAllocation =
  | {
      type: "billWise";
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialAllocations?: any[];
    }
  | {
      type: "billWiseParty";
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialAllocations?: any[];
    }
  | {
      type: "costCentre";
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialAllocations?: any[];
    }
    | {
      type: "bankDetails";
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialDetails?: any;
    }
    | {
      type: "cashDenomination";
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialDetails?: any;
    }
  | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const formatDateDisplay = (dateStr: string | undefined): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}-${MONTH_NAMES[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};

const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

// ─── Default row factories ────────────────────────────────────────────────────

const makeParticularRow = (type: "Dr" | "Cr" = "Dr"): ParticularRow => ({
  id: nextId(),
  type,
  ledger: null,
  ledgerBalance: "",
  amountRaw: "",
});

const makeStockRow = (): StockEntryRow => ({
  id: nextId(),
  stockItem: null,
  godown: null,
  unit: null,
  quantityRaw: "",
  rateRaw: "",
  amountRaw: "",
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoucherForm() {
  const { selectedCompany, activeFY } = useCompany();

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const persistKey = companyId ? `voucherForm_${companyId}` : null;

  // Tracks whether the first render has passed so auto-save doesn't overwrite
  // the just-restored state on mount.
  const hasRestored = useRef(false);

  // ── Voucher meta ────────────────────────────────────────────────────────────

  const [voucherType, setVoucherType] = useState<string>(
    () => loadFormState<any>(persistKey ?? "")?.voucherType ?? "Receipt"
  );
  const [voucherNumber, setVoucherNumber] = useState<string>("1");
  const [voucherNumberLoading, setVoucherNumberLoading] = useState(true);
  const [date, setDate] = useState<string>(todayStr());
  const [status, setStatus] = useState<"Regular" | "Post-Dated">("Regular");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState<string>("");
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState<string>("");
  const [narration, setNarration] = useState<string>(
    () => loadFormState<any>(persistKey ?? "")?.narration ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Advanced allocation state ───────────────────────────────────────────────

  const [activeAllocation, setActiveAllocation] = useState<ActiveAllocation>(null);
  const [partyBillReferences, setPartyBillReferences] = useState<any[]>(
    () => loadFormState<any>(persistKey ?? "")?.partyBillReferences ?? []
  );
  const [bankDetails, setBankDetails] = useState<any | null>(
    () => loadFormState<any>(persistKey ?? "")?.bankDetails ?? null
  );
  const [cashDenominations, setCashDenominations] = useState<any | null>(null);

  // ── Reference / invoice fields ──────────────────────────────────────────────

  const [referenceNumber, setReferenceNumber] = useState<string>(
    () => loadFormState<any>(persistKey ?? "")?.referenceNumber ?? ""
  );
  const [referenceDate, setReferenceDate] = useState<string>(todayStr());
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(
    () => loadFormState<any>(persistKey ?? "")?.placeOfSupply ?? "Select"
  );

  // ── Master data ─────────────────────────────────────────────────────────────

  const [allLedgers, setAllLedgers] = useState<LedgerType[]>([]);
  const [allGroups, setAllGroups] = useState<GroupType[]>([]);
  const [allStockItems, setAllStockItems] = useState<StockItemType[]>([]);
  const [allGodowns, setAllGodowns] = useState<GodownType[]>([]);
  const [allUnits, setAllUnits] = useState<UnitType[]>([]);
  const [ledgersLoading, setLedgersLoading] = useState(false);

  // ── Search / active field ───────────────────────────────────────────────────

  const [ledgerSearchTerm, setLedgerSearchTerm] = useState("");
  const [stockSearchTerm, setStockSearchTerm] = useState("");
  const [activeField, setActiveField] = useState<ActiveField | null>(null);

  // ── Layout 1: Single-entry  (Receipt F6 · Payment F5 · Contra F4) ──────────
  //
  //   ACCOUNT field  = cash/bank side  (the "one" side in single-entry)
  //     Receipt  → Account is Dr  (money comes IN to cash/bank)
  //     Payment  → Account is Cr  (money goes OUT from cash/bank)
  //     Contra   → Account is Cr  (source side, e.g. withdraw from bank)
  //
  //   PARTICULARS rows = opposite side
  //     Receipt  → all rows are Cr  (the income/party being receipted from)
  //     Payment  → all rows are Dr  (the expense/party being paid to)
  //     Contra   → all rows are Dr  (destination side, e.g. cash-in-hand)

  const [accountLedger, setAccountLedger] = useState<LedgerType | null>(
    () => loadFormState<any>(persistKey ?? "")?.accountLedger ?? null
  );
  const [accountBalance, setAccountBalance] = useState<string>("");

  const [particulars, setParticulars] = useState<ParticularRow[]>(() => {
    const saved = loadFormState<any>(persistKey ?? "");
    return saved?.particulars?.length ? saved.particulars : [makeParticularRow("Cr")];
  });

  const [contraEntryMode, setContraEntryMode] = useState<"single" | "double">(
    () => loadFormState<any>(persistKey ?? "")?.contraEntryMode ?? "single"
  );

  // ── Layout 1b: Double-entry Contra (F4 double-entry mode) ────────────────

  const [contraDoubleRows, setContraDoubleRows] = useState<ParticularRow[]>(() => {
    const saved = loadFormState<any>(persistKey ?? "");
    return saved?.contraDoubleRows?.length
      ? saved.contraDoubleRows
      : [makeParticularRow("Dr"), makeParticularRow("Cr")];
  });

  const [journalRows, setJournalRows] = useState<ParticularRow[]>(() => {
    const saved = loadFormState<any>(persistKey ?? "");
    return saved?.journalRows?.length
      ? saved.journalRows
      : [makeParticularRow("Dr"), makeParticularRow("Cr")];
  });

  // ── Layout 3: Inventory invoice (Sales F8 · Purchase F9) ──────────────────
  //
  //   Sales:    Party Dr (total)  ·  Sales Cr (subtotal)  ·  Tax Cr (each tax)
  //   Purchase: Party Cr (total)  ·  Purchase Dr (subtotal)  ·  Tax Dr (each tax)

  const [partyLedger, setPartyLedger] = useState<LedgerType | null>(
    () => loadFormState<any>(persistKey ?? "")?.partyLedger ?? null
  );
  const [partyBalance, setPartyBalance] = useState<string>("");

  const [salesPurchaseLedger, setSalesPurchaseLedger] = useState<LedgerType | null>(
    () => loadFormState<any>(persistKey ?? "")?.salesPurchaseLedger ?? null
  );
  const [salesPurchaseBalance, setSalesPurchaseBalance] = useState<string>("");

  const [stockEntries, setStockEntries] = useState<StockEntryRow[]>(() => {
    const saved = loadFormState<any>(persistKey ?? "");
    return saved?.stockEntries?.length ? saved.stockEntries : [makeStockRow()];
  });

  // additionalEntries = tax ledgers, discounts, freight, etc.
  // Sales default: Cr  (tax collected is a liability/output)
  // Purchase default: Dr  (tax paid is an asset/input credit)
  const [additionalEntries, setAdditionalEntries] = useState<ParticularRow[]>(
    () => loadFormState<any>(persistKey ?? "")?.additionalEntries ?? []
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Persistence snapshot
  // ─────────────────────────────────────────────────────────────────────────────

  const getSnapshot = useCallback(
    () => ({
      voucherType,
      narration,
      accountLedger,
      particulars,
      journalRows,
      contraEntryMode,
      contraDoubleRows,
      partyLedger,
      salesPurchaseLedger,
      stockEntries,
      additionalEntries,
      referenceNumber,
      placeOfSupply,
      partyBillReferences,
      bankDetails,
      supplierInvoiceNo,
      supplierInvoiceDate,
    }),
    [
      voucherType, narration, accountLedger, particulars, journalRows,
      contraEntryMode, contraDoubleRows,
      partyLedger, salesPurchaseLedger, stockEntries, additionalEntries,
      referenceNumber, placeOfSupply, partyBillReferences, bankDetails,
      supplierInvoiceNo, supplierInvoiceDate,
    ]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Data fetching
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchContextData = useCallback(async () => {
    if (!companyId) return;
    setLedgersLoading(true);
    try {
      const [ledRes, grpRes, itemRes, godRes, unitRes] = await Promise.all([
        window.api.ledger.getAll(companyId),
        window.api.group.getAll(companyId),
        window.api.stockItem.getAll(companyId),
        window.api.godown.getAll(companyId),
        window.api.unit.getAll(companyId),
      ]);
      if (ledRes.success) setAllLedgers((ledRes as any).ledgers ?? []);
      if (grpRes.success) setAllGroups((grpRes as any).groups ?? []);
      if (itemRes.success) setAllStockItems((itemRes as any).stockItems ?? []);
      if (godRes.success) setAllGodowns((godRes as any).godowns ?? []);
      if (unitRes.success) setAllUnits((unitRes as any).units ?? []);
    } catch {
      // silently ignore — user can retry
    } finally {
      setLedgersLoading(false);
    }
  }, [companyId]);

  const fetchNextNumber = useCallback(async () => {
    if (!companyId || !fyId) return;
    setVoucherNumberLoading(true);
    try {
      const res = await window.api.voucher.getNextNumber(companyId, fyId, voucherType);
      if (res.success && res.voucher_number) {
        setVoucherNumber(String(res.voucher_number));
      }
    } catch {
      // ignore
    } finally {
      setVoucherNumberLoading(false);
    }
  }, [companyId, fyId, voucherType]);

  const fetchLedgerBalance = useCallback(
    async (ledgerId: number): Promise<string> => {
      if (!companyId || !fyId) return "";
      try {
        const res = await window.api.voucher.getLedgerBalance(ledgerId, companyId, fyId);
        if (res.success && res.balance != null) return String(res.balance);
      } catch {
        // ignore
      }
      return "";
    },
    [companyId, fyId]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchContextData();
    fetchNextNumber();
  }, [fetchContextData, fetchNextNumber]);

  // Auto-save — skip the very first render (restoration just happened)
  useEffect(() => {
    if (!persistKey) return;
    if (!hasRestored.current) {
      hasRestored.current = true;
      return;
    }
    saveFormState(persistKey, getSnapshot());
  }, [persistKey, getSnapshot]);

  // Reset when voucher type changes (via stable ref to avoid circular deps)
  const resetFormRef = useRef<() => void>(() => {});
  const prevVoucherType = useRef(voucherType);
  useEffect(() => {
    if (prevVoucherType.current !== voucherType) {
      prevVoucherType.current = voucherType;
      resetFormRef.current?.();
    }
  }, [voucherType]);

  // Balance sync helpers
  useEffect(() => {
    if (accountLedger?.ledger_id) {
      fetchLedgerBalance(accountLedger.ledger_id).then(setAccountBalance);
    } else {
      setAccountBalance("");
    }
  }, [accountLedger, fetchLedgerBalance]);

  useEffect(() => {
    if (partyLedger?.ledger_id) {
      fetchLedgerBalance(partyLedger.ledger_id).then(setPartyBalance);
    } else {
      setPartyBalance("");
    }
  }, [partyLedger, fetchLedgerBalance]);

  useEffect(() => {
    if (salesPurchaseLedger?.ledger_id) {
      fetchLedgerBalance(salesPurchaseLedger.ledger_id).then(setSalesPurchaseBalance);
    } else {
      setSalesPurchaseBalance("");
    }
  }, [salesPurchaseLedger, fetchLedgerBalance]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Group / cash-bank helpers
  // ─────────────────────────────────────────────────────────────────────────────

  /** Walk the group hierarchy to check if a ledger belongs to any of the named groups. */
  const checkLedgerGroup = useCallback(
    (ledger: LedgerType | null, targetGroupNames: string[]): boolean => {
      if (!ledger) return false;
      const ledgerGroupId = ledger.group_id;
      if (!ledgerGroupId) return false;
      if (allGroups.length === 0) return false;

      const targets = targetGroupNames.map((n) => n.toLowerCase().trim());

      const findGroup = (id: number | null | undefined): GroupType | undefined => {
        if (!id) return undefined;
        return allGroups.find((g) => Number(g.group_id) === Number(id));
      };

      const check = (grp: GroupType): boolean => {
        if (!grp.name) return false;
        if (targets.includes(grp.name.toLowerCase().trim())) return true;
        if (grp.parent_group_id) {
          const parent = findGroup(grp.parent_group_id);
          if (parent) return check(parent);
        }
        return false;
      };

      const group = findGroup(ledgerGroupId);
      return group ? check(group) : false;
    },
    [allGroups]
  );

  const checkIsCashOrBank = useCallback(
    (ledger: LedgerType | null): boolean =>
      checkLedgerGroup(ledger, [
        "bank accounts",
        "bank od accounts",
        "bank od a/c",
        "bank od account",
        "cash-in-hand",
      ]),
    [checkLedgerGroup]
  );

  const checkIsCash = useCallback(
    (ledger: LedgerType | null): boolean =>
      checkLedgerGroup(ledger, ["cash-in-hand"]),
    [checkLedgerGroup]
  );

  const checkIsBank = useCallback(
    (ledger: LedgerType | null): boolean =>
      checkLedgerGroup(ledger, [
        "bank accounts",
        "bank od accounts",
        "bank od a/c",
        "bank od account",
      ]),
    [checkLedgerGroup]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Particulars Dr/Cr derivation (single-entry layouts)
  //
  // In single-entry mode:
  //   Receipt  → Particulars are ALWAYS Cr  (income / party side)
  //   Payment  → Particulars are ALWAYS Dr  (expense / party side)
  //   Contra   → Particulars are ALWAYS Dr  (destination cash/bank)
  //
  // The Account field carries the opposite type automatically (see submit logic).
  // We do NOT check cash/bank group here — that was the old bug. The group check
  // is only needed to filter which ledgers appear in the Account field selector.
  // ─────────────────────────────────────────────────────────────────────────────

  const deriveParticularType = useCallback(
    (currentType: "Dr" | "Cr"): "Dr" | "Cr" => {
      if (voucherType === "Receipt") return "Cr";
      if (voucherType === "Payment") return "Dr";
      if (voucherType === "Contra") return "Dr"; // destination side
      return currentType; // Journal / Sales / Purchase — keep as-is
    },
    [voucherType]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Computed totals
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * debitTotal / creditTotal
   *
   * For Journal: sum Dr rows / sum Cr rows from journalRows.
   * For Receipt/Payment/Contra: the Particulars rows are ALL one side (Cr for Receipt,
   *   Dr for Payment/Contra). The Account field supplies the opposite side. So:
   *     debitTotal  = Account amount  (for Receipt)  OR  particulars sum  (for Payment/Contra)
   *     creditTotal = particulars sum (for Receipt)  OR  Account amount   (for Payment/Contra)
   *   But for the "balanced" indicator we just need the two sides to match.
   *   We compute particularsTotal separately and compare to accountAmount.
   */

  /** Sum of all amounts in the Particulars rows (single-entry layouts). */
  const particularsTotal = useMemo(
    () => particulars.reduce((s, p) => s + (Number(p.amountRaw) || 0), 0),
    [particulars]
  );

  /** Sum of all Dr amounts in journalRows or contraDoubleRows. */
  const debitTotal = useMemo(() => {
    if (voucherType === "Journal") {
      return journalRows.reduce(
        (sum, r) => sum + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    if (voucherType === "Contra" && contraEntryMode === "double") {
      return contraDoubleRows.reduce(
        (sum, r) => sum + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    // Receipt: Account is Dr; Payment/Contra: particulars are Dr
    return particularsTotal;
  }, [voucherType, journalRows, contraDoubleRows, contraEntryMode, particularsTotal]);

  /** Sum of all Cr amounts in journalRows or contraDoubleRows. */
  const creditTotal = useMemo(() => {
    if (voucherType === "Journal") {
      return journalRows.reduce(
        (sum, r) => sum + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    if (voucherType === "Contra" && contraEntryMode === "double") {
      return contraDoubleRows.reduce(
        (sum, r) => sum + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    // Mirror of debitTotal for single-entry
    return particularsTotal;
  }, [voucherType, journalRows, contraDoubleRows, contraEntryMode, particularsTotal]);

  /**
   * totalAmount — the grand total shown in the voucher footer and used for
   * the Account field amount and the party ledger entry in Sales/Purchase.
   *
   * Receipt / Payment / Contra:
   *   = sum of Particulars rows  (Account leg always equals this when balanced)
   *
   * Journal:
   *   = debitTotal  (Dr side; equals creditTotal when balanced)
   *
   * Sales / Purchase:
   *   stockSubtotal + adjustments
   *   Sales:    Cr entries (taxes) add to party receivable; Dr entries (discounts) reduce it
   *   Purchase: Dr entries (taxes/charges) add to party payable; Cr entries (discounts) reduce it
   */
  const totalAmount = useMemo(() => {
    if (["Receipt", "Payment"].includes(voucherType)) {
      return particularsTotal;
    }

    if (voucherType === "Contra") {
      if (contraEntryMode === "double") {
        return debitTotal; // same as creditTotal when balanced
      }
      return particularsTotal;
    }

    if (voucherType === "Journal") {
      return debitTotal;
    }

    if (voucherType === "Sales" || voucherType === "Purchase") {
      const stockSum = stockEntries.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0);
      const adjSum = additionalEntries.reduce((s, r) => {
        const amt = Number(r.amountRaw) || 0;
        // Sales:    Cr = tax/charge adds (+), Dr = discount/deduction subtracts (-)
        // Purchase: Dr = tax/charge adds (+), Cr = discount/deduction subtracts (-)
        if (voucherType === "Sales") return r.type === "Cr" ? s + amt : s - amt;
        return r.type === "Dr" ? s + amt : s - amt;
      }, 0);
      return Math.max(0, stockSum + adjSum);
    }

    return 0;
  }, [voucherType, particularsTotal, debitTotal, contraEntryMode, stockEntries, additionalEntries]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Particular row handlers (single-entry layouts)
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddParticularRow = useCallback(() => {
    setParticulars((prev) => [
      ...prev,
      makeParticularRow(
        // New rows always get the correct side for the active voucher type
        voucherType === "Receipt" ? "Cr"
        : voucherType === "Payment" ? "Dr"
        : "Dr" // Contra
      ),
    ]);
  }, [voucherType]);

  const handleUpdateParticularRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setParticulars((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const next = { ...p, ...updates };
          // When a ledger is selected, enforce the correct Dr/Cr for this voucher type
          if (updates.ledger !== undefined) {
            next.type = deriveParticularType(p.type);
          }
          return next;
        })
      );

      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setParticulars((prev) =>
          prev.map((p) => (p.id !== id ? p : { ...p, ledgerBalance: bal }))
        );
      }
    },
    [deriveParticularType, fetchLedgerBalance]
  );

  const handleRemoveParticularRow = useCallback((id: string) => {
    setParticulars((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Journal row handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddJournalRow = useCallback(() => {
    setJournalRows((prev) => {
      // Alternate Dr/Cr to help the user build a balanced entry
      const lastType = prev[prev.length - 1]?.type ?? "Dr";
      const nextType: "Dr" | "Cr" = lastType === "Dr" ? "Cr" : "Dr";
      return [...prev, makeParticularRow(nextType)];
    });
  }, []);

  const handleUpdateJournalRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setJournalRows((prev) =>
        prev.map((r) => (r.id !== id ? r : { ...r, ...updates }))
      );
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setJournalRows((prev) =>
          prev.map((r) => (r.id !== id ? r : { ...r, ledgerBalance: bal }))
        );
      }
    },
    [fetchLedgerBalance]
  );

  const handleRemoveJournalRow = useCallback((id: string) => {
    setJournalRows((prev) => (prev.length > 2 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Contra double-entry row handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddContraDoubleRow = useCallback(() => {
    setContraDoubleRows((prev) => {
      const lastType = prev[prev.length - 1]?.type ?? "Dr";
      const nextType: "Dr" | "Cr" = lastType === "Dr" ? "Cr" : "Dr";
      return [...prev, makeParticularRow(nextType)];
    });
  }, []);

  const handleUpdateContraDoubleRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setContraDoubleRows((prev) =>
        prev.map((r) => (r.id !== id ? r : { ...r, ...updates }))
      );
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setContraDoubleRows((prev) =>
          prev.map((r) => (r.id !== id ? r : { ...r, ledgerBalance: bal }))
        );
      }
    },
    [fetchLedgerBalance]
  );

  const handleRemoveContraDoubleRow = useCallback((id: string) => {
    setContraDoubleRows((prev) => (prev.length > 2 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Stock entry handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddStockRow = useCallback(() => {
    setStockEntries((prev) => [...prev, makeStockRow()]);
  }, []);

  const handleUpdateStockRow = useCallback(
    async (id: string, updates: Partial<Omit<StockEntryRow, "id">>) => {
      setStockEntries((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, ...updates };
          // Auto-compute amount whenever quantity or rate changes
          if (updates.quantityRaw !== undefined || updates.rateRaw !== undefined) {
            const qty = Number(updated.quantityRaw) || 0;
            const rate = Number(updated.rateRaw) || 0;
            updated.amountRaw = qty > 0 && rate > 0 ? (qty * rate).toFixed(2) : "";
          }
          return updated;
        })
      );
    },
    []
  );

  const handleRemoveStockRow = useCallback((id: string) => {
    setStockEntries((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Additional ledger row handlers (Sales/Purchase taxes & adjustments)
  //
  //   Sales default    → Cr  (tax collected = output liability, adds to party receivable)
  //   Purchase default → Dr  (tax paid = input credit asset, adds to party payable)
  //
  //   User can flip to the opposite type to record discounts / contra-adjustments.
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddAdditionalRow = useCallback(() => {
    setAdditionalEntries((prev) => [
      ...prev,
      makeParticularRow(voucherType === "Sales" ? "Cr" : "Dr"),
    ]);
  }, [voucherType]);

  const handleUpdateAdditionalRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setAdditionalEntries((prev) =>
        prev.map((p) => (p.id !== id ? p : { ...p, ...updates }))
      );
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setAdditionalEntries((prev) =>
          prev.map((p) => (p.id !== id ? p : { ...p, ledgerBalance: bal }))
        );
      }
    },
    [fetchLedgerBalance]
  );

  const handleRemoveAdditionalRow = useCallback((id: string) => {
    setAdditionalEntries((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Active field / search panel
  // ─────────────────────────────────────────────────────────────────────────────

  const handleFieldFocus = useCallback(
    (field: ActiveField) => {
      setActiveField(field);
      setLedgerSearchTerm("");
      setStockSearchTerm("");
    },
    []
  );

  const handleFieldBlur = useCallback(() => {
    setActiveField(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Universal selection handler
  // ─────────────────────────────────────────────────────────────────────────────

  const handleLedgerPanelSelect = useCallback(
    (item: any) => {
      if (!activeField) return;

      switch (activeField.type) {
        case "account":
          setAccountLedger(item as LedgerType);
          break;

        case "party":
          setPartyLedger(item as LedgerType);
          break;

        case "salesPurchase":
          setSalesPurchaseLedger(item as LedgerType);
          break;

        case "particular": {
          const ledger = item as LedgerType;
          if (voucherType === "Journal") {
            handleUpdateJournalRow(activeField.rowId, { ledger });
          } else if (voucherType === "Contra" && contraEntryMode === "double") {
            handleUpdateContraDoubleRow(activeField.rowId, { ledger });
          } else {
            handleUpdateParticularRow(activeField.rowId, { ledger });
          }
          break;
        }

        case "additional":
          handleUpdateAdditionalRow(activeField.rowId, { ledger: item as LedgerType });
          break;

        case "stockItem": {
          const stockItem = item as StockItemType;
          const matchingUnit = allUnits.find((u) => u.unit_id === stockItem.unit_id) ?? null;
          handleUpdateStockRow(activeField.rowId, { stockItem, unit: matchingUnit });
          break;
        }

        default:
          break;
      }

      setActiveField(null);
      setLedgerSearchTerm("");
      setStockSearchTerm("");
    },
    [
      activeField, voucherType, contraEntryMode, allUnits,
      handleUpdateParticularRow, handleUpdateJournalRow,
      handleUpdateContraDoubleRow,
      handleUpdateAdditionalRow, handleUpdateStockRow,
    ]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Form reset
  // ─────────────────────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    if (persistKey) clearFormState(persistKey);
    hasRestored.current = false;

    setAccountLedger(null);
    setAccountBalance("");
    setPartyLedger(null);
    setPartyBalance("");
    setSalesPurchaseLedger(null);
    setSalesPurchaseBalance("");

    // Default first row type to the correct Cr/Dr for the current voucher type
    const defaultParticular: "Dr" | "Cr" =
      voucherType === "Receipt" ? "Cr"
      : voucherType === "Payment" ? "Dr"
      : "Dr"; // Contra
    setParticulars([makeParticularRow(defaultParticular)]);
    setJournalRows([makeParticularRow("Dr"), makeParticularRow("Cr")]);
    setContraDoubleRows([makeParticularRow("Dr"), makeParticularRow("Cr")]);
    setStockEntries([makeStockRow()]);
    setAdditionalEntries([]);

    setActiveAllocation(null);
    setPartyBillReferences([]);
    setBankDetails(null);

    setReferenceNumber("");
    setNarration("");
    setError(null);
    setSuccess(null);
    setActiveField(null);
    setLedgerSearchTerm("");
    setStockSearchTerm("");
    setSupplierInvoiceNo("");
    setSupplierInvoiceDate("");
    setStatus("Regular");
    setContraEntryMode("single");
    setDate(todayStr());

    fetchNextNumber();
  }, [persistKey, voucherType, fetchNextNumber]);

  useEffect(() => {
    resetFormRef.current = resetForm;
  }, [resetForm]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────────────────────────

  const validate = useCallback((): string | null => {
    if (!companyId) return "No company selected.";
    if (!fyId) return "No active financial year.";

    if (["Receipt", "Payment"].includes(voucherType)) {
      if (!accountLedger) return "Account (cash/bank ledger) is required.";
      const filled = particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0);
      if (filled.length < 1)
        return "At least one Particulars entry with an amount is required.";
      if (particularsTotal <= 0) return "Total amount must be greater than zero.";
    }

    if (voucherType === "Contra") {
      if (contraEntryMode === "single") {
        if (!accountLedger) return "Account (cash/bank ledger) is required.";
        if (!checkIsCashOrBank(accountLedger)) {
          return "Contra Account must be a Cash or Bank ledger.";
        }
        const filled = particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0);
        if (filled.length < 1)
          return "At least one Particulars entry with an amount is required.";
        for (const row of filled) {
          if (!checkIsCashOrBank(row.ledger))
            return "Contra vouchers may only use Cash/Bank ledgers on both sides.";
        }
        if (particularsTotal <= 0) return "Total amount must be greater than zero.";
      } else {
        // Double-entry Contra
        const filled = contraDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
        if (filled.length < 2)
          return "At least two valid entries are required.";
        for (const row of filled) {
          if (!checkIsCashOrBank(row.ledger))
            return "Contra vouchers may only use Cash/Bank ledgers.";
        }
        if (Math.abs(debitTotal - creditTotal) > 0.01)
          return `Debit (${debitTotal.toFixed(2)}) and Credit (${creditTotal.toFixed(
            2
          )}) totals must balance.`;
        if (debitTotal <= 0) return "Amount must be greater than zero.";
      }
    }

    if (voucherType === "Journal") {
      const filled = journalRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
      if (filled.length < 2) return "At least two valid Journal entries are required.";
      if (Math.abs(debitTotal - creditTotal) > 0.01)
        return `Debit (${debitTotal.toFixed(2)}) and Credit (${creditTotal.toFixed(
          2
        )}) totals must balance.`;
      if (debitTotal <= 0) return "Journal amount must be greater than zero.";
    }

    if (["Sales", "Purchase"].includes(voucherType)) {
      if (!partyLedger) return "Party A/c Name is required.";
      if (!salesPurchaseLedger) return `${voucherType} Ledger is required.`;
      if (partyLedger.ledger_id === salesPurchaseLedger.ledger_id)
        return `Party and ${voucherType} ledger cannot be the same account.`;

      const filledItems = stockEntries.filter(
        (r) => r.stockItem && Number(r.quantityRaw) > 0 && Number(r.rateRaw) > 0
      );
      if (filledItems.length === 0)
        return "At least one Stock Item with quantity and rate is required.";
      if (totalAmount <= 0) return "Total amount must be greater than zero.";
    }

    return null;
  }, [
    companyId, fyId, voucherType, contraEntryMode,
    accountLedger, particulars, particularsTotal,
    contraDoubleRows, journalRows, debitTotal, creditTotal,
    stockEntries, partyLedger, salesPurchaseLedger, totalAmount,
    checkIsCashOrBank,
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let entries: any[] = [];
      let stock_entries: any[] = [];

      // ── Build accounting entries ─────────────────────────────────────────────

      if (["Receipt", "Payment"].includes(voucherType)) {
        const accountType: "Dr" | "Cr" =
          voucherType === "Receipt" ? "Dr" : "Cr";

        entries.push({
          ledger_id: accountLedger!.ledger_id,
          ledger_name: accountLedger!.name,
          type: accountType,
          amount: particularsTotal,
        });

        const filled = particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0);
        entries.push(
          ...filled.map((p) => ({
            ledger_id: p.ledger!.ledger_id,
            ledger_name: p.ledger!.name,
            type: p.type,
            amount: Number(p.amountRaw),
            currency: "INR",
            cost_centres: p.costCentres,
          }))
        );

      } else if (voucherType === "Contra") {
        if (contraEntryMode === "single") {
          const accountType: "Dr" | "Cr" = "Cr";

          entries.push({
            ledger_id: accountLedger!.ledger_id,
            ledger_name: accountLedger!.name,
            type: accountType,
            amount: particularsTotal,
          });

          const filled = particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0);
          entries.push(
            ...filled.map((p) => ({
              ledger_id: p.ledger!.ledger_id,
              ledger_name: p.ledger!.name,
              type: p.type,
              amount: Number(p.amountRaw),
              currency: "INR",
              cost_centres: p.costCentres,
            }))
          );
        } else {
          // Double-entry Contra: entries directly from rows (like Journal)
          const filled = contraDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
          entries = filled.map((r) => ({
            ledger_id: r.ledger!.ledger_id,
            ledger_name: r.ledger!.name,
            type: r.type,
            amount: Number(r.amountRaw),
            currency: "INR",
            cost_centres: r.costCentres,
          }));
        }

      } else if (voucherType === "Journal") {
        const filled = journalRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
        entries = filled.map((r) => ({
          ledger_id: r.ledger!.ledger_id,
          ledger_name: r.ledger!.name,
          type: r.type,
          amount: Number(r.amountRaw),
          currency: "INR",
          cost_centres: r.costCentres,
        }));

      } else if (["Sales", "Purchase"].includes(voucherType)) {
        //
        // Sales:
        //   Party A/c     → Dr  (total: stock + taxes − discounts)
        //   Sales ledger  → Cr  (stock subtotal only)
        //   Tax ledgers   → Cr  (each tax amount, default for additional Cr rows)
        //   Discount etc. → Dr  (each Dr additional row)
        //
        // Purchase:
        //   Purchase ledger → Dr  (stock subtotal only)
        //   Tax ledgers     → Dr  (each tax amount, default for additional Dr rows)
        //   Discount etc.   → Cr  (each Cr additional row)
        //   Party A/c       → Cr  (total: stock + taxes − discounts)
        //

        const filledItems = stockEntries.filter(
          (r) => r.stockItem && Number(r.quantityRaw) > 0 && Number(r.rateRaw) > 0
        );
        const stockSubtotal = filledItems.reduce(
          (s, r) => s + (Number(r.amountRaw) || 0),
          0
        );

        stock_entries = filledItems.map((r) => ({
          stock_item_id: r.stockItem!.item_id ?? null,
          item_name: r.stockItem!.name,
          godown_id: r.godown?.godown_id ?? null,
          unit_id: r.unit?.unit_id ?? null,
          quantity: Number(r.quantityRaw),
          rate: Number(r.rateRaw),
          amount: Number(r.amountRaw),
        }));

        const partyType: "Dr" | "Cr" = voucherType === "Sales" ? "Dr" : "Cr";
        const spType: "Dr" | "Cr" = voucherType === "Sales" ? "Cr" : "Dr";

        entries = [
          // Party: receives the grand total (Dr for Sales, Cr for Purchase)
          {
            ledger_id: partyLedger!.ledger_id,
            ledger_name: partyLedger!.name,
            type: partyType,
            amount: totalAmount,
            currency: "INR",
          },
          // Sales/Purchase ledger: stock value only
          {
            ledger_id: salesPurchaseLedger!.ledger_id,
            ledger_name: salesPurchaseLedger!.name,
            type: spType,
            amount: stockSubtotal,
            currency: "INR",
          },
          // Tax / adjustment ledgers (each keeps its own Dr/Cr as set by user)
          ...additionalEntries
            .filter((p) => p.ledger && Number(p.amountRaw) > 0)
            .map((p) => ({
              ledger_id: p.ledger!.ledger_id,
              ledger_name: p.ledger!.name,
              type: p.type,
              amount: Number(p.amountRaw),
              currency: "INR",
              cost_centres: p.costCentres,
            })),
        ];
      }

      // ── Collect bill references ──────────────────────────────────────────────

      let finalBillReferences: any[] = [];

      if (["Receipt", "Payment"].includes(voucherType)) {
        finalBillReferences = particulars
          .filter((p) => p.ledger && p.billReferences?.length)
          .flatMap((p) =>
            p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id }))
          );
      } else if (voucherType === "Contra") {
        if (contraEntryMode === "single") {
          finalBillReferences = particulars
            .filter((p) => p.ledger && p.billReferences?.length)
            .flatMap((p) =>
              p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id }))
            );
        } else {
          finalBillReferences = contraDoubleRows
            .filter((r) => r.ledger && r.billReferences?.length)
            .flatMap((r) =>
              r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id }))
            );
        }
      } else if (voucherType === "Journal") {
        finalBillReferences = journalRows
          .filter((r) => r.ledger && r.billReferences?.length)
          .flatMap((r) =>
            r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id }))
          );
      } else if (["Sales", "Purchase"].includes(voucherType)) {
        if (partyLedger && partyBillReferences.length > 0) {
          finalBillReferences = partyBillReferences.map((b) => ({
            ...b,
            ledger_id: partyLedger.ledger_id,
          }));
        }
        const additionalRefs = additionalEntries
          .filter((p) => p.ledger && p.billReferences?.length)
          .flatMap((p) =>
            p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id }))
          );
        finalBillReferences = [...finalBillReferences, ...additionalRefs];
      }

      // ── Final payload ────────────────────────────────────────────────────────

      const payload: any = {
        company_id: companyId!,
        fy_id: fyId!,
        voucher_type: voucherType,
        date,
        status,
        supplier_invoice_no: supplierInvoiceNo || null,
        supplier_invoice_date: supplierInvoiceDate || null,
        reference_number: referenceNumber || null,
        reference_date: referenceDate || null,
        place_of_supply: placeOfSupply !== "Select" ? placeOfSupply : null,
        narration: narration || null,
        party_ledger_id: ["Sales", "Purchase"].includes(voucherType)
          ? partyLedger?.ledger_id ?? null
          : null,
        party_name: ["Sales", "Purchase"].includes(voucherType)
          ? partyLedger?.name ?? null
          : null,
        is_accounting_voucher: 1,
        is_invoice: ["Sales", "Purchase"].includes(voucherType) ? 1 : 0,
        is_inventory_voucher: ["Sales", "Purchase"].includes(voucherType) ? 1 : 0,
        is_post_dated: status === "Post-Dated" ? 1 : 0,
        entries,
        stock_entries,
        bill_references: finalBillReferences.length > 0 ? finalBillReferences : undefined,
        bank_details: bankDetails || undefined,
        cash_denominations: cashDenominations || undefined,
      };

      const res = await window.api.voucher.create(payload);
      if (res.success) {
        const savedNumber = voucherNumber;
        resetForm();
        setSuccess(`Voucher No. ${savedNumber} saved successfully.`);
        // Refresh all ledger balances and master data after successful entry
        fetchContextData();
      } else {
        setError(res.error || "Failed to save voucher.");
      }
    } catch (e: any) {
      setError(e?.message || "Unexpected error.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validate,
    companyId, fyId, voucherType, contraEntryMode,
    date, status,
    supplierInvoiceNo, supplierInvoiceDate,
    referenceNumber, referenceDate, placeOfSupply,
    narration, totalAmount, particularsTotal,
    accountLedger,
    particulars, contraDoubleRows, journalRows,
    partyLedger, salesPurchaseLedger,
    stockEntries, additionalEntries,
    partyBillReferences, bankDetails, cashDenominations,
    voucherNumber, resetForm, fetchContextData,
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Derived display
  // ─────────────────────────────────────────────────────────────────────────────

  const dateDisplay = useMemo(() => formatDateDisplay(date), [date]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    // ── Voucher meta ───────────────────────────────────────────────────────────
    voucherType,
    setVoucherType,
    voucherNumber,
    voucherNumberLoading,
    date,
    setDate,
    dateDisplay,
    status,
    setStatus,
    supplierInvoiceNo,
    setSupplierInvoiceNo,
    supplierInvoiceDate,
    setSupplierInvoiceDate,
    narration,
    setNarration,

    // ── Computed totals ────────────────────────────────────────────────────────
    totalAmount,       // grand total (used for footer display, party entry, account entry)
    debitTotal,        // Journal Dr side; equals particularsTotal for Receipt
    creditTotal,       // Journal Cr side; equals particularsTotal for Payment/Contra
    particularsTotal,  // raw sum of all Particulars rows (single-entry layouts)

    // ── Submission ─────────────────────────────────────────────────────────────
    isSubmitting,
    error,
    setError,
    success,
    setSuccess,
    handleSubmit,
    resetForm,

    // ── Advanced allocations ───────────────────────────────────────────────────
    activeAllocation,
    setActiveAllocation,
    partyBillReferences,
    setPartyBillReferences,
    bankDetails,
    setBankDetails,
    cashDenominations,
    setCashDenominations,

    // ── Reference / invoice ────────────────────────────────────────────────────
    referenceNumber,
    setReferenceNumber,
    referenceDate,
    setReferenceDate,
    placeOfSupply,
    setPlaceOfSupply,

    // ── Master data ────────────────────────────────────────────────────────────
    allLedgers,
    allStockItems,
    allGodowns,
    allUnits,
    ledgersLoading,
    fetchContextData,

    // ── Search / panel ─────────────────────────────────────────────────────────
    ledgerSearchTerm,
    setLedgerSearchTerm,
    stockSearchTerm,
    setStockSearchTerm,
    activeField,
    handleFieldFocus,
    handleFieldBlur,
    handleLedgerPanelSelect,

    // ── Layout 1 — single-entry (Contra F4 · Payment F5 · Receipt F6) ─────────
    accountLedger,
    accountBalance,
    particulars,
    setParticulars,
    handleUpdateParticularRow,
    handleAddParticularRow,
    handleRemoveParticularRow,

    // ── Layout 1b — Contra double-entry ───────────────────────────────────────
    contraEntryMode,
    setContraEntryMode,
    contraDoubleRows,
    setContraDoubleRows,
    handleUpdateContraDoubleRow,
    handleAddContraDoubleRow,
    handleRemoveContraDoubleRow,

    // ── Layout 2 — journal (F7) ────────────────────────────────────────────────
    journalRows,
    setJournalRows,
    handleUpdateJournalRow,
    handleAddJournalRow,
    handleRemoveJournalRow,

    // ── Layout 3 — inventory invoice (Sales F8 · Purchase F9) ─────────────────
    partyLedger,
    partyBalance,
    salesPurchaseLedger,
    salesPurchaseBalance,
    stockEntries,
    handleUpdateStockRow,
    handleAddStockRow,
    handleRemoveStockRow,
    additionalEntries,
    setAdditionalEntries,
    handleUpdateAdditionalRow,
    handleAddAdditionalRow,
    handleRemoveAdditionalRow,

    // ── Context helpers ────────────────────────────────────────────────────────
    checkIsCashOrBank,
    checkIsCash,
    checkIsBank,
    checkLedgerGroup,
    companyId,
    fyId,
  };
}
```

---

## File: `transactions/ui/AmountDisplay.tsx`

```
/**
 * AmountDisplay — formats a number as an INR amount string consistently.
 * Use for all monetary values across the app.
 */

interface Props {
  amount: number;
  /** Show the ₹ symbol (default true) */
  showSymbol?: boolean;
  className?: string;
}

const formatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatINR(amount: number, showSymbol = true): string {
  return `${showSymbol ? "₹" : ""}${formatter.format(amount)}`;
}

export default function AmountDisplay({ amount, showSymbol = true, className }: Props) {
  return (
    <span className={className}>
      {formatINR(amount, showSymbol)}
    </span>
  );
}

```

---

## File: `transactions/ui/index.ts`

```
export { default as VoucherTypeBadge, voucherTypeSolidClass } from './VoucherTypeBadge';
export { default as LedgerField } from './LedgerField';
export { default as AmountDisplay, formatINR } from './AmountDisplay';
export { default as PageFooterBar } from './PageFooterBar';

```

---

## File: `transactions/ui/LedgerField.tsx`

```
/**
 * LedgerField — the label:value input row used to pick a ledger.
 * Combines the text input, balance display, and field-focus wiring.
 * Reused in the Account row, Party A/c, and Sales/Purchase Ledger rows.
 */

interface Props {
  /** Current display value (ledger name or search term) */
  value: string;
  /** Optional balance string shown in muted text next to the input */
  balance?: string;
  placeholder?: string;
  onFocus: () => void;
  onChange: (value: string) => void;
  /** Tailwind class applied to the wrapping div */
  className?: string;
}

export default function LedgerField({
  value,
  balance,
  placeholder,
  onFocus,
  onChange,
  className = "",
}: Props) {
  return (
    <div className={`flex-1 flex items-center gap-2 ${className}`}>
      <input
        type="text"
        className="flex-1 bg-transparent text-xs outline-none px-2 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded font-semibold text-zinc-800"
        value={value}
        placeholder={placeholder}
        onFocus={onFocus}
        onChange={e => onChange(e.target.value)}
      />
      {balance && (
        <span className="text-[10px] text-zinc-400 font-sans italic shrink-0 select-none">
          (Bal: {balance})
        </span>
      )}
    </div>
  );
}

```

---

## File: `transactions/ui/PageFooterBar.tsx`

```
/**
 * PageFooterBar — bottom status/navigation bar used on list pages.
 * Shows a count label on the left and a back/keyboard-hint on the right.
 */

interface Props {
  countLabel: string;
  backLabel?: string;
  onBack?: () => void;
}

export default function PageFooterBar({ countLabel, backLabel = "Esc → Back", onBack }: Props) {
  return (
    <div className="px-3 py-1.5 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center text-[10px] text-zinc-500 uppercase tracking-wider shrink-0 select-none">
      <span>{countLabel}</span>
      {onBack && (
        <button onClick={onBack} className="hover:text-zinc-800 transition-colors">
          {backLabel}
        </button>
      )}
    </div>
  );
}

```

---

## File: `transactions/ui/VoucherTypeBadge.tsx`

```
/**
 * VoucherTypeBadge — monochrome label for a voucher type string.
 * Black/white palette consistent with the app's design language.
 */

/** Solid accent class used as a background for VoucherView title bars */
export function voucherTypeSolidClass(_type: string): string {
  // All types use the same dark zinc bar — no per-type colour
  return "bg-zinc-900";
}

interface Props {
  type: string;
  size?: "xs" | "sm";
}

export default function VoucherTypeBadge({ type, size = "xs" }: Props) {
  const sizeClass = size === "sm"
    ? "text-[10px] px-2 py-0.5"
    : "text-[9px] px-1.5 py-0.5";

  return (
    <span
      className={`font-bold rounded uppercase tracking-wider select-none border border-zinc-300 bg-zinc-100 text-zinc-700 ${sizeClass}`}
    >
      {type}
    </span>
  );
}

```

---

## File: `transactions/utils/formatCurrency.ts`

```
const formatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatIndianCurrency = (value: number): string =>
  formatter.format(value);

export const parseIndianCurrency = (value: string): number =>
  Number(value.replace(/,/g, "")) || 0;
```

---

## File: `transactions/VoucherList.tsx`

```
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import { PageTitleBar, AlertBanner, SearchInput, DataTable, StatusBadge, RightActionPanel } from "../../components/ui";
import type { TableColumn } from "../../components/ui";
import { VoucherTypeBadge, PageFooterBar } from "./ui";

const VOUCHER_TYPES = ["Receipt", "Payment", "Contra", "Journal", "Sales", "Purchase"];

interface VoucherRow {
  voucher_id: number;
  voucher_type: string;
  voucher_number: string;
  date: string;
  narration: string | null;
  party_name: string | null;
  is_cancelled: number;
}

const formatDate = (d: string) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const TABLE_COLUMNS: TableColumn[] = [
  { key: "voucher_number", label: "Voucher No.",    span: "col-span-2" },
  { key: "voucher_type",   label: "Type",           span: "col-span-1" },
  { key: "date",           label: "Date",           span: "col-span-2" },
  { key: "party_name",     label: "Party / Narration", span: "col-span-4" },
  { key: "status",         label: "Status",         span: "col-span-2" },
  { key: "actions",        label: "",               span: "col-span-1", align: "right" },
];

export default function VoucherList() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const [selectedType, setSelectedType] = useState<string>("All");
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const fetchVouchers = useCallback(async () => {
    if (!companyId || !fyId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = selectedType === "All"
        ? await window.api.voucher.getAll(companyId, fyId)
        : await window.api.voucher.getByType(companyId, fyId, selectedType);
      if (res.success) setVouchers(res.vouchers || []);
      else setError(res.error || "Failed to fetch vouchers");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, selectedType]);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        navigate("/transactions/vouchers");
      }
      if (e.altKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        navigate("/transactions/daybook");
      }
      if (e.altKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        navigate("/utilities/banking");
      }
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/");
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [navigate]);

  const listActions = [
    { key: "Alt+C", label: "New Voucher", onClick: () => navigate("/transactions/vouchers") },
    { key: "Alt+D", label: "Day Book", onClick: () => navigate("/transactions/daybook") },
    { key: "Alt+B", label: "Banking", onClick: () => navigate("/utilities/banking") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/") },
  ];

  const filtered = vouchers.filter(v => {
    const q = search.toLowerCase();
    return (
      !q ||
      v.voucher_number?.toLowerCase().includes(q) ||
      v.party_name?.toLowerCase().includes(q) ||
      v.narration?.toLowerCase().includes(q)
    );
  });

  // Augment rows with rendered fields for DataTable
  const tableRows = filtered.map(v => ({
    ...v,
    voucher_number: v.voucher_number || "—",
    date: formatDate(v.date),
    party_name: v.party_name || v.narration || "—",
  }));

  const columns: TableColumn[] = TABLE_COLUMNS.map(col => ({
    ...col,
    render: col.key === "voucher_type"
      ? (row) => <VoucherTypeBadge type={row.voucher_type} />
      : col.key === "status"
        ? (row) => <StatusBadge label={row.is_cancelled ? "Cancelled" : "Active"} />
        : col.key === "actions"
          ? (row) => (
              <button
                onClick={e => { e.stopPropagation(); navigate(`/transactions/voucher/${row.voucher_id}`); }}
                className="text-[10px] text-zinc-500 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-400 px-1.5 py-0.5 rounded transition-all font-sans uppercase opacity-0 group-hover:opacity-100"
              >
                View
              </button>
            )
          : undefined,
  }));

  return (
    <div className="flex-1 flex flex-col bg-white h-full text-xs select-none">
      {/* Title Bar */}
      <PageTitleBar
        title="Voucher Register"
        subtitle={selectedCompany?.name}
        actions={
          <button
            onClick={() => navigate("/transactions/vouchers")}
            className="text-[10px] bg-zinc-700 hover:bg-zinc-600 text-white px-2 py-0.5 rounded uppercase tracking-wider transition-colors"
          >
            + New Voucher
          </button>
        }
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left Side: Table & Filters */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Type Filter Tabs */}
          <div className="flex border-b border-zinc-200 bg-zinc-50 overflow-x-auto shrink-0">
            {["All", ...VOUCHER_TYPES].map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                  selectedType === type
                    ? "border-zinc-900 text-zinc-900 bg-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50/50">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by voucher no, party, narration…"
              className="max-w-sm"
            />
          </div>

          {/* Error Banner */}
          {error && (
            <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />
          )}

          {/* Table */}
          <DataTable
            columns={columns}
            rows={tableRows}
            rowKey={row => row.voucher_id}
            loading={loading}
            onRowClick={row => navigate(`/transactions/voucher/${row.voucher_id}`)}
            emptyMessage={
              vouchers.length === 0
                ? "No vouchers found. Create your first voucher."
                : "No results match your search."
            }
            rowClassName={row => row.is_cancelled ? "opacity-50" : "group"}
          />
        </div>

        {/* Right Side: Action Panel */}
        <RightActionPanel actions={listActions} />
      </div>

      {/* Footer */}
      <PageFooterBar
        countLabel={`${filtered.length} voucher${filtered.length !== 1 ? "s" : ""}`}
        onBack={() => navigate("/")}
      />
    </div>
  );
}

```

---

## File: `transactions/Vouchers.tsx`

```
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import { useVoucherForm } from "./hooks/useVoucherForm";
import { INDIAN_STATES } from "../../constants/states";
import { AlertBanner } from "../../components/ui";
import BillWiseAllocationPopup from "./components/popups/BillWiseAllocationPopup";
import CostCentreAllocationPopup from "./components/popups/CostCentreAllocationPopup";
import BankAllocationPopup from "./components/popups/BankAllocationPopup";
import DenominationPopup from "./components/popups/DenominationPopup";
import DispatchDetailsPopup from "./components/popups/DispatchDetailsPopup";
import ReceiptDetailsPopup from "./components/popups/ReceiptDetailsPopup";
import DatePickerPopup from "./components/popups/DatePickerPopup";
import ContraDoubleEntryTable from "./components/ContraDoubleEntryTable";

function RightSidebar({
  voucherType,
  onTypeChange,
  status,
  onStatusChange,
  entryMode,
  onEntryModeChange,
  onDateClick,
  onCreateLedger,
  onAccept,
  onQuit,
  canAccept,
}: {
  voucherType: string;
  onTypeChange: (t: string) => void;
  status: string;
  onStatusChange: () => void;
  entryMode: "single" | "double";
  onEntryModeChange: () => void;
  onDateClick: () => void;
  onCreateLedger: () => void;
  onAccept: () => void;
  onQuit: () => void;
  canAccept: boolean;
}) {
  const types = [
    { key: "F4", label: "Contra" },
    { key: "F5", label: "Payment" },
    { key: "F6", label: "Receipt" },
    { key: "F7", label: "Journal" },
    { key: "F8", label: "Sales" },
    { key: "F9", label: "Purchase" },
  ];

  return (
    <div className="w-36 border-l border-black flex flex-col shrink-0 bg-white">
      <div className="border-b border-black px-2 py-1">
        <button
          onClick={onDateClick}
          className="w-full text-left text-xs text-black hover:underline"
        >
          <span className="text-gray-500">F2</span>: Date
        </button>
      </div>

      {types.map(({ key, label }) => (
        <div key={key} className="border-b border-gray-200">
          <button
            onClick={() => onTypeChange(label)}
            className={`w-full text-left px-2 py-1 text-xs ${
              voucherType === label
                ? "bg-black text-white font-semibold"
                : "text-black hover:bg-gray-100"
            }`}
          >
            <span className={voucherType === label ? "text-gray-300" : "text-gray-500"}>
              {key}
            </span>
            : {label}
          </button>
        </div>
      ))}

      <div className="border-b border-gray-200">
        <button
          onClick={onCreateLedger}
          className="w-full text-left px-2 py-1 text-xs text-black hover:bg-gray-100"
        >
          <span className="text-gray-500">Alt+C</span>: Create Ldgr
        </button>
      </div>

      <div className="border-b border-gray-200">
        <button
          onClick={onStatusChange}
          className="w-full text-left px-2 py-1 text-xs text-black hover:bg-gray-100"
        >
          <span className="text-gray-500">T</span>:{" "}
          {status === "Post-Dated" ? "✓ " : ""}Post-Dated
        </button>
      </div>

      {voucherType === "Contra" && (
        <div className="border-b border-gray-200">
          <button
            onClick={onEntryModeChange}
            className="w-full text-left px-2 py-1 text-xs text-black hover:bg-gray-100"
          >
            <span className="text-gray-500">H</span>:{" "}
            {entryMode === "double" ? "✓ " : ""}Double Entry
          </button>
        </div>
      )}

      <div className="flex-1" />

      <div className="border-t border-black px-2 py-1">
        <button
          onClick={onAccept}
          disabled={!canAccept}
          className="w-full text-left text-xs text-black hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <span className="text-gray-500">A</span>: Accept
        </button>
      </div>
      <div className="border-t border-gray-300 px-2 py-1">
        <button onClick={onQuit} className="w-full text-left text-xs text-black hover:underline">
          <span className="text-gray-500">Q</span>: Quit
        </button>
      </div>
    </div>
  );
}

// ─── Ledger list panel ──────────────────────────────────────────────────────

function LedgerListPanel({
  title,
  items,
  searchTerm,
  onSearchChange,
  onSelect,
  onClose,
  onCreateNew,
  createLabel,
}: {
  title: string;
  items: any[];
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onSelect: (item: any) => void;
  onClose: () => void;
  onCreateNew: () => void;
  createLabel: string;
}) {
  const [hi, setHi] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      items.filter(
        (it) =>
          !searchTerm ||
          it.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (it.alias && it.alias.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [items, searchTerm]
  );

  useEffect(() => { setHi(0); }, [searchTerm]);

  useEffect(() => {
    const el = listRef.current?.querySelector("[data-hi]") as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [hi]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setHi((p) => Math.min(p + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setHi((p) => Math.max(p - 1, 0)); }
      if (e.key === "Enter") { e.preventDefault(); if (filtered[hi]) onSelect(filtered[hi]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtered, hi, onSelect, onClose]);

  return (
    <div className="w-64 border-l border-black flex flex-col shrink-0 bg-white h-full">
      <div className="bg-black text-white px-2 py-1 text-xs font-semibold select-none flex justify-between items-center">
        <span>{title}</span>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-300 font-bold leading-none"
        >
          &times;
        </button>
      </div>

      <div className="border-b border-gray-300">
        <input
          autoFocus
          type="text"
          className="w-full text-xs outline-none px-2 py-1 bg-white"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
        />
      </div>

      <div
        className="px-2 py-1 text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-200 text-black select-none"
        onClick={onCreateNew}
      >
        {createLabel}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto min-h-0">
        {filtered.map((item, idx) => (
          <div
            key={item.ledger_id ?? item.item_id ?? item.godown_id ?? idx}
            data-hi={idx === hi ? "true" : undefined}
            className={`px-2 py-0.5 text-xs cursor-pointer select-none ${
              idx === hi
                ? "bg-[#f0c040] text-black font-semibold"
                : "text-black hover:bg-gray-50"
            }`}
            onClick={() => onSelect(item)}
            onMouseEnter={() => setHi(idx)}
          >
            {item.name}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-2 py-2 text-xs text-gray-400 italic">No results</div>
        )}
      </div>

      <div className="border-t border-gray-200 px-2 py-1 text-[10px] text-gray-500 select-none bg-gray-50">
        ↑↓ Navigate &nbsp;·&nbsp; Enter Select
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────

export default function Vouchers() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const form = useVoucherForm();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDispatchDetails, setShowDispatchDetails] = useState(false);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);

  // Stable ref so async callbacks (bill-wise save → accept) always call the
  // latest version of handleAccept without stale closure issues.
  const acceptRef = useRef<() => void>(() => {});

  // ─── canAccept ──────────────────────────────────────────────────────

  const canAccept = useMemo(() => {
    if (form.isSubmitting) return false;

    if (["Receipt", "Payment"].includes(form.voucherType)) {
      return (
        !!form.accountLedger &&
        form.particulars.some((p) => !!p.ledger && (Number(p.amountRaw) || 0) > 0)
      );
    }

    if (form.voucherType === "Contra") {
      if (form.contraEntryMode === "single") {
        return (
          !!form.accountLedger &&
          form.particulars.some((p) => !!p.ledger && (Number(p.amountRaw) || 0) > 0)
        );
      }
      const filled = form.contraDoubleRows.filter(
        (r) => !!r.ledger && (Number(r.amountRaw) || 0) > 0
      );
      return (
        filled.length >= 2 &&
        Math.abs(form.debitTotal - form.creditTotal) < 0.01
      );
    }

    if (form.voucherType === "Journal") {
      const filled = form.journalRows.filter(
        (r) => !!r.ledger && (Number(r.amountRaw) || 0) > 0
      );
      return (
        filled.length >= 2 &&
        Math.abs(form.debitTotal - form.creditTotal) < 0.01
      );
    }

    if (["Sales", "Purchase"].includes(form.voucherType)) {
      return (
        !!form.partyLedger &&
        !!form.salesPurchaseLedger &&
        form.stockEntries.some((s) => !!s.stockItem && (Number(s.amountRaw) || 0) > 0)
      );
    }

    return false;
  }, [
    form.isSubmitting,
    form.voucherType,
    form.contraEntryMode,
    form.contraDoubleRows,
    form.accountLedger,
    form.particulars,
    form.journalRows,
    form.debitTotal,
    form.creditTotal,
    form.partyLedger,
    form.salesPurchaseLedger,
    form.stockEntries,
  ]);

  // ─── Monitor party ledger changes to open dispatch/receipt details ────────

  useEffect(() => {
    if (form.voucherType === "Sales" && form.partyLedger) {
      setShowDispatchDetails(true);
    }
  }, [form.partyLedger, form.voucherType]);

  useEffect(() => {
    if (form.voucherType === "Purchase" && form.partyLedger) {
      setShowReceiptDetails(true);
    }
  }, [form.partyLedger, form.voucherType]);

  // ─── handleAccept ────────────────────────────────────────────────────

  const handleAccept = useCallback(() => {
    // ── Sales / Purchase: bill-wise for party ───────────────────────────
    if (
      ["Sales", "Purchase"].includes(form.voucherType) &&
      form.partyLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      form.setActiveAllocation({
        type: "billWiseParty",
        ledgerId: form.partyLedger.ledger_id,
        ledgerName: form.partyLedger.name,
        amount: form.totalAmount,
        initialAllocations: [],
      });
      return;
    }

    // ── Receipt / Payment / Contra (single): bill-wise for account ledger ────────
    if (
      ["Receipt", "Payment"].includes(form.voucherType) &&
      form.accountLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      form.setActiveAllocation({
        type: "billWiseParty",
        ledgerId: form.accountLedger.ledger_id,
        ledgerName: form.accountLedger.name,
        amount: form.particularsTotal,
        initialAllocations: [],
      });
      return;
    }

    if (
      form.voucherType === "Contra" &&
      form.contraEntryMode === "single" &&
      form.accountLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      form.setActiveAllocation({
        type: "billWiseParty",
        ledgerId: form.accountLedger.ledger_id,
        ledgerName: form.accountLedger.name,
        amount: form.particularsTotal,
        initialAllocations: [],
      });
      return;
    }

    form.handleSubmit();
  }, [
    form.voucherType,
    form.contraEntryMode,
    form.partyLedger,
    form.accountLedger,
    form.partyBillReferences,
    form.totalAmount,
    form.particularsTotal,
    form.handleSubmit,
    form.setActiveAllocation,
  ]);

  useEffect(() => { acceptRef.current = handleAccept; }, [handleAccept]);

  // ─── proceedToNextRow ────────────────────────────────────────────────

  const proceedToNextRow = useCallback(
    (idx: number) => {
      const isJ = form.voucherType === "Journal";
      const isInv = ["Sales", "Purchase"].includes(form.voucherType);
      const isContraDouble = form.voucherType === "Contra" && form.contraEntryMode === "double";
      const list = isJ
        ? form.journalRows
        : isInv
        ? form.additionalEntries
        : isContraDouble
        ? form.contraDoubleRows
        : form.particulars;
      const addRow = isJ
        ? form.handleAddJournalRow
        : isInv
        ? form.handleAddAdditionalRow
        : isContraDouble
        ? form.handleAddContraDoubleRow
        : form.handleAddParticularRow;

      if (idx === list.length - 1) addRow();

      const sel = isInv
        ? `[data-additional-ledger="${idx + 2}"]`
        : `[data-particular-ledger="${idx + 2}"]`;
      setTimeout(
        () => (document.querySelector(sel) as HTMLInputElement | null)?.focus(),
        50
      );
    },
    [
      form.voucherType,
      form.contraEntryMode,
      form.journalRows,
      form.additionalEntries,
      form.particulars,
      form.contraDoubleRows,
      form.handleAddJournalRow,
      form.handleAddAdditionalRow,
      form.handleAddParticularRow,
      form.handleAddContraDoubleRow,
    ]
  );

  // ─── handleAmountConfirm ─────────────────────────────────────────────

  const handleAmountConfirm = useCallback(
    (row: any, idx: number) => {
      const { ledger, amountRaw, id } = row;
      const amount = Number(amountRaw) || 0;
      if (!ledger || amount <= 0) { proceedToNextRow(idx); return; }

      // Contra: bank allocation for bank ledgers, denomination for cash ledgers
      if (form.voucherType === "Contra") {
        if (form.checkIsBank(ledger)) {
          form.setActiveAllocation({
            type: "bankDetails",
            rowId: id,
            ledgerId: ledger.ledger_id,
            ledgerName: ledger.name,
            amount,
            initialDetails: form.bankDetails,
          });
          return;
        }
        if (form.checkIsCash(ledger)) {
          form.setActiveAllocation({
            type: "cashDenomination",
            rowId: id,
            ledgerId: ledger.ledger_id,
            ledgerName: ledger.name,
            amount,
            initialDetails: form.cashDenominations,
          });
          return;
        }
        proceedToNextRow(idx);
        return;
      }

      if (ledger.is_bill_wise === 1) {
        form.setActiveAllocation({
          type: "billWise",
          rowId: id,
          ledgerId: ledger.ledger_id,
          ledgerName: ledger.name,
          amount,
          initialAllocations: row.billReferences ?? [],
        });
      } else if (ledger.allow_cost_centres === 1) {
        form.setActiveAllocation({
          type: "costCentre",
          rowId: id,
          ledgerId: ledger.ledger_id,
          ledgerName: ledger.name,
          amount,
          initialAllocations: row.costCentres ?? [],
        });
      } else {
        proceedToNextRow(idx);
      }
    },
    [form.voucherType, form.checkIsBank, form.checkIsCash, form.bankDetails, form.cashDenominations, form.setActiveAllocation, proceedToNextRow]
  );

  // ─── Allocation save handlers ────────────────────────────────────────

  const handleSaveBillWise = useCallback(
    (allocations: any[]) => {
      // Party bill-wise (Sales/Purchase) or account bill-wise (Receipt/Payment)
      if (
        form.activeAllocation?.type === "billWiseParty"
      ) {
        form.setPartyBillReferences(allocations);
        form.setActiveAllocation(null);
        setTimeout(() => acceptRef.current(), 50);
        return;
      }

      const alloc = form.activeAllocation;
      if (!alloc || !("rowId" in alloc)) return;
      const { rowId } = alloc;
      const isJ = form.voucherType === "Journal";
      const isInv = ["Sales", "Purchase"].includes(form.voucherType);
      const isContraDouble = form.voucherType === "Contra" && form.contraEntryMode === "double";

      if (isJ) form.handleUpdateJournalRow(rowId, { billReferences: allocations });
      else if (isInv) form.handleUpdateAdditionalRow(rowId, { billReferences: allocations });
      else if (isContraDouble) form.handleUpdateContraDoubleRow(rowId, { billReferences: allocations });
      else form.handleUpdateParticularRow(rowId, { billReferences: allocations });

      const list = isJ ? form.journalRows : isInv ? form.additionalEntries : isContraDouble ? form.contraDoubleRows : form.particulars;
      const targetRow = list.find((r) => r.id === rowId);

      if (targetRow?.ledger?.allow_cost_centres === 1) {
        form.setActiveAllocation({
          type: "costCentre",
          rowId,
          ledgerId: targetRow.ledger.ledger_id,
          ledgerName: targetRow.ledger.name,
          amount: Number(targetRow.amountRaw) || 0,
          initialAllocations: (targetRow as any).costCentres ?? [],
        });
      } else {
        form.setActiveAllocation(null);
        proceedToNextRow(list.findIndex((r) => r.id === rowId));
      }
    },
    [
      form.activeAllocation,
      form.voucherType,
      form.contraEntryMode,
      form.journalRows,
      form.additionalEntries,
      form.particulars,
      form.contraDoubleRows,
      form.setPartyBillReferences,
      form.setActiveAllocation,
      form.handleUpdateJournalRow,
      form.handleUpdateAdditionalRow,
      form.handleUpdateContraDoubleRow,
      form.handleUpdateParticularRow,
      proceedToNextRow,
    ]
  );

  const handleSaveCostCentre = useCallback(
    (allocations: any[]) => {
      const alloc = form.activeAllocation;
      if (!alloc || !("rowId" in alloc)) return;
      const { rowId } = alloc;
      const isJ = form.voucherType === "Journal";
      const isInv = ["Sales", "Purchase"].includes(form.voucherType);
      const isContraDouble = form.voucherType === "Contra" && form.contraEntryMode === "double";

      if (isJ) form.handleUpdateJournalRow(rowId, { costCentres: allocations });
      else if (isInv) form.handleUpdateAdditionalRow(rowId, { costCentres: allocations });
      else if (isContraDouble) form.handleUpdateContraDoubleRow(rowId, { costCentres: allocations });
      else form.handleUpdateParticularRow(rowId, { costCentres: allocations });

      form.setActiveAllocation(null);
      const list = isJ ? form.journalRows : isInv ? form.additionalEntries : isContraDouble ? form.contraDoubleRows : form.particulars;
      proceedToNextRow(list.findIndex((r) => r.id === rowId));
    },
    [
      form.activeAllocation,
      form.voucherType,
      form.contraEntryMode,
      form.journalRows,
      form.additionalEntries,
      form.particulars,
      form.contraDoubleRows,
      form.setActiveAllocation,
      form.handleUpdateJournalRow,
      form.handleUpdateAdditionalRow,
      form.handleUpdateContraDoubleRow,
      form.handleUpdateParticularRow,
      proceedToNextRow,
    ]
  );

  const handleSaveBankDetails = useCallback(
    (details: any) => {
      const alloc = form.activeAllocation;
      form.setBankDetails(details);
      form.setActiveAllocation(null);
      if (alloc && "rowId" in alloc) {
        const list =
          form.voucherType === "Contra" && form.contraEntryMode === "double"
            ? form.contraDoubleRows
            : form.particulars;
        const rowIdx = list.findIndex((r) => r.id === alloc.rowId);
        proceedToNextRow(rowIdx);
      }
    },
    [form.activeAllocation, form.setBankDetails, form.setActiveAllocation, form.voucherType, form.contraEntryMode, form.contraDoubleRows, form.particulars, proceedToNextRow]
  );

  const handleSaveCashDenomination = useCallback(
    (details: any) => {
      const alloc = form.activeAllocation;
      form.setCashDenominations(details);
      form.setActiveAllocation(null);
      if (alloc && "rowId" in alloc) {
        const list =
          form.voucherType === "Contra" && form.contraEntryMode === "double"
            ? form.contraDoubleRows
            : form.particulars;
        const rowIdx = list.findIndex((r) => r.id === alloc.rowId);
        proceedToNextRow(rowIdx);
      }
    },
    [form.activeAllocation, form.setCashDenominations, form.setActiveAllocation, form.voucherType, form.contraEntryMode, form.contraDoubleRows, form.particulars, proceedToNextRow]
  );

  const handleSaveDispatchDetails = useCallback(
    (_details: any) => {
      // Store dispatch details in form state (can be extended later)
      setShowDispatchDetails(false);
    },
    []
  );

  const handleSaveReceiptDetails = useCallback(
    (_details: any) => {
      // Store receipt details in form state (can be extended later)
      setShowReceiptDetails(false);
    },
    []
  );

  // ─── Ledger panel items ──────────────────────────────────────────────

  const panelOpen = !!form.activeField;

  const panelItems = useMemo(() => {
    const af = form.activeField;
    if (!af) return [];

    if (af.type === "stockItem") return form.allStockItems;

    if (af.type === "account") {
      // Account field is always cash/bank for all three single-entry types
      return form.allLedgers.filter((l) => form.checkIsCashOrBank(l));
    }

    if (af.type === "party") {
      return form.allLedgers.filter((l) =>
        form.checkLedgerGroup(l, [
          "bank accounts",
          "bank od accounts",
          "bank od a/c",
          "cash-in-hand",
          "sundry debtors",
          "sundry creditors",
        ])
      );
    }

    if (af.type === "salesPurchase") {
      return form.allLedgers.filter((l) =>
        form.checkLedgerGroup(
          l,
          form.voucherType === "Sales" ? ["sales accounts"] : ["purchase accounts"]
        )
      );
    }

    // Contra Particulars: also restricted to cash/bank (destination side)
    // In double-entry mode, all rows are restricted to cash/bank
    if (form.voucherType === "Contra" && af.type === "particular") {
      return form.allLedgers.filter((l) => form.checkIsCashOrBank(l));
    }

    // Receipt / Payment Particulars + Journal + additional: any ledger
    return form.allLedgers;
  }, [
    form.activeField,
    form.voucherType,
    form.allLedgers,
    form.allStockItems,
    form.checkIsCashOrBank,
    form.checkLedgerGroup,
  ]);

  const panelTitle = useMemo(() => {
    const af = form.activeField;
    if (!af) return "List of Ledger Accounts";
    if (af.type === "stockItem") return "List of Stock Items";
    if (af.type === "account") return "List of Cash / Bank Accounts";
    if (af.type === "party") return "List of Party Accounts";
    if (af.type === "salesPurchase") return `List of ${form.voucherType} Ledgers`;
    return "List of Ledger Accounts";
  }, [form.activeField, form.voucherType]);

  const panelSearchTerm =
    form.activeField?.type === "stockItem" ? form.stockSearchTerm : form.ledgerSearchTerm;

  const handlePanelSearchChange = useCallback(
    (v: string) => {
      if (form.activeField?.type === "stockItem") form.setStockSearchTerm(v);
      else form.setLedgerSearchTerm(v);
    },
    [form.activeField, form.setStockSearchTerm, form.setLedgerSearchTerm]
  );

  // ─── Keyboard shortcuts ──────────────────────────────────────────────

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); setShowDatePicker(true); }
      if (e.key === "F4") { e.preventDefault(); form.setVoucherType("Contra"); }
      if (e.key === "F5") { e.preventDefault(); form.setVoucherType("Payment"); }
      if (e.key === "F6") { e.preventDefault(); form.setVoucherType("Receipt"); }
      if (e.key === "F7") { e.preventDefault(); form.setVoucherType("Journal"); }
      if (e.key === "F8") { e.preventDefault(); form.setVoucherType("Sales"); }
      if (e.key === "F9") { e.preventDefault(); form.setVoucherType("Purchase"); }
      if (e.altKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        if (form.voucherType === "Contra") {
          form.setContraEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
        }
      }
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        if (canAccept) handleAccept();
      }
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        navigate("/master/create/ledger");
      }
      if (
        e.key === "Escape" &&
        !form.activeField &&
        !form.activeAllocation &&
        !showDatePicker &&
        !showDispatchDetails &&
        !showReceiptDetails
      ) {
        e.preventDefault();
        navigate("/");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [
    form.setVoucherType,
    form.setContraEntryMode,
    form.voucherType,
    form.activeField,
    form.activeAllocation,
    canAccept,
    handleAccept,
    showDatePicker,
    showDispatchDetails,
    showReceiptDetails,
    navigate,
  ]);

  // ─── FieldRow (named ledger + balance display) ──────────────────────

  function FieldRow({
    label,
    fieldType,
    ledger,
    balance,
  }: {
    label: string;
    fieldType: "account" | "party" | "salesPurchase";
    ledger: any;
    balance: string;
  }) {
    const isActive = form.activeField?.type === fieldType;
    const st = isActive ? form.ledgerSearchTerm : "";

    return (
      <>
        <div className="flex items-center px-3 py-0 min-h-[22px]">
          <span className="w-40 text-sm text-black shrink-0">{label}</span>
          <span className="text-sm text-black mr-2 shrink-0">:</span>
          <input
            type="text"
            className="w-64 text-sm border border-gray-400 px-1 py-0 outline-none focus:border-black"
            value={isActive ? st : (ledger?.name ?? "")}
            onFocus={() => form.handleFieldFocus({ type: fieldType })}
            onChange={(e) => {
              form.setLedgerSearchTerm(e.target.value);
              form.handleFieldFocus({ type: fieldType });
            }}
            autoComplete="off"
          />
        </div>
        <div className="flex items-center px-3 py-0 min-h-[18px]">
          <span className="w-40 text-xs text-gray-500 shrink-0 italic">Current balance</span>
          <span className="text-xs text-gray-500 mr-2 shrink-0">:</span>
          <span className="text-xs text-gray-500 italic">{balance || ""}</span>
        </div>
      </>
    );
  }

  // ─── Balanced / diff indicator ───────────────────────────────────────

  function BalanceIndicator() {
    if (["Receipt", "Payment"].includes(form.voucherType)) {
      return form.particularsTotal > 0 ? (
        <span className="text-gray-500">✓ Balanced</span>
      ) : null;
    }
    if (form.voucherType === "Contra") {
      if (form.contraEntryMode === "single") {
        return form.particularsTotal > 0 ? (
          <span className="text-gray-500">✓ Balanced</span>
        ) : null;
      }
      if (form.debitTotal <= 0) return null;
      if (Math.abs(form.debitTotal - form.creditTotal) > 0.01) {
        return (
          <span className="text-red-700">
            ⚠ Diff:{" "}
            {Math.abs(form.debitTotal - form.creditTotal).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        );
      }
      return <span className="text-gray-500">✓ Balanced</span>;
    }
    if (form.voucherType === "Journal") {
      if (form.debitTotal <= 0) return null;
      if (Math.abs(form.debitTotal - form.creditTotal) > 0.01) {
        return (
          <span className="text-red-700">
            ⚠ Diff:{" "}
            {Math.abs(form.debitTotal - form.creditTotal).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        );
      }
      return <span className="text-gray-500">✓ Balanced</span>;
    }
    return null;
  }

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-white text-black text-sm select-none overflow-hidden">
      {form.error && (
        <AlertBanner
          type="error"
          message={form.error}
          onDismiss={() => form.setError(null)}
        />
      )}
      {form.success && (
        <AlertBanner
          type="success"
          message={form.success}
          onDismiss={() => form.setSuccess(null)}
          actions={
            <button
              onClick={() => navigate("/transactions/voucher-list")}
              className="text-xs underline"
            >
              View Register →
            </button>
          }
        />
      )}

      {/* ── Title bar ── */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-black bg-white shrink-0">
        <span className="text-sm font-semibold text-black">Accounting Voucher Creation</span>
        <span className="text-sm text-black">{selectedCompany?.name ?? ""}</span>
        <button
          onClick={() => navigate("/")}
          className="text-black text-sm font-bold hover:opacity-60 leading-none"
        >
          ✕
        </button>
      </div>

      {/* ── Voucher type / number / date bar ── */}
      <div className="flex items-center px-3 py-1 border-b border-black bg-white shrink-0">
        <div className="text-xs font-bold text-white bg-black px-3 py-0.5 min-w-[80px] text-center uppercase">
          {form.voucherType}
        </div>
        <span className="text-sm text-black ml-3">No.</span>
        <span className="text-sm font-bold text-black ml-2 mr-6">{form.voucherNumber}</span>
        <div className="flex-1" />
        {form.status === "Post-Dated" && (
          <span className="text-xs text-black border border-black px-2 py-0 mr-4">
            Post-Dated
          </span>
        )}
        <button
          onClick={() => setShowDatePicker(true)}
          className="text-sm font-semibold text-black hover:underline focus:outline-none"
          title="F2: Change Date"
        >
          {form.dateDisplay}
        </button>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden border-r border-black">

          {/* ════════════════════════════════════════════════════════════
              Layout 1 — Receipt · Payment · Contra (single-entry)
              Account (cash/bank) + Particulars table
          ═════════════════════════════════════════════════════════════ */}
          {(["Receipt", "Payment"].includes(form.voucherType) ||
            (form.voucherType === "Contra" && form.contraEntryMode === "single")) && (
            <>
              {/* Account field */}
              <div className="border-b border-gray-300 shrink-0 py-1">
                <FieldRow
                  label="Account"
                  fieldType="account"
                  ledger={form.accountLedger}
                  balance={form.accountBalance}
                />
              </div>

              {/* Particulars table header */}
              <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-white">
                <div className="flex-1 text-sm font-semibold text-black">Particulars</div>
                <div className="w-40 text-right text-sm font-semibold text-black">Amount</div>
              </div>

              {/* Particulars rows */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {form.particulars.map((row, idx) => {
                  const isActive =
                    form.activeField?.type === "particular" &&
                    form.activeField.rowId === row.id;
                  return (
                    <div
                      key={row.id}
                      className="flex items-center border-b border-gray-100 min-h-[22px] group"
                    >
                      <div className="flex-1 flex items-center px-3 gap-1">
                        <input
                          data-particular-ledger={idx + 1}
                          type="text"
                          className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                          value={isActive ? form.ledgerSearchTerm : (row.ledger?.name ?? "")}
                          placeholder={idx === 0 ? "Select Ledger…" : ""}
                          onFocus={() =>
                            form.handleFieldFocus({ type: "particular", rowId: row.id })
                          }
                          onChange={(e) => {
                            form.setLedgerSearchTerm(e.target.value);
                            if (!row.ledger)
                              form.handleFieldFocus({ type: "particular", rowId: row.id });
                          }}
                          autoComplete="off"
                        />
                        {row.ledgerBalance ? (
                          <span className="text-xs text-gray-500 italic shrink-0">
                            ({row.ledgerBalance})
                          </span>
                        ) : null}
                        {form.particulars.length > 1 && (
                          <button
                            tabIndex={-1}
                            onClick={() => form.handleRemoveParticularRow(row.id)}
                            className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0 ml-1"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                      <div className="w-40 pr-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                          value={row.amountRaw}
                          placeholder=""
                          onChange={(e) =>
                            form.handleUpdateParticularRow(row.id, { amountRaw: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            handleAmountConfirm(row, idx);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Filler rows */}
                {Array.from({ length: Math.max(0, 10 - form.particulars.length) }).map((_, i) => (
                  <div key={`ep-${i}`} className="flex border-b border-gray-50 min-h-[22px]">
                    <div className="flex-1 px-3" />
                    <div className="w-40 pr-3" />
                  </div>
                ))}
              </div>

              {/* Footer — balanced indicator + total */}
              <div className="flex border-t border-black shrink-0 px-3 py-0.5 bg-white">
                <div className="flex-1 text-xs text-gray-600">
                  <BalanceIndicator />
                </div>
                <div className="w-40 text-right text-sm font-semibold text-black pr-0">
                  {form.particularsTotal > 0
                    ? form.particularsTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : ""}
                </div>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════
              Layout 1b — Contra (double-entry)
              No Account field; Particulars + Debit + Credit columns
          ═════════════════════════════════════════════════════════════ */}
          {form.voucherType === "Contra" && form.contraEntryMode === "double" && (
            <ContraDoubleEntryTable
              rows={form.contraDoubleRows}
              onUpdateRow={form.handleUpdateContraDoubleRow}
              onAddRow={form.handleAddContraDoubleRow}
              onRemoveRow={form.handleRemoveContraDoubleRow}
              onFieldFocus={form.handleFieldFocus}
              onSearchChange={form.setLedgerSearchTerm}
              searchTerm={form.ledgerSearchTerm}
              activeRowId={form.activeField?.type === "particular" ? form.activeField.rowId : null}
              onAmountConfirm={handleAmountConfirm}
            />
          )}

          {/* ════════════════════════════════════════════════════════════
              Layout 2 — Journal
              By/To rows with separate Dr/Cr columns
          ═════════════════════════════════════════════════════════════ */}
          {form.voucherType === "Journal" && (
            <>
              <div className="grid grid-cols-12 border-b border-black shrink-0 px-3 py-0.5 bg-white">
                <div className="col-span-1" />
                <div className="col-span-7 text-sm font-semibold text-black">Particulars</div>
                <div className="col-span-2 text-right text-sm font-semibold text-black">Debit</div>
                <div className="col-span-2 text-right text-sm font-semibold text-black">Credit</div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {form.journalRows.map((row, idx) => {
                  const isActive =
                    form.activeField?.type === "particular" &&
                    form.activeField.rowId === row.id;
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-12 items-center border-b border-gray-100 min-h-[22px] group px-3 py-0"
                    >
                      {/* By / To label */}
                      <div className="col-span-1 text-sm font-semibold text-black select-none">
                        {row.type === "Dr" ? "By" : "To"}
                      </div>

                      <div className="col-span-7 flex items-center gap-1">
                        <input
                          data-particular-ledger={idx + 1}
                          type="text"
                          className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                          value={isActive ? form.ledgerSearchTerm : (row.ledger?.name ?? "")}
                          onFocus={() =>
                            form.handleFieldFocus({ type: "particular", rowId: row.id })
                          }
                          onChange={(e) => {
                            form.setLedgerSearchTerm(e.target.value);
                            if (!row.ledger)
                              form.handleFieldFocus({ type: "particular", rowId: row.id });
                          }}
                          autoComplete="off"
                        />
                        {form.journalRows.length > 2 && (
                          <button
                            tabIndex={-1}
                            onClick={() => form.handleRemoveJournalRow(row.id)}
                            className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                          >
                            &times;
                          </button>
                        )}
                      </div>

                      {/* Debit column — only shown for Dr rows */}
                      <div className="col-span-2 text-right pr-1">
                        {row.type === "Dr" ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                            value={row.amountRaw}
                            placeholder=""
                            onChange={(e) =>
                              form.handleUpdateJournalRow(row.id, { amountRaw: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              handleAmountConfirm(row, idx);
                            }}
                          />
                        ) : (
                          <span className="text-gray-300 text-sm select-none">—</span>
                        )}
                      </div>

                      {/* Credit column — only shown for Cr rows */}
                      <div className="col-span-2 text-right">
                        {row.type === "Cr" ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                            value={row.amountRaw}
                            placeholder=""
                            onChange={(e) =>
                              form.handleUpdateJournalRow(row.id, { amountRaw: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              handleAmountConfirm(row, idx);
                            }}
                          />
                        ) : (
                          <span className="text-gray-300 text-sm select-none">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Filler rows */}
                {Array.from({ length: Math.max(0, 10 - form.journalRows.length) }).map((_, i) => (
                  <div
                    key={`ej-${i}`}
                    className="grid grid-cols-12 border-b border-gray-50 min-h-[22px]"
                  />
                ))}
              </div>

              {/* Footer — Dr / Cr totals with balance indicator */}
              <div className="grid grid-cols-12 border-t border-black shrink-0 px-3 py-0.5 bg-white">
                <div className="col-span-8 text-xs text-gray-600">
                  <BalanceIndicator />
                </div>
                <div className="col-span-2 text-right text-sm font-semibold text-black">
                  {form.debitTotal > 0
                    ? form.debitTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : ""}
                </div>
                <div className="col-span-2 text-right text-sm font-semibold text-black">
                  {form.creditTotal > 0
                    ? form.creditTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : ""}
                </div>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════
              Layout 3 — Sales · Purchase
              Party + Sales/Purchase ledger + stock items + additional entries
          ═════════════════════════════════════════════════════════════ */}
          {["Sales", "Purchase"].includes(form.voucherType) && (
            <>
              {/* Purchase: supplier invoice fields */}
              {form.voucherType === "Purchase" && (
                <div className="flex items-center border-b border-gray-300 shrink-0 px-3 py-1 gap-6 bg-white">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-black shrink-0">Supplier Invoice No.</span>
                    <span className="text-sm text-black shrink-0">:</span>
                    <input
                      type="text"
                      className="text-sm border border-gray-400 px-1 py-0 outline-none focus:border-black w-36"
                      value={form.supplierInvoiceNo}
                      onChange={(e) => form.setSupplierInvoiceNo(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-black shrink-0">Date</span>
                    <span className="text-sm text-black shrink-0">:</span>
                    <input
                      type="date"
                      className="text-sm border border-gray-400 px-1 py-0 outline-none focus:border-black"
                      value={form.supplierInvoiceDate}
                      onChange={(e) => form.setSupplierInvoiceDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Party */}
              <div className="border-b border-gray-300 shrink-0 py-1">
                <FieldRow
                  label="Party A/c name"
                  fieldType="party"
                  ledger={form.partyLedger}
                  balance={form.partyBalance}
                />
              </div>

              {/* Sales/Purchase ledger */}
              <div className="border-b border-gray-300 shrink-0 py-1">
                <FieldRow
                  label={`${form.voucherType} ledger`}
                  fieldType="salesPurchase"
                  ledger={form.salesPurchaseLedger}
                  balance={form.salesPurchaseBalance}
                />
              </div>

              {/* Ref no. + place of supply */}
              <div className="flex items-center gap-6 border-b border-gray-300 shrink-0 px-3 py-1 bg-white">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-black shrink-0 w-28">Ref No.</span>
                  <span className="text-sm text-black shrink-0">:</span>
                  <input
                    type="text"
                    className="text-sm border border-gray-300 bg-transparent px-1 py-0 outline-none focus:border-black w-32"
                    value={form.referenceNumber}
                    onChange={(e) => form.setReferenceNumber(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-black shrink-0">Place of Supply</span>
                  <span className="text-sm text-black shrink-0">:</span>
                  <select
                    className="text-sm border border-gray-300 bg-transparent px-1 py-0 outline-none focus:border-black"
                    value={form.placeOfSupply}
                    onChange={(e) => form.setPlaceOfSupply(e.target.value)}
                  >
                    <option value="Select">Select</option>
                    {INDIAN_STATES.map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stock items table header */}
              <div className="grid grid-cols-12 border-b border-black shrink-0 px-3 py-0.5 bg-white">
                <div className="col-span-4 text-sm font-semibold text-black">Name of Item</div>
                <div className="col-span-2 text-sm font-semibold text-black">Godown</div>
                <div className="col-span-2 text-right text-sm font-semibold text-black">Quantity</div>
                <div className="col-span-1 text-right text-sm font-semibold text-black">Rate</div>
                <div className="col-span-1 text-center text-sm font-semibold text-black">per</div>
                <div className="col-span-2 text-right text-sm font-semibold text-black">Amount</div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {/* Stock item rows */}
                {form.stockEntries.map((row, idx) => {
                  const isActive =
                    form.activeField?.type === "stockItem" &&
                    form.activeField.rowId === row.id;
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-12 items-center border-b border-gray-100 min-h-[22px] group px-3 py-0"
                    >
                      <div className="col-span-4 flex items-center gap-1">
                        <input
                          data-stock-item={idx + 1}
                          type="text"
                          className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                          value={isActive ? form.stockSearchTerm : (row.stockItem?.name ?? "")}
                          placeholder={idx === 0 ? "Select Item…" : ""}
                          onFocus={() =>
                            form.handleFieldFocus({ type: "stockItem", rowId: row.id })
                          }
                          onChange={(e) => {
                            form.setStockSearchTerm(e.target.value);
                            if (!row.stockItem)
                              form.handleFieldFocus({ type: "stockItem", rowId: row.id });
                          }}
                          autoComplete="off"
                        />
                        {form.stockEntries.length > 1 && (
                          <button
                            tabIndex={-1}
                            onClick={() => form.handleRemoveStockRow(row.id)}
                            className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                          >
                            &times;
                          </button>
                        )}
                      </div>

                      <div className="col-span-2 px-1">
                        <select
                          className="w-full text-sm bg-transparent outline-none border-b border-transparent focus:border-black"
                          value={row.godown?.godown_id ?? ""}
                          onChange={(e) => {
                            const id = Number(e.target.value);
                            form.handleUpdateStockRow(row.id, {
                              godown: form.allGodowns.find((g) => g.godown_id === id) ?? null,
                            });
                          }}
                        >
                          <option value="">—</option>
                          {form.allGodowns.map((g) => (
                            <option key={g.godown_id} value={g.godown_id}>{g.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2 text-right pr-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                          value={row.quantityRaw}
                          placeholder=""
                          onChange={(e) =>
                            form.handleUpdateStockRow(row.id, { quantityRaw: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-span-1 text-right pr-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                          value={row.rateRaw}
                          placeholder=""
                          onChange={(e) =>
                            form.handleUpdateStockRow(row.id, { rateRaw: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-span-1 text-center px-1">
                        <select
                          className="w-full text-sm bg-transparent outline-none"
                          value={row.unit?.unit_id ?? ""}
                          onChange={(e) => {
                            const id = Number(e.target.value);
                            form.handleUpdateStockRow(row.id, {
                              unit: form.allUnits.find((u) => u.unit_id === id) ?? null,
                            });
                          }}
                        >
                          <option value="">—</option>
                          {form.allUnits.map((u) => (
                            <option key={u.unit_id} value={u.unit_id}>{u.symbol}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2 text-right text-sm font-semibold text-black select-none">
                        {row.amountRaw
                          ? Number(row.amountRaw).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : ""}
                      </div>
                    </div>
                  );
                })}

                {/* Filler rows */}
                {Array.from({ length: Math.max(0, 5 - form.stockEntries.length) }).map((_, i) => (
                  <div
                    key={`sf-${i}`}
                    className="grid grid-cols-12 border-b border-gray-50 min-h-[22px]"
                  />
                ))}

                {/* Stock subtotal */}
                {form.stockEntries.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0) > 0 && (
                  <div className="grid grid-cols-12 border-t border-gray-300 border-b border-gray-300 px-3 py-0.5 bg-white">
                    <div className="col-span-10 text-xs text-gray-700">Subtotal</div>
                    <div className="col-span-2 text-right text-sm font-semibold text-black">
                      {form.stockEntries
                        .reduce((s, r) => s + (Number(r.amountRaw) || 0), 0)
                        .toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                    </div>
                  </div>
                )}

                {/* Additional ledger rows (taxes, freight, discounts) */}
                {form.additionalEntries.map((row, idx) => {
                  const isAddActive =
                    form.activeField?.type === "additional" &&
                    form.activeField.rowId === row.id;
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-12 items-center border-b border-gray-100 min-h-[22px] group px-3 py-0"
                    >
                      <div className="col-span-5 flex items-center gap-1 pl-4">
                        <input
                          data-additional-ledger={idx + 1}
                          type="text"
                          className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                          value={isAddActive ? form.ledgerSearchTerm : (row.ledger?.name ?? "")}
                          placeholder="Tax / Ledger…"
                          onFocus={() =>
                            form.handleFieldFocus({ type: "additional", rowId: row.id })
                          }
                          onChange={(e) => {
                            form.setLedgerSearchTerm(e.target.value);
                            if (!row.ledger)
                              form.handleFieldFocus({ type: "additional", rowId: row.id });
                          }}
                          autoComplete="off"
                        />
                        <button
                          tabIndex={-1}
                          onClick={() => form.handleRemoveAdditionalRow(row.id)}
                          className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          &times;
                        </button>
                      </div>

                      {/* Dr/Cr selector
                          Sales:    Cr = tax adds to party receivable (default)
                                     Dr = discount reduces party receivable
                          Purchase: Dr = tax adds to party payable (default)
                                     Cr = discount reduces party payable */}
                      <div className="col-span-1 text-center">
                        <select
                          className="text-xs bg-transparent outline-none font-semibold text-black"
                          value={row.type}
                          onChange={(e) =>
                            form.handleUpdateAdditionalRow(row.id, {
                              type: e.target.value as "Dr" | "Cr",
                            })
                          }
                        >
                          <option value="Dr">Dr</option>
                          <option value="Cr">Cr</option>
                        </select>
                      </div>

                      <div className="col-span-4" />

                      <div className="col-span-2 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black font-semibold"
                          value={row.amountRaw}
                          placeholder=""
                          onChange={(e) =>
                            form.handleUpdateAdditionalRow(row.id, { amountRaw: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            handleAmountConfirm(row, idx);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="px-3 py-1 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={form.handleAddAdditionalRow}
                    className="text-xs text-gray-500 hover:text-black border border-gray-300 px-2 py-0.5"
                  >
                    + Add Tax / Ledger Row
                  </button>
                </div>
              </div>

              {/* Grand total footer */}
              <div className="grid grid-cols-12 border-t border-black shrink-0 px-3 py-0.5 bg-white">
                <div className="col-span-10 text-sm font-semibold text-black" />
                <div className="col-span-2 text-right text-sm font-semibold text-black">
                  {form.totalAmount > 0
                    ? form.totalAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : ""}
                </div>
              </div>
            </>
          )}

          {/* ── Narration + grand total ── */}
          <div className="flex items-center border-t border-black shrink-0 px-3 py-1 bg-white">
            <span className="text-sm text-black shrink-0 w-24">Narration</span>
            <span className="text-sm text-black shrink-0 mr-2">:</span>
            <input
              type="text"
              className="flex-1 text-sm bg-transparent outline-none border-b border-transparent focus:border-black px-1 py-0"
              value={form.narration}
              onChange={(e) => form.setNarration(e.target.value)}
            />
            {form.totalAmount > 0 && (form.voucherType !== "Contra" || form.contraEntryMode === "double") && (
              <span className="text-sm font-semibold text-black ml-4 shrink-0 tabular-nums">
                {form.totalAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            )}
          </div>

          {/* ── Accept / Quit / Cancel ── */}
          <div className="flex items-center justify-between border-t border-black shrink-0 px-3 py-1.5 bg-white">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-black hover:underline"
            >
              <span className="underline">Q</span>: Quit
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAccept}
                disabled={form.isSubmitting || !canAccept}
                className="text-sm px-6 py-0.5 bg-black text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800"
              >
                <span className="underline">A</span>: Accept
              </button>
              <button
                onClick={form.resetForm}
                className="text-sm px-3 py-0.5 border border-black text-black hover:bg-gray-100"
              >
                Cancel Vch
              </button>
            </div>
          </div>
        </div>

        {/* ── Ledger list panel (right of main, left of sidebar) ── */}
        {panelOpen && (
          <LedgerListPanel
            title={panelTitle}
            items={panelItems}
            searchTerm={panelSearchTerm}
            onSearchChange={handlePanelSearchChange}
            onSelect={form.handleLedgerPanelSelect}
            onClose={form.handleFieldBlur}
            onCreateNew={() =>
              form.activeField?.type === "stockItem"
                ? navigate("/master/create/stock-item")
                : navigate("/master/create/ledger")
            }
            createLabel={
              form.activeField?.type === "stockItem" ? "Create Stock Item" : "Create"
            }
          />
        )}

        {/* ── Right sidebar ── */}
        <RightSidebar
          voucherType={form.voucherType}
          onTypeChange={form.setVoucherType}
          status={form.status}
          onStatusChange={() =>
            form.setStatus((p: string) => (p === "Regular" ? "Post-Dated" : "Regular"))
          }
          entryMode={form.contraEntryMode}
          onEntryModeChange={() =>
            form.setContraEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"))
          }
          onDateClick={() => setShowDatePicker(true)}
          onCreateLedger={() => navigate("/master/create/ledger")}
          onAccept={handleAccept}
          onQuit={() => navigate("/")}
          canAccept={canAccept}
        />
      </div>

      {/* ── Popups ── */}

      {showDatePicker && (
        <DatePickerPopup
          initialDate={form.date}
          onClose={() => setShowDatePicker(false)}
          onConfirm={form.setDate}
          label="Voucher Date"
        />
      )}

      {showDispatchDetails && form.partyLedger && (
        <DispatchDetailsPopup
          partyName={form.partyLedger.name}
          totalAmount={form.totalAmount}
          onClose={() => setShowDispatchDetails(false)}
          onSave={handleSaveDispatchDetails}
        />
      )}

      {showReceiptDetails && form.partyLedger && (
        <ReceiptDetailsPopup
          partyName={form.partyLedger.name}
          totalAmount={form.totalAmount}
          onClose={() => setShowReceiptDetails(false)}
          onSave={handleSaveReceiptDetails}
        />
      )}

      {form.activeAllocation?.type === "billWise" && (
        <BillWiseAllocationPopup
          ledgerId={form.activeAllocation.ledgerId}
          ledgerName={form.activeAllocation.ledgerName}
          totalAmount={form.activeAllocation.amount}
          initialAllocations={form.activeAllocation.initialAllocations ?? []}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveBillWise}
        />
      )}

      {form.activeAllocation?.type === "billWiseParty" && (
        <BillWiseAllocationPopup
          ledgerId={form.activeAllocation.ledgerId}
          ledgerName={form.activeAllocation.ledgerName}
          totalAmount={form.activeAllocation.amount}
          initialAllocations={form.partyBillReferences}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveBillWise}
        />
      )}

      {form.activeAllocation?.type === "costCentre" && (
        <CostCentreAllocationPopup
          companyId={selectedCompany!.company_id}
          ledgerName={form.activeAllocation.ledgerName}
          totalAmount={form.activeAllocation.amount}
          initialAllocations={form.activeAllocation.initialAllocations ?? []}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveCostCentre}
        />
      )}

      {form.activeAllocation?.type === "bankDetails" && (
        <BankAllocationPopup
          ledgerId={form.activeAllocation.ledgerId}
          ledgerName={form.activeAllocation.ledgerName}
          amount={form.activeAllocation.amount}
          initialDetails={form.bankDetails}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveBankDetails}
        />
      )}

      {form.activeAllocation?.type === "cashDenomination" && (
        <DenominationPopup
          ledgerId={form.activeAllocation.ledgerId}
          ledgerName={form.activeAllocation.ledgerName}
          amount={form.activeAllocation.amount}
          initialDetails={form.cashDenominations}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveCashDenomination}
        />
      )}
    </div>
  );
}

```

---

## File: `transactions/VoucherView.tsx`

```
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SectionCard, AlertBanner } from "../../components/ui";
import { VoucherTypeBadge, AmountDisplay, PageFooterBar } from "./ui";

interface VoucherEntry {
  entry_id: number;
  ledger_id: number;
  ledger_name: string;
  type: "Dr" | "Cr";
  amount: number;
  currency: string;
}

interface StockEntry {
  stock_entry_id: number;
  item_name: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Voucher {
  voucher_id: number;
  voucher_type: string;
  voucher_number: string;
  date: string;
  reference_number: string | null;
  reference_date: string | null;
  narration: string | null;
  party_name: string | null;
  party_ledger_id: number | null;
  place_of_supply: string | null;
  is_invoice: number;
  is_cancelled: number;
  created_at: string;
  entries: VoucherEntry[];
  stock_entries: StockEntry[];
}

const formatDate = (d: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// ─── Sub-components ──────────────────────────────────────────────────────────

/** A single labelled detail cell inside the header card */
function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2.5">
      <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider mb-0.5">{label}</div>
      <div className="text-zinc-800 font-semibold truncate" title={value}>{value}</div>
    </div>
  );
}

/** Dr / Cr badge pill for entry rows */
function DrCrBadge({ type }: { type: "Dr" | "Cr" }) {
  const cls = type === "Dr"
    ? "bg-black text-white"
    : "bg-zinc-600 text-white";
  return (
    <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${cls}`}>{type}</span>
  );
}


function TableHeader({ cols }: { cols: { label: string; span: string; align?: string }[] }) {
  return (
    <div className="grid grid-cols-12 px-3 py-1.5 bg-zinc-50 border-b border-zinc-100 text-[9px] font-bold uppercase tracking-wider text-zinc-500 select-none">
      {cols.map(c => (
        <div key={c.label} className={`${c.span} ${c.align ?? ""}`}>{c.label}</div>
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function VoucherView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await window.api.voucher.getById(Number(id));
        if (res.success) setVoucher(res.voucher as Voucher);
        else setError(res.error || "Voucher not found");
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleCancel = async () => {
    if (!voucher) return;
    if (!window.confirm(`Cancel voucher ${voucher.voucher_number}? This cannot be undone.`)) return;
    setCancelling(true);
    try {
      const res = await window.api.voucher.cancel(voucher.voucher_id);
      if (res.success) setVoucher(prev => prev ? { ...prev, is_cancelled: 1 } : prev);
      else setError(res.error || "Failed to cancel");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    if (!voucher) return;
    if (!window.confirm(`Permanently delete voucher ${voucher.voucher_number}?`)) return;
    try {
      const res = await window.api.voucher.delete(voucher.voucher_id);
      if (res.success) navigate("/transactions/voucher-list");
      else setError(res.error || "Failed to delete");
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ── Loading / error states ──
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs">
        Loading voucher…
      </div>
    );
  }

  if (error && !voucher) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-500 text-xs">
        <span className="text-red-600">{error}</span>
        <button onClick={() => navigate(-1)} className="underline hover:text-zinc-900">← Go Back</button>
      </div>
    );
  }

  if (!voucher) return null;

  // ── Computed totals ──
  const drTotal    = voucher.entries.filter(e => e.type === "Dr").reduce((s, e) => s + e.amount, 0);
  const crTotal    = voucher.entries.filter(e => e.type === "Cr").reduce((s, e) => s + e.amount, 0);
  const stockTotal = voucher.stock_entries.reduce((s, e) => s + e.amount, 0);
  const balanced   = Math.abs(drTotal - crTotal) < 0.01;

  const accentClass = "bg-zinc-900";

  // Header detail cells (skip nulls)
  const headerCells: { label: string; value: string }[] = [
    { label: "Voucher No.", value: voucher.voucher_number },
    { label: "Type",        value: voucher.voucher_type },
    { label: "Date",        value: formatDate(voucher.date) },
    ...(voucher.party_name       ? [{ label: "Party",          value: voucher.party_name }]                   : []),
    ...(voucher.reference_number ? [{ label: "Ref No.",        value: voucher.reference_number }]             : []),
    ...(voucher.reference_date   ? [{ label: "Ref Date",       value: formatDate(voucher.reference_date) }]   : []),
    ...(voucher.place_of_supply  ? [{ label: "Place of Supply",value: voucher.place_of_supply }]              : []),
    ...(voucher.narration        ? [{ label: "Narration",      value: voucher.narration }]                    : []),
  ];

  return (
    <div className="flex-1 flex flex-col bg-white h-full text-xs select-none">

      {/* Coloured Title Bar */}
      <div className={`px-4 py-2.5 text-white flex justify-between items-center shadow-sm shrink-0 ${accentClass}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white transition-colors text-sm">←</button>
          <div>
            <div className="text-sm font-bold tracking-wide uppercase">
              {voucher.voucher_type} Voucher — {voucher.voucher_number}
            </div>
            <div className="text-[10px] text-white/60 font-sans">
              {formatDate(voucher.date)}
              {voucher.is_cancelled ? " · CANCELLED" : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!voucher.is_cancelled && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              Cancel Voucher
            </button>
          )}
          <button
            onClick={handleDelete}
            className="text-[10px] bg-red-700 hover:bg-red-800 text-white px-2 py-1 rounded uppercase tracking-wider transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}

      {/* Body */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">

        {/* Header Details Card */}
        <SectionCard title="Voucher Details">
          <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y divide-zinc-100">
            {headerCells.map(({ label, value }) => (
              <DetailCell key={label} label={label} value={value} />
            ))}
          </div>
        </SectionCard>

        {/* Accounting Entries */}
        {voucher.entries.length > 0 && (
          <SectionCard
            title="Accounting Entries"
            headerRight={
              <div className="flex gap-3 text-[10px] text-zinc-500">
                <span>Dr: <span className="font-bold text-zinc-800"><AmountDisplay amount={drTotal} /></span></span>
                <span>Cr: <span className="font-bold text-zinc-800"><AmountDisplay amount={crTotal} /></span></span>
              </div>
            }
          >
            <TableHeader cols={[
              { label: "Dr/Cr", span: "col-span-1", align: "text-center" },
              { label: "Ledger Account", span: "col-span-7" },
              { label: "Amount", span: "col-span-4", align: "text-right" },
            ]} />

            {voucher.entries.map(entry => (
              <div key={entry.entry_id} className="grid grid-cols-12 px-3 py-2 border-b border-zinc-100 items-center hover:bg-zinc-50/50 transition-colors">
                <div className="col-span-1 text-center">
                  <DrCrBadge type={entry.type} />
                </div>
                <div className="col-span-7 text-zinc-800 font-semibold truncate">
                  {entry.ledger_name || `Ledger #${entry.ledger_id}`}
                </div>
                <div className="col-span-4 text-right font-bold text-zinc-900">
                  <AmountDisplay amount={entry.amount} />
                </div>
              </div>
            ))}

            {/* Balance indicator */}
            <div className={`px-3 py-1.5 text-[10px] font-bold text-right border-t border-zinc-100 ${balanced ? "bg-zinc-50 text-zinc-700" : "bg-zinc-900 text-white"}`}>
              {balanced
                ? "✓ Balanced"
                : `⚠ Difference: `}
              {!balanced && <AmountDisplay amount={Math.abs(drTotal - crTotal)} />}
            </div>
          </SectionCard>
        )}

        {/* Inventory / Stock Entries */}
        {voucher.stock_entries.length > 0 && (
          <SectionCard title="Inventory Particulars">
            <TableHeader cols={[
              { label: "Item Name", span: "col-span-5" },
              { label: "Qty",       span: "col-span-2", align: "text-right" },
              { label: "Rate",      span: "col-span-2", align: "text-right" },
              { label: "Amount",    span: "col-span-3", align: "text-right" },
            ]} />

            {voucher.stock_entries.map(item => (
              <div key={item.stock_entry_id} className="grid grid-cols-12 px-3 py-2 border-b border-zinc-100 items-center hover:bg-zinc-50/50 transition-colors">
                <div className="col-span-5 text-zinc-800 font-semibold truncate">{item.item_name || "—"}</div>
                <div className="col-span-2 text-right text-zinc-600">{item.quantity}</div>
                <div className="col-span-2 text-right text-zinc-600"><AmountDisplay amount={item.rate} /></div>
                <div className="col-span-3 text-right font-bold text-zinc-900"><AmountDisplay amount={item.amount} /></div>
              </div>
            ))}

            {/* Stock total row */}
            <div className="grid grid-cols-12 px-3 py-2 bg-zinc-50 border-t border-zinc-200">
              <div className="col-span-9 font-bold text-zinc-700 uppercase text-[10px] tracking-wider">Total Inventory Value</div>
              <div className="col-span-3 text-right font-bold text-zinc-900"><AmountDisplay amount={stockTotal} /></div>
            </div>
          </SectionCard>
        )}

        {/* Type badge (visual flourish at bottom) */}
        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
          <VoucherTypeBadge type={voucher.voucher_type} size="sm" />
          <span>Voucher ID: {voucher.voucher_id}</span>
          <span>·</span>
          <span>Created: {formatDate(voucher.created_at)}</span>
        </div>
      </div>

      <PageFooterBar
        countLabel={`Voucher #${voucher.voucher_id}`}
        backLabel="← Back to List"
        onBack={() => navigate("/transactions/voucher-list")}
      />
    </div>
  );
}

```

---

