import { useNavigate } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import { useVoucherForm } from "./hooks/useVoucherForm";
import VoucherTypeTabs from "./components/VoucherTypeTabs";
import VoucherHeader from "./components/VoucherHeader";
import AccountSection from "./components/AccountSection";
import ParticularsTable from "./components/ParticularsTable";
import NarrationSection from "./components/NarrationSection";
import ActionFooter from "./components/ActionFooter";
import LedgerPanel from "./components/LedgerPanel";

export default function Vouchers() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const form = useVoucherForm();

  const canAccept = !!form.accountLedger && form.totalAmount > 0 && !form.isSubmitting;
  const panelOpen = !!form.activeField;

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="bg-gray-200 px-3 py-1 text-sm font-medium flex justify-between items-center border-b border-black select-none">
        <span className="text-black">Accounting Voucher Creation</span>
        <span className="text-xs text-gray-700">{selectedCompany?.name || ""}</span>
        <button onClick={() => navigate("/")} className="text-xs text-black hover:underline">&times;</button>
      </div>

      {form.error && (
        <div className="px-3 py-1 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>{form.error}</span>
          <button onClick={() => form.setError(null)} className="text-red-500 hover:text-red-700 text-xs">dismiss</button>
        </div>
      )}
      {form.success && (
        <div className="px-3 py-1 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
          <span>{form.success}</span>
          <button onClick={() => form.setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs">dismiss</button>
        </div>
      )}

      <VoucherTypeTabs
        activeType={form.voucherType}
        onChange={form.setVoucherType}
      />

      <VoucherHeader
        voucherType={form.voucherType}
        voucherNumber={form.voucherNumber}
        dateDisplay={form.dateDisplay}
      />

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          {form.voucherType === "Receipt" ? (
            <>
              <AccountSection
                ledger={form.accountLedger}
                balance={form.accountBalance}
                searchTerm={form.ledgerSearchTerm}
                onFieldFocus={form.handleFieldFocus}
                onSearchChange={form.setLedgerSearchTerm}
              />

              <div className="border-t border-gray-200 mx-2" />

              <ParticularsTable
                rows={form.particulars}
                onUpdateRow={form.handleUpdateParticularRow}
                onAddRow={form.handleAddParticularRow}
                onFieldFocus={form.handleFieldFocus}
                onSearchChange={form.setLedgerSearchTerm}
                activeRowId={form.activeField?.type === 'particular' ? form.activeField.rowId : null}
              />
            </>
          ) : (
            <div className="flex-1 bg-white" />
          )}

          <NarrationSection
            value={form.narration}
            totalAmount={form.totalAmount}
            onChange={form.setNarration}
          />
        </div>

        {panelOpen && (
          <LedgerPanel
            isOpen={panelOpen}
            ledgers={form.allLedgers}
            loading={form.ledgersLoading}
            searchTerm={form.ledgerSearchTerm}
            onSearchChange={form.setLedgerSearchTerm}
            onSelect={form.handleLedgerPanelSelect}
            onClose={form.handleFieldBlur}
          />
        )}
      </div>

      <ActionFooter
        onAccept={form.handleSubmit}
        onCancelVch={form.resetForm}
        onQuit={() => navigate("/")}
        isSubmitting={form.isSubmitting}
        canAccept={canAccept}
      />
    </div>
  );
}
