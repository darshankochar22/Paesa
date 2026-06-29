import type { useVoucherForm, ParticularRow } from "../hooks/useVoucherForm";
import FieldRow from "./FieldRow";
import BalanceIndicator from "./BalanceIndicator";
import VoucherDoubleEntryTable from "./VoucherDoubleEntryTable";

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
  onUpdateDoubleRow: (id: string, updates: Partial<Omit<ParticularRow, "id">>) => void;
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
  if (entryMode === "single") {
    return (
      <>
        <div className="border-b border-gray-300 shrink-0 py-1">
          <FieldRow
            label="Account"
            fieldType="account"
            ledger={form.accountLedger}
            balance={form.accountBalance}
            form={form}
          />
        </div>

        <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-white">
          <div className="flex-1 text-sm font-semibold text-black">Particulars</div>
          <div className="w-40 text-right text-sm font-semibold text-black">Amount</div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {form.particulars.map((row, idx) => {
            const isActive =
              form.activeField?.type === "particular" &&
              form.activeField.rowId === row.id;
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
                    value={isActive ? form.ledgerSearchTerm : (row.ledger?.name ?? "")}
                    placeholder={idx === 0 ? "Select Ledger…" : ""}
                    onFocus={() =>
                      form.handleFieldFocus({ type: "particular", rowId: row.id })
                    }
                    onChange={(e) => {
                      form.setLedgerSearchTerm(e.target.value);
                      if (!row.ledger)
                        form.handleFieldFocus({ type: "particular", rowId: row.id });
                    }}
                    autoComplete="off"
                  />
                  {row.ledgerBalance ? (
                    <span className="text-xs text-gray-500 italic shrink-0">
                      ({row.ledgerBalance})
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
                      if (e.key !== "Enter") return;
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

        {/* Footer — balanced indicator + total */}
        <div className="flex border-t border-black shrink-0 px-3 py-0.5 bg-white">
          <div className="flex-1 text-xs text-gray-600">
            <BalanceIndicator form={form} />
          </div>
          <div className="w-40 text-right text-sm font-semibold text-black pr-0">
            {form.particularsTotal > 0
              ? form.particularsTotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : ""}
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
      activeRowId={form.activeField?.type === "particular" ? form.activeField.rowId : null}
      onAmountConfirm={handleAmountConfirm}
    />
  );
}
