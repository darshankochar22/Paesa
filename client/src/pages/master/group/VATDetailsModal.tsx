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

const PARTY_ENTITY_OPTIONS = ['Not Applicable', 'SEZ / STP / EHTP'];
const TAX_TYPES = ['Unknown', 'Exempt', 'Tax Free'];

const NATURES_WITH_ENTITY_TYPE = new Set([
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
]);

export interface VATData {
  vat_nature_of_transaction: string;
  vat_party_entity_type: string;
  vat_tax_rate: number;
  vat_tax_type: string;
  vat_revised_applicability: string;
}

interface VATDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<VATData>;
  onSave?: (data: VATData) => void;
}

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function VATDetailsModal({
  isOpen,
  onClose,
  initialData,
  onSave,
}: VATDetailsModalProps) {
  const [natureOfTransaction, setNatureOfTransaction] = useState('Undefined');
  const [partyEntityType, setPartyEntityType] = useState('Not Applicable');
  const [taxRate, setTaxRate] = useState('0');
  const [taxType, setTaxType] = useState('Unknown');
  const [highlightedTaxType, setHighlightedTaxType] = useState('Unknown');
  const [revisedApplicability, setRevisedApplicability] = useState('');
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [pendingNature, setPendingNature] = useState('');
  const [dateInput, setDateInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNatureOfTransaction(initialData?.vat_nature_of_transaction || 'Undefined');
      setPartyEntityType(initialData?.vat_party_entity_type || 'Not Applicable');
      setTaxRate(String(initialData?.vat_tax_rate ?? 0));
      setTaxType(initialData?.vat_tax_type || 'Unknown');
      setHighlightedTaxType(initialData?.vat_tax_type || 'Unknown');
      setRevisedApplicability(initialData?.vat_revised_applicability || '');
      setShowDatePopup(false);
      setPendingNature('');
      setDateInput(initialData?.vat_revised_applicability || '');
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        if (showDatePopup) setShowDatePopup(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, showDatePopup]);

  if (!isOpen) return null;

  const handleNatureChange = (val: string) => {
    setPendingNature(val);
    setDateInput('');
    setShowDatePopup(true);
  };

  const handleDateConfirm = () => {
    setNatureOfTransaction(pendingNature);
    setRevisedApplicability(dateInput);
    setShowDatePopup(false);
    setPendingNature('');
    if (!NATURES_WITH_ENTITY_TYPE.has(pendingNature)) {
      setPartyEntityType('Not Applicable');
    }
  };

  const handleDateCancel = () => {
    setShowDatePopup(false);
    setPendingNature('');
    setDateInput('');
  };

  const handleAccept = () => {
    onSave?.({
      vat_nature_of_transaction: natureOfTransaction,
      vat_party_entity_type: partyEntityType,
      vat_tax_rate: Number(taxRate) || 0,
      vat_tax_type: taxType,
      vat_revised_applicability: revisedApplicability,
    });
    onClose();
  };

  const showEntityType = NATURES_WITH_ENTITY_TYPE.has(natureOfTransaction);

  return (
    <div data-enter-nav-ignore className="fixed inset-0 z-[60] bg-black/30">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pr-72">
        <div className="bg-white border border-zinc-300 shadow-2xl w-[480px] flex flex-col">
          <div className="px-4 py-2 border-b border-zinc-300 bg-zinc-50 text-center">
            <span className="text-[13px] font-semibold text-zinc-900">Tax/Rate details</span>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 bg-white">
            {/* Transaction Info */}
            <div className="mb-5">
              <div className="text-[13px] font-semibold text-zinc-800 mb-2">Transaction Info</div>
              <div className="flex items-center gap-2 ml-4 mb-2">
                <span className="text-[13px] text-zinc-700 w-44 shrink-0">
                  Nature of transaction
                </span>
                <span className="text-zinc-400 mr-2">:</span>
                <select
                  className={selectCls}
                  value={natureOfTransaction}
                  onChange={(e) => handleNatureChange(e.target.value)}
                >
                  <option value="Undefined">Undefined</option>
                  {NATURE_OF_TRANSACTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              {showEntityType && (
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-[13px] text-zinc-700 w-44 shrink-0">
                    Party Entity/Org. Type
                  </span>
                  <span className="text-zinc-400 mr-2">:</span>
                  <select
                    className={selectCls}
                    value={partyEntityType}
                    onChange={(e) => setPartyEntityType(e.target.value)}
                  >
                    {PARTY_ENTITY_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* VAT Rate */}
            <div>
              <div className="text-[13px] font-semibold text-zinc-800 mb-2">VAT Rate</div>
              <div className="flex items-start gap-2 mb-3 ml-4">
                <span className="text-[13px] text-zinc-700 w-44 shrink-0 pt-1">Tax rate</span>
                <span className="text-zinc-400 mr-2 pt-1">:</span>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <input
                      className={inputCls}
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      placeholder="0"
                    />
                    <span className="text-[13px] text-zinc-500">%</span>
                  </div>
                  {revisedApplicability && (
                    <div className="text-[11px] text-zinc-400 mt-0.5 pl-1">
                      (From {formatDate(revisedApplicability)})
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-[13px] text-zinc-700 w-44 shrink-0">Tax type</span>
                <span className="text-zinc-400 mr-2">:</span>
                <select
                  className={selectCls}
                  value={taxType}
                  onChange={(e) => {
                    setTaxType(e.target.value);
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

          <div className="px-4 py-3 border-t border-zinc-300 flex justify-end gap-2 bg-zinc-50">
            <button
              onClick={onClose}
              className="text-xs px-4 py-1.5 border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleAccept}
              className="text-xs px-6 py-1.5 bg-black text-white hover:bg-zinc-800 font-medium"
            >
              Accept
            </button>
          </div>
        </div>
      </div>

      {/* Right panel: List of Taxability */}
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
              onClick={() => {
                setTaxType(t);
                setHighlightedTaxType(t);
              }}
            >
              {t === 'Unknown' ? '◆ ' : ''}
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Revised Applicability date popup — fires every time nature changes */}
      {showDatePopup && (
        <div
          data-enter-nav-ignore
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
        >
          <div className="bg-white border border-zinc-300 shadow-2xl w-80 flex flex-col">
            <div className="px-4 py-2 border-b border-zinc-300 bg-zinc-50 text-center">
              <span className="text-[13px] font-semibold text-zinc-900">Revised Applicability</span>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-zinc-700 w-32 shrink-0">Applicable from</span>
                <span className="text-zinc-400 mr-2">:</span>
                <input
                  autoFocus
                  className="w-full bg-transparent text-[13px] outline-none py-1 px-1 border-b border-zinc-300 focus:border-zinc-500"
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDateConfirm();
                  }}
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-zinc-300 flex justify-end gap-2 bg-zinc-50">
              <button
                onClick={handleDateCancel}
                className="text-xs px-4 py-1.5 border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDateConfirm}
                className="text-xs px-6 py-1.5 bg-black text-white hover:bg-zinc-800 font-medium"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
