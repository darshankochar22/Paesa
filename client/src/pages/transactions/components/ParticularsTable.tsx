import { useRef } from 'react';
import type { ParticularRow, ActiveField } from '../hooks/useVoucherForm';
import BillRefLines from './BillRefLines';
import CostCentreAllocLines from './CostCentreAllocLines';

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
  voucherType?: string;
  // FIX #1 — accept pre-computed totals from the hook instead of recalculating
  debitTotal?: number;
  creditTotal?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatAmount = (n: number): string =>
  n > 0 ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

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
  const isSingleEntry = ['Receipt', 'Payment'].includes(voucherType ?? '');

  // ── Amount handlers ────────────────────────────────────────────────────────

  const handleAmountChange = (rowId: string, value: string) => {
    onUpdateRow(rowId, { amountRaw: value });
  };

  // FIX #5 — only Enter confirms; Tab lets the browser move focus naturally.
  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key !== 'Enter') return;

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
          `[data-particular-ledger="${nextIdx + 1}"]`,
        ) as HTMLInputElement | null;
        next?.focus();
      }, 50);
    }
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  // FIX #1 — prefer pre-computed props; fall back to local reduce only when
  // the parent hasn't wired them up yet (defensive).
  const drTotal =
    debitTotal ?? rows.reduce((s, r) => s + (r.type === 'Dr' ? Number(r.amountRaw) || 0 : 0), 0);
  const crTotal =
    creditTotal ?? rows.reduce((s, r) => s + (r.type === 'Cr' ? Number(r.amountRaw) || 0 : 0), 0);

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
                      row.type === 'Dr' ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    {row.type}
                  </span>
                ) : (
                  // Journal / Contra — user picks the side
                  <select
                    className="bg-transparent font-bold outline-none text-zinc-900 cursor-pointer text-xs"
                    value={row.type}
                    onChange={(e) => onUpdateRow(row.id, { type: e.target.value as 'Dr' | 'Cr' })}
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
                    value={isActive ? searchTerm : (row.ledger?.name ?? '')}
                    placeholder={idx === 0 ? 'Select Particular Ledger…' : ''}
                    onFocus={() => onFieldFocus({ type: 'particular', rowId: row.id })}
                    onChange={(e) => {
                      onSearchChange(e.target.value);
                      if (!row.ledger) onFieldFocus({ type: 'particular', rowId: row.id });
                    }}
                  />
                  {row.ledgerBalance && (
                    <span className="text-[10px] text-zinc-400 font-sans italic select-none">
                      Current Bal: {row.ledgerBalance}
                    </span>
                  )}
                  {/* Bill-wise breakup + cost-centre indicator */}
                  <BillRefLines billReferences={row.billReferences} dcType={row.type} />
                  <CostCentreAllocLines costCentres={row.costCentres} dcType={row.type} />
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
                {row.type === 'Dr' ? (
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
                  <span className="block text-right px-1 py-0.5 text-zinc-300 select-none">—</span>
                )}
              </div>

              {/* ── Column 4: Credit amount ────────────────────────────────── */}
              <div className="col-span-2 px-1">
                {row.type === 'Cr' ? (
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
                  <span className="block text-right px-1 py-0.5 text-zinc-300 select-none">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Totals row ────────────────────────────────────────────────────────── */}
      <div
        className={`border-t-2 px-3 py-2 ${
          isBalanced && drTotal > 0 ? 'border-zinc-300 bg-zinc-50' : 'border-zinc-300 bg-zinc-50'
        }`}
      >
        <div className="grid grid-cols-12 items-center">
          <div className="col-span-8 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider select-none">
            {drTotal > 0 && crTotal > 0 && !isBalanced && (
              <span className="text-zinc-600">
                ⚠ Difference:{' '}
                {Math.abs(drTotal - crTotal).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            )}
            {isBalanced && drTotal > 0 && <span className="text-zinc-500">✓ Balanced</span>}
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
