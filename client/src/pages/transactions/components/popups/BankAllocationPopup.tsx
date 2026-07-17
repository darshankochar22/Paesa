import { useState, useEffect, useCallback, useRef } from 'react';
import { TallyFieldPopup } from '@/components/tally-ui/TallyFieldPopup';
import DenominationPopup from './DenominationPopup';
import { toLocalIsoDate } from '@/lib/dueDate';

const TRANSACTION_TYPES = [
  'ATM',
  'Card',
  'Cheque',
  'ECS',
  'e-Fund Transfer',
  'Electronic Cheque',
  'Electronic DD/PO',
  'Cash',
  'Others',
] as const;

/** One allocation row. Additive shape — mirrors the legacy flat keys. */
export interface BankAllocationRow {
  transaction_type: string;
  cheque_range?: string;
  instrument_number: string;
  instrument_date: string;
  bank_name?: string;
  favouring_name?: string;
  transfer_mode?: string;
  account_number?: string;
  ifsc_code?: string;
  payment_gateway?: string;
  amount: number;
}

interface BankDetails {
  ledger_id: number;
  transaction_type: string;
  cheque_range?: string;
  instrument_number: string;
  instrument_date: string;
  bank_name?: string;
  favouring_name?: string;
  transfer_mode?: string;
  account_number?: string;
  ifsc_code?: string;
  payment_gateway?: string;
  amount: number;
  /** Additive: all allocation rows. Flat keys above mirror row 1 (back-compat). */
  allocations?: BankAllocationRow[];
  /** Cash Denominations captured for a Cash transaction type (Tally sub-screen). */
  cash_denominations?: any;
}

interface Props {
  ledgerId: number;
  ledgerName: string;
  amount: number;
  initialDetails?: Partial<BankDetails> | null;
  onClose: () => void;
  onSave: (details: BankDetails) => void;
  allowCash?: boolean;
  /** Existing denominations (edit mode) to prefill the nested sub-screen. */
  initialCashDenominations?: any;
  /** When false (e.g. Receipt), a Cash type does NOT prompt for denominations. */
  enableCashDenomination?: boolean;
}

const todayIso = () => toLocalIsoDate(new Date());

function makeRow(partial?: Partial<BankAllocationRow>, fallbackAmount = 0): BankAllocationRow {
  return {
    transaction_type: partial?.transaction_type ?? 'Cheque',
    cheque_range: partial?.cheque_range ?? '',
    instrument_number: partial?.instrument_number ?? '',
    instrument_date: partial?.instrument_date ?? todayIso(),
    bank_name: partial?.bank_name ?? '',
    favouring_name: partial?.favouring_name ?? '',
    transfer_mode: partial?.transfer_mode ?? '',
    account_number: partial?.account_number ?? '',
    ifsc_code: partial?.ifsc_code ?? '',
    payment_gateway: partial?.payment_gateway ?? '',
    amount: partial?.amount ?? fallbackAmount,
  };
}

function rowsFromDetails(
  details: Partial<BankDetails> | null | undefined,
  fallbackAmount: number,
): BankAllocationRow[] {
  if (details?.allocations?.length) {
    return details.allocations.map((r) => makeRow(r, fallbackAmount));
  }
  return [makeRow(details ?? undefined, fallbackAmount)];
}

const fmt = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Compact "label : input" row (Tally sub-form styling — borderless, gray-fill on focus).
const fieldInputCls =
  'flex-1 min-w-0 text-[13px] bg-transparent border-b border-gray-300 px-1 py-0 outline-none focus:bg-gray-200 focus:border-black';
function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[13px] text-black w-40 shrink-0">{label}</span>
      <span className="text-[13px] text-black">:</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldInputCls}
      />
    </div>
  );
}

