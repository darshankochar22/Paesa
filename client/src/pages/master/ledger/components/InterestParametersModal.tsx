import { useEffect, useRef, useState } from 'react';
import { FormRow, inputCls, selectCls } from '@/components/ui';
import type { InterestDetails, InterestRateSlab } from '../hooks/useLedgerForm';

export const INTEREST_STYLES = ['30-Day Month', '365-Day Year', 'Calendar Month', 'Calendar Year'];

export const INTEREST_BALANCES = ['All Balances', 'Credit Balances Only', 'Debit Balances Only'];

export const INTEREST_CALCULATE_ON = ['Bill-by-Bill', 'Outstanding Balance'];

export const INTEREST_APPLICABLE_FROM = ['Due Date', 'Bill Date'];

export const INTEREST_ROUNDING_METHODS = [
  'No Rounding',
  'Round Nearest',
  'Round Upward',
  'Round Downward',
];

/* Numeric-only guards for rate/limit inputs — block bad chars at keystroke
   level AND strip anything non-numeric on change (paste, IME, etc.). */
const blockNonNumericKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return; // allow shortcuts (copy/paste/select-all)
  if (e.key.length === 1 && !/[0-9.]/.test(e.key)) e.preventDefault();
};
const sanitizeNumeric = (v: string) => v.replace(/[^0-9.]/g, '');

interface InterestParametersModalProps {
  isOpen: boolean;
  onClose: () => void;
  ledgerName?: string;
  interestForm: InterestDetails;
  setInterestForm: React.Dispatch<React.SetStateAction<InterestDetails>>;
  isBank?: boolean;
}

