import { useState, useEffect } from 'react';

const inputCls =
  'w-full bg-transparent text-[13px] outline-none py-1 px-1 placeholder:text-zinc-400 border-b border-transparent focus:border-zinc-400 transition-colors';
const selectCls =
  'w-full bg-transparent text-[13px] outline-none py-1 px-1 cursor-pointer border-b border-transparent focus:border-zinc-400 transition-colors';

const NATURE_OF_TRANSACTIONS = [
  'Imports',
  'Interstate Branch Transfer Inward',
  'Interstate Consignment Transfer Inward',
  'Interstate Purchase - Against Form C',
  'Interstate Purchase Deemed Export',
  'Interstate Purchase - E1',
  'Interstate Purchase - E2',
  'Interstate Purchase - Exempt',
  'Interstate Purchase Exempt - E1',
  'Interstate Purchase Exempt - With Form C',
  'Interstate Purchase - Taxable',
  'Interstate Purchase - Zero Rated',
  'Non Creditable Purchase - Special Goods',
  'Purchase Exempt',
  'Purchase from Unregistered Dealer',
  'Purchase Taxable',
  'Purchase Taxable - Capital Goods',
  'Purchase - Works Contract',
];

const TAX_TYPES = ['Unknown', 'Exempt', 'Tax Free'];

export interface VATTaxRateFormData {
  nature_of_transaction: string;
  tax_rate: string;
  tax_type: string;
}

interface VATTaxRateDetailsModalProps {
  isOpen: boolean;
  ledgerName?: string;
  value: VATTaxRateFormData;
  onClose: () => void;
  onAccept: (state: VATTaxRateFormData) => void;
}

export default function VATTaxRateDetailsModal({
  isOpen,
  ledgerName,
  value,
  onClose,
  onAccept,
}: VATTaxRateDetailsModalProps) {
  const [form, setForm] = useState<VATTaxRateFormData>({
    nature_of_transaction: value.nature_of_transaction || 'Undefined',
    tax_rate: value.tax_rate || '0',
    tax_type: value.tax_type || 'Unknown',
  });

  const [highlightedTaxType, setHighlightedTaxType] = useState<string>(value.tax_type || 'Unknown');

  useEffect(() => {
    if (isOpen) {
      setForm({
        nature_of_transaction: value.nature_of_transaction || 'Undefined',
        tax_rate: value.tax_rate || '0',
        tax_type: value.tax_type || 'Unknown',
      });
      setHighlightedTaxType(value.tax_type || 'Unknown');
    }
  }, [isOpen, value]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
      if (e.altKey && (e.key === 'a' || e.key === 'A') && isOpen) {
        e.preventDefault();
        onAccept(form);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, form, onClose, onAccept]);

  if (!isOpen) return null;

  const handleTaxTypeClick = (t: string) => {
    setHighlightedTaxType(t);
    setForm((f) => ({ ...f, tax_type: t }));
  };

  const update = <K extends keyof VATTaxRateFormData>(key: K, val: VATTaxRateFormData[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
  };

  return (
    <div data-enter-nav-ignore className="fixed inset-0 z-[60] bg-black/30">
      {/* Main modal - centered horizontally, with right padding to leave room for the panel */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pr-72">
        <div className="bg-white border border-zinc-300 shadow-2xl w-[480px] flex flex-col">
          {/* Tally-style title bar */}
          <div className="px-4 py-2 border-b border-zinc-300 bg-zinc-50 text-center">
            <span className="text-[13px] font-semibold text-zinc-900">Tax/Rate details</span>
            {ledgerName && (
              <span className="text-[13px] font-semibold text-zinc-500"> — {ledgerName}</span>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 bg-white">
            <div className="mb-5">
              <div className="text-[13px] font-semibold text-zinc-800 mb-2">Transaction Info</div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-[13px] text-zinc-700 w-44 shrink-0">
                  Nature of transaction
                </span>
                <span className="text-zinc-400 mr-2">:</span>
                <select
                  className={selectCls}
                  value={form.nature_of_transaction}
                  onChange={(e) => update('nature_of_transaction', e.target.value)}
                >
                  <option value="Undefined">Undefined</option>
                  {NATURE_OF_TRANSACTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-zinc-800 mb-2">VAT Rate</div>
              <div className="flex items-center gap-2 mb-3 ml-4">
                <span className="text-[13px] text-zinc-700 w-44 shrink-0">Tax rate</span>
                <span className="text-zinc-400 mr-2">:</span>
                <input
                  className={inputCls}
                  type="number"
                  value={form.tax_rate}
                  onChange={(e) => update('tax_rate', e.target.value)}
                  placeholder="0"
                />
                <span className="text-[13px] text-zinc-500">%</span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-[13px] text-zinc-700 w-44 shrink-0">Tax type</span>
                <span className="text-zinc-400 mr-2">:</span>
                <select
                  className={selectCls}
                  value={form.tax_type}
                  onChange={(e) => {
                    update('tax_type', e.target.value);
                    setHighlightedTaxType(e.target.value);
                  }}
                >
                  {TAX_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-zinc-300 flex justify-end gap-2 bg-zinc-50">
            <button
              onClick={onClose}
              className="text-xs px-4 py-1.5 border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => onAccept(form)}
              className="text-xs px-6 py-1.5 bg-black text-white hover:bg-zinc-800 font-medium"
            >
              Accept
            </button>
          </div>
        </div>
      </div>

      {/* Right panel: sticks to extreme right edge */}
      <div className="absolute top-0 right-0 bottom-0 w-72 bg-white border-l border-zinc-300 flex flex-col shadow-2xl">
        <div className="px-3 py-2 border-b border-zinc-300 bg-zinc-50">
          <span className="text-[13px] font-semibold text-zinc-900">List of Taxability</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {TAX_TYPES.map((t) => (
            <div
              key={t}
              className={`px-3 py-1.5 text-[13px] cursor-pointer select-none ${
                highlightedTaxType === t
                  ? 'bg-zinc-200 text-zinc-900 font-medium'
                  : 'text-zinc-700 hover:bg-zinc-50'
              }`}
              onClick={() => handleTaxTypeClick(t)}
            >
              {t === 'Unknown' ? '◆ ' : ''}
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
