import { useState, useEffect, useMemo } from 'react';

export interface ChequeRange {
  from_number: string;
  to_number: string;
  name: string;
}

/** Cheque Printing Configuration — all dimensions in mm (stored as strings). */
export interface ChequePrintingConfig {
  // Cheque Dimension
  width_of_cheque: string;
  height_of_cheque: string;
  // Cross Cheque
  cross_start_left: string;
  cross_start_top: string;
  // Cheque Date
  date_distance_top: string;
  date_start_left: string;
  style_of_date: string;
  date_separator: string;
  date_separator_width: string;
  date_char_distance: string;
  // Party's / Payee Name
  payee_distance_top: string;
  payee_start_left: string;
  payee_width: string;
  // Amount in Words
  words_a_dist_2nd_top: string; // (A) Distance of 2nd Line from Top Edge
  words_b_gap: string; // (B) Height (gap) between 2nd and 1st Line
  words_1st_start_left: string;
  words_2nd_start_left: string;
  words_width: string;
  print_currency_formal_name: string; // Yes/No
  // Amount in Figures
  figures_distance_top: string;
  figures_start_left: string;
  figures_width: string;
  print_currency_symbol: string; // Yes/No
  // Company Signatory Details
  company_name_on_cheque: string;
  print_company_name: string; // Yes/No
  salutation_1st: string;
  salutation_2nd: string;
  sign_distance_top: string;
  sign_start_left: string;
  sign_width: string;
  sign_height: string;
}

export const EMPTY_CHEQUE_PRINTING_CONFIG: ChequePrintingConfig = {
  width_of_cheque: '',
  height_of_cheque: '',
  cross_start_left: '',
  cross_start_top: '',
  date_distance_top: '',
  date_start_left: '',
  style_of_date: 'dd-mmm-yyyy',
  date_separator: '',
  date_separator_width: '',
  date_char_distance: '',
  payee_distance_top: '',
  payee_start_left: '',
  payee_width: '',
  words_a_dist_2nd_top: '',
  words_b_gap: '',
  words_1st_start_left: '',
  words_2nd_start_left: '',
  words_width: '',
  print_currency_formal_name: 'Yes',
  figures_distance_top: '',
  figures_start_left: '',
  figures_width: '',
  print_currency_symbol: 'Yes',
  company_name_on_cheque: '',
  print_company_name: 'Yes',
  salutation_1st: '',
  salutation_2nd: '',
  sign_distance_top: '',
  sign_start_left: '',
  sign_width: '',
  sign_height: '',
};

export interface BankDetails {
  account_holder_name?: string;
  account_number?: string;
  ifsc_code?: string;
  swift_code?: string;
  bank_name?: string;
  branch?: string;
  bsr_code?: string;
  set_alter_cheque_books?: string;
  cheque_ranges?: ChequeRange[];
  enable_cheque_printing?: string;
  set_alter_cheque_printing?: string;
  cheque_printing_config?: ChequePrintingConfig;
  transaction_type?: string;
  cross_using?: string;
  company_bank?: string;
  beneficiary_code?: string;
}

export const EMPTY_BANK_DETAILS: BankDetails = {
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  swift_code: '',
  bank_name: '',
  branch: '',
  bsr_code: '',
  set_alter_cheque_books: 'No',
  cheque_ranges: [],
  enable_cheque_printing: 'No',
  set_alter_cheque_printing: 'No',
  transaction_type: '',
  cross_using: 'A/c Payee',
  company_bank: '',
  beneficiary_code: '',
};

interface BankDetailsPopupProps {
  ledgerName: string;
  bankForm: BankDetails;
  setBankForm: React.Dispatch<React.SetStateAction<BankDetails>>;
  onClose: () => void;
  onAccept: () => void;
  isOD?: boolean;
}

const TXN_TYPES_DEFAULT = ['End of List', 'Cheque', 'e-Fund Transfer', 'Others'];
const TXN_TYPES_MORE = [
  'End of List',
  'ATM',
  'Card',
  'Cheque',
  'ECS',
  'e-Fund Transfer',
  'Electronic Cheque',
  'Electronic DD/PO',
  'Others',
];