export default function InterestParametersModal({
  isOpen,
  onClose,
  ledgerName,
  interestForm,
  setInterestForm,
  isBank = false,
}: InterestParametersModalProps) {
  const rateRef = useRef<HTMLInputElement>(null);
  const [showSlabs, setShowSlabs] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Enter' || (e.ctrlKey && (e.key === 'a' || e.key === 'A'))) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => rateRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const setField = <K extends keyof InterestDetails>(key: K, value: InterestDetails[K]) =>
    setInterestForm((f) => ({ ...f, [key]: value }));

  const setSlab = (idx: number, patch: Partial<InterestRateSlab>) =>
    setInterestForm((f) => ({
      ...f,
      interest_rate_slabs: (f.interest_rate_slabs || []).map((s, i) =>
        i === idx ? { ...s, ...patch } : s,
      ),
    }));

  const addSlab = () =>
    setInterestForm((f) => ({
      ...f,
      interest_rate_slabs: [
        ...(f.interest_rate_slabs || []),
        { from_date: '', to_date: null, rate: 0 },
      ],
    }));

  const removeSlab = (idx: number) =>
    setInterestForm((f) => ({
      ...f,
      interest_rate_slabs: (f.interest_rate_slabs || []).filter((_, i) => i !== idx),
    }));

  return (
    <div
      data-enter-nav-ignore
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
    >
      <div className="bg-white border border-zinc-300 shadow-2xl w-[560px] flex flex-col">
        <div className="px-4 py-2 border-b border-zinc-300 text-center">
          <span className="text-[13px] font-semibold text-zinc-900">
            Interest Parameters
            {ledgerName ? (
              <span className="text-zinc-500 font-normal"> for {ledgerName}</span>
            ) : null}
          </span>
        </div>

        <div className="px-6 py-4 bg-white space-y-1.5 max-h-[70vh] overflow-y-auto">
          {isBank && (
            <FormRow
              label="Calculate Interest Based on"
              labelWidth="w-56"
              className="flex items-center min-h-[26px] mb-2"
            >
              <select
                className={selectCls}
                value={interestForm.calculate_interest_based_on || 'Voucher Date'}
                onChange={(e) => setField('calculate_interest_based_on', e.target.value)}
              >
                <option value="Bank/Reco Date">Bank/Reco Date</option>
                <option value="Voucher Date">Voucher Date</option>
              </select>
            </FormRow>
          )}
          <div className="text-[12px] text-zinc-700 font-medium mb-1">
            Include transaction date for interest calculation:
          </div>
          <FormRow
            label="For amounts added"
            labelWidth="w-44"
            className="flex items-center min-h-[26px]"
          >
            <select
              className={selectCls}
              value={interestForm.interest_include_added ? 'Yes' : 'No'}
              onChange={(e) => setField('interest_include_added', e.target.value === 'Yes' ? 1 : 0)}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </FormRow>
          <FormRow
            label="For amounts deducted"
            labelWidth="w-44"
            className="flex items-center min-h-[26px]"
          >
            <select
              className={selectCls}
              value={interestForm.interest_include_deducted ? 'Yes' : 'No'}
              onChange={(e) =>
                setField('interest_include_deducted', e.target.value === 'Yes' ? 1 : 0)
              }
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </FormRow>

          <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center min-h-[26px] gap-2">
            <span className="text-[12px] text-zinc-700 font-medium w-12 shrink-0">Rate :</span>
            <input
              ref={rateRef}
              type="text"
              inputMode="decimal"
              className={`${inputCls} text-right max-w-[80px]`}
              value={String(interestForm.interest_rate ?? '')}
              onKeyDown={blockNonNumericKeys}
              onChange={(e) => setField('interest_rate', sanitizeNumeric(e.target.value))}
            />
            <span className="text-[12px] text-zinc-600">% per</span>
            <select
              className={`${selectCls} max-w-[160px]`}
              value={interestForm.interest_style || '30-Day Month'}
              onChange={(e) => setField('interest_style', e.target.value)}
            >
              {INTEREST_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="text-[12px] text-zinc-600">on</span>
            <select
              className={`${selectCls} max-w-[180px]`}
              value={interestForm.interest_balances || 'All Balances'}
              onChange={(e) => setField('interest_balances', e.target.value)}
            >
              {INTEREST_BALANCES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 mt-2 border-t border-zinc-100 space-y-1.5">
            <FormRow
              label="Calculate Interest on"
              labelWidth="w-44"
              className="flex items-center min-h-[26px]"
            >
              <select
                className={selectCls}
                value={interestForm.interest_calculate_on || 'Bill-by-Bill'}
                onChange={(e) => setField('interest_calculate_on', e.target.value)}
              >
                {INTEREST_CALCULATE_ON.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </FormRow>
            <FormRow
              label="Applicable From"
              labelWidth="w-44"
              className="flex items-center min-h-[26px]"
            >
              <select
                className={selectCls}
                value={interestForm.interest_applicable_from || 'Due Date'}
                onChange={(e) => setField('interest_applicable_from', e.target.value)}
              >
                {INTEREST_APPLICABLE_FROM.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Rounding" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select
                className={selectCls}
                value={interestForm.interest_rounding_method || 'No Rounding'}
                onChange={(e) => setField('interest_rounding_method', e.target.value)}
              >
                {INTEREST_ROUNDING_METHODS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </FormRow>
            {(interestForm.interest_rounding_method || 'No Rounding') !== 'No Rounding' && (
              <FormRow
                label="Round to nearest"
                labelWidth="w-44"
                className="flex items-center min-h-[26px]"
              >
                <input
                  type="text"
                  inputMode="decimal"
                  className={`${inputCls} text-right max-w-[80px]`}
                  value={String(interestForm.interest_rounding_limit ?? '')}
                  onKeyDown={blockNonNumericKeys}
                  onChange={(e) =>
                    setField('interest_rounding_limit', sanitizeNumeric(e.target.value))
                  }
                />
              </FormRow>
            )}
          </div>

          {/* Rate slabs — advanced, collapsible */}
          <div className="pt-2 mt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setShowSlabs((v) => !v)}
              className="text-[12px] text-zinc-700 font-medium flex items-center gap-1.5 hover:text-zinc-900 transition-colors"
            >
              <span className="text-[9px] text-zinc-400 w-3 text-center">
                {showSlabs ? '▼' : '▶'}
              </span>
              Rate Slabs (optional)
              {interestForm.interest_rate_slabs?.length > 0 && (
                <span className="text-zinc-500 font-normal">
                  — {interestForm.interest_rate_slabs.length} defined
                </span>
              )}
            </button>
            {showSlabs && (
              <div className="mt-1.5 space-y-1">
                {(interestForm.interest_rate_slabs || []).map((slab, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-500 w-10 shrink-0">From</span>
                    <input
                      type="date"
                      className={`${inputCls} max-w-[130px]`}
                      value={slab.from_date || ''}
                      onChange={(e) => setSlab(idx, { from_date: e.target.value })}
                    />
                    <span className="text-[11px] text-zinc-500">To</span>
                    <input
                      type="date"
                      className={`${inputCls} max-w-[130px]`}
                      value={slab.to_date || ''}
                      onChange={(e) => setSlab(idx, { to_date: e.target.value || null })}
                    />
                    <span className="text-[11px] text-zinc-500">Rate</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`${inputCls} text-right max-w-[60px]`}
                      value={String(slab.rate ?? '')}
                      onKeyDown={blockNonNumericKeys}
                      onChange={(e) => setSlab(idx, { rate: sanitizeNumeric(e.target.value) })}
                    />
                    <span className="text-[11px] text-zinc-500">%</span>
                    <button
                      type="button"
                      onClick={() => removeSlab(idx)}
                      className="text-[11px] px-1.5 border border-zinc-300 text-zinc-600 hover:bg-zinc-100 rounded transition-colors shrink-0"
                      title="Remove slab"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSlab}
                  className="text-[11px] px-2 py-0.5 border border-zinc-300 text-zinc-700 hover:bg-zinc-100 rounded transition-colors font-medium"
                >
                  + Add Slab
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="px-4 py-2 border-t border-zinc-300 flex justify-end gap-2 bg-zinc-50">
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors font-medium"
          >
            Quit (Esc)
          </button>
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 rounded bg-zinc-900 text-white hover:bg-zinc-800 transition-colors font-medium"
          >
            Accept (Ctrl+A)
          </button>
        </div>
      </div>
    </div>
  );
}
