import { useRef } from 'react';
import type { ParticularRow, ActiveField } from '../hooks/useVoucherForm';
import BillRefLines from './BillRefLines';
import InventoryAllocLines from './InventoryAllocLines';

interface Props {
  rows: ParticularRow[];
  onUpdateRow: (id: string, updates: Partial<Omit<ParticularRow, 'id'>>) => void;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onFieldFocus: (field: ActiveField) => void;
  onSearchChange: (term: string) => void;
  searchTerm: string;
  activeRowId: string | null;
  onAmountConfirm?: (row: ParticularRow, index: number) => void;
  /** Overdrawn-balance warning only makes sense for Cash/Bank ledgers — a Cr
   *  balance on an income/liability/capital ledger is natural, not negative. */
  checkIsCashOrBank?: (ledger: ParticularRow['ledger']) => boolean;
}

const formatAmount = (n: number): string =>
  n > 0 ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

export default function VoucherDoubleEntryTable({
  rows,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
  onFieldFocus,
  onSearchChange,
  searchTerm,
  activeRowId,
  onAmountConfirm,
  checkIsCashOrBank,
}: Props) {
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const handleAmountChange = (rowId: string, value: string) => {
    onUpdateRow(rowId, { amountRaw: value });
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key !== 'Enter') return;

    const row = rowsRef.current[idx];
    if (!row?.ledger) return;

    e.preventDefault();

    if (onAmountConfirm) {
      onAmountConfirm(row, idx);
    } else if (Number(row.amountRaw) > 0) {
      if (idx === rowsRef.current.length - 1) onAddRow();
      setTimeout(() => {
        const nextIdx = idx + 1;
        const next = document.querySelector(
          `[data-particular-ledger="${nextIdx + 1}"]`,
        ) as HTMLInputElement | null;
        next?.focus();
      }, 50);
    }
  };

  const drTotal = rows.reduce((s, r) => s + (r.type === 'Dr' ? Number(r.amountRaw) || 0 : 0), 0);
  const crTotal = rows.reduce((s, r) => s + (r.type === 'Cr' ? Number(r.amountRaw) || 0 : 0), 0);

  const isBalanced = Math.abs(drTotal - crTotal) < 0.01;
  const diff = Math.abs(drTotal - crTotal);

  // Only Cash/Bank ledgers can be "overdrawn". A Cr balance elsewhere (income,
  // liability, capital…) is the natural side, so it must not read as negative.
  const isOverdrawn = (row: ParticularRow) =>
    !!row.ledger &&
    !!checkIsCashOrBank?.(row.ledger) &&
    !!row.ledgerBalance &&
    parseFloat(row.ledgerBalance) < 0;

  const hasNegativeBalances = rows.some(isOverdrawn);

  const amountWarningClass = (row: ParticularRow) =>
    isOverdrawn(row) && Number(row.amountRaw) > 0 ? 'text-red-700' : 'text-black';

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white text-xs">
      <div className="grid grid-cols-12 border-b border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="col-span-1" />
        <div className="col-span-7 text-sm font-semibold text-black">Particulars</div>
        <div className="col-span-2 text-right text-sm font-semibold text-black">Debit</div>
        <div className="col-span-2 text-right text-sm font-semibold text-black">Credit</div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {rows.map((row, idx) => {
          const isActive = activeRowId === row.id;

          return (
            <div
              key={row.id}
              className="grid grid-cols-12 items-center border-b border-gray-100 min-h-[22px] group px-3 py-0"
            >
              <div className="col-span-1 text-center">
                <select
                  className="bg-transparent font-bold outline-none text-black text-xs"
                  value={row.type}
                  onChange={(e) => onUpdateRow(row.id, { type: e.target.value as 'Dr' | 'Cr' })}
                >
                  <option value="Dr">Dr</option>
                  <option value="Cr">Cr</option>
                </select>
              </div>

              <div className="col-span-7 flex items-center gap-1">
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <input
                    data-particular-ledger={idx + 1}
                    type="text"
                    className="w-full bg-transparent outline-none px-1 border border-transparent focus:border-black text-sm text-black"
                    value={isActive ? searchTerm : (row.ledger?.name ?? '')}
                    placeholder={idx === 0 ? 'Select Ledger…' : ''}
                    onFocus={() => onFieldFocus({ type: 'particular', rowId: row.id })}
                    onChange={(e) => {
                      onSearchChange(e.target.value);
                      if (!row.ledger) onFieldFocus({ type: 'particular', rowId: row.id });
                    }}
                    autoComplete="off"
                  />
                  {row.ledgerBalance && (
                    <span
                      className={`text-[10px] italic select-none ${
                        isOverdrawn(row) ? 'text-red-600' : 'text-gray-500'
                      }`}
                    >
                      Bal: {row.ledgerBalanceLabel || row.ledgerBalance}
                    </span>
                  )}
                  <BillRefLines billReferences={row.billReferences} dcType={row.type} />
                  <InventoryAllocLines
                    inventoryAllocations={row.inventoryAllocations}
                    dcType={row.type}
                  />
                  {row.costCentres?.length && !row.inventoryAllocations?.length ? (
                    <span className="text-[10px] text-zinc-500 select-none">
                      {row.costCentres.length} cost centre{row.costCentres.length > 1 ? 's' : ''}
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

              <div className="col-span-2 text-right pr-1">
                {row.type === 'Dr' ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black ${amountWarningClass(row)}`}
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

              <div className="col-span-2 text-right">
                {row.type === 'Cr' ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black ${amountWarningClass(row)}`}
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

        {Array.from({ length: Math.max(0, 10 - rows.length) }).map((_, i) => (
          <div key={`ec-${i}`} className="grid grid-cols-12 border-b border-gray-50 min-h-[22px]" />
        ))}
      </div>

      <div className="border-t border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="grid grid-cols-12 items-center">
          <div className="col-span-8 text-xs">
            <button
              onClick={onAddRow}
              className="text-black hover:bg-gray-100 px-2 py-0.5 border border-gray-300 font-medium"
            >
              + Add Row
            </button>
          </div>
          <div className="col-span-2 text-right text-sm font-semibold text-black">
            {formatAmount(drTotal)}
          </div>
          <div className="col-span-2 text-right text-sm font-semibold text-black">
            {formatAmount(crTotal)}
          </div>
        </div>
        <div className="grid grid-cols-12 items-center mt-0.5 border-t border-gray-200 pt-0.5">
          <div className="col-span-8 text-xs">
            {hasNegativeBalances && (
              <span className="text-red-600 font-medium">⚠ Negative balance detected</span>
            )}
            {drTotal > 0 && crTotal > 0 && !isBalanced && (
              <span className="text-red-700">
                ⚠ Diff:{' '}
                {diff.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            )}
            {isBalanced && drTotal > 0 && <span className="text-gray-500">✓ Balanced</span>}
          </div>
          <div className="col-span-4" />
        </div>
      </div>
    </div>
  );
}
