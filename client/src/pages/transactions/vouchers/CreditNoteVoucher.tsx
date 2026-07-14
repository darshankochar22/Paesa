// vouchers/CreditNoteVoucher.tsx
import { useState } from 'react';
import type { useVoucherForm } from '../hooks/useVoucherForm';
import FieldRow from '../components/FieldRow';
import StockItemDescription from '../components/StockItemDescription';
import GstNoteAdditionalDetailsPopup from '../components/popups/GstNoteAdditionalDetailsPopup';
import GstEwayBillDetailsPopup from '../components/popups/GstEwayBillDetailsPopup';
import EInvoiceRow from '../components/EInvoiceRow';
import VatNatureOfReturnPopup from '../components/popups/VatNatureOfReturnPopup';
import AdditionalTaxLedgerRows from '../components/AdditionalTaxLedgerRows';
import AccountingInvoiceBody from '../components/AccountingInvoiceBody';
import { useCompany } from '../../../context/CompanyContext';
import { isTaxFeatureEnabled } from '@/lib/taxFeatures';

interface Props {
  form: ReturnType<typeof useVoucherForm>;
  handleAmountConfirm: (row: any, idx: number) => void;
  focusStockQty: (idx: number) => void;
  focusStockRate: (idx: number) => void;
  proceedToNextStockRow: (idx: number) => void;
}

