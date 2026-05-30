import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../../../context/CompanyContext";
import { useVoucherHandlers } from "../../hooks/useVoucherHandlers";
import { useVoucherCanAccept } from "../../hooks/useVoucherCanAccept";
import type { useVoucherForm } from "../../hooks/useVoucherForm";

import SalesPurchaseLayout from "../../layouts/SalesPurchaseLayout";
import RightSidebar from "../../panels/RightSidebar";
import LedgerListPanel from "../../panels/LedgerListPanel";
import VoucherTypeModal from "../../ui/VoucherTypeModal";

import DatePickerPopup from "../../components/popups/DatePickerPopup";
import BillWiseAllocationPopup from "../../components/popups/BillWiseAllocationPopup";
import CostCentreAllocationPopup from "../../components/popups/CostCentreAllocationPopup";
import BankAllocationPopup from "../../components/popups/BankAllocationPopup";
import DenominationPopup from "../../components/popups/DenominationPopup";
import DispatchDetailsPopup from "../../components/popups/DispatchDetailsPopup";
import PartyDetailsPopup from "../../components/popups/PartyDetailsPopup";

interface Props {
  form: ReturnType<typeof useVoucherForm>;
}

export default function SalesVoucher({ form }: Props) {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDispatchDetails, setShowDispatchDetails] = useState(false);
  const [showPartyDetails, setShowPartyDetails] = useState(false);
  const [pendingDispatchDetails, setPendingDispatchDetails] = useState<any>(null);
  const [showVoucherTypeModal, setShowVoucherTypeModal] = useState(false);

  const {
    canAccept,
    panelItems,
    panelTitle,
    panelSearchTerm,
    handlePanelSearchChange,
  } = useVoucherCanAccept(form);

  const {
    handleAccept,
    handleAmountConfirm,
    handleSaveBillWise,
    handleSaveCostCentre,
    handleSaveBankDetails,
    handleSaveCashDenomination,
    handleSaveDispatchDetails,
    setAcceptRef,
  } = useVoucherHandlers({
    voucherType: "Sales",
    contraEntryMode: form.contraEntryMode,
    accountLedger: form.accountLedger,
    particulars: form.particulars,
    particularsTotal: form.particularsTotal,
    handleAddParticularRow: form.handleAddParticularRow,
    handleUpdateParticularRow: form.handleUpdateParticularRow,
    contraDoubleRows: form.contraDoubleRows,
    handleAddContraDoubleRow: form.handleAddContraDoubleRow,
    handleUpdateContraDoubleRow: form.handleUpdateContraDoubleRow,
    journalRows: form.journalRows,
    handleAddJournalRow: form.handleAddJournalRow,
    handleUpdateJournalRow: form.handleUpdateJournalRow,
    partyLedger: form.partyLedger,
    additionalEntries: form.additionalEntries,
    handleAddAdditionalRow: form.handleAddAdditionalRow,
    handleUpdateAdditionalRow: form.handleUpdateAdditionalRow,
    partyBillReferences: form.partyBillReferences,
    setPartyBillReferences: form.setPartyBillReferences,
    bankDetails: form.bankDetails,
    cashDenominations: form.cashDenominations,
    setCashDenominations: form.setCashDenominations,
    totalAmount: form.totalAmount,
    activeAllocation: form.activeAllocation,
    setActiveAllocation: form.setActiveAllocation,
    setBankDetails: form.setBankDetails,
    setDispatchDetails: (_d: any) => setShowDispatchDetails(false),
    setReceiptDetails: () => {},
    handleSubmit: form.handleSubmit,
    checkIsBank: form.checkIsBank,
    checkIsCash: form.checkIsCash,
  });

  useEffect(() => {
    setAcceptRef(handleAccept);
  }, [handleAccept, setAcceptRef]);

  // Open dispatch details popup when party ledger is selected for Sales
  useEffect(() => {
    if (form.partyLedger) setShowDispatchDetails(true);
  }, [form.partyLedger]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (form.isSubmitting) return;
      if (e.key === "F2") { e.preventDefault(); setShowDatePicker(true); }
      if (e.key === "F4") { e.preventDefault(); form.setVoucherType("Contra"); }
      if (e.key === "F5") { e.preventDefault(); form.setVoucherType("Payment"); }
      if (e.key === "F6") { e.preventDefault(); form.setVoucherType("Receipt"); }
      if (e.key === "F7") { e.preventDefault(); form.setVoucherType("Journal"); }
      if (e.key === "F8") { e.preventDefault(); form.setVoucherType("Sales"); }
      if (e.key === "F9") { e.preventDefault(); form.setVoucherType("Purchase"); }

      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        if (canAccept) handleAccept();
      }
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        navigate("/master/create/ledger");
      }
      if (
        e.key === "Escape" &&
        !form.activeField &&
        !form.activeAllocation &&
        !showDatePicker &&
        !showDispatchDetails
      ) {
        e.preventDefault();
        navigate("/");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [
    form.setVoucherType, form.activeField, form.activeAllocation,
    canAccept, handleAccept, showDatePicker, showDispatchDetails,
    navigate, form.isSubmitting,
  ]);

  return (
    <div className="flex flex-col h-screen bg-white text-black text-sm select-none overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-3 py-1 border-b border-black bg-white shrink-0 font-semibold select-none">
        <span className="text-sm uppercase tracking-wider">Accounting Voucher Creation</span>
        <span className="text-sm font-mono text-zinc-600">{selectedCompany?.name ?? ""}</span>
        <button onClick={() => navigate("/")} className="text-black text-sm font-bold hover:opacity-60 leading-none px-1">
          ✕
        </button>
      </div>

      <div className="flex items-center px-3 py-1 border-b border-black bg-white shrink-0 select-none">
        <div className="text-xs font-bold text-white bg-zinc-950 px-3 py-0.5 min-w-[80px] text-center uppercase tracking-wider rounded-sm shadow-sm">
          Sales
        </div>
        <span className="text-sm text-zinc-500 ml-3 font-mono">No.</span>
        <span className="text-sm font-bold text-black ml-2 mr-6 font-mono">
          {form.voucherNumberLoading ? "Loading…" : form.voucherNumber}
        </span>
        <div className="flex-1" />
        {form.status === "Post-Dated" && (
          <span className="text-xs text-rose-700 border border-rose-400 bg-rose-50 px-2 py-0.5 mr-4 font-bold rounded-sm uppercase tracking-wide">Post-Dated</span>
        )}
        <button
          onClick={() => setShowDatePicker(true)}
          className="text-sm font-semibold text-zinc-800 hover:text-black hover:underline focus:outline-none font-mono"
          title="F2: Change Date"
        >
          {form.dateDisplay}
        </button>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden border-r border-black">
          <SalesPurchaseLayout
            voucherType="Sales"

            supplierInvoiceNo={form.supplierInvoiceNo}
            supplierInvoiceDate={form.supplierInvoiceDate}
            onSupplierInvoiceNoChange={form.setSupplierInvoiceNo}
            onSupplierInvoiceDateChange={form.setSupplierInvoiceDate}

            partyLedger={form.partyLedger}
            partyBalance={form.partyBalance}
            activeField={form.activeField}
            ledgerSearchTerm={form.ledgerSearchTerm}
            onPartyFocus={() => form.handleFieldFocus({ type: "party" })}
            onPartySearchChange={form.setLedgerSearchTerm}

            salesPurchaseLedger={form.salesPurchaseLedger}
            salesPurchaseBalance={form.salesPurchaseBalance}
            onSalesPurchaseFocus={() => form.handleFieldFocus({ type: "salesPurchase" })}
            onSalesPurchaseSearchChange={form.setLedgerSearchTerm}

            referenceNumber={form.referenceNumber}
            onReferenceNumberChange={form.setReferenceNumber}
            placeOfSupply={form.placeOfSupply}
            onPlaceOfSupplyChange={form.setPlaceOfSupply}

            stockEntries={form.stockEntries}
            stockSearchTerm={form.stockSearchTerm}
            onUpdateStockRow={form.handleUpdateStockRow}
            onRemoveStockRow={form.handleRemoveStockRow}
            onStockItemFocus={(rowId) => form.handleFieldFocus({ type: "stockItem", rowId })}
            onStockSearchChange={form.setStockSearchTerm}
            allGodowns={form.allGodowns}
            allUnits={form.allUnits}

            additionalEntries={form.additionalEntries}
            onUpdateAdditionalRow={form.handleUpdateAdditionalRow}
            onRemoveAdditionalRow={form.handleRemoveAdditionalRow}
            onAddAdditionalRow={form.handleAddAdditionalRow}
            onAdditionalFocus={(rowId) => form.handleFieldFocus({ type: "additional", rowId })}
            onAdditionalSearchChange={form.setLedgerSearchTerm}
            onAmountConfirm={handleAmountConfirm}

            totalAmount={form.totalAmount}
          />
        </div>

        {!!form.activeField && (
          <LedgerListPanel
            title={panelTitle}
            items={panelItems}
            searchTerm={panelSearchTerm}
            onSearchChange={handlePanelSearchChange}
            onSelect={form.handleLedgerPanelSelect}
            onClose={form.handleFieldBlur}
            onCreateNew={() =>
              form.activeField?.type === "stockItem"
                ? navigate("/master/create/stock-item")
                : navigate("/master/create/ledger")
            }
            createLabel={
              form.activeField?.type === "stockItem"
                ? "Alt+C: Create Stock Item"
                : "Alt+C: Create Ledger"
            }
          />
        )}

        <RightSidebar
          voucherType="Sales"
          onTypeChange={form.setVoucherType}
          status={form.status}
          onStatusChange={() => form.setStatus((p: string) => p === "Regular" ? "Post-Dated" : "Regular")}
          entryMode="single"
          onEntryModeChange={() => {}}
          onDateClick={() => setShowDatePicker(true)}
          onCreateLedger={() => navigate("/master/create/ledger")}
          onOtherVouchers={() => setShowVoucherTypeModal(true)}
          onAccept={handleAccept}
          onQuit={() => navigate("/")}
          canAccept={canAccept}
          isSubmitting={form.isSubmitting}
        />
      </div>

      {showDatePicker && (
        <DatePickerPopup
          initialDate={form.date}
          onClose={() => setShowDatePicker(false)}
          onConfirm={form.setDate}
          label="Voucher Date"
        />
      )}

      {showDispatchDetails && form.partyLedger && (
        <DispatchDetailsPopup
          partyName={form.partyLedger.name}
          totalAmount={form.totalAmount}
          onClose={() => setShowDispatchDetails(false)}
          onSave={(details) => {
            setPendingDispatchDetails(details);
            setShowDispatchDetails(false);
            setShowPartyDetails(true);
          }}
        />
      )}

      {showPartyDetails && form.partyLedger && (
        <PartyDetailsPopup
          partyLedger={form.partyLedger}
          voucherType="Sales"
          onClose={() => setShowPartyDetails(false)}
          onSave={(partyDetails) => {
            setShowPartyDetails(false);
            form.setPlaceOfSupply(partyDetails.place_of_supply);
            if (pendingDispatchDetails) {
              handleSaveDispatchDetails(pendingDispatchDetails);
              setPendingDispatchDetails(null);
            }
          }}
        />
      )}

      {(form.activeAllocation?.type === "billWise" || form.activeAllocation?.type === "billWiseParty") && (
        <BillWiseAllocationPopup
          ledgerId={form.activeAllocation.ledgerId}
          ledgerName={form.activeAllocation.ledgerName}
          totalAmount={form.activeAllocation.amount}
          initialAllocations={
            form.activeAllocation.type === "billWiseParty"
              ? form.partyBillReferences
              : (form.activeAllocation.initialAllocations ?? [])
          }
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveBillWise}
        />
      )}

      {form.activeAllocation?.type === "costCentre" && (
        <CostCentreAllocationPopup
          companyId={selectedCompany!.company_id}
          ledgerName={form.activeAllocation.ledgerName}
          totalAmount={form.activeAllocation.amount}
          initialAllocations={form.activeAllocation.initialAllocations ?? []}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveCostCentre}
        />
      )}

      {form.activeAllocation?.type === "bankDetails" && (
        <BankAllocationPopup
          ledgerId={form.activeAllocation.ledgerId}
          ledgerName={form.activeAllocation.ledgerName}
          amount={form.activeAllocation.amount}
          initialDetails={form.bankDetails}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveBankDetails}
        />
      )}

      {form.activeAllocation?.type === "cashDenomination" && (
        <DenominationPopup
          ledgerId={form.activeAllocation.ledgerId}
          ledgerName={form.activeAllocation.ledgerName}
          amount={form.activeAllocation.amount}
          initialDetails={form.cashDenominations}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveCashDenomination}
        />
      )}

      {showVoucherTypeModal && (
        <VoucherTypeModal
          currentType={form.voucherType}
          onSelect={(type) => form.setVoucherType(type as any)}
          onClose={() => setShowVoucherTypeModal(false)}
        />
      )}
    </div>
  );
}
