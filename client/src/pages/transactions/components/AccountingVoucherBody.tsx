import type { useVoucherForm, ParticularRow } from '../hooks/useVoucherForm';
import FieldRow from './FieldRow';
import BalanceIndicator from './BalanceIndicator';
import VoucherDoubleEntryTable from './VoucherDoubleEntryTable';
import SingleEntryParticulars from './SingleEntryParticulars';
import { projectedBalanceLabel } from '../utils/projectBalance';

/**
 * Shared body for the accounting vouchers (Payment, Receipt, Contra, Journal).
 * The single-entry "Account + Particulars" layout is identical across all of
 * them; only the entry-mode flag and the double-entry row bindings differ, so
 * each leaf passes its voucher-specific `form` fields in via props.
 */
interface Props {
  form: ReturnType<typeof useVoucherForm>;
  handleAmountConfirm: (row: ParticularRow, idx: number) => void;
  entryMode: string;
  doubleRows: ParticularRow[];
  onUpdateDoubleRow: (id: string, updates: Partial<Omit<ParticularRow, 'id'>>) => void;
  onAddDoubleRow: () => void;
  onRemoveDoubleRow: (id: string) => void;
}

export default function AccountingVoucherBody({
  form,
  handleAmountConfirm,
  entryMode,
  doubleRows,
  onUpdateDoubleRow,
  onAddDoubleRow,
  onRemoveDoubleRow,
}: Props) {
  if (entryMode === 'single') {
    // The single "Account" ledger takes the whole voucher on the side opposite
    // the particulars (Receipt → account Dr, Payment/Contra → account Cr), so its
    // running balance moves by the particulars total the same way each row does.
    const accountSide: 'Dr' | 'Cr' = form.voucherType === 'Receipt' ? 'Dr' : 'Cr';
    const accountBalance = form.accountLedger
      ? projectedBalanceLabel(
          Number(form.accountBalanceRaw) || 0,
          form.accountLedger.nature,
          accountSide,
          form.particularsTotal,
        )
      : form.accountBalance;

    return (
      <>
        <div className="border-b border-gray-300 shrink-0 py-1">
          <FieldRow
            label="Account"
            fieldType="account"
            ledger={form.accountLedger}
            balance={accountBalance}
            form={form}
          />
        </div>

        <SingleEntryParticulars form={form} handleAmountConfirm={handleAmountConfirm} />

        {/* Footer — balanced indicator + total */}
        <div className="flex border-t border-black shrink-0 px-3 py-0.5 bg-white">
          <div className="flex-1 text-xs text-gray-600">
            <BalanceIndicator form={form} />
          </div>
          <div className="w-40 text-right text-sm font-semibold text-black pr-0">
            {form.particularsTotal > 0
              ? form.particularsTotal.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : ''}
          </div>
        </div>
      </>
    );
  }

  // Double entry mode
  return (
    <VoucherDoubleEntryTable
      rows={doubleRows}
      onUpdateRow={onUpdateDoubleRow}
      onAddRow={onAddDoubleRow}
      onRemoveRow={onRemoveDoubleRow}
      onFieldFocus={form.handleFieldFocus}
      onSearchChange={form.setLedgerSearchTerm}
      searchTerm={form.ledgerSearchTerm}
      activeRowId={form.activeField?.type === 'particular' ? form.activeField.rowId : null}
      onAmountConfirm={handleAmountConfirm}
      checkIsCashOrBank={form.checkIsCashOrBank}
    />
  );
}
