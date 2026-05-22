import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import { useVoucherForm } from "./hooks/useVoucherForm";
import VoucherTypeTabs from "./components/VoucherTypeTabs";
import VoucherHeader from "./components/VoucherHeader";
import ParticularsTable from "./components/ParticularsTable";
import InventoryParticularsTable from "./components/InventoryParticularsTable";
import LedgerPanel from "./components/LedgerPanel";
import ActionFooter from "./components/ActionFooter";
import { INDIAN_STATES } from "../../constants/states";
import { PageTitleBar, AlertBanner, RightActionPanel } from "../../components/ui";
import { LedgerField } from "./ui";

export default function Vouchers() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const form = useVoucherForm();

  // Dynamic canAccept based on active layout context
  const canAccept = useMemo(() => {
    if (form.isSubmitting) return false;
    if (["Receipt", "Payment", "Contra"].includes(form.voucherType)) {
      return !!form.accountLedger && form.particulars.some(p => !!p.ledger && (Number(p.amountRaw) || 0) > 0);
    }
    if (form.voucherType === "Journal") {
      return form.journalRows.filter(r => !!r.ledger && (Number(r.amountRaw) || 0) > 0).length >= 2;
    }
    if (["Sales", "Purchase"].includes(form.voucherType)) {
      return !!form.partyLedger && !!form.salesPurchaseLedger && form.stockEntries.some(s => !!s.stockItem && (Number(s.amountRaw) || 0) > 0);
    }
    return false;
  }, [form.voucherType, form.accountLedger, form.particulars, form.journalRows, form.partyLedger, form.salesPurchaseLedger, form.stockEntries, form.isSubmitting]);

  const panelOpen = !!form.activeField;

  const voucherActions = [
    { key: "F4", label: "Contra", onClick: () => form.setVoucherType("Contra"), active: form.voucherType === "Contra" },
    { key: "F5", label: "Payment", onClick: () => form.setVoucherType("Payment"), active: form.voucherType === "Payment" },
    { key: "F6", label: "Receipt", onClick: () => form.setVoucherType("Receipt"), active: form.voucherType === "Receipt" },
    { key: "F7", label: "Journal", onClick: () => form.setVoucherType("Journal"), active: form.voucherType === "Journal" },
    { key: "F8", label: "Sales", onClick: () => form.setVoucherType("Sales"), active: form.voucherType === "Sales" },
    { key: "F9", label: "Purchase", onClick: () => form.setVoucherType("Purchase"), active: form.voucherType === "Purchase" },
    { key: "Ctrl+A", label: "Accept", onClick: form.handleSubmit, disabled: !canAccept },
    { key: "Esc", label: "Quit", onClick: () => navigate("/") },
  ];

  // Keyboard navigation mappings (F4–F9, Ctrl+A to save, Escape to quit)
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === "F4") { e.preventDefault(); form.setVoucherType("Contra"); }
      if (e.key === "F5") { e.preventDefault(); form.setVoucherType("Payment"); }
      if (e.key === "F6") { e.preventDefault(); form.setVoucherType("Receipt"); }
      if (e.key === "F7") { e.preventDefault(); form.setVoucherType("Journal"); }
      if (e.key === "F8") { e.preventDefault(); form.setVoucherType("Sales"); }
      if (e.key === "F9") { e.preventDefault(); form.setVoucherType("Purchase"); }

      // Accept shortcut: Alt+A or Ctrl+A or Cmd+A
      if ((e.altKey || e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        if (canAccept) {
          form.handleSubmit();
        }
      }

      // Quit shortcut: Escape
      if (e.key === "Escape" && !form.activeField) {
        e.preventDefault();
        navigate("/");
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [form, canAccept, navigate]);

  return (
    <div className="flex-1 flex flex-col bg-white h-full text-xs select-none">
      
      {/* Title Bar */}
      <PageTitleBar
        title="Accounting Voucher Creation"
        subtitle={selectedCompany?.name || ""}
      />

      {/* Error / Success Toast Panels */}
      {form.error && (
        <AlertBanner
          type="error"
          message={form.error}
          onDismiss={() => form.setError(null)}
        />
      )}
      {form.success && (
        <AlertBanner
          type="success"
          message={form.success}
          onDismiss={() => form.setSuccess(null)}
          actions={
            <button
              onClick={() => navigate("/transactions/voucher-list")}
              className="text-[10px] text-zinc-600 underline hover:text-zinc-900 font-sans transition-colors"
            >
              View Voucher Register →
            </button>
          }
        />
      )}

      {/* Voucher Type Tab switcher */}
      <VoucherTypeTabs
        activeType={form.voucherType}
        onChange={form.setVoucherType}
      />

      {/* Basic Number & Date Banner */}
      <VoucherHeader
        voucherType={form.voucherType}
        voucherNumber={form.voucherNumber}
        dateDisplay={form.dateDisplay}
      />

      <div className="flex-1 flex min-h-0 overflow-x-auto">
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          
          {/* Layout Router */}
          {/* 1. Single-Entry Accounting Forms (F4, F5, F6) */}
          {["Receipt", "Payment", "Contra"].includes(form.voucherType) && (
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Account selection row */}
              <div className="flex items-center min-h-[36px] border-b border-zinc-100 py-1.5 px-3 bg-zinc-50/20">
                <span className="w-24 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Account</span>
                <span className="text-zinc-400 mr-2">:</span>
                <LedgerField
                  value={form.activeField?.type === 'account' ? form.ledgerSearchTerm : (form.accountLedger?.name || "")}
                  balance={form.accountBalance}
                  placeholder="Select Cash / Bank Account..."
                  onFocus={() => form.handleFieldFocus({ type: 'account' })}
                  onChange={(v) => {
                    form.setLedgerSearchTerm(v);
                    if (!form.accountLedger) form.handleFieldFocus({ type: 'account' });
                  }}
                />
              </div>

              {/* Particulars grid */}
              <ParticularsTable
                rows={form.particulars}
                onUpdateRow={form.handleUpdateParticularRow}
                onAddRow={form.handleAddParticularRow}
                onRemoveRow={form.handleRemoveParticularRow}
                onFieldFocus={form.handleFieldFocus}
                onSearchChange={form.setLedgerSearchTerm}
                searchTerm={form.ledgerSearchTerm}
                activeRowId={form.activeField?.type === 'particular' ? form.activeField.rowId : null}
              />
            </div>
          )}

          {/* 2. Double-Entry Journal Matrix Form (F7) */}
          {form.voucherType === "Journal" && (
            <div className="flex-1 flex flex-col min-h-0">
              <ParticularsTable
                rows={form.journalRows}
                onUpdateRow={form.handleUpdateJournalRow}
                onAddRow={form.handleAddJournalRow}
                onRemoveRow={form.handleRemoveJournalRow}
                onFieldFocus={form.handleFieldFocus}
                onSearchChange={form.setLedgerSearchTerm}
                searchTerm={form.ledgerSearchTerm}
                activeRowId={form.activeField?.type === 'particular' ? form.activeField.rowId : null}
                isJournal={true}
              />
            </div>
          )}

          {/* 3. Inventory Stock Invoice Layouts (F8 Sales, F9 Purchase) */}
          {["Sales", "Purchase"].includes(form.voucherType) && (
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Party & Sales / Purchase details grid */}
              <div className="grid grid-cols-2 gap-4 p-3 border-b border-zinc-200 bg-zinc-50/20">
                <div className="space-y-1.5">
                  <div className="flex items-center min-h-[30px]">
                    <span className="w-24 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Party A/c Name</span>
                    <span className="text-zinc-400 mr-2">:</span>
                    <LedgerField
                      value={form.activeField?.type === 'party' ? form.ledgerSearchTerm : (form.partyLedger?.name || "")}
                      balance={form.partyBalance}
                      placeholder="Select Party Ledger (Debtor/Creditor/Cash/Bank)..."
                      onFocus={() => form.handleFieldFocus({ type: 'party' })}
                      onChange={(v) => {
                        form.setLedgerSearchTerm(v);
                        if (!form.partyLedger) form.handleFieldFocus({ type: 'party' });
                      }}
                    />
                  </div>

                  <div className="flex items-center min-h-[30px]">
                    <span className="w-24 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      {form.voucherType} Ledger
                    </span>
                    <span className="text-zinc-400 mr-2">:</span>
                    <LedgerField
                      value={form.activeField?.type === 'salesPurchase' ? form.ledgerSearchTerm : (form.salesPurchaseLedger?.name || "")}
                      balance={form.salesPurchaseBalance}
                      placeholder={`Select ${form.voucherType} Ledger...`}
                      onFocus={() => form.handleFieldFocus({ type: 'salesPurchase' })}
                      onChange={(v) => {
                        form.setLedgerSearchTerm(v);
                        if (!form.salesPurchaseLedger) form.handleFieldFocus({ type: 'salesPurchase' });
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center min-h-[30px]">
                    <span className="w-28 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Ref No. & Date</span>
                    <span className="text-zinc-400 mr-2">:</span>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        className="w-1/2 bg-transparent text-xs outline-none px-2 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded font-semibold text-zinc-800"
                        value={form.referenceNumber}
                        onChange={(e) => form.setReferenceNumber(e.target.value)}
                        placeholder="Ref Number"
                      />
                      <input
                        type="date"
                        className="w-1/2 bg-transparent text-xs outline-none px-2 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded font-semibold text-zinc-800"
                        value={form.referenceDate}
                        onChange={(e) => form.setReferenceDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center min-h-[30px]">
                    <span className="w-28 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Place of Supply</span>
                    <span className="text-zinc-400 mr-2">:</span>
                    <select
                      className="flex-1 bg-transparent text-xs outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded font-semibold text-zinc-800 cursor-pointer"
                      value={form.placeOfSupply}
                      onChange={(e) => form.setPlaceOfSupply(e.target.value)}
                    >
                      <option value="Select">Select Supply State</option>
                      {INDIAN_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Invoicing particulars grid */}
              <InventoryParticularsTable
                stockEntries={form.stockEntries}
                additionalEntries={form.additionalEntries}
                allGodowns={form.allGodowns}
                allUnits={form.allUnits}
                activeField={form.activeField}
                searchTerm={form.ledgerSearchTerm}
                stockSearchTerm={form.stockSearchTerm}
                onFieldFocus={form.handleFieldFocus}
                onSearchChange={form.setStockSearchTerm}
                onUpdateStockRow={form.handleUpdateStockRow}
                onAddStockRow={form.handleAddStockRow}
                onRemoveStockRow={form.handleRemoveStockRow}
                onUpdateAdditionalRow={form.handleUpdateAdditionalRow}
                onAddAdditionalRow={form.handleAddAdditionalRow}
                onRemoveAdditionalRow={form.handleRemoveAdditionalRow}
              />
            </div>
          )}

          {/* Narration & Subtotal Panel */}
          <div className="border-t border-zinc-200 bg-zinc-50/50 p-3 flex items-center justify-between gap-4 select-none">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Narration</span>
              <span className="text-zinc-400">:</span>
              <input
                type="text"
                className="flex-1 bg-transparent text-xs outline-none px-2 py-1 border border-zinc-300 rounded focus:border-zinc-800 transition-all bg-white"
                placeholder="Enter narration remarks..."
                value={form.narration}
                onChange={(e) => form.setNarration(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 shrink-0 pl-4 border-l border-zinc-200">
              <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Grand Total :</span>
              <span className="text-sm font-bold text-zinc-950 px-3 py-1 bg-zinc-100 rounded border border-zinc-200 shadow-sm min-w-[120px] text-right">
                {form.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Context Sidebar Selector panel */}
        {panelOpen && (
          <LedgerPanel
            isOpen={panelOpen}
            activeField={form.activeField}
            ledgers={form.allLedgers}
            stockItems={form.allStockItems}
            godowns={form.allGodowns}
            loading={form.ledgersLoading}
            searchTerm={form.activeField?.type === 'stockItem' ? form.stockSearchTerm : form.ledgerSearchTerm}
            onSearchChange={form.activeField?.type === 'stockItem' ? form.setStockSearchTerm : form.setLedgerSearchTerm}
            onSelect={form.handleLedgerPanelSelect}
            onClose={form.handleFieldBlur}
            checkIsCashOrBank={form.checkIsCashOrBank}
            checkLedgerGroup={form.checkLedgerGroup}
            voucherType={form.voucherType}
          />
        )}

        {/* Action sidebar */}
        <RightActionPanel actions={voucherActions} />
      </div>

      {/* Submit, cancel and quit actions footer */}
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