const INSTANT_CLOSE = new Set([
  'ATM',
  'Card',
  'ECS',
  'Electronic Cheque',
  'Electronic DD/PO',
  'Others',
]);
const BANK_LIST = ['All Items', 'End of List', 'SBI', 'HDFC', 'ICICI', 'Axis', 'PNB', 'BOB'];

export default function BankDetailsPopup({
  ledgerName,
  isOD: _isOD = false,
  bankForm,
  setBankForm,
  onClose,
  onAccept,
}: BankDetailsPopupProps) {
  const [showMore, setShowMore] = useState(false);
  const [showBankList, setShowBankList] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [activeBankIdx, setActiveBankIdx] = useState(0);

  const txnList = showMore ? TXN_TYPES_MORE : TXN_TYPES_DEFAULT;
  const selectedTxn = bankForm.transaction_type ?? '';

  const set = (key: keyof BankDetails) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setBankForm((f) => ({ ...f, [key]: e.target.value }));

  const selectTxn = (txn: string) => {
    if (txn === 'End of List') {
      setBankForm((f) => ({ ...f, transaction_type: '' }));
      onAccept();
      return;
    }
    if (INSTANT_CLOSE.has(txn)) {
      setBankForm((f) => ({ ...f, transaction_type: txn }));
      onAccept();
      return;
    }

    setBankForm((f) => ({
      ...f,
      transaction_type: txn,
      cross_using: txn === 'Cheque' ? f.cross_using || 'A/c Payee' : f.cross_using,
      company_bank: txn === 'e-Fund Transfer' ? f.company_bank || '' : f.company_bank,
      beneficiary_code: txn === 'e-Fund Transfer' ? f.beneficiary_code || '' : f.beneficiary_code,
    }));
  };

  // ── bank list filter ──
  const filteredBanks = useMemo(() => {
    if (!bankSearch) return BANK_LIST;
    return BANK_LIST.filter((b) => b.toLowerCase().includes(bankSearch.toLowerCase()));
  }, [bankSearch]);

  useEffect(() => {
    setActiveBankIdx(0);
  }, [bankSearch]);

  // ── bank select ──
  const selectBank = (bank: string) => {
    if (bank === 'End of List') {
      setBankForm((f) => ({ ...f, company_bank: '', beneficiary_code: '' }));
      setShowBankList(false);
      setBankSearch('');
      return;
    }
    setBankForm((f) => ({ ...f, company_bank: bank, beneficiary_code: '' }));
    setShowBankList(false);
    setBankSearch('');
  };

  // ── bank list keyboard ──
  const bankKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveBankIdx((p) => (p + 1) % filteredBanks.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveBankIdx((p) => (p - 1 + filteredBanks.length) % filteredBanks.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredBanks[activeBankIdx]) selectBank(filteredBanks[activeBankIdx]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowBankList(false);
      setBankSearch('');
    }
  };

  // ── global keyboard ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showBankList) {
          setShowBankList(false);
          setBankSearch('');
          return;
        }
        onClose();
      }
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        onAccept();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onAccept, showBankList]);

  // ── derived display values ──
  const companyBankDisplay = bankForm.company_bank
    ? bankForm.company_bank === 'All Items'
      ? '• All Items'
      : bankForm.company_bank
    : '• End of List';

  const hasBankSelected =
    !!bankForm.company_bank &&
    bankForm.company_bank !== '' &&
    bankForm.company_bank !== 'End of List';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    // Full-screen dimmed backdrop
    <div
      data-enter-nav-ignore
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/10 pt-20"
    >
      <div className="flex items-start gap-0">
        {/* ════════════════════════════════════════
            MAIN MODAL
        ════════════════════════════════════════ */}
        <div
          className="bg-white border border-zinc-400 shadow-lg flex flex-col"
          style={{ width: 560, minHeight: 440 }}
        >
          {/* Title */}
          <div className="border-b border-zinc-300 text-center py-1 select-none bg-white">
            <span className="text-[11px] text-zinc-700">Bank Details for: </span>
            <span className="text-[11px] font-semibold text-zinc-900">{ledgerName || '—'}</span>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 px-0 pt-1">
            {/* "Transaction Type" label row */}
            <div className="flex items-center px-3 py-0.5">
              <span className="text-[11px] font-semibold text-zinc-800">Transaction Type</span>
            </div>

            {/* Thin separator under label */}
            <div className="border-b border-zinc-300 mx-0" />

            {/* The active yellow input row — shows the selected txn type */}
            <div className="flex items-center bg-[#fffde7] border-b border-zinc-200 px-3 py-[3px]">
              <input
                readOnly
                value={selectedTxn}
                className="text-[11px] text-zinc-900 bg-transparent outline-none w-48 font-normal cursor-default"
                tabIndex={-1}
              />
            </div>

            {/* ── Cheque sub-fields ── */}
            {selectedTxn === 'Cheque' && (
              <div className="flex items-center bg-[#fffde7] border-b border-zinc-200 px-3 py-[3px]">
                <span className="text-[11px] text-zinc-700 w-24 shrink-0">Cross using</span>
                <span className="text-[11px] text-zinc-500 mr-2 shrink-0">:</span>
                <input
                  autoFocus
                  className="text-[11px] text-zinc-900 bg-transparent outline-none flex-1 border-b border-transparent focus:border-zinc-400"
                  value={bankForm.cross_using ?? 'A/c Payee'}
                  onChange={set('cross_using')}
                />
              </div>
            )}

            {/* ── e-Fund Transfer sub-fields ── */}
            {selectedTxn === 'e-Fund Transfer' && (
              <>
                {/* "e-Fund Transfer" sub-section label */}
                <div className="flex items-center px-3 py-0.5">
                  <span className="text-[11px] font-semibold text-zinc-800">e-Fund Transfer</span>
                </div>

                {/* A/c No. + IFS Code — same row, yellow, with column divider */}
                <div className="flex items-center bg-[#fffde7] border-b border-zinc-200">
                  {/* Left half: A/c No. */}
                  <div className="flex items-center px-3 py-[3px] flex-1">
                    <span className="text-[11px] text-zinc-700 w-12 shrink-0">A/c No.</span>
                    <span className="text-[11px] text-zinc-500 mr-1 shrink-0">:</span>
                    <input
                      autoFocus
                      className="text-[11px] text-zinc-900 bg-transparent outline-none flex-1 border-b border-transparent focus:border-zinc-400"
                      value={bankForm.account_number ?? ''}
                      onChange={set('account_number')}
                    />
                  </div>

                  <div className="w-px bg-zinc-300 self-stretch" />
                  <div className="flex items-center px-3 py-[3px] flex-1">
                    <span className="text-[11px] text-zinc-700 w-14 shrink-0">IFS Code</span>
                    <span className="text-[11px] text-zinc-500 mr-1 shrink-0">:</span>
                    <input
                      className="text-[11px] text-zinc-900 bg-transparent outline-none flex-1 border-b border-transparent focus:border-zinc-400"
                      value={bankForm.ifsc_code ?? ''}
                      onChange={set('ifsc_code')}
                    />
                  </div>
                </div>

                <div className="flex items-center px-3 py-[3px] border-b border-zinc-200 bg-white">
                  <span className="text-[11px] text-zinc-700 w-24 shrink-0">Bank Name</span>
                  <span className="text-[11px] text-zinc-500 mr-2 shrink-0">:</span>
                  <span className="text-[11px] text-zinc-700">
                    {bankForm.bank_name ? bankForm.bank_name : '• Not Applicable'}
                  </span>
                </div>

                <div
                  className={[
                    'flex items-center px-3 py-[3px] border-b border-zinc-200 cursor-pointer',
                    !hasBankSelected ? 'bg-[#fffde7]' : 'bg-white',
                  ].join(' ')}
                  onClick={() => setShowBankList(true)}
                >
                  <span className="text-[11px] text-zinc-700 w-24 shrink-0">Company Bank</span>
                  <span className="text-[11px] text-zinc-500 mr-2 shrink-0">:</span>
                  <span className="text-[11px] text-zinc-900">{companyBankDisplay}</span>
                </div>

                {/* Beneficiary Code — appears ONLY after a real bank is chosen, yellow active */}
                {hasBankSelected && (
                  <div className="flex items-center bg-[#fffde7] border-b border-zinc-200 px-3 py-[3px]">
                    <span className="text-[11px] text-zinc-700 w-24 shrink-0">
                      Beneficiary Code
                    </span>
                    <span className="text-[11px] text-zinc-500 mr-2 shrink-0">:</span>
                    <input
                      autoFocus
                      className="text-[11px] text-zinc-900 bg-transparent outline-none flex-1 border-b border-transparent focus:border-zinc-400"
                      value={bankForm.beneficiary_code ?? ''}
                      onChange={set('beneficiary_code')}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-zinc-300 flex select-none">
            <button
              onClick={onClose}
              className="px-4 py-1 text-[11px] text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <span className="underline">Q</span>: Quit
            </button>
            <button
              onClick={onAccept}
              className="px-4 py-1 text-[11px] text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <span className="underline">A</span>: Accept
            </button>
          </div>
        </div>

        <div
          className="bg-white border border-zinc-400 shadow-lg flex flex-col ml-0"
          style={{ width: 170 }}
        >
          <div className="bg-[#1a56db] text-white flex items-center justify-between px-2 py-[3px] select-none">
            <span className="text-[11px] font-semibold">Transaction Types</span>
            <button
              onClick={onClose}
              className="text-white text-xs leading-none hover:opacity-70 ml-2"
            >
              ✕
            </button>
          </div>

          <div className="flex justify-end border-b border-zinc-200">
            <button
              onClick={() => setShowMore((v) => !v)}
              className="text-[10px] px-2 py-[2px] bg-zinc-100 hover:bg-zinc-200 transition-colors text-zinc-700 font-medium border-l border-zinc-200"
            >
              {showMore ? 'Show Less' : 'Show More'}
            </button>
          </div>

          <div className="py-0.5">
            {txnList.map((txn) => {
              const isSelected = selectedTxn === txn || (!selectedTxn && txn === 'End of List');
              return (
                <div
                  key={txn}
                  onClick={() => selectTxn(txn)}
                  className={[
                    'text-[11px] px-3 py-[2px] cursor-pointer select-none transition-colors',
                    isSelected ? 'bg-zinc-700 text-white' : 'text-zinc-800 hover:bg-zinc-100',
                  ].join(' ')}
                >
                  {txn === 'End of List' ? `• ${txn}` : txn}
                  {txn === 'e-Fund Transfer' && selectedTxn === 'e-Fund Transfer' ? '' : ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* ════════════════════════════════════════
            LIST OF BANKS SUB-PANEL
            (appears to the right when Company Bank is clicked)
        ════════════════════════════════════════ */}
        {showBankList && (
          <div
            className="bg-white border border-zinc-400 shadow-lg flex flex-col ml-0"
            style={{ width: 160 }}
          >
            {/* Header */}
            <div className="bg-[#1a56db] text-white px-2 py-[3px] select-none">
              <span className="text-[11px] font-semibold">List of Banks</span>
            </div>

            {/* Search */}
            <div className="border-b border-zinc-200 px-1 py-0.5">
              <input
                autoFocus
                className="w-full text-[11px] bg-zinc-50 border border-zinc-300 px-1.5 py-[2px] outline-none focus:border-zinc-500"
                placeholder="Search..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                onKeyDown={bankKeydown}
              />
            </div>

            {/* Options */}
            <div className="py-0.5">
              {filteredBanks.length === 0 ? (
                <div className="text-[10px] text-zinc-400 px-3 py-1 italic">No match</div>
              ) : (
                filteredBanks.map((bank, idx) => {
                  const isActive = idx === activeBankIdx;
                  const isCurrent = bankForm.company_bank === bank;
                  return (
                    <div
                      key={bank}
                      onClick={() => selectBank(bank)}
                      className={[
                        'text-[11px] px-3 py-[2px] cursor-pointer select-none transition-colors',
                        isCurrent || isActive
                          ? 'bg-zinc-700 text-white'
                          : 'text-zinc-800 hover:bg-zinc-100',
                      ].join(' ')}
                    >
                      {bank === 'End of List' || bank === 'All Items' ? `• ${bank}` : bank}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