export default function CreditNoteVoucher({
  form,
  handleAmountConfirm,
  focusStockQty,
  focusStockRate,
  proceedToNextStockRow,
}: Props) {
  // F11 "Use separate Actual and Billed Quantity columns" — collapse to a single
  // Quantity column when the flag is explicitly No.
  const { features } = useCompany();
  const showBilled = features?.use_separate_actual_billed_qty !== 0;
  // F11 "Use Discount column in invoices" — hide the Disc % column when No.
  const showDisc = features?.use_discount_column_in_invoices !== 0;
  // F11 "Enable Value Added Tax (VAT)" — hide the Provide VAT details block when No.
  const vatEnabled = isTaxFeatureEnabled(features, 'vat');

  // Accounting Invoice mode (Ctrl+H / forced when F11 maintain_inventory is off): no
  // stock grid — pick ledgers with typed amounts. Party stays at top; the Ledger-account
  // picker + stock table are hidden. Tax-ledger rows + GST/e-Way + e-Invoice stay.
  if (form.isAccountingInvoice) {
    return (
      <AccountingInvoiceBody
        form={form}
        handleAmountConfirm={handleAmountConfirm}
        partyLabel="Party A/c name"
        footer={
          <>
            <CreditNoteGstEwayDetails form={form} />
            {features?.enable_gst && <EInvoiceRow form={form} />}
          </>
        }
      />
    );
  }

  return (
    <>
      <div className="flex justify-between items-start border-b border-gray-300 shrink-0 py-1">
        <div className="flex-1">
          <FieldRow
            label="Party A/c name"
            fieldType="party"
            ledger={form.partyLedger}
            balance={form.partyBalance}
            form={form}
          />
        </div>
        <div className="flex items-center gap-2 px-3 pt-0.5 shrink-0">
          <span className="text-sm text-black">Status</span>
          <span className="text-sm text-black">:</span>
          <span className="text-sm italic text-black">Excise</span>
        </div>
        <div className="flex items-center gap-2 px-3 pt-0.5 shrink-0">
          <span className="text-sm text-black">Price Level</span>
          <span className="text-sm text-black">:</span>
          <select
            className="w-40 text-sm border border-gray-400 px-1 py-0 outline-none focus:border-black bg-white"
            value={form.priceLevel}
            onChange={(e) => form.setPriceLevel(e.target.value)}
          >
            <option value="">♦ Not Applicable</option>
            {form.allPriceLevels.map((pl: string) => (
              <option key={pl} value={pl}>
                {pl}
              </option>
            ))}
          </select>
        </div>
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
          {showDisc && (
            <div className="w-16 text-right text-sm font-semibold text-black">Disc %</div>
          )}
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
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-1">
                  <input
                    data-stock-item={idx + 1}
                    type="text"
                    className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                    value={isActive ? form.stockSearchTerm : (row.stockItem?.name ?? '')}
                    placeholder={idx === 0 ? 'Select Item…' : ''}
                    onFocus={() => form.handleFieldFocus({ type: 'stockItem', rowId: row.id })}
                    onChange={(e) => {
                      form.setStockSearchTerm(e.target.value);
                      if (!row.stockItem)
                        form.handleFieldFocus({ type: 'stockItem', rowId: row.id });
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
                {row.stockItem && (
                  <StockItemDescription
                    itemName={row.stockItem.name}
                    value={row.descriptionRaw}
                    onChange={(v) => form.handleUpdateStockRow(row.id, { descriptionRaw: v })}
                  />
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

              {showDisc && (
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
              )}

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
          <div key={`cnf-${i}`} className="flex border-b border-gray-50 min-h-[22px] px-3" />
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

        {/* Additional tax / ledger lines (GST etc.) — same flow as Sales */}
        <AdditionalTaxLedgerRows form={form} handleAmountConfirm={handleAmountConfirm} />
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

      <div className="px-3 py-1 shrink-0">
        <button
          type="button"
          onClick={form.handleAddAdditionalRow}
          className="text-xs text-gray-500 hover:text-black border border-gray-300 px-2 py-0.5"
        >
          + Add Tax / Ledger Row
        </button>
      </div>

      {/* Provide GST details — only for a Purchase Accounts ledger */}
      {form.checkLedgerGroup(form.salesPurchaseLedger, ['purchase accounts']) && (
        <CreditNoteGSTDetails form={form} />
      )}

      {/* Provide VAT details — only for a Sales Accounts ledger, and only when VAT is on */}
      {vatEnabled && form.checkLedgerGroup(form.salesPurchaseLedger, ['sales accounts']) && (
        <CreditNoteVATDetails form={form} />
      )}

      {/* Provide GST/e-Way Bill details — Statutory Details popup */}
      <CreditNoteGstEwayDetails form={form} />

      {/* Provide e-Invoice details */}
      {features?.enable_gst && <EInvoiceRow form={form} />}
    </>
  );
}

// ── GST / e-Way Bill Details (Statutory Details popup) ────────────────────────
function CreditNoteGstEwayDetails({ form }: { form: any }) {
  const [provide, setProvide] = useState<'Yes' | 'No'>('No');
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      <div className="flex items-center border-t border-gray-200 shrink-0 px-3 py-1 bg-white gap-3">
        <span className="text-sm text-black">Provide GST/e-Way Bill details</span>
        <span className="text-sm text-black">:</span>
        {/* Keyboard: ←/→ toggle Yes/No; Enter on Yes opens the popup, Enter on No
            moves to Narration. data-gst-eway is the End-of-List focus target. */}
        <div
          data-gst-eway
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              e.preventDefault();
              setProvide((p) => (p === 'Yes' ? 'No' : 'Yes'));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (provide === 'Yes') {
                setShowPopup(true);
              } else {
                setShowPopup(false);
                (document.querySelector('[data-narration="true"]') as HTMLElement | null)?.focus();
              }
            }
          }}
          className="flex gap-2 outline-none focus:ring-1 focus:ring-black"
        >
          <button
            type="button"
            onClick={() => {
              setProvide('Yes');
              setShowPopup(true);
            }}
            className={`text-sm px-2 py-0 border ${provide === 'Yes' ? 'bg-black text-white border-black' : 'border-gray-400 text-black'}`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => {
              setProvide('No');
              setShowPopup(false);
            }}
            className={`text-sm px-2 py-0 border ${provide === 'No' ? 'bg-black text-white border-black' : 'border-gray-400 text-black'}`}
          >
            No
          </button>
        </div>
      </div>

      {showPopup && (
        <GstEwayBillDetailsPopup
          initialDetails={form.gstEwayDetails}
          showNoteReason
          noteNoLabel="Buyer's Debit Note No."
          onClose={() => {
            setProvide('No');
            setShowPopup(false);
          }}
          onSave={(details) => {
            form.setGstEwayDetails({ ...form.gstEwayDetails, ...details });
            setShowPopup(false);
          }}
        />
      )}
    </>
  );
}

// ── GST Details (Statutory / Additional Details) ──────────────────────────────
function CreditNoteGSTDetails({ form }: { form: any }) {
  const [provideGST, setProvideGST] = useState<'Yes' | 'No'>('No');
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      <div className="flex items-center border-t border-gray-200 shrink-0 px-3 py-1 bg-white gap-3">
        <span className="text-sm text-black">Provide GST Details</span>
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
          initialDetails={form.creditNoteDetails}
          onClose={() => {
            setProvideGST('No');
            setShowPopup(false);
          }}
          onSave={(details) => {
            form.setCreditNoteDetails({ ...form.creditNoteDetails, ...details });
            setShowPopup(false);
          }}
        />
      )}
    </>
  );
}

// ── VAT Details (Additional Details : Nature of Return) ───────────────────────
function CreditNoteVATDetails({ form }: { form: any }) {
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
          initialDetails={form.creditNoteDetails}
          onClose={() => {
            setProvideVAT('No');
            setShowPopup(false);
          }}
          onSave={(details) => {
            form.setCreditNoteDetails({ ...form.creditNoteDetails, ...details });
            setShowPopup(false);
          }}
        />
      )}
    </>
  );
}
