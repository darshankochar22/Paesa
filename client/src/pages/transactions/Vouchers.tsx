import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import { useVoucherForm } from "./hooks/useVoucherForm";

// ── Layout components ────────────────────────────────────────────────────────
import VoucherTypeTabs from "./components/VoucherTypeTabs";
import VoucherHeader from "./components/VoucherHeader";
import AccountSection from "./components/AccountSection";          // FIX #6 — now used
import ParticularsTable from "./components/ParticularsTable";
import InventoryParticularsTable from "./components/InventoryParticularsTable";
import LedgerPanel from "./components/LedgerPanel";
import ActionFooter from "./components/ActionFooter";
import StatusDropdown from "./components/StatusDropdown";
import NarrationSection from "./components/NarrationSection";      // FIX #7 — now used

// ── Popups ───────────────────────────────────────────────────────────────────
import BillWiseAllocationPopup from "./components/popups/BillWiseAllocationPopup";
import CostCentreAllocationPopup from "./components/popups/CostCentreAllocationPopup";
import BankAllocationPopup from "./components/popups/BankAllocationPopup";
import InlineMasterPopup from "./components/popups/InlineMasterPopup"; // FIX #5 — now used

// ── Shared UI ─────────────────────────────────────────────────────────────────
import { INDIAN_STATES } from "../../constants/states";
import { PageTitleBar, AlertBanner, RightActionPanel } from "../../components/ui";
import { LedgerField } from "./ui";

