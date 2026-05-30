import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import { useVoucherForm } from "./hooks/useVoucherForm";
import { AlertBanner } from "../../components/ui";
import BillWiseAllocationPopup from "./components/popups/BillWiseAllocationPopup";
import CostCentreAllocationPopup from "./components/popups/CostCentreAllocationPopup";
import BankAllocationPopup from "./components/popups/BankAllocationPopup";
import DenominationPopup from "./components/popups/DenominationPopup";
import DispatchDetailsPopup from "./components/popups/DispatchDetailsPopup";
import ReceiptDetailsPopup from "./components/popups/ReceiptDetailsPopup";
import PartyDetailsPopup from "./components/popups/PartyDetailsPopup";
import DatePickerPopup from "./components/popups/DatePickerPopup";
import VoucherDoubleEntryTable from "./components/VoucherDoubleEntryTable";
import LedgerListPanel from "./components/LedgerListPanel";

function RightSidebar({
  voucherType,
  onTypeChange,
  status,
  onStatusChange,
  entryMode,
  onEntryModeChange,
  onDateClick,
  onCreateLedger,
  onAccept,
  onQuit,
  canAccept,
}: {
  voucherType: string;
  onTypeChange: (t: string) => void;
  status: string;
  onStatusChange: () => void;
  entryMode: "single" | "double";
  onEntryModeChange: () => void;
  onDateClick: () => void;
  onCreateLedger: () => void;
  onAccept: () => void;
  onQuit: () => void;
  canAccept: boolean;
}) {
  const types = [
    { key: "F4", label: "Contra" },
    { key: "F5", label: "Payment" },
    { key: "F6", label: "Receipt" },
    { key: "F7", label: "Journal" },
    { key: "F8", label: "Sales" },
    { key: "F9", label: "Purchase" },
  ];

  return (
    <div className="w-36 border-l border-black flex flex-col shrink-0 bg-white">
      <div className="border-b border-black px-2 py-1">
        <button
          onClick={onDateClick}
          className="w-full text-left text-xs text-black hover:underline"
        >
          <span className="text-gray-500">F2</span>: Date
        </button>
      </div>

      {types.map(({ key, label }) => (
        <div key={key} className="border-b border-gray-200">
          <button
            onClick={() => onTypeChange(label)}
            className={`w-full text-left px-2 py-1 text-xs ${
              voucherType === label
                ? "bg-black text-white font-semibold"
                : "text-black hover:bg-gray-100"
            }`}
          >
            <span className={voucherType === label ? "text-gray-300" : "text-gray-500"}>
              {key}
            </span>
            : {label}
          </button>
        </div>
      ))}

      <div className="border-b border-gray-200">
        <button
          onClick={onCreateLedger}
          className="w-full text-left px-2 py-1 text-xs text-black hover:bg-gray-100"
        >
          <span className="text-gray-500">Alt+C</span>: Create Ldgr
        </button>
      </div>

      <div className="border-b border-gray-200">
        <button
          onClick={onStatusChange}
          className="w-full text-left px-2 py-1 text-xs text-black hover:bg-gray-100"
        >
          <span className="text-gray-500">T</span>:{" "}
          {status === "Post-Dated" ? "✓ " : ""}Post-Dated
        </button>
      </div>

      {["Contra", "Receipt", "Journal", "Payment"].includes(voucherType) && (
        <div className="border-b border-gray-200">
          <button
            onClick={onEntryModeChange}
            className="w-full text-left px-2 py-1 text-xs text-black hover:bg-gray-100"
          >
            <span className="text-gray-500">H</span>:{" "}
            {entryMode === "double" ? "✓ " : ""}Double Entry
          </button>
        </div>
      )}

      <div className="flex-1" />

      <div className="border-t border-black px-2 py-1">
        <button
          onClick={onAccept}
          disabled={!canAccept}
          className="w-full text-left text-xs text-black hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <span className="text-gray-500">A</span>: Accept
        </button>
      </div>
      <div className="border-t border-gray-300 px-2 py-1">
        <button onClick={onQuit} className="w-full text-left text-xs text-black hover:underline">
          <span className="text-gray-500">Q</span>: Quit
        </button>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────

export default function Vouchers() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const form = useVoucherForm();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDispatchDetails, setShowDispatchDetails] = useState(false);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);
  const [showPartyDetails, setShowPartyDetails] = useState(false);

  // Prevent auto-opening receipt details on mount when form is restored from persistence
  const hasAutoOpenedReceipt = useRef(false);

  // Stable ref so async callbacks (bill-wise save → accept) always call the
  // latest version of handleAccept without stale closure issues.
  const acceptRef = useRef<() => void>(() => {});

  // ─── canAccept ──────────────────────────────────────────────────────

  const canAccept = useMemo(() => {
    if (form.isSubmitting) return false;

    if (form.voucherType === "Receipt") {
      if (form.receiptEntryMode === "single") {
        return (
          !!form.accountLedger &&
          form.particulars.some((p) => !!p.ledger && p.amountRaw !== "")
        );
      }
      const filled = form.receiptDoubleRows.filter(
        (r) => !!r.ledger && r.amountRaw !== ""
      );
      return (
        filled.length >= 2 &&
        Math.abs(form.debitTotal - form.creditTotal) < 0.01
      );
    }

    if (form.voucherType === "Payment") {
      if (form.paymentEntryMode === "single") {
        return (
          !!form.accountLedger &&
          form.particulars.some((p) => !!p.ledger && (Number(p.amountRaw) || 0) > 0)
        );
      }
      const filled = form.paymentDoubleRows.filter(
        (r) => !!r.ledger && (Number(r.amountRaw) || 0) > 0
      );
      return (
        filled.length >= 2 &&
        Math.abs(form.debitTotal - form.creditTotal) < 0.01
      );
    }

    if (form.voucherType === "Contra") {
      if (form.contraEntryMode === "single") {
        return (
          !!form.accountLedger &&
          form.particulars.some((p) => !!p.ledger && p.amountRaw !== "")
        );
      }
      const filled = form.contraDoubleRows.filter(
        (r) => !!r.ledger && r.amountRaw !== ""
      );
      return (
        filled.length >= 2 &&
        Math.abs(form.debitTotal - form.creditTotal) < 0.01
      );
    }

    if (form.voucherType === "Journal") {
      if (form.journalEntryMode === "single") {
        return (
          !!form.accountLedger &&
          form.particulars.some((p) => !!p.ledger && (Number(p.amountRaw) || 0) > 0)
        );
      }
      const filled = form.journalRows.filter(
        (r) => !!r.ledger && (Number(r.amountRaw) || 0) > 0
      );
      return (
        filled.length >= 2 &&
        Math.abs(form.debitTotal - form.creditTotal) < 0.01
      );
    }

    if (["Sales", "Purchase"].includes(form.voucherType)) {
      return (
        !!form.partyLedger &&
        !!form.salesPurchaseLedger &&
        form.stockEntries.some((s) => !!s.stockItem && (Number(s.amountRaw) || 0) > 0)
      );
    }

    return false;
  }, [
    form.isSubmitting,
    form.paymentEntryMode,
    form.journalEntryMode,
    form.voucherType,
    form.contraEntryMode,
    form.receiptEntryMode,
    form.contraDoubleRows,
    form.receiptDoubleRows,
    form.paymentDoubleRows,
    form.accountLedger,
    form.particulars,
    form.journalRows,
    form.debitTotal,
    form.creditTotal,
    form.partyLedger,
    form.salesPurchaseLedger,
    form.stockEntries,
  ]);

  // ─── Monitor party ledger changes to open dispatch/receipt details ────────

  useEffect(() => {
    if (form.voucherType === "Sales" && form.partyLedger) {
      setShowDispatchDetails(true);
    }
  }, [form.partyLedger, form.voucherType]);

  useEffect(() => {
    if (form.voucherType === "Purchase" && form.partyLedger && !hasAutoOpenedReceipt.current) {
      hasAutoOpenedReceipt.current = true;
      setShowReceiptDetails(true);
    }
  }, [form.partyLedger, form.voucherType]);

  useEffect(() => {
    if (!form.partyLedger) {
      hasAutoOpenedReceipt.current = false;
    }
  }, [form.partyLedger]);

  // ─── handleAccept ────────────────────────────────────────────────────

  const handleAccept = useCallback(() => {
    // ── Sales / Purchase: bill-wise for party ───────────────────────────
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

    // ── Receipt (single-entry) / Payment (single-entry): bill-wise for account ledger ────────
    if (
      ((form.voucherType === "Payment" && form.paymentEntryMode === "single") ||
       (form.voucherType === "Receipt" && form.receiptEntryMode === "single")) &&
      form.accountLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      form.setActiveAllocation({
        type: "billWiseParty",
        ledgerId: form.accountLedger.ledger_id,
        ledgerName: form.accountLedger.name,
        amount: form.particularsTotal,
        initialAllocations: [],
      });
      return;
    }

    if (
      form.voucherType === "Contra" &&
      form.contraEntryMode === "single" &&
      form.accountLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      form.setActiveAllocation({
        type: "billWiseParty",
        ledgerId: form.accountLedger.ledger_id,
        ledgerName: form.accountLedger.name,
        amount: form.particularsTotal,
        initialAllocations: [],
      });
      return;
    }

    if (
      form.voucherType === "Journal" &&
      form.journalEntryMode === "single" &&
      form.accountLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      form.setActiveAllocation({
        type: "billWiseParty",
        ledgerId: form.accountLedger.ledger_id,
        ledgerName: form.accountLedger.name,
        amount: form.particularsTotal,
        initialAllocations: [],
      });
      return;
    }

    form.handleSubmit();
  }, [
    form.voucherType,
    form.paymentEntryMode,
    form.journalEntryMode,
    form.contraEntryMode,
    form.receiptEntryMode,
    form.partyLedger,
    form.accountLedger,
    form.partyBillReferences,
    form.totalAmount,
    form.particularsTotal,
    form.handleSubmit,
    form.setActiveAllocation,
  ]);

  useEffect(() => { acceptRef.current = handleAccept; }, [handleAccept]);

  // ─── proceedToNextRow ────────────────────────────────────────────────

  const proceedToNextRow = useCallback(
    (idx: number) => {
      const isJDouble = form.voucherType === "Journal" && form.journalEntryMode === "double";
      const isJSingle = form.voucherType === "Journal" && form.journalEntryMode === "single";
      const isPayDouble = form.voucherType === "Payment" && form.paymentEntryMode === "double";
      const isInv = ["Sales", "Purchase"].includes(form.voucherType);
      const isContraDouble = form.voucherType === "Contra" && form.contraEntryMode === "double";
      const isReceiptDouble = form.voucherType === "Receipt" && form.receiptEntryMode === "double";
      const list = isJDouble
        ? form.journalRows
        : isJSingle
        ? form.particulars
        : isPayDouble
        ? form.paymentDoubleRows
        : isInv
        ? form.additionalEntries
        : isContraDouble
        ? form.contraDoubleRows
        : isReceiptDouble
        ? form.receiptDoubleRows
        : form.particulars;
      const addRow = isJDouble
        ? form.handleAddJournalRow
        : isJSingle
        ? form.handleAddParticularRow
        : isPayDouble
        ? form.handleAddPaymentDoubleRow
        : isInv
        ? form.handleAddAdditionalRow
        : isContraDouble
        ? form.handleAddContraDoubleRow
        : isReceiptDouble
        ? form.handleAddReceiptDoubleRow
        : form.handleAddParticularRow;

      if (idx === list.length - 1) addRow();

      const sel = isInv
        ? `[data-additional-ledger="${idx + 2}"]`
        : `[data-particular-ledger="${idx + 2}"]`;
      setTimeout(
        () => (document.querySelector(sel) as HTMLInputElement | null)?.focus(),
        50
      );
    },
    [
      form.voucherType,
      form.paymentEntryMode,
      form.journalEntryMode,
      form.contraEntryMode,
      form.receiptEntryMode,
      form.journalRows,
      form.paymentDoubleRows,
      form.additionalEntries,
      form.particulars,
      form.contraDoubleRows,
      form.receiptDoubleRows,
      form.handleAddJournalRow,
      form.handleAddPaymentDoubleRow,
      form.handleAddAdditionalRow,
      form.handleAddParticularRow,
      form.handleAddContraDoubleRow,
      form.handleAddReceiptDoubleRow,
    ]
  );

  // ─── handleAmountConfirm ─────────────────────────────────────────────

  const handleAmountConfirm = useCallback(
    (row: any, idx: number) => {
      const { ledger, amountRaw, id } = row;
      const amount = Number(amountRaw) || 0;
      if (!ledger) { proceedToNextRow(idx); return; }

      // Contra / Receipt / Payment double-entry: bank allocation for any bank ledger
      if (
        form.voucherType === "Contra" ||
        (form.voucherType === "Receipt" && form.receiptEntryMode === "double") ||
        (form.voucherType === "Payment" && form.paymentEntryMode === "double")
      ) {
        if (form.checkIsBank(ledger)) {
          const allowCash =
            (form.voucherType === "Receipt" || form.voucherType === "Contra")
              ? row.type === "Dr"
              : true;
          form.setActiveAllocation({
            type: "bankDetails",
            rowId: id,
            ledgerId: ledger.ledger_id,
            ledgerName: ledger.name,
            amount,
            initialDetails: form.bankDetails,
            allowCash,
          });
          return;
        }
        proceedToNextRow(idx);
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
        proceedToNextRow(idx);
      }
    },
    [form.voucherType, form.paymentEntryMode, form.receiptEntryMode, form.checkIsBank, form.checkIsCash, form.bankDetails, form.cashDenominations, form.setActiveAllocation, proceedToNextRow]
  );

  // ─── Allocation save handlers ────────────────────────────────────────

  const handleSaveBillWise = useCallback(
    (allocations: any[]) => {
      // Party bill-wise (Sales/Purchase) or account bill-wise (Receipt/Payment)
      if (
        form.activeAllocation?.type === "billWiseParty"
      ) {
        form.setPartyBillReferences(allocations);
        form.setActiveAllocation(null);
        setTimeout(() => acceptRef.current(), 50);
        return;
      }

      const alloc = form.activeAllocation;
      if (!alloc || !("rowId" in alloc)) return;
      const { rowId } = alloc;
      const isJDouble = form.voucherType === "Journal" && form.journalEntryMode === "double";
      const isJSingle = form.voucherType === "Journal" && form.journalEntryMode === "single";
      const isPayDouble = form.voucherType === "Payment" && form.paymentEntryMode === "double";
      const isInv = ["Sales", "Purchase"].includes(form.voucherType);
      const isContraDouble = form.voucherType === "Contra" && form.contraEntryMode === "double";
      const isReceiptDouble = form.voucherType === "Receipt" && form.receiptEntryMode === "double";

      if (isJDouble) form.handleUpdateJournalRow(rowId, { billReferences: allocations });
      else if (isJSingle) form.handleUpdateParticularRow(rowId, { billReferences: allocations });
      else if (isPayDouble) form.handleUpdatePaymentDoubleRow(rowId, { billReferences: allocations });
      else if (isInv) form.handleUpdateAdditionalRow(rowId, { billReferences: allocations });
      else if (isContraDouble) form.handleUpdateContraDoubleRow(rowId, { billReferences: allocations });
      else if (isReceiptDouble) form.handleUpdateReceiptDoubleRow(rowId, { billReferences: allocations });
      else form.handleUpdateParticularRow(rowId, { billReferences: allocations });

      const list = isJDouble ? form.journalRows : isJSingle ? form.particulars : isPayDouble ? form.paymentDoubleRows : isInv ? form.additionalEntries : isContraDouble ? form.contraDoubleRows : isReceiptDouble ? form.receiptDoubleRows : form.particulars;
      const targetRow = list.find((r) => r.id === rowId);

      if (targetRow?.ledger?.allow_cost_centres === 1) {
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
        proceedToNextRow(list.findIndex((r) => r.id === rowId));
      }
    },
    [
      form.activeAllocation,
      form.voucherType,
      form.paymentEntryMode,
      form.journalEntryMode,
      form.contraEntryMode,
      form.receiptEntryMode,
      form.journalRows,
      form.paymentDoubleRows,
      form.additionalEntries,
      form.particulars,
      form.contraDoubleRows,
      form.receiptDoubleRows,
      form.setPartyBillReferences,
      form.setActiveAllocation,
      form.handleUpdateJournalRow,
      form.handleUpdatePaymentDoubleRow,
      form.handleUpdateAdditionalRow,
      form.handleUpdateContraDoubleRow,
      form.handleUpdateReceiptDoubleRow,
      form.handleUpdateParticularRow,
      proceedToNextRow,
    ]
  );

  const handleSaveCostCentre = useCallback(
    (allocations: any[]) => {
      const alloc = form.activeAllocation;
      if (!alloc || !("rowId" in alloc)) return;
      const { rowId } = alloc;
      const isJDouble = form.voucherType === "Journal" && form.journalEntryMode === "double";
      const isJSingle = form.voucherType === "Journal" && form.journalEntryMode === "single";
      const isPayDouble = form.voucherType === "Payment" && form.paymentEntryMode === "double";
      const isInv = ["Sales", "Purchase"].includes(form.voucherType);
      const isContraDouble = form.voucherType === "Contra" && form.contraEntryMode === "double";
      const isReceiptDouble = form.voucherType === "Receipt" && form.receiptEntryMode === "double";

      if (isJDouble) form.handleUpdateJournalRow(rowId, { costCentres: allocations });
      else if (isJSingle) form.handleUpdateParticularRow(rowId, { costCentres: allocations });
      else if (isPayDouble) form.handleUpdatePaymentDoubleRow(rowId, { costCentres: allocations });
      else if (isInv) form.handleUpdateAdditionalRow(rowId, { costCentres: allocations });
      else if (isContraDouble) form.handleUpdateContraDoubleRow(rowId, { costCentres: allocations });
      else if (isReceiptDouble) form.handleUpdateReceiptDoubleRow(rowId, { costCentres: allocations });
      else form.handleUpdateParticularRow(rowId, { costCentres: allocations });

      form.setActiveAllocation(null);
      const list = isJDouble ? form.journalRows : isJSingle ? form.particulars : isPayDouble ? form.paymentDoubleRows : isInv ? form.additionalEntries : isContraDouble ? form.contraDoubleRows : isReceiptDouble ? form.receiptDoubleRows : form.particulars;
      proceedToNextRow(list.findIndex((r) => r.id === rowId));
    },
    [
      form.activeAllocation,
      form.voucherType,
      form.paymentEntryMode,
      form.journalEntryMode,
      form.contraEntryMode,
      form.receiptEntryMode,
      form.journalRows,
      form.paymentDoubleRows,
      form.additionalEntries,
      form.particulars,
      form.contraDoubleRows,
      form.receiptDoubleRows,
      form.setActiveAllocation,
      form.handleUpdateJournalRow,
      form.handleUpdatePaymentDoubleRow,
      form.handleUpdateAdditionalRow,
      form.handleUpdateContraDoubleRow,
      form.handleUpdateReceiptDoubleRow,
      form.handleUpdateParticularRow,
      proceedToNextRow,
    ]
  );

  const handleSaveBankDetails = useCallback(
    (details: any) => {
      const alloc = form.activeAllocation;
      form.setBankDetails(details);

      if (details.transaction_type === "Cash") {
        const shouldSkipDenomination =
          form.voucherType === "Receipt" ||
          (alloc && alloc.type === "bankDetails" && alloc.allowCash === false);

        if (shouldSkipDenomination) {
          form.setActiveAllocation(null);
          if (alloc && "rowId" in alloc) {
            const isContraDouble = form.voucherType === "Contra" && form.contraEntryMode === "double";
            const isReceiptDouble = form.voucherType === "Receipt" && form.receiptEntryMode === "double";
            const isPayDouble = form.voucherType === "Payment" && form.paymentEntryMode === "double";
            const list = isContraDouble
              ? form.contraDoubleRows
              : isReceiptDouble
              ? form.receiptDoubleRows
              : isPayDouble
              ? form.paymentDoubleRows
              : form.particulars;
            const rowIdx = list.findIndex((r) => r.id === alloc.rowId);
            proceedToNextRow(rowIdx);
          }
          return;
        }

        form.setActiveAllocation({
          type: "cashDenomination",
          rowId: alloc && "rowId" in alloc ? alloc.rowId : "",
          ledgerId: details.ledger_id,
          ledgerName: details.bank_name || form.activeAllocation?.ledgerName || "Cash",
          amount: details.amount,
          initialDetails: form.cashDenominations,
        });
        return;
      }

      form.setActiveAllocation(null);
      if (alloc && "rowId" in alloc) {
        const isContraDouble = form.voucherType === "Contra" && form.contraEntryMode === "double";
        const isReceiptDouble = form.voucherType === "Receipt" && form.receiptEntryMode === "double";
        const isPayDouble = form.voucherType === "Payment" && form.paymentEntryMode === "double";
        const list = isContraDouble
          ? form.contraDoubleRows
          : isReceiptDouble
          ? form.receiptDoubleRows
          : isPayDouble
          ? form.paymentDoubleRows
          : form.particulars;
        const rowIdx = list.findIndex((r) => r.id === alloc.rowId);
        proceedToNextRow(rowIdx);
      }
    },
    [form.activeAllocation, form.setBankDetails, form.setActiveAllocation, form.voucherType, form.paymentEntryMode, form.contraEntryMode, form.receiptEntryMode, form.contraDoubleRows, form.receiptDoubleRows, form.paymentDoubleRows, form.particulars, form.cashDenominations, proceedToNextRow]
  );

  const handleSaveCashDenomination = useCallback(
    (details: any) => {
      const alloc = form.activeAllocation;
      form.setCashDenominations(details);
      form.setActiveAllocation(null);
      if (alloc && "rowId" in alloc) {
        const isContraDouble = form.voucherType === "Contra" && form.contraEntryMode === "double";
        const isReceiptDouble = form.voucherType === "Receipt" && form.receiptEntryMode === "double";
        const isPayDouble = form.voucherType === "Payment" && form.paymentEntryMode === "double";
        const list = isContraDouble
          ? form.contraDoubleRows
          : isReceiptDouble
          ? form.receiptDoubleRows
          : isPayDouble
          ? form.paymentDoubleRows
          : form.particulars;
        const rowIdx = list.findIndex((r) => r.id === alloc.rowId);
        proceedToNextRow(rowIdx);
      }
    },
    [form.activeAllocation, form.setCashDenominations, form.setActiveAllocation, form.voucherType, form.paymentEntryMode, form.contraEntryMode, form.receiptEntryMode, form.contraDoubleRows, form.receiptDoubleRows, form.paymentDoubleRows, form.particulars, proceedToNextRow]
  );

  const handleSaveDispatchDetails = useCallback(
    (_details: any) => {
      // Store dispatch details in form state (can be extended later)
      setShowDispatchDetails(false);
    },
    []
  );

  const handleSaveReceiptDetails = useCallback(
    (details: any) => {
      form.setReceiptDetails(details);
      setShowReceiptDetails(false);
      setShowPartyDetails(true);
    },
    [form.setReceiptDetails]
  );

  const handleSavePartyDetails = useCallback(
    (details: any) => {
      form.setPartyDetails(details);
      if (details.state) {
        form.setPlaceOfSupply(details.state);
      }
      setShowPartyDetails(false);
    },
    [form.setPartyDetails, form.setPlaceOfSupply]
  );

  // ─── Ledger panel items ──────────────────────────────────────────────

  const panelOpen = !!form.activeField;

  const panelItems = useMemo(() => {
    const af = form.activeField;
    if (!af) return [];

    if (af.type === "stockItem") return form.allStockItems;

    if (af.type === "account") {
      if (form.voucherType === "Journal") {
        return form.allLedgers.filter((l) => !form.checkIsCashOrBank(l));
      }
      // Account field is always cash/bank for all three single-entry types
      return form.allLedgers.filter((l) => form.checkIsCashOrBank(l));
    }

    if (af.type === "party") {
      return form.allLedgers.filter((l) =>
        form.checkLedgerGroup(l, [
          "bank accounts",
          "bank od accounts",
          "bank od a/c",
          "cash-in-hand",
          "sundry debtors",
          "sundry creditors",
        ])
      );
    }

    if (af.type === "salesPurchase") {
      return form.allLedgers.filter((l) =>
        form.checkLedgerGroup(
          l,
          form.voucherType === "Sales" ? ["sales accounts"] : ["purchase accounts"]
        )
      );
    }

    // Journal Particulars: all ledgers except cash/bank
    if (form.voucherType === "Journal" && af.type === "particular") {
      return form.allLedgers.filter((l) => !form.checkIsCashOrBank(l));
    }

    // Contra Particulars: also restricted to cash/bank (destination side)
    // In double-entry mode, all rows are restricted to cash/bank
    if (form.voucherType === "Contra" && af.type === "particular") {
      return form.allLedgers.filter((l) => form.checkIsCashOrBank(l));
    }

    // Receipt double-entry: Dr rows = all ledgers, Cr rows = all ledgers
    if (form.voucherType === "Receipt" && form.receiptEntryMode === "double" && af.type === "particular") {
      return form.allLedgers;
    }

    // Payment double-entry: all ledgers visible for both Dr and Cr
    if (form.voucherType === "Payment" && form.paymentEntryMode === "double" && af.type === "particular") {
      return form.allLedgers;
    }

    // Payment single-entry: Particulars are Dr — all ledgers except cash/bank
    if (form.voucherType === "Payment" && form.paymentEntryMode === "single" && af.type === "particular") {
      return form.allLedgers.filter((l) => !form.checkIsCashOrBank(l));
    }

    // Receipt / Payment Particulars + Journal + additional: any ledger
    return form.allLedgers;
  }, [
    form.activeField,
    form.voucherType,
    form.paymentEntryMode,
    form.journalEntryMode,
    form.receiptEntryMode,
    form.paymentDoubleRows,
    form.receiptDoubleRows,
    form.allLedgers,
    form.allStockItems,
    form.checkIsCashOrBank,
    form.checkLedgerGroup,
  ]);

  const panelTitle = useMemo(() => {
    const af = form.activeField;
    if (!af) return "List of Ledger Accounts";
    if (af.type === "stockItem") return "List of Stock Items";
    if (af.type === "account") return form.voucherType === "Journal" ? "List of Ledger Accounts" : "List of Cash / Bank Accounts";
    if (af.type === "party") return "List of Party Accounts";
    if (af.type === "salesPurchase") return `List of ${form.voucherType} Ledgers`;
    return "List of Ledger Accounts";
  }, [form.activeField, form.voucherType, form.receiptEntryMode, form.receiptDoubleRows]);

  const panelSearchTerm =
    form.activeField?.type === "stockItem" ? form.stockSearchTerm : form.ledgerSearchTerm;

  const handlePanelSearchChange = useCallback(
    (v: string) => {
      if (form.activeField?.type === "stockItem") form.setStockSearchTerm(v);
      else form.setLedgerSearchTerm(v);
    },
    [form.activeField, form.setStockSearchTerm, form.setLedgerSearchTerm]
  );

  // ─── Keyboard shortcuts ──────────────────────────────────────────────

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
          form.setContraEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
        } else if (form.voucherType === "Receipt") {
          form.setReceiptEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
        } else if (form.voucherType === "Payment") {
          form.setPaymentEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
        } else if (form.voucherType === "Journal") {
          form.setJournalEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
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
    form.setPaymentEntryMode,
    form.setJournalEntryMode,
    form.setVoucherType,
    form.setContraEntryMode,
    form.setReceiptEntryMode,
    form.voucherType,
    form.activeField,
    form.activeAllocation,
    canAccept,
    handleAccept,
    showDatePicker,
    showDispatchDetails,
    showReceiptDetails,
    navigate,
  ]);

  // ─── FieldRow (named ledger + balance display) ──────────────────────

  function FieldRow({
    label,
    fieldType,
    ledger,
    balance,
  }: {
    label: string;
    fieldType: "account" | "party" | "salesPurchase";
    ledger: any;
    balance: string;
  }) {
    const isActive = form.activeField?.type === fieldType;
    const st = isActive ? form.ledgerSearchTerm : "";

    return (
      <>
        <div className="flex items-center px-3 py-0 min-h-[22px]">
          <span className="w-40 text-sm text-black shrink-0">{label}</span>
          <span className="text-sm text-black mr-2 shrink-0">:</span>
          <input
            type="text"
            className="w-64 text-sm border border-gray-400 px-1 py-0 outline-none focus:border-black"
            value={isActive ? st : (ledger?.name ?? "")}
            onFocus={() => form.handleFieldFocus({ type: fieldType })}
            onChange={(e) => {
              form.setLedgerSearchTerm(e.target.value);
              form.handleFieldFocus({ type: fieldType });
            }}
            autoComplete="off"
          />
        </div>
        <div className="flex items-center px-3 py-0 min-h-[18px]">
          <span className="w-40 text-xs text-gray-500 shrink-0 italic">Current balance</span>
          <span className="text-xs text-gray-500 mr-2 shrink-0">:</span>
          <span className="text-xs text-gray-500 italic">{balance || ""}</span>
        </div>
      </>
    );
  }

  // ─── Balanced / diff indicator ───────────────────────────────────────

  function BalanceIndicator() {
    if (form.voucherType === "Receipt") {
      if (form.receiptEntryMode === "single") {
        return form.particularsTotal > 0 ? (
          <span className="text-gray-500">✓ Balanced</span>
        ) : null;
      }
      if (form.debitTotal <= 0) return null;

      const hasNegative = form.receiptDoubleRows.some(
        (r) =>
          r.ledger &&
          r.ledgerBalance &&
          parseFloat(r.ledgerBalance) < 0
      );

      if (Math.abs(form.debitTotal - form.creditTotal) > 0.01) {
        return (
          <span className="text-red-700">
            ⚠ Diff:{" "}
            {Math.abs(form.debitTotal - form.creditTotal).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        );
      }

      if (hasNegative) {
        return <span className="text-red-600">⚠ Negative balance on selected ledgers</span>;
      }

      return <span className="text-gray-500">✓ Balanced</span>;
    }

    if (form.voucherType === "Payment") {
      if (form.paymentEntryMode === "single") {
        return form.particularsTotal > 0 ? (
          <span className="text-gray-500">✓ Balanced</span>
        ) : null;
      }
      if (form.debitTotal <= 0) return null;

      const hasNegative = form.paymentDoubleRows.some(
        (r) =>
          r.ledger &&
          r.ledgerBalance &&
          parseFloat(r.ledgerBalance) < 0
      );

      if (Math.abs(form.debitTotal - form.creditTotal) > 0.01) {
        return (
          <span className="text-red-700">
            ⚠ Diff:{" "}
            {Math.abs(form.debitTotal - form.creditTotal).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        );
      }

      if (hasNegative) {
        return <span className="text-red-600">⚠ Negative balance on selected ledgers</span>;
      }

      return <span className="text-gray-500">✓ Balanced</span>;
    }
    if (form.voucherType === "Contra") {
      if (form.contraEntryMode === "single") {
        return form.particularsTotal > 0 ? (
          <span className="text-gray-500">✓ Balanced</span>
        ) : null;
      }
      if (form.debitTotal <= 0) return null;

      const hasNegative = form.contraDoubleRows.some(
        (r) =>
          r.ledger &&
          r.ledgerBalance &&
          parseFloat(r.ledgerBalance) < 0
      );

      if (Math.abs(form.debitTotal - form.creditTotal) > 0.01) {
        return (
          <span className="text-red-700">
            ⚠ Diff:{" "}
            {Math.abs(form.debitTotal - form.creditTotal).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        );
      }

      if (hasNegative) {
        return <span className="text-red-600">⚠ Negative balance on selected ledgers</span>;
      }

      return <span className="text-gray-500">✓ Balanced</span>;
    }
    if (form.voucherType === "Journal") {
      if (form.journalEntryMode === "single") {
        return form.particularsTotal > 0 ? (
          <span className="text-gray-500">✓ Balanced</span>
        ) : null;
      }
      if (form.debitTotal <= 0) return null;
      if (Math.abs(form.debitTotal - form.creditTotal) > 0.01) {
        return (
          <span className="text-red-700">
            ⚠ Diff:{" "}
            {Math.abs(form.debitTotal - form.creditTotal).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        );
      }
      return <span className="text-gray-500">✓ Balanced</span>;
    }
    return null;
  }

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-white text-black text-sm select-none overflow-hidden">
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
              className="text-xs underline"
            >
              View Register →
            </button>
          }
        />
      )}

      {/* ── Title bar ── */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-black bg-white shrink-0">
        <span className="text-sm font-semibold text-black">Accounting Voucher Creation</span>
        <span className="text-sm text-black">{selectedCompany?.name ?? ""}</span>
        <button
          onClick={() => navigate("/")}
          className="text-black text-sm font-bold hover:opacity-60 leading-none"
        >
          ✕
        </button>
      </div>

      {/* ── Voucher type / number / date bar ── */}
      <div className="flex items-center px-3 py-1 border-b border-black bg-white shrink-0">
        <div className="text-xs font-bold text-white bg-black px-3 py-0.5 min-w-[80px] text-center uppercase">
          {form.voucherType}
        </div>
        <span className="text-sm text-black ml-3">No.</span>
        <span className="text-sm font-bold text-black ml-2 mr-6">{form.voucherNumber}</span>
        <div className="flex-1" />
        {form.status === "Post-Dated" && (
          <span className="text-xs text-black border border-black px-2 py-0 mr-4">
            Post-Dated
          </span>
        )}
        <button
          onClick={() => setShowDatePicker(true)}
          className="text-sm font-semibold text-black hover:underline focus:outline-none"
          title="F2: Change Date"
        >
          {form.dateDisplay}
        </button>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden border-r border-black">

          {/* ════════════════════════════════════════════════════════════
              Layout 1 — Payment · Receipt (single-entry) · Contra (single-entry)
              Account (cash/bank) + Particulars table
          ═════════════════════════════════════════════════════════════ */}
          {((form.voucherType === "Payment" && form.paymentEntryMode === "single") ||
            (form.voucherType === "Receipt" && form.receiptEntryMode === "single") ||
            (form.voucherType === "Contra" && form.contraEntryMode === "single") ||
            (form.voucherType === "Journal" && form.journalEntryMode === "single")) && (
            <>
              {/* Account field */}
              <div className="border-b border-gray-300 shrink-0 py-1">
                <FieldRow
                  label="Account"
                  fieldType="account"
                  ledger={form.accountLedger}
                  balance={form.accountBalance}
                />
              </div>

              {/* Particulars table header */}
              <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-white">
                <div className="flex-1 text-sm font-semibold text-black">Particulars</div>
                <div className="w-40 text-right text-sm font-semibold text-black">Amount</div>
              </div>

              {/* Particulars rows */}
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
                  <BalanceIndicator />
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
          )}

          {/* ════════════════════════════════════════════════════════════
              Layout 1c — Receipt (double-entry)
              Dr = Cash/Bank only · Cr = non-Cash/Bank only
          ═════════════════════════════════════════════════════════════ */}
          {form.voucherType === "Receipt" && form.receiptEntryMode === "double" && (
            <VoucherDoubleEntryTable
              rows={form.receiptDoubleRows}
              onUpdateRow={form.handleUpdateReceiptDoubleRow}
              onAddRow={form.handleAddReceiptDoubleRow}
              onRemoveRow={form.handleRemoveReceiptDoubleRow}
              onFieldFocus={form.handleFieldFocus}
              onSearchChange={form.setLedgerSearchTerm}
              searchTerm={form.ledgerSearchTerm}
              activeRowId={form.activeField?.type === "particular" ? form.activeField.rowId : null}
              onAmountConfirm={handleAmountConfirm}
            />
          )}

          {/* ════════════════════════════════════════════════════════════
              Layout 1d — Payment (double-entry)
              Dr = non-Cash/Bank only · Cr = Cash/Bank only
          ═════════════════════════════════════════════════════════════ */}
          {form.voucherType === "Payment" && form.paymentEntryMode === "double" && (
            <VoucherDoubleEntryTable
              rows={form.paymentDoubleRows}
              onUpdateRow={form.handleUpdatePaymentDoubleRow}
              onAddRow={form.handleAddPaymentDoubleRow}
              onRemoveRow={form.handleRemovePaymentDoubleRow}
              onFieldFocus={form.handleFieldFocus}
              onSearchChange={form.setLedgerSearchTerm}
              searchTerm={form.ledgerSearchTerm}
              activeRowId={form.activeField?.type === "particular" ? form.activeField.rowId : null}
              onAmountConfirm={handleAmountConfirm}
            />
          )}

          {/* ════════════════════════════════════════════════════════════
              Layout 1b — Contra (double-entry)
              No Account field; Particulars + Debit + Credit columns
          ═════════════════════════════════════════════════════════════ */}
          {form.voucherType === "Contra" && form.contraEntryMode === "double" && (
            <VoucherDoubleEntryTable
              rows={form.contraDoubleRows}
              onUpdateRow={form.handleUpdateContraDoubleRow}
              onAddRow={form.handleAddContraDoubleRow}
              onRemoveRow={form.handleRemoveContraDoubleRow}
              onFieldFocus={form.handleFieldFocus}
              onSearchChange={form.setLedgerSearchTerm}
              searchTerm={form.ledgerSearchTerm}
              activeRowId={form.activeField?.type === "particular" ? form.activeField.rowId : null}
              onAmountConfirm={handleAmountConfirm}
            />
          )}

          {/* ════════════════════════════════════════════════════════════
              Layout 2 — Journal (double-entry)
              Same layout as Contra/Receipt double-entry with Dr/Cr selector
          ═════════════════════════════════════════════════════════════ */}
          {form.voucherType === "Journal" && form.journalEntryMode === "double" && (
            <VoucherDoubleEntryTable
              rows={form.journalRows}
              onUpdateRow={form.handleUpdateJournalRow}
              onAddRow={form.handleAddJournalRow}
              onRemoveRow={form.handleRemoveJournalRow}
              onFieldFocus={form.handleFieldFocus}
              onSearchChange={form.setLedgerSearchTerm}
              searchTerm={form.ledgerSearchTerm}
              activeRowId={form.activeField?.type === "particular" ? form.activeField.rowId : null}
              onAmountConfirm={handleAmountConfirm}
            />
          )}

          {/* ════════════════════════════════════════════════════════════
              Layout 3 — Sales · Purchase
              Party + Sales/Purchase ledger + stock items + additional entries
          ═════════════════════════════════════════════════════════════ */}
          {["Sales", "Purchase"].includes(form.voucherType) && (
            <>
              {/* Purchase: supplier invoice fields */}
              {form.voucherType === "Purchase" && (
                <div className="flex items-center border-b border-gray-300 shrink-0 px-3 py-1 gap-6 bg-white">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-black shrink-0">Supplier Invoice No.</span>
                    <span className="text-sm text-black shrink-0">:</span>
                    <input
                      type="text"
                      className="text-sm border border-gray-400 px-1 py-0 outline-none focus:border-black w-36"
                      value={form.supplierInvoiceNo}
                      onChange={(e) => form.setSupplierInvoiceNo(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-black shrink-0">Date</span>
                    <span className="text-sm text-black shrink-0">:</span>
                    <input
                      type="date"
                      className="text-sm border border-gray-400 px-1 py-0 outline-none focus:border-black"
                      value={form.supplierInvoiceDate}
                      onChange={(e) => form.setSupplierInvoiceDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Party */}
              <div className="border-b border-gray-300 shrink-0 py-1">
                <FieldRow
                  label="Party A/c name"
                  fieldType="party"
                  ledger={form.partyLedger}
                  balance={form.partyBalance}
                />
              </div>

              {/* Sales/Purchase ledger */}
              <div className="border-b border-gray-300 shrink-0 py-1">
                <FieldRow
                  label={`${form.voucherType} ledger`}
                  fieldType="salesPurchase"
                  ledger={form.salesPurchaseLedger}
                  balance={form.salesPurchaseBalance}
                />
              </div>

              {/* Separator line like Tally */}
              <div className="border-b border-black shrink-0" />

              {/* Stock items table header */}
              <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-white">
                <div className="flex-1 text-sm font-semibold text-black">Name of Item</div>
                <div className="w-24 text-right text-sm font-semibold text-black">Quantity</div>
                <div className="w-32 text-right text-sm font-semibold text-black">Rate per</div>
                <div className="w-32 text-right text-sm font-semibold text-black">Amount</div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {/* Stock item rows */}
                {form.stockEntries.map((row, idx) => {
                  const isActive =
                    form.activeField?.type === "stockItem" &&
                    form.activeField.rowId === row.id;
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
                          value={isActive ? form.stockSearchTerm : (row.stockItem?.name ?? "")}
                          placeholder={idx === 0 ? "Select Item…" : ""}
                          onFocus={() =>
                            form.handleFieldFocus({ type: "stockItem", rowId: row.id })
                          }
                          onChange={(e) => {
                            form.setStockSearchTerm(e.target.value);
                            if (!row.stockItem)
                              form.handleFieldFocus({ type: "stockItem", rowId: row.id });
                          }}
                          autoComplete="off"
                        />
                        {form.stockEntries.length > 1 && (
                          <button
                            tabIndex={-1}
                            onClick={() => form.handleRemoveStockRow(row.id)}
                            className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                          >
                            &times;
                          </button>
                        )}
                      </div>

                      <div className="w-24 text-right pr-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                          value={row.quantityRaw}
                          placeholder=""
                          onChange={(e) =>
                            form.handleUpdateStockRow(row.id, { quantityRaw: e.target.value })
                          }
                        />
                      </div>

                      <div className="w-32 text-right pr-1 flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="flex-1 text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                          value={row.rateRaw}
                          placeholder=""
                          onChange={(e) =>
                            form.handleUpdateStockRow(row.id, { rateRaw: e.target.value })
                          }
                        />
                        <span className="text-xs text-gray-500">{row.unit?.symbol ?? ""}</span>
                      </div>

                      <div className="w-32 text-right text-sm font-semibold text-black select-none">
                        {row.amountRaw
                          ? Number(row.amountRaw).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : ""}
                      </div>
                    </div>
                  );
                })}

                {/* Filler rows */}
                {Array.from({ length: Math.max(0, 5 - form.stockEntries.length) }).map((_, i) => (
                  <div
                    key={`sf-${i}`}
                    className="flex border-b border-gray-50 min-h-[22px] px-3"
                  />
                ))}

                {/* Stock subtotal */}
                {form.stockEntries.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0) > 0 && (
                  <div className="flex border-t border-gray-300 border-b border-gray-300 px-3 py-0.5 bg-white">
                    <div className="flex-1 text-xs text-gray-700">Subtotal</div>
                    <div className="w-24 text-right pr-1" />
                    <div className="w-32 text-right pr-1" />
                    <div className="w-32 text-right text-sm font-semibold text-black">
                      {form.stockEntries
                        .reduce((s, r) => s + (Number(r.amountRaw) || 0), 0)
                        .toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                    </div>
                  </div>
                )}

                {/* Additional ledger rows (taxes, freight, discounts) */}
                {form.additionalEntries.map((row, idx) => {
                  const isAddActive =
                    form.activeField?.type === "additional" &&
                    form.activeField.rowId === row.id;
                  return (
                    <div
                      key={row.id}
                      className="flex items-center border-b border-gray-100 min-h-[22px] group px-3 py-0"
                    >
                      <div className="w-10 text-center">
                        <select
                          className="text-xs bg-transparent outline-none font-semibold text-black"
                          value={row.type}
                          onChange={(e) =>
                            form.handleUpdateAdditionalRow(row.id, {
                              type: e.target.value as "Dr" | "Cr",
                            })
                          }
                        >
                          <option value="Dr">Dr</option>
                          <option value="Cr">Cr</option>
                        </select>
                      </div>

                      <div className="flex-1 flex items-center gap-1 pl-2">
                        <input
                          data-additional-ledger={idx + 1}
                          type="text"
                          className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                          value={isAddActive ? form.ledgerSearchTerm : (row.ledger?.name ?? "")}
                          placeholder="Tax / Ledger…"
                          onFocus={() =>
                            form.handleFieldFocus({ type: "additional", rowId: row.id })
                          }
                          onChange={(e) => {
                            form.setLedgerSearchTerm(e.target.value);
                            if (!row.ledger)
                              form.handleFieldFocus({ type: "additional", rowId: row.id });
                          }}
                          autoComplete="off"
                        />
                        <button
                          tabIndex={-1}
                          onClick={() => form.handleRemoveAdditionalRow(row.id)}
                          className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          &times;
                        </button>
                      </div>

                      <div className="w-32 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black font-semibold"
                          value={row.amountRaw}
                          placeholder=""
                          onChange={(e) =>
                            form.handleUpdateAdditionalRow(row.id, { amountRaw: e.target.value })
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

                <div className="px-3 py-1 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={form.handleAddAdditionalRow}
                    className="text-xs text-gray-500 hover:text-black border border-gray-300 px-2 py-0.5"
                  >
                    + Add Tax / Ledger Row
                  </button>
                </div>
              </div>

              {/* Grand total footer */}
              <div className="flex border-t border-black shrink-0 px-3 py-0.5 bg-white">
                <div className="flex-1 text-sm font-semibold text-black" />
                <div className="w-32 text-right text-sm font-semibold text-black">
                  {form.totalAmount > 0
                    ? form.totalAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : ""}
                </div>
              </div>
            </>
          )}

          {/* ── Narration + grand total ── */}
          <div className="flex items-center border-t border-black shrink-0 px-3 py-1 bg-white">
            <span className="text-sm text-black shrink-0 w-24">Narration</span>
            <span className="text-sm text-black shrink-0 mr-2">:</span>
            <input
              type="text"
              className="flex-1 text-sm bg-transparent outline-none border-b border-transparent focus:border-black px-1 py-0"
              value={form.narration}
              onChange={(e) => form.setNarration(e.target.value)}
            />
            {form.totalAmount > 0 && (form.voucherType !== "Contra" || form.contraEntryMode === "double") && (
              <span className="text-sm font-semibold text-black ml-4 shrink-0 tabular-nums">
                {form.totalAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            )}
          </div>

          {/* ── Accept / Quit / Cancel ── */}
          <div className="flex items-center justify-between border-t border-black shrink-0 px-3 py-1.5 bg-white">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-black hover:underline"
            >
              <span className="underline">Q</span>: Quit
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAccept}
                disabled={form.isSubmitting || !canAccept}
                className="text-sm px-6 py-0.5 bg-black text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800"
              >
                <span className="underline">A</span>: Accept
              </button>
              <button
                onClick={form.resetForm}
                className="text-sm px-3 py-0.5 border border-black text-black hover:bg-gray-100"
              >
                Cancel Vch
              </button>
            </div>
          </div>
        </div>

        {/* ── Ledger list panel (right of main, left of sidebar) ── */}
        {panelOpen && (
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
              form.activeField?.type === "stockItem" ? "Create Stock Item" : "Create"
            }
          />
        )}

        {/* ── Right sidebar ── */}
        <RightSidebar
          voucherType={form.voucherType}
          onTypeChange={form.setVoucherType}
          status={form.status}
          onStatusChange={() =>
            form.setStatus((p: string) => (p === "Regular" ? "Post-Dated" : "Regular"))
          }
          entryMode={
            form.voucherType === "Receipt" ? form.receiptEntryMode
            : form.voucherType === "Payment" ? form.paymentEntryMode
            : form.voucherType === "Journal" ? form.journalEntryMode
            : form.contraEntryMode
          }
          onEntryModeChange={() => {
            if (form.voucherType === "Receipt") {
              form.setReceiptEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
            } else if (form.voucherType === "Payment") {
              form.setPaymentEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
            } else if (form.voucherType === "Journal") {
              form.setJournalEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
            } else {
              form.setContraEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
            }
          }}
          onDateClick={() => setShowDatePicker(true)}
          onCreateLedger={() => navigate("/master/create/ledger")}
          onAccept={handleAccept}
          onQuit={() => navigate("/")}
          canAccept={canAccept}
        />
      </div>

      {/* ── Popups ── */}

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
          initialDetails={form.receiptDetails}
          onClose={() => setShowReceiptDetails(false)}
          onSave={handleSaveReceiptDetails}
        />
      )}

      {showPartyDetails && form.partyLedger && (
        <PartyDetailsPopup
          partyLedger={form.partyLedger}
          allLedgers={form.allLedgers}
          initialDetails={form.partyDetails}
          onClose={() => setShowPartyDetails(false)}
          onSave={handleSavePartyDetails}
          onCreateLedger={() => navigate("/master/create/ledger")}
        />
      )}

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
          allowCash={form.activeAllocation.allowCash !== false}
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
