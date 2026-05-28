import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";

// ── Hook ──────────────────────────────────────────────────────────────────────
import { useVoucherForm } from "./hooks/useVoucherForm";
import { useVoucherHandlers } from "./hooks/useVoucherHandlers";
import { useVoucherCanAccept } from "./hooks/useVoucherCanAccept";

// ── Layouts ───────────────────────────────────────────────────────────────────
import SingleEntryLayout from "./layouts/SingleEntryLayout";
import JournalLayout from "./layouts/JournalLayout";
import SalesPurchaseLayout from "./layouts/SalesPurchaseLayout";

// ── Panels ────────────────────────────────────────────────────────────────────
import RightSidebar from "./panels/RightSidebar";
import LedgerListPanel from "./panels/LedgerListPanel";

// ── Popups ────────────────────────────────────────────────────────────────────
import DatePickerPopup from "./components/popups/DatePickerPopup";
import BillWiseAllocationPopup from "./components/popups/BillWiseAllocationPopup";
import CostCentreAllocationPopup from "./components/popups/CostCentreAllocationPopup";
import BankAllocationPopup from "./components/popups/BankAllocationPopup";
import DenominationPopup from "./components/popups/DenominationPopup";
import DispatchDetailsPopup from "./components/popups/DispatchDetailsPopup";
import ReceiptDetailsPopup from "./components/popups/ReceiptDetailsPopup";

// ── Shared UI ─────────────────────────────────────────────────────────────────
import { AlertBanner } from "../../components/ui";

// ─────────────────────────────────────────────────────────────────────────────