export default function BankAllocationPopup({
  ledgerId,
  ledgerName,
  amount,
  initialDetails,
  onClose,
  onSave,
  allowCash = true,
  initialCashDenominations,
  enableCashDenomination = true,
}: Props) {
  const [rows, setRows] = useState<BankAllocationRow[]>(() =>
    rowsFromDetails(initialDetails, amount),
  );
  const [activeRow, setActiveRow] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Nested Cash Denominations sub-screen (Tally opens it from the Cash amount).
  const [denomOpen, setDenomOpen] = useState(false);
  const [cashDenom, setCashDenom] = useState<any | null>(initialCashDenominations ?? null);
  const refNoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRows(rowsFromDetails(initialDetails, amount));
    setActiveRow(0);
  }, [ledgerId, amount, initialDetails]);

  const setRowField = (index: number, field: keyof BankAllocationRow, value: any) => {
    setError(null);
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, [field]: value };
        // Default the instrument date only when it is empty — never clobber a
        // date the user already entered just because the type changed.
        if (field === 'transaction_type' && value === 'Cheque' && !next.instrument_date) {
          next.instrument_date = todayIso();
        }
        return next;
      }),
    );
  };

  const addRow = () => {
    setError(null);
    setRows((prev) => {
      const allocated = prev.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const remaining = Math.max(amount - allocated, 0);
      const next = [...prev, makeRow({ amount: remaining })];
      setActiveRow(next.length - 1);
      return next;
    });
  };

  const removeRow = (index: number) => {
    setError(null);
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      setActiveRow((a) => Math.min(a >= index ? Math.max(a - 1, 0) : a, next.length - 1));
      return next;
    });
  };

  const totalAllocated = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const cashTotal = rows
    .filter((r) => r.transaction_type === 'Cash')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  // Open the nested Cash Denominations sub-screen for the active/first Cash row.
  const openDenomination = useCallback(() => {
    const cashIdx = rows.findIndex((r) => r.transaction_type === 'Cash');
    if (cashIdx >= 0) setActiveRow(cashIdx);
    setDenomOpen(true);
  }, [rows]);

  const handleSave = useCallback(() => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowLabel = rows.length > 1 ? `Row ${i + 1}: ` : '';
      if (!(Number(r.amount) > 0)) {
        setError(`${rowLabel}Amount must be greater than 0`);
        setActiveRow(i);
        return;
      }
      if (!r.instrument_date) {
        setError(`${rowLabel}Instrument date is required`);
        setActiveRow(i);
        return;
      }
      // Instrument number is optional (Tally accepts a Cheque allocation with a
      // blank instrument no.), so Enter flows straight through to Accept.
    }
    if (amount > 0 && Math.abs(totalAllocated - amount) > 0.005) {
      setError(`Allocated total ${fmt(totalAllocated)} must equal ${fmt(amount)}`);
      return;
    }

    // A Cash allocation must have balanced denominations before the bank
    // allocation can be accepted (Tally). If missing/unbalanced, re-open the
    // denominations sub-screen instead of saving.
    if (enableCashDenomination && cashTotal > 0) {
      const denomOk = cashDenom && Math.abs((Number(cashDenom.total) || 0) - cashTotal) < 0.01;
      if (!denomOk) {
        setError('Enter cash denominations to balance the cash amount');
        openDenomination();
        return;
      }
    }

    const first = rows[0];
    onSave({
      cash_denominations: enableCashDenomination && cashTotal > 0 ? cashDenom : undefined,
      ledger_id: ledgerId,
      // Flat keys mirror row 1 for back-compat with existing consumers.
      transaction_type: first.transaction_type,
      cheque_range: first.cheque_range,
      instrument_number: first.instrument_number,
      instrument_date: first.instrument_date,
      bank_name: first.bank_name,
      favouring_name: first.favouring_name,
      transfer_mode: first.transfer_mode,
      account_number: first.account_number,
      ifsc_code: first.ifsc_code,
      payment_gateway: first.payment_gateway,
      amount: totalAllocated,
      allocations: rows,
    });
  }, [
    rows,
    totalAllocated,
    amount,
    ledgerId,
    onSave,
    cashTotal,
    cashDenom,
    enableCashDenomination,
    openDenomination,
  ]);

  // Nested denominations accepted → keep the data and return to the bank
  // allocation at the next field (Ref/Inst No.), so Enter walks to the end.
  const handleDenomSave = useCallback((data: any) => {
    setCashDenom(data);
    setDenomOpen(false);
    requestAnimationFrame(() => refNoRef.current?.focus());
  }, []);

  const availableTypes = allowCash
    ? TRANSACTION_TYPES
    : TRANSACTION_TYPES.filter((t) => t !== 'Cash');

  const current = rows[Math.min(activeRow, rows.length - 1)];
  const isCheque = current.transaction_type === 'Cheque';
  const isCash = current.transaction_type === 'Cash';
  const isEFund = current.transaction_type === 'e-Fund Transfer';
  const setCur = (field: keyof BankAllocationRow, value: any) =>
    setRowField(Math.min(activeRow, rows.length - 1), field, value);

  return (
    <>
      <TallyFieldPopup
        title={`Bank Allocations for: ${ledgerName}`}
        onClose={onClose}
        onAccept={handleSave}
        width={1200}
        minHeight="72vh"
        disabled={denomOpen}
      >
        {/* For: <amount> — centred under the title, matching TallyPrime */}
        <div className="text-center text-[13px] text-black mb-2">
          For: <span className="font-bold">{fmt(amount)}</span>
        </div>

        {/* Transaction Type table — one line per allocation row */}
        <div className="flex items-center border-b border-black pb-0.5 text-[13px] font-bold text-black">
          <div className="flex-1">Transaction Type</div>
          <div className="w-40 text-right">Amount</div>
          <div className="w-5" />
        </div>
        {rows.map((row, i) => (
          <div
            key={i}
            className={`flex items-center border-b border-gray-200 py-0.5 text-[13px] ${
              i === activeRow ? 'bg-gray-100' : ''
            }`}
            onClick={() => setActiveRow(i)}
          >
            <div className="flex-1">
              <select
                value={row.transaction_type}
                onChange={(e) => setRowField(i, 'transaction_type', e.target.value)}
                onFocus={() => setActiveRow(i)}
                className="bg-transparent outline-none border-b border-gray-300 focus:bg-gray-200 focus:border-black px-1 py-0 text-[13px] text-black w-48"
              >
                {availableTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-40 text-right">
              <input
                type="number"
                min={0}
                step="0.01"
                value={Number.isFinite(row.amount) ? row.amount : ''}
                onChange={(e) =>
                  setRowField(i, 'amount', e.target.value === '' ? 0 : Number(e.target.value))
                }
                onFocus={() => setActiveRow(i)}
                onKeyDown={(e) => {
                  // Tally: confirming a Cash amount opens the Denominations screen.
                  if (
                    e.key === 'Enter' &&
                    !e.shiftKey &&
                    !e.ctrlKey &&
                    !e.altKey &&
                    !e.metaKey &&
                    enableCashDenomination &&
                    row.transaction_type === 'Cash' &&
                    Number(row.amount) > 0
                  ) {
                    e.preventDefault();
                    setActiveRow(i);
                    setDenomOpen(true);
                  }
                }}
                className="w-36 text-right text-[13px] text-black bg-transparent border-b border-gray-300 px-1 py-0 outline-none focus:bg-gray-200 focus:border-black"
              />
            </div>
            <div className="w-5 text-right">
              {rows.length > 1 && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRow(i);
                  }}
                  className="text-[13px] text-gray-400 hover:text-black"
                  aria-label={`Remove row ${i + 1}`}
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        ))}
        {/* Allocated total + (unobtrusive) split-row control */}
        <div className="flex items-center py-1 text-[13px]">
          <div className="flex-1">
            <button
              type="button"
              tabIndex={-1}
              onClick={addRow}
              className="text-[11px] border border-gray-300 px-2 py-0 text-black hover:bg-gray-100"
            >
              + Add Row
            </button>
          </div>
          <div className="w-40 text-right font-bold text-black border-t border-black pt-0.5">
            {fmt(totalAllocated)}
          </div>
          <div className="w-5" />
        </div>

        {/* Fields for the active row */}
        <div className="pt-2 space-y-1.5">
          {error && (
            <div className="mb-1 border border-black text-black text-[11px] font-semibold px-2 py-1 flex justify-between items-center">
              <span>{error}</span>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setError(null)}
                className="font-bold"
              >
                &times;
              </button>
            </div>
          )}

          {rows.length > 1 && (
            <div className="text-[11px] font-semibold text-black">
              Details for row {Math.min(activeRow, rows.length - 1) + 1} ({current.transaction_type}
              )
            </div>
          )}

          {isEFund ? (
            /* e-Fund Transfer (TallyPrime layout):
             A/c No.  ·  IFS Code
             Bank/Payment Gateway
             Inst No.  ·  Inst Date */
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-x-10">
                <Field
                  label="A/c No."
                  value={current.account_number ?? ''}
                  onChange={(v) => setCur('account_number', v)}
                />
                <Field
                  label="IFS Code"
                  value={current.ifsc_code ?? ''}
                  onChange={(v) => setCur('ifsc_code', v)}
                />
              </div>
              <Field
                label="Bank/Payment Gateway"
                value={current.payment_gateway ?? ''}
                onChange={(v) => setCur('payment_gateway', v)}
              />
              <div className="grid grid-cols-2 gap-x-10">
                <Field
                  label="Inst No."
                  value={current.instrument_number}
                  onChange={(v) => setCur('instrument_number', v)}
                />
                <Field
                  label="Inst Date"
                  type="date"
                  value={current.instrument_date}
                  onChange={(v) => setCur('instrument_date', v)}
                />
              </div>
            </div>
          ) : (
            <>
              {isCheque && (
                <Field
                  label="Cheque range"
                  value={current.cheque_range ?? ''}
                  onChange={(v) => setCur('cheque_range', v)}
                />
              )}
              <div className="flex items-center gap-1">
                <span className="text-[13px] text-black w-40 shrink-0">
                  {isCash ? 'Ref No.' : 'Inst No.'}
                </span>
                <span className="text-[13px] text-black">:</span>
                <input
                  ref={refNoRef}
                  type="text"
                  value={current.instrument_number}
                  onChange={(e) => setCur('instrument_number', e.target.value)}
                  className="text-[13px] bg-transparent border-b border-gray-300 px-1 py-0 outline-none focus:bg-gray-200 focus:border-black w-40"
                />
                <span className="text-[13px] text-black ml-6 shrink-0">Inst Date</span>
                <span className="text-[13px] text-black">:</span>
                <input
                  type="date"
                  value={current.instrument_date}
                  onChange={(e) => setCur('instrument_date', e.target.value)}
                  className="text-[13px] bg-transparent border-b border-gray-300 px-1 py-0 outline-none focus:bg-gray-200 focus:border-black w-32"
                />
              </div>
            </>
          )}
        </div>
      </TallyFieldPopup>

      {denomOpen && (
        <DenominationPopup
          ledgerId={ledgerId}
          ledgerName={ledgerName}
          amount={Number(current.amount) || cashTotal}
          initialDetails={cashDenom}
          onClose={() => setDenomOpen(false)}
          onSave={handleDenomSave}
        />
      )}
    </>
  );
}
