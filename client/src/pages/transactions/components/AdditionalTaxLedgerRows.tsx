import { gstRowInfo } from '../utils/gstRow';

/**
 * The "+ Add Tax / Ledger Row" lines shared by the trade invoices (Sales flow).
 * Renders each `form.additionalEntries` row in the same 6-column grid as the item
 * table: a ledger picker (opens the List of Ledger Accounts), the GST % in the
 * Rate column, and an editable Amount. GST ledgers hide the Dr/Cr selector (their
 * side is implied by the voucher). Used by Credit Note and Debit Note.
 */
export default function AdditionalTaxLedgerRows({
  form,
  handleAmountConfirm,
}: {
  form: any;
  handleAmountConfirm: (row: any, idx: number) => void;
}) {
  return (
    <>
      {form.additionalEntries.map((row: any, idx: number) => {
        const isAddActive =
          form.activeField?.type === 'additional' && form.activeField.rowId === row.id;
        const stockSubtotal = form.stockEntries.reduce(
          (s: number, r: any) => s + (Number(r.amountRaw) || 0),
          0,
        );
        const { isGstRow, rateLabel } = gstRowInfo(row.ledger, row.amountRaw, stockSubtotal);
        return (
          <div
            key={row.id}
            className="flex items-center border-b border-gray-100 min-h-[22px] group px-3 py-0"
          >
            <div className="flex-1 flex items-center gap-1">
              {!isGstRow && (
                <select
                  className="text-xs bg-transparent outline-none font-semibold text-black shrink-0"
                  value={row.type}
                  onChange={(e) =>
                    form.handleUpdateAdditionalRow(row.id, {
                      type: e.target.value as 'Dr' | 'Cr',
                    })
                  }
                >
                  <option value="Dr">Dr</option>
                  <option value="Cr">Cr</option>
                </select>
              )}
              <input
                data-additional-ledger={idx + 1}
                type="text"
                className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                value={isAddActive ? form.ledgerSearchTerm : (row.ledger?.name ?? '')}
                placeholder="Tax / Ledger…"
                onFocus={() => form.handleFieldFocus({ type: 'additional', rowId: row.id })}
                onChange={(e) => {
                  form.setLedgerSearchTerm(e.target.value);
                  if (!row.ledger) form.handleFieldFocus({ type: 'additional', rowId: row.id });
                }}
                autoComplete="off"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => form.handleRemoveAdditionalRow(row.id)}
                className="text-xs text-gray-300 hover:text-black opacity-0 group-hover:opacity-100 shrink-0"
              >
                &times;
              </button>
            </div>

            {/* Quantity column — unused for a tax line */}
            <div className="w-44" />
            {/* Rate column — the applied GST % */}
            <div className="w-20 text-right pr-1 text-sm text-black select-none">{rateLabel}</div>
            {/* per + Disc% columns — unused for a tax line */}
            <div className="w-12" />
            <div className="w-16" />
            {/* Amount column */}
            <div className="w-32 text-right">
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
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  handleAmountConfirm(row, idx);
                }}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}