export default function Vouchers() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const form = useVoucherForm();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDispatchDetails, setShowDispatchDetails] = useState(false);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);

  // Stable ref so async allocation-save callbacks always call the latest accept
  const acceptRef = useRef<() => void>(() => {});

  // ── Derived: canAccept + panel props ────────────────────────────────────────
  const {
    canAccept,
    panelItems,
    panelTitle,
    panelSearchTerm,
    handlePanelSearchChange,
  } = useVoucherCanAccept(form);

  // ── Event handlers ──────────────────────────────────────────────────────────
  const {
    handleAccept,
    handleAmountConfirm,
    handleSaveBillWise,
    handleSaveCostCentre,
    handleSaveBankDetails,
    handleSaveCashDenomination,
    handleSaveDispatchDetails,
    handleSaveReceiptDetails,
  } = useVoucherHandlers({
    form,
    canAccept,
    acceptRef,
    setShowDispatchDetails,
    setShowReceiptDetails,
  });

  // Keep acceptRef current
  useEffect(() => { acceptRef.current = handleAccept; }, [handleAccept]);

  // ── Open dispatch/receipt popup when party is selected ──────────────────────
  useEffect(() => {
    if (form.voucherType === "Sales" && form.partyLedger) setShowDispatchDetails(true);
  }, [form.partyLedger, form.voucherType]);

  useEffect(() => {
    if (form.voucherType === "Purchase" && form.partyLedger) setShowReceiptDetails(true);
  }, [form.partyLedger, form.voucherType]);

  // ── Global keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); setShowDatePicker(true); }
      if (e.key === "F4") { e.preventDefault(); form.setVoucherType("Contra"); }
      if (e.key === "F5") { e.preventDefault(); form.setVoucherType("Payment"); }
      if (e.key === "F6") { e.preventDefault(); form.setVoucherType("Receipt"); }
      if (e.key === "F7") { e.preventDefault(); form.setVoucherType("Journal"); }
      if (e.key === "F8") { e.preventDefault(); form.setVoucherType("Sales"); }
      if (e.key === "F9") { e.preventDefault(); form.setVoucherType("Purchase"); }
      if (e.altKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        if (form.voucherType === "Contra") {
          form.setContraEntryMode((p: "single" | "double") => p === "single" ? "double" : "single");
        }
      }
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
        !showDispatchDetails &&
        !showReceiptDetails
      ) {
        e.preventDefault();
        navigate("/");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [
    form.setVoucherType, form.setContraEntryMode, form.voucherType,
    form.activeField, form.activeAllocation,
    canAccept, handleAccept, showDatePicker, showDispatchDetails, showReceiptDetails,
    navigate,
  ]);
  const isSingleEntry =
    ["Receipt", "Payment"].includes(form.voucherType) ||
    (form.voucherType === "Contra" && form.contraEntryMode === "single");

  return (
    <div className="flex flex-col h-screen bg-white text-black text-sm select-none overflow-hidden">

      {form.error && (
        <AlertBanner type="error" message={form.error} onDismiss={() => form.setError(null)} />
      )}
      {form.success && (
        <AlertBanner
          type="success"
          message={form.success}
          onDismiss={() => form.setSuccess(null)}
          actions={
            <button onClick={() => navigate("/transactions/voucher-list")} className="text-xs underline">
              View Register →
            </button>
          }
        />
      )}

      <div className="flex items-center justify-between px-3 py-1 border-b border-black bg-white shrink-0">
        <span className="text-sm font-semibold text-black">Accounting Voucher Creation</span>
        <span className="text-sm text-black">{selectedCompany?.name ?? ""}</span>
        <button onClick={() => navigate("/")} className="text-black text-sm font-bold hover:opacity-60 leading-none">
          ✕
        </button>
      </div>

      <div className="flex items-center px-3 py-1 border-b border-black bg-white shrink-0">
        <div className="text-xs font-bold text-white bg-black px-3 py-0.5 min-w-[80px] text-center uppercase">
          {form.voucherType}
        </div>
        <span className="text-sm text-black ml-3">No.</span>
        <span className="text-sm font-bold text-black ml-2 mr-6">{form.voucherNumber}</span>
        <div className="flex-1" />
        {form.status === "Post-Dated" && (
          <span className="text-xs text-black border border-black px-2 py-0 mr-4">Post-Dated</span>
        )}
        <button
          onClick={() => setShowDatePicker(true)}
          className="text-sm font-semibold text-black hover:underline focus:outline-none"
          title="F2: Change Date"
        >
          {form.dateDisplay}
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* ── Active layout ── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden border-r border-black">
          {isSingleEntry && (
            <SingleEntryLayout
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              handleAccept={handleAccept}
              canAccept={canAccept}
              onQuit={() => navigate("/")}
            />
          )}

          {form.voucherType === "Contra" && form.contraEntryMode === "double" && (
            <SingleEntryLayout
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              handleAccept={handleAccept}
              canAccept={canAccept}
              onQuit={() => navigate("/")}
              doubleEntry
            />
          )}

          {form.voucherType === "Journal" && (
            <JournalLayout
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              handleAccept={handleAccept}
              canAccept={canAccept}
              onQuit={() => navigate("/")}
            />
          )}

          {["Sales", "Purchase"].includes(form.voucherType) && (
            <SalesPurchaseLayout
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              handleAccept={handleAccept}
              canAccept={canAccept}
              onQuit={() => navigate("/")}
            />
          )}
        </div>

        {/* ── Ledger list panel ── */}
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
            createLabel={form.activeField?.type === "stockItem" ? "Create Stock Item" : "Create Ledger"}
          />
        )}

        {/* ── Right sidebar ── */}
        <RightSidebar
          voucherType={form.voucherType}
          onTypeChange={form.setVoucherType}
          status={form.status}
          onStatusChange={() =>
            form.setStatus((p: string) => p === "Regular" ? "Post-Dated" : "Regular")
          }
          entryMode={form.contraEntryMode}
          onEntryModeChange={() =>
            form.setContraEntryMode((p: "single" | "double") => p === "single" ? "double" : "single")
          }
          onDateClick={() => setShowDatePicker(true)}
          onCreateLedger={() => navigate("/master/create/ledger")}
          onAccept={handleAccept}
          onQuit={() => navigate("/")}
          canAccept={canAccept}
        />
      </div>

      {/* ══════════════════ Popups ══════════════════ */}

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
          onSave={handleSaveDispatchDetails}
        />
      )}

      {showReceiptDetails && form.partyLedger && (
        <ReceiptDetailsPopup
          partyName={form.partyLedger.name}
          totalAmount={form.totalAmount}
          onClose={() => setShowReceiptDetails(false)}
          onSave={handleSaveReceiptDetails}
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
    </div>
  );
}