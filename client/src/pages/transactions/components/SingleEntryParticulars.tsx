import type { useVoucherForm, ParticularRow } from '../hooks/useVoucherForm';

/**
 * The single-entry "Particulars | Amount" ledger grid: a ledger picker plus a typed
 * amount per row (`form.particulars`). Extracted from AccountingVoucherBody so the same
 * grid backs both the accounting vouchers' single-entry layout AND the Accounting-Invoice
 * mode of the trade vouchers (Sales/Purchase/Credit Note/Debit Note) — no new markup.
 * Renders the header + the scrollable rows (with fillers); the owner supplies its footer.
 */
interface Props {
  form: ReturnType<typeof useVoucherForm>;
  handleAmountConfirm: (row: ParticularRow, idx: number) => void;
  /** Placeholder shown on the first empty row. */
  firstRowPlaceholder?: string;
}

export default function SingleEntryParticulars({
  form,
  handleAmountConfirm,
  firstRowPlaceholder = 'Select Ledger…',
}: Props) {
  return (
    <>
      <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="flex-1 text-sm font-semibold text-black">Particulars</div>
        <div className="w-40 text-right text-sm font-semibold text-black">Amount</div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {form.particulars.map((row, idx) => {
          const isActive =
            form.activeField?.type === 'particular' && form.activeField.rowId === row.id;
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
                  value={isActive ? form.ledgerSearchTerm : (row.ledger?.name ?? '')}
                  placeholder={idx === 0 ? firstRowPlaceholder : ''}
                  onFocus={() => form.handleFieldFocus({ type: 'particular', rowId: row.id })}
                  onChange={(e) => {
                    form.setLedgerSearchTerm(e.target.value);
                    if (!row.ledger) form.handleFieldFocus({ type: 'particular', rowId: row.id });
                  }}
                  autoComplete="off"
                />
                {row.ledgerBalance ? (
                  <span className="text-xs text-gray-500 italic shrink-0">
                    ({row.ledgerBalanceLabel || row.ledgerBalance})
                  </span>
                ) : null}
                {form.particulars.length > 1 && (
                  <button
                    type="button"
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
                    if (e.key !== 'Enter') return;
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
    </>
  );
}