export default function Vouchers() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const form = useVoucherForm();

  // FIX #5 — inline master creation state (replaces navigate-away)
  const [inlineCreateType, setInlineCreateType] = useState<
    "ledger" | "stockItem" | "godown" | null
  >(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // FIX #8 — stable ref for handleAcceptClick so setTimeout callbacks
  // never capture a stale closure.
  // ─────────────────────────────────────────────────────────────────────────────
  const acceptRef = useRef<() => void>(() => {});

  // FIX #8 — memoised so it is safe to list in dependency arrays
  const handleAcceptClick = useCallback(() => {
    // For Sales/Purchase: if the party ledger requires bill-wise details and
    // none have been entered yet, capture them before submitting.
    if (
      ["Sales", "Purchase"].includes(form.voucherType) &&
      form.partyLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      form.setActiveAllocation({
        type: "billWiseParty",
        ledgerId: form.partyLedger.ledger_id,
        ledgerName: form.partyLedger.name,
        amount: form.totalAmount,
        initialAllocations: [],
      });
      return;
    }
    form.handleSubmit();
  }, [
    form.voucherType,
    form.partyLedger,
    form.partyBillReferences,
    form.totalAmount,
    form.handleSubmit,
    form.setActiveAllocation,
  ]);

  // Keep the ref in sync so setTimeout callbacks always call the latest version
  useEffect(() => {
    acceptRef.current = handleAcceptClick;
  }, [handleAcceptClick]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Row-focus progression (moves the cursor to the next input after confirmation)
  // ─────────────────────────────────────────────────────────────────────────────

  const proceedToNextRow = useCallback(
    (idx: number) => {
      const isJournal = form.voucherType === "Journal";
      const isInventory = ["Sales", "Purchase"].includes(form.voucherType);

      if (isJournal) {
        if (idx === form.journalRows.length - 1) {
          form.handleAddJournalRow();
          setTimeout(() => {
            const next = document.querySelector(
              `[data-particular-ledger="${form.journalRows.length + 1}"]`
            ) as HTMLInputElement | null;
            next?.focus();
          }, 50);
        } else {
          setTimeout(() => {
            const next = document.querySelector(
              `[data-particular-ledger="${idx + 2}"]`
            ) as HTMLInputElement | null;
            next?.focus();
          }, 50);
        }
      } else if (isInventory) {
        if (idx === form.additionalEntries.length - 1) {
          form.handleAddAdditionalRow();
          setTimeout(() => {
            const next = document.querySelector(
              `[data-additional-ledger="${form.additionalEntries.length + 1}"]`
            ) as HTMLInputElement | null;
            next?.focus();
          }, 50);
        } else {
          setTimeout(() => {
            const next = document.querySelector(
              `[data-additional-ledger="${idx + 2}"]`
            ) as HTMLInputElement | null;
            next?.focus();
          }, 50);
        }
      } else {
        if (idx === form.particulars.length - 1) {
          form.handleAddParticularRow();
          setTimeout(() => {
            const next = document.querySelector(
              `[data-particular-ledger="${form.particulars.length + 1}"]`
            ) as HTMLInputElement | null;
            next?.focus();
          }, 50);
        } else {
          setTimeout(() => {
            const next = document.querySelector(
              `[data-particular-ledger="${idx + 2}"]`
            ) as HTMLInputElement | null;
            next?.focus();
          }, 50);
        }
      }
    },
    [
      form.voucherType,
      form.journalRows,
      form.additionalEntries,
      form.particulars,
      form.handleAddJournalRow,
      form.handleAddAdditionalRow,
      form.handleAddParticularRow,
    ]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Amount confirmation — triggers bill-wise / cost-centre popups when needed,
  // or simply moves focus to the next row.
  // ─────────────────────────────────────────────────────────────────────────────

  const handleParticularAmountConfirm = useCallback(
    (row: any, index: number) => {
      const { ledger, amountRaw, id } = row;
      const amount = Number(amountRaw) || 0;

      if (!ledger || amount <= 0) {
        proceedToNextRow(index);
        return;
      }

      if (ledger.is_bill_wise === 1) {
        form.setActiveAllocation({
          type: "billWise",
          rowId: id,
          ledgerId: ledger.ledger_id,
          ledgerName: ledger.name,
          amount,
          initialAllocations: row.billReferences ?? [],
        });
      } else if (ledger.allow_cost_centres === 1) {
        form.setActiveAllocation({
          type: "costCentre",
          rowId: id,
          ledgerId: ledger.ledger_id,
          ledgerName: ledger.name,
          amount,
          initialAllocations: row.costCentres ?? [],
        });
      } else {
        proceedToNextRow(index);
      }
    },
    [form.setActiveAllocation, proceedToNextRow]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Popup save handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSaveBillWise = useCallback(
    (allocations: any[]) => {
      // Party bill-wise (Sales/Purchase) — save then proceed to submit
      if (form.activeAllocation?.type === "billWiseParty") {
        form.setPartyBillReferences(allocations);
        form.setActiveAllocation(null);
        // FIX #8 — use ref so the callback is never stale
        setTimeout(() => acceptRef.current(), 50);
        return;
      }

      const alloc = form.activeAllocation;
      if (!alloc || !("rowId" in alloc)) return;
      const { rowId } = alloc;

      const isJournal = form.voucherType === "Journal";
      const isInventory = ["Sales", "Purchase"].includes(form.voucherType);

      // Determine which list the row lives in
      const rowsList = isJournal
        ? form.journalRows
        : isInventory
        ? form.additionalEntries
        : form.particulars;

      const targetRow = rowsList.find((r) => r.id === rowId);
      if (!targetRow) return;

      // Save the bill references
      if (isJournal) {
        form.handleUpdateJournalRow(rowId, { billReferences: allocations });
      } else if (isInventory) {
        form.handleUpdateAdditionalRow(rowId, { billReferences: allocations });
      } else {
        form.handleUpdateParticularRow(rowId, { billReferences: allocations });
      }

      // If the ledger also requires cost-centre allocation, chain into that popup
      if (targetRow.ledger?.allow_cost_centres === 1) {
        form.setActiveAllocation({
          type: "costCentre",
          rowId,
          ledgerId: targetRow.ledger.ledger_id,
          ledgerName: targetRow.ledger.name,
          amount: Number(targetRow.amountRaw) || 0,
          initialAllocations: (targetRow as any).costCentres ?? [],
        });
      } else {
        form.setActiveAllocation(null);
        const idx = rowsList.findIndex((r) => r.id === rowId);
        proceedToNextRow(idx);
      }
    },
    [
      form.activeAllocation,
      form.voucherType,
      form.journalRows,
      form.additionalEntries,
      form.particulars,
      form.setPartyBillReferences,
      form.setActiveAllocation,
      form.handleUpdateJournalRow,
      form.handleUpdateAdditionalRow,
      form.handleUpdateParticularRow,
      proceedToNextRow,
    ]
  );

  const handleSaveCostCentre = useCallback(
    (allocations: any[]) => {
      const alloc = form.activeAllocation;
      if (!alloc || !("rowId" in alloc)) return;
      const { rowId } = alloc;

      const isJournal = form.voucherType === "Journal";
      const isInventory = ["Sales", "Purchase"].includes(form.voucherType);

      const rowsList = isJournal
        ? form.journalRows
        : isInventory
        ? form.additionalEntries
        : form.particulars;

      if (isJournal) {
        form.handleUpdateJournalRow(rowId, { costCentres: allocations });
      } else if (isInventory) {
        form.handleUpdateAdditionalRow(rowId, { costCentres: allocations });
      } else {
        form.handleUpdateParticularRow(rowId, { costCentres: allocations });
      }

      form.setActiveAllocation(null);
      const idx = rowsList.findIndex((r) => r.id === rowId);
      proceedToNextRow(idx);
    },
    [
      form.activeAllocation,
      form.voucherType,
      form.journalRows,
      form.additionalEntries,
      form.particulars,
      form.setActiveAllocation,
      form.handleUpdateJournalRow,
      form.handleUpdateAdditionalRow,
      form.handleUpdateParticularRow,
      proceedToNextRow,
    ]
  );

  const handleSaveBankDetails = useCallback(
    (details: any) => {
      form.setBankDetails(details);
      form.setActiveAllocation(null);
      // FIX #8 — use ref so the callback is never stale
      setTimeout(() => acceptRef.current(), 50);
    },
    [form.setBankDetails, form.setActiveAllocation]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // FIX #2 — canAccept now uses exported debitTotal / creditTotal (no `as any`)
  // ─────────────────────────────────────────────────────────────────────────────

  const canAccept = useMemo(() => {
    if (form.isSubmitting) return false;

    if (["Receipt", "Payment", "Contra"].includes(form.voucherType)) {
      const filled = form.particulars.filter(
        (p) => !!p.ledger && (Number(p.amountRaw) || 0) > 0
      );
      const hasDebit = filled.some((p) => p.type === "Dr");
      const hasCredit = filled.some((p) => p.type === "Cr");
      return filled.length >= 2 && hasDebit && hasCredit;
    }

    if (form.voucherType === "Journal") {
      const filled = form.journalRows.filter(
        (r) => !!r.ledger && (Number(r.amountRaw) || 0) > 0
      );
      // FIX #2 — form.debitTotal / form.creditTotal are now properly exported
      return (
        filled.length >= 2 &&
        Math.abs(form.debitTotal - form.creditTotal) < 0.01
      );
    }

    if (["Sales", "Purchase"].includes(form.voucherType)) {
      return (
        !!form.partyLedger &&
        !!form.salesPurchaseLedger &&
        form.stockEntries.some(
          (s) => !!s.stockItem && (Number(s.amountRaw) || 0) > 0
        )
      );
    }

    return false;
  }, [
    form.isSubmitting,
    form.voucherType,
    form.particulars,
    form.journalRows,
    form.debitTotal,   // FIX #2
    form.creditTotal,  // FIX #2
    form.partyLedger,
    form.salesPurchaseLedger,
    form.stockEntries,
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // FIX #3 — smart search-change handler: stock rows use stockSearchTerm,
  // all ledger rows (including additional) use ledgerSearchTerm.
  // ─────────────────────────────────────────────────────────────────────────────

  const handleInventorySearchChange = useCallback(
    (term: string) => {
      if (form.activeField?.type === "stockItem") {
        form.setStockSearchTerm(term);
      } else {
        form.setLedgerSearchTerm(term);
      }
    },
    [form.activeField, form.setStockSearchTerm, form.setLedgerSearchTerm]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Right action panel items
  // ─────────────────────────────────────────────────────────────────────────────

  const voucherActions = useMemo(
    () => [
      {
        key: "F4",
        label: "Contra",
        onClick: () => form.setVoucherType("Contra"),
        active: form.voucherType === "Contra",
      },
      {
        key: "F5",
        label: "Payment",
        onClick: () => form.setVoucherType("Payment"),
        active: form.voucherType === "Payment",
      },
      {
        key: "F6",
        label: "Receipt",
        onClick: () => form.setVoucherType("Receipt"),
        active: form.voucherType === "Receipt",
      },
      {
        key: "F7",
        label: "Journal",
        onClick: () => form.setVoucherType("Journal"),
        active: form.voucherType === "Journal",
      },
      {
        key: "F8",
        label: "Sales",
        onClick: () => form.setVoucherType("Sales"),
        active: form.voucherType === "Sales",
      },
      {
        key: "F9",
        label: "Purchase",
        onClick: () => form.setVoucherType("Purchase"),
        active: form.voucherType === "Purchase",
      },
      {
        key: "Alt+C",
        label: "Create Ledger",
        // FIX #5 — opens inline popup instead of navigating away
        onClick: () => setInlineCreateType("ledger"),
      },
      {
        key: "Ctrl+A",
        label: "Accept",
        onClick: handleAcceptClick,
        disabled: !canAccept,
      },
      { key: "Esc", label: "Quit", onClick: () => navigate("/") },
    ],
    [form.voucherType, form.setVoucherType, handleAcceptClick, canAccept, navigate]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Keyboard shortcuts
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      // Voucher type switching
      if (e.key === "F4") { e.preventDefault(); form.setVoucherType("Contra"); }
      if (e.key === "F5") { e.preventDefault(); form.setVoucherType("Payment"); }
      if (e.key === "F6") { e.preventDefault(); form.setVoucherType("Receipt"); }
      if (e.key === "F7") { e.preventDefault(); form.setVoucherType("Journal"); }
      if (e.key === "F8") { e.preventDefault(); form.setVoucherType("Sales"); }
      if (e.key === "F9") { e.preventDefault(); form.setVoucherType("Purchase"); }

      // Status toggle
      if (e.key === "F11") {
        e.preventDefault();
        form.setStatus((prev) => (prev === "Regular" ? "Post-Dated" : "Regular"));
      }

      // Accept: Alt+A, Ctrl+A, Cmd+A
      if ((e.altKey || e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        if (canAccept) handleAcceptClick();
      }

      // FIX #5 — Alt+C opens inline ledger creation, does NOT navigate away
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        setInlineCreateType("ledger");
      }

      // Quit — only when no popup/panel is open
      if (
        e.key === "Escape" &&
        !form.activeField &&
        !form.activeAllocation &&
        !inlineCreateType
      ) {
        e.preventDefault();
        navigate("/");
      }
    };

    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [
    form.setVoucherType,
    form.setStatus,
    form.activeField,
    form.activeAllocation,
    canAccept,
    handleAcceptClick,
    inlineCreateType,
    navigate,
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Derived state
  // ─────────────────────────────────────────────────────────────────────────────

  const panelOpen = !!form.activeField;

  // The search term shown in LedgerPanel depends on what kind of field is active
  const panelSearchTerm =
    form.activeField?.type === "stockItem"
      ? form.stockSearchTerm
      : form.ledgerSearchTerm;

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col bg-white h-full text-xs select-none">

      {/* ── Title bar ─────────────────────────────────────────────────────────── */}
      <PageTitleBar
        title="Accounting Voucher Creation"
        subtitle={selectedCompany?.name ?? ""}
      />

      {/* ── Toasts ────────────────────────────────────────────────────────────── */}
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

      {/* ── Voucher type tabs ─────────────────────────────────────────────────── */}
      <VoucherTypeTabs activeType={form.voucherType} onChange={form.setVoucherType} />

      {/* ── Voucher number + date header ──────────────────────────────────────── */}
      <VoucherHeader
        voucherType={form.voucherType}
        voucherNumber={form.voucherNumber}   // FIX #4 — string, not number
        dateDisplay={form.dateDisplay}
        date={form.date}
        onDateChange={form.setDate}
        supplierInvoiceNo={form.supplierInvoiceNo}
        onSupplierInvoiceNoChange={form.setSupplierInvoiceNo}
        supplierInvoiceDate={form.supplierInvoiceDate}
        onSupplierInvoiceDateChange={form.setSupplierInvoiceDate}
      />

      {/* ── Main content area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-x-auto">
        <div className="flex-1 flex flex-col min-w-0 bg-white">

          {/* ════════════════════════════════════════════════════════════════════
              Layout 1 — Single-entry: Receipt (F6), Payment (F5), Contra (F4)
              FIX #6 — AccountSection is now rendered above ParticularsTable
          ════════════════════════════════════════════════════════════════════ */}
          {["Receipt", "Payment", "Contra"].includes(form.voucherType) && (
            <div className="flex-1 flex flex-col min-h-0">

              {/* Status bar */}
              <div className="flex items-center min-h-[36px] border-b border-zinc-100 py-1.5 px-3 bg-zinc-50/20">
                <StatusDropdown status={form.status} onChange={form.setStatus} />
              </div>

              {/* FIX #6 — Account field (Tally's top "Account" row for single-entry) */}
              <div className="border-b border-zinc-200">
                <AccountSection
                  ledger={form.accountLedger}
                  balance={form.accountBalance}
                  searchTerm={
                    form.activeField?.type === "account"
                      ? form.ledgerSearchTerm
                      : ""
                  }
                  onFieldFocus={() => form.handleFieldFocus({ type: "account" })}
                  onSearchChange={(term) => {
                    form.setLedgerSearchTerm(term);
                    form.handleFieldFocus({ type: "account" });
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
                activeRowId={
                  form.activeField?.type === "particular"
                    ? form.activeField.rowId
                    : null
                }
                onAmountConfirm={handleParticularAmountConfirm}
                voucherType={form.voucherType}
                debitTotal={form.debitTotal}
                creditTotal={form.creditTotal}
              />
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              Layout 2 — Journal (F7)
          ════════════════════════════════════════════════════════════════════ */}
          {form.voucherType === "Journal" && (
            <div className="flex-1 flex flex-col min-h-0">

              {/* Status bar */}
              <div className="flex items-center min-h-[36px] border-b border-zinc-100 py-1.5 px-3 bg-zinc-50/20">
                <StatusDropdown status={form.status} onChange={form.setStatus} />
              </div>

              <ParticularsTable
                rows={form.journalRows}
                onUpdateRow={form.handleUpdateJournalRow}
                onAddRow={form.handleAddJournalRow}
                onRemoveRow={form.handleRemoveJournalRow}
                onFieldFocus={form.handleFieldFocus}
                onSearchChange={form.setLedgerSearchTerm}
                searchTerm={form.ledgerSearchTerm}
                activeRowId={
                  form.activeField?.type === "particular"
                    ? form.activeField.rowId
                    : null
                }
                isJournal
                onAmountConfirm={handleParticularAmountConfirm}
                debitTotal={form.debitTotal}
                creditTotal={form.creditTotal}
              />
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              Layout 3 — Inventory invoice: Sales (F8), Purchase (F9)
          ════════════════════════════════════════════════════════════════════ */}
          {["Sales", "Purchase"].includes(form.voucherType) && (
            <div className="flex-1 flex flex-col min-h-0">

              {/* Status bar */}
              <div className="flex items-center min-h-[36px] border-b border-zinc-100 py-1.5 px-3 bg-zinc-50/20">
                <StatusDropdown status={form.status} onChange={form.setStatus} />
              </div>

              {/* Party + Sales/Purchase ledger + Ref + Supply state */}
              <div className="grid grid-cols-2 gap-4 p-3 border-b border-zinc-200 bg-zinc-50/20">

                {/* Left column */}
                <div className="space-y-1.5">
                  {/* Party ledger */}
                  <div className="flex items-center min-h-[30px]">
                    <span className="w-24 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Party A/c Name
                    </span>
                    <span className="text-zinc-400 mr-2">:</span>
                    <LedgerField
                      value={
                        form.activeField?.type === "party"
                          ? form.ledgerSearchTerm
                          : form.partyLedger?.name ?? ""
                      }
                      balance={form.partyBalance}
                      placeholder="Select Party Ledger (Debtor / Creditor / Cash / Bank)…"
                      onFocus={() => form.handleFieldFocus({ type: "party" })}
                      onChange={(v) => {
                        form.setLedgerSearchTerm(v);
                        if (!form.partyLedger) form.handleFieldFocus({ type: "party" });
                      }}
                    />
                  </div>

                  {/* Sales / Purchase ledger */}
                  <div className="flex items-center min-h-[30px]">
                    <span className="w-24 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      {form.voucherType} Ledger
                    </span>
                    <span className="text-zinc-400 mr-2">:</span>
                    <LedgerField
                      value={
                        form.activeField?.type === "salesPurchase"
                          ? form.ledgerSearchTerm
                          : form.salesPurchaseLedger?.name ?? ""
                      }
                      balance={form.salesPurchaseBalance}
                      placeholder={`Select ${form.voucherType} Ledger…`}
                      onFocus={() => form.handleFieldFocus({ type: "salesPurchase" })}
                      onChange={(v) => {
                        form.setLedgerSearchTerm(v);
                        if (!form.salesPurchaseLedger)
                          form.handleFieldFocus({ type: "salesPurchase" });
                      }}
                    />
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-1.5">
                  {/* Ref No. + Date */}
                  <div className="flex items-center min-h-[30px]">
                    <span className="w-28 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Ref No. &amp; Date
                    </span>
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

                  {/* Place of supply */}
                  <div className="flex items-center min-h-[30px]">
                    <span className="w-28 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Place of Supply
                    </span>
                    <span className="text-zinc-400 mr-2">:</span>
                    <select
                      className="flex-1 bg-transparent text-xs outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded font-semibold text-zinc-800 cursor-pointer"
                      value={form.placeOfSupply}
                      onChange={(e) => form.setPlaceOfSupply(e.target.value)}
                    >
                      <option value="Select">Select Supply State</option>
                      {INDIAN_STATES.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Stock + additional ledger grid
                  FIX #3 — handleInventorySearchChange routes to the correct setter */}
              <InventoryParticularsTable
                stockEntries={form.stockEntries}
                additionalEntries={form.additionalEntries}
                allGodowns={form.allGodowns}
                allUnits={form.allUnits}
                activeField={form.activeField}
                searchTerm={form.ledgerSearchTerm}
                stockSearchTerm={form.stockSearchTerm}
                onFieldFocus={form.handleFieldFocus}
                onSearchChange={handleInventorySearchChange}  // FIX #3
                onUpdateStockRow={form.handleUpdateStockRow}
                onAddStockRow={form.handleAddStockRow}
                onRemoveStockRow={form.handleRemoveStockRow}
                onUpdateAdditionalRow={form.handleUpdateAdditionalRow}
                onAddAdditionalRow={form.handleAddAdditionalRow}
                onRemoveAdditionalRow={form.handleRemoveAdditionalRow}
                onAmountConfirm={handleParticularAmountConfirm}
              />
            </div>
          )}

          {/* ── FIX #7 — NarrationSection replaces the inline div ──────────────── */}
          <NarrationSection
            value={form.narration}
            totalAmount={form.totalAmount}
            onChange={form.setNarration}
          />
        </div>

        {/* ── Ledger / stock selection panel ──────────────────────────────────── */}
        {panelOpen && (
          <LedgerPanel
            isOpen={panelOpen}
            activeField={form.activeField}
            ledgers={form.allLedgers}
            stockItems={form.allStockItems}
            godowns={form.allGodowns}
            loading={form.ledgersLoading}
            searchTerm={panelSearchTerm}             // correct term per field type
            onSearchChange={
              form.activeField?.type === "stockItem"
                ? form.setStockSearchTerm
                : form.setLedgerSearchTerm
            }
            onSelect={form.handleLedgerPanelSelect}
            onClose={form.handleFieldBlur}
            checkIsCashOrBank={form.checkIsCashOrBank}
            checkLedgerGroup={form.checkLedgerGroup}
            voucherType={form.voucherType}
            // FIX #5 — opens inline popup instead of navigating away
            onInlineCreate={(type) => setInlineCreateType(type)}
          />
        )}

        {/* ── Right action panel ───────────────────────────────────────────────── */}
        <RightActionPanel actions={voucherActions} />
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <ActionFooter
        onAccept={handleAcceptClick}
        onCancelVch={form.resetForm}
        onQuit={() => navigate("/")}
        isSubmitting={form.isSubmitting}
        canAccept={canAccept}
      />

      {/* ══════════════════════════════════════════════════════════════════════════
          Popups
      ══════════════════════════════════════════════════════════════════════════ */}

      {/* Bill-wise allocation (particulars / journal row) */}
      {form.activeAllocation?.type === "billWise" && (
        <BillWiseAllocationPopup
          ledgerId={form.activeAllocation.ledgerId}
          ledgerName={form.activeAllocation.ledgerName}
          totalAmount={form.activeAllocation.amount}
          initialAllocations={form.activeAllocation.initialAllocations ?? []}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveBillWise}
        />
      )}

      {/* Bill-wise allocation (party ledger on Sales/Purchase) */}
      {form.activeAllocation?.type === "billWiseParty" && (
        <BillWiseAllocationPopup
          ledgerId={form.activeAllocation.ledgerId}
          ledgerName={form.activeAllocation.ledgerName}
          totalAmount={form.activeAllocation.amount}
          initialAllocations={form.partyBillReferences}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveBillWise}
        />
      )}

      {/* Cost-centre allocation */}
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

      {/* Bank details */}
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

      {/* FIX #5 — Inline master creation popup (ledger / stock item / godown) */}
      {inlineCreateType && (
        <InlineMasterPopup
          companyId={selectedCompany!.company_id}
          initialType={inlineCreateType}
          onClose={() => setInlineCreateType(null)}
          onSuccess={async (_type, created) => {
            // Refresh all master lists so the new item appears immediately
            await form.fetchContextData();
            setInlineCreateType(null);
            // Auto-select the newly created item into whichever field is active
            if (created) {
              form.handleLedgerPanelSelect(created);
            }
          }}
        />
      )}
    </div>
  );
}