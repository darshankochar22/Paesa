import type { ReactNode } from 'react';
import type { useVoucherForm, ParticularRow } from '../hooks/useVoucherForm';
import FieldRow from './FieldRow';
import SingleEntryParticulars from './SingleEntryParticulars';
import AdditionalTaxLedgerRows from './AdditionalTaxLedgerRows';

/**
 * TallyPrime "Accounting Invoice" body (Ctrl+H) for the trade vouchers
 * (Sales/Purchase/Credit Note/Debit Note). No stock grid: the Party A/c stays at the
 * top and the user picks ledgers with typed amounts in the shared particulars grid,
 * exactly like a single-entry Journal. The additional tax/ledger rows section still
 * works. The invoice total (form.totalAmount) = particulars + tax rows and is posted as
 * the party amount by voucherSubmit's accounting-invoice branch.
 */
interface Props {
  form: ReturnType<typeof useVoucherForm>;
  handleAmountConfirm: (row: ParticularRow, idx: number) => void;
  /** Label for the top party field (e.g. "Party A/c name"). */
  partyLabel?: string;
  /** Optional block rendered above the party field (e.g. Purchase supplier-invoice row). */
  header?: ReactNode;
  /** Optional block rendered below the table (e.g. GST/e-Way + e-Invoice rows). */
  footer?: ReactNode;
}

export default function AccountingInvoiceBody({
  form,
  handleAmountConfirm,
  partyLabel = 'Party A/c name',
  header,
  footer,
}: Props) {
  return (
    <div className="flex flex-1 flex-col min-h-0">
      {header}

      {/* Party A/c stays at the top (the only ledger field; no Sales/Purchase picker). */}
      <div className="border-b border-gray-300 shrink-0 py-1">
        <FieldRow
          label={partyLabel}
          fieldType="party"
          ledger={form.partyLedger}
          balance={form.partyBalance}
          form={form}
        />
      </div>

      {/* Separator like Tally */}
      <div className="border-b border-black shrink-0" />

      {/* Reused single-entry ledger-particulars grid (no stock grid). */}
      <SingleEntryParticulars form={form} handleAmountConfirm={handleAmountConfirm} />

      {/* Additional tax / ledger rows (GST etc.) — same shared component as the item mode. */}
      <div className="shrink-0">
        <AdditionalTaxLedgerRows form={form} handleAmountConfirm={handleAmountConfirm} />
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

      {/* Grand total (party amount) */}
      <div className="flex border-t border-black shrink-0 px-3 py-1 bg-white">
        <div className="flex-1 text-sm font-bold text-black">Total</div>
        <div className="w-40 text-right text-sm font-bold text-black pr-3">
          {form.totalAmount > 0
            ? form.totalAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : ''}
        </div>
      </div>

      {footer}
    </div>
  );
}
