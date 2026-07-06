// vouchers/DebitNoteVoucher.tsx
import { useState } from 'react';
import type { useVoucherForm } from '../hooks/useVoucherForm';
import FieldRow from '../components/FieldRow';
import GstNoteAdditionalDetailsPopup from '../components/popups/GstNoteAdditionalDetailsPopup';
import VatNatureOfReturnPopup from '../components/popups/VatNatureOfReturnPopup';
import { useCompany } from '../../../context/CompanyContext';

interface Props {
  form: ReturnType<typeof useVoucherForm>;
  handleAmountConfirm: (row: any, idx: number) => void;
  focusStockQty: (idx: number) => void;
  focusStockRate: (idx: number) => void;
  proceedToNextStockRow: (idx: number) => void;
}

export default function DebitNoteVoucher({
  form,
  focusStockQty,
  focusStockRate,
  proceedToNextStockRow,
}: Props) {
  // F11 "Use separate Actual and Billed Quantity columns" — collapse to a single
  // Quantity column when the flag is explicitly No.
  const { features } = useCompany();
  const showBilled = features?.use_separate_actual_billed_qty !== 0;
  return (
    <>
      {/* Party */}
      <div className="border-b border-gray-300 shrink-0 py-1">
        <FieldRow
          label="Party A/c name"
          fieldType="party"
          ledger={form.partyLedger}
          balance={form.partyBalance}
          form={form}
        />
      </div>

      {/* Ledger account */}
      <div className="border-b border-gray-300 shrink-0 py-1">
        <FieldRow
          label="Ledger account"
          fieldType="salesPurchase"
          ledger={form.salesPurchaseLedger}
          balance={form.salesPurchaseBalance}
          form={form}
        />
      </div>

      {/* Separator line like Tally */}
      <div className="border-b border-black shrink-0" />

      {/* Stock items table header — two rows: main labels, then Actual/Billed sub-labels */}
      <div className="border-b border-black shrink-0 bg-white">
        <div className="flex px-3 py-0.5">
          <div className="flex-1 text-sm font-semibold text-black">Name of Item</div>
          <div className="w-44 text-center text-sm font-semibold text-black">Quantity</div>
          <div className="w-20 text-right text-sm font-semibold text-black">Rate</div>
          <div className="w-12 text-center text-sm font-semibold text-black">per</div>
          <div className="w-16 text-right text-sm font-semibold text-black">Disc %</div>
          <div className="w-32 text-right text-sm font-semibold text-black">Amount</div>
        </div>
        <div className="flex px-3 py-0.5 border-t border-gray-200">
          <div className="flex-1" />
          <div className="w-44 flex">
            {showBilled && (
              <>
                <div className="flex-1 text-center text-xs text-zinc-600">Actual</div>
                <div className="flex-1 text-center text-xs text-zinc-600">Billed</div>
              </>
            )}
          </div>
          <div className="w-20" />
          <div className="w-12" />
          <div className="w-16" />
          <div className="w-32" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Stock item rows */}
        {form.stockEntries.map((row, idx) => {
          const isActive =
            form.activeField?.type === 'stockItem' && form.activeField.rowId === row.id;
          return (
            <div
              key={row.id}
              className="flex items-center border-b border-gray-100 min-h-[22px] group px-3 py-0"
            >
              <div className="flex-1 flex items-center gap-1">
                <input
                  data-stock-item={idx + 1}
                  type="text"
                  className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                  value={isActive ? form.stockSearchTerm : (row.stockItem?.name ?? '')}
                  placeholder={idx === 0 ? 'Select Item…' : ''}
                  onFocus={() => form.handleFieldFocus({ type: 'stockItem', rowId: row.id })}
                  onChange={(e) => {
                    form.setStockSearchTerm(e.target.value);
                    if (!row.stockItem) form.handleFieldFocus({ type: 'stockItem', rowId: row.id });
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || !row.stockItem) return;
                    e.preventDefault();
                    focusStockQty(idx);
                  }}
                  autoComplete="off"
                />
                {form.stockEntries.length > 1 && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => form.handleRemoveStockRow(row.id)}
                    className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Quantity: Actual / Billed split */}
              <div className="w-44 flex">
                <div className="flex-1 text-right pr-1">
                  <input
                    data-stock-qty={idx + 1}
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                    value={row.quantityRaw}
                    placeholder=""
                    onChange={(e) =>
                      form.handleUpdateStockRow(row.id, { quantityRaw: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      focusStockRate(idx);
                    }}
                  />
                </div>
                {showBilled && (
                  <div className="flex-1 text-right pr-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                      value={row.billedQtyRaw ?? row.quantityRaw}
                      placeholder=""
                      onChange={(e) =>
                        form.handleUpdateStockRow(row.id, { billedQtyRaw: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="w-20 text-right pr-1">
                <input
                  data-stock-rate={idx + 1}
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                  value={row.rateRaw}
                  placeholder=""
                  onChange={(e) => form.handleUpdateStockRow(row.id, { rateRaw: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    proceedToNextStockRow(idx);
                  }}
                />
              </div>

              <div className="w-12 text-center text-xs text-gray-500">{row.unit?.symbol ?? ''}</div>

              <div className="w-16 text-right pr-1">
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                  value={row.discPercentRaw ?? ''}
                  placeholder=""
                  onChange={(e) =>
                    form.handleUpdateStockRow(row.id, { discPercentRaw: e.target.value })
                  }
                />
              </div>

              <div className="w-32 text-right text-sm font-semibold text-black select-none">
                {row.amountRaw
                  ? Number(row.amountRaw).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : ''}
              </div>
            </div>
          );
        })}

        {/* Filler rows */}
        {Array.from({ length: Math.max(0, 5 - form.stockEntries.length) }).map((_, i) => (
          <div key={`dnf-${i}`} className="flex border-b border-gray-50 min-h-[22px] px-3" />
        ))}

        {/* Stock subtotal */}
        {form.stockEntries.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0) > 0 && (
          <div className="flex border-t border-gray-300 border-b border-gray-300 px-3 py-0.5 bg-white">
            <div className="flex-1 text-xs text-gray-700">Subtotal</div>
            <div className="w-44" />
            <div className="w-20" />
            <div className="w-12" />
            <div className="w-16" />
            <div className="w-32 text-right text-sm font-semibold text-black">
              {form.stockEntries
                .reduce((s, r) => s + (Number(r.amountRaw) || 0), 0)
                .toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
            </div>
          </div>
        )}
      </div>

      {/* Grand total footer */}
      <div className="flex border-t border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="flex-1 text-sm font-semibold text-black" />
        <div className="w-32 text-right text-sm font-semibold text-black">
          {form.totalAmount > 0
            ? form.totalAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : ''}
        </div>
      </div>

      {/* Provide GST details — only for a Purchase Accounts ledger */}
      {form.checkLedgerGroup(form.salesPurchaseLedger, ['purchase accounts']) && (
        <DebitNoteGSTDetails form={form} />
      )}

      {/* Provide VAT details — only for a Sales Accounts ledger */}
      {form.checkLedgerGroup(form.salesPurchaseLedger, ['sales accounts']) && (
        <DebitNoteVATDetails form={form} />
      )}
    </>
  );
}

// ── GST Details (Additional Details : Reason for Issuing Note) ────────────────
function DebitNoteGSTDetails({ form }: { form: any }) {
  const [provideGST, setProvideGST] = useState<'Yes' | 'No'>('No');
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      <div className="flex items-center border-t border-gray-200 shrink-0 px-3 py-1 bg-white gap-3">
        <span className="text-sm text-black">Provide GST details</span>
        <span className="text-sm text-black">:</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setProvideGST('Yes');
              setShowPopup(true);
            }}
            className={`text-sm px-2 py-0 border ${provideGST === 'Yes' ? 'bg-black text-white border-black' : 'border-gray-400 text-black'}`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => {
              setProvideGST('No');
              setShowPopup(false);
            }}
            className={`text-sm px-2 py-0 border ${provideGST === 'No' ? 'bg-black text-white border-black' : 'border-gray-400 text-black'}`}
          >
            No
          </button>
        </div>
      </div>

      {showPopup && (
        <GstNoteAdditionalDetailsPopup
          initialDetails={form.debitNoteDetails}
          onClose={() => {
            setProvideGST('No');
            setShowPopup(false);
          }}
          onSave={(details) => {
            form.setDebitNoteDetails({ ...form.debitNoteDetails, ...details });
            setShowPopup(false);
          }}
        />
      )}
    </>
  );
}

// ── VAT Details (Additional Details : Nature of Return) ───────────────────────
function DebitNoteVATDetails({ form }: { form: any }) {
  const [provideVAT, setProvideVAT] = useState<'Yes' | 'No'>('No');
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      <div className="flex items-center border-t border-gray-200 shrink-0 px-3 py-1 bg-white gap-3">
        <span className="text-sm text-black">Provide VAT details</span>
        <span className="text-sm text-black">:</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setProvideVAT('Yes');
              setShowPopup(true);
            }}
            className={`text-sm px-2 py-0 border ${provideVAT === 'Yes' ? 'bg-black text-white border-black' : 'border-gray-400 text-black'}`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => {
              setProvideVAT('No');
              setShowPopup(false);
            }}
            className={`text-sm px-2 py-0 border ${provideVAT === 'No' ? 'bg-black text-white border-black' : 'border-gray-400 text-black'}`}
          >
            No
          </button>
        </div>
      </div>

      {showPopup && (
        <VatNatureOfReturnPopup
          initialDetails={form.debitNoteDetails}
          onClose={() => {
            setProvideVAT('No');
            setShowPopup(false);
          }}
          onSave={(details) => {
            form.setDebitNoteDetails({ ...form.debitNoteDetails, ...details });
            setShowPopup(false);
          }}
        />
      )}
    </>
  );
}
