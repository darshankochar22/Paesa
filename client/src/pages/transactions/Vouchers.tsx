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
import CreditNoteDetailsPopup from "./components/popups/CreditNoteDetailsPopup";
import DebitNoteDetailsPopup from "./components/popups/DebitNoteDetailsPopup";
import OtherVouchersPopup from "./components/popups/OtherVouchersPopup";
import LedgerListPanel from "./components/LedgerListPanel";
import PaymentVoucher from "./vouchers/PaymentVoucher";
import ReceiptVoucher from "./vouchers/ReceiptVoucher";
import ContraVoucher from "./vouchers/ContraVoucher";
import JournalVoucher from "./vouchers/JournalVoucher";
import SalesVoucher from "./vouchers/SalesVoucher";
import PurchaseVoucher from "./vouchers/PurchaseVoucher";
import CreditNoteVoucher from "./vouchers/CreditNoteVoucher";
import DebitNoteVoucher from "./vouchers/DebitNoteVoucher";
import PhysicalStockVoucher from "./vouchers/PhysicalStockVoucher";
import StockJournalVoucher from "./vouchers/StockJournalVoucher";
import DeliveryNoteVoucher from "./vouchers/DeliveryNoteVoucher";
import ReceiptNoteVoucher from "./vouchers/ReceiptNoteVoucher";
import RejectionInVoucher from "./vouchers/RejectionInVoucher";
import RejectionOutVoucher from "./vouchers/RejectionOutVoucher";
import MaterialInVoucher from "./vouchers/MaterialInVoucher";
import MaterialOutVoucher from "./vouchers/MaterialOutVoucher";
import ManufacturingJournalVoucher from "./vouchers/ManufacturingJournalVoucher";
import AttendanceVoucher from "./vouchers/AttendanceVoucher";
import PayrollVoucher from "./vouchers/PayrollVoucher";

function RightSidebar({
  voucherType,
  onTypeChange,
  voucherTypeChildren,
  subDropdownType,
  onSubDropdownToggle,
  status,
  onStatusChange,
  entryMode,
  onEntryModeChange,
  onDateClick,
  onCreateLedger,
  onAccept,
  onQuit,
  canAccept,
  onOtherVouchersClick,
}: {
  voucherType: string;
  onTypeChange: (t: string) => void;
  voucherTypeChildren: Record<string, string[]>;
  subDropdownType: string | null;
  onSubDropdownToggle: (type: string) => void;
  status: string;
  onStatusChange: () => void;
  entryMode: "single" | "double";
  onEntryModeChange: () => void;
  onDateClick: () => void;
  onCreateLedger: () => void;
  onAccept: () => void;
  onQuit: () => void;
  canAccept: boolean;
  onOtherVouchersClick: () => void;
}) {
  const types = [
    { key: "F4", label: "Contra" },
    { key: "F5", label: "Payment" },
    { key: "F6", label: "Receipt" },
    { key: "F7", label: "Journal" },
    { key: "F8", label: "Sales" },
    { key: "F9", label: "Purchase" },
  ];

  const otherVoucherTypes = [
    "Attendance",
    "Credit Note",
    "Debit Note",
    "Delivery Note",
    "Job Work In Order",
    "Job Work Out Order",
    "Material In",
    "Material Out",
    "Manufacturing Journal",
    "Memorandum",
    "Payroll",
    "Physical Stock",
    "Purchase Order",
    "Receipt Note",
    "Rejection In",
    "Rejection Out",
    "Reversing Journal",
    "Sales Order",
    "Stock Journal",
  ];
  const isOtherActive = otherVoucherTypes.includes(voucherType);

  const sidebarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!subDropdownType) return;
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onSubDropdownToggle(subDropdownType);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [subDropdownType, onSubDropdownToggle]);

  return (
    <div ref={sidebarRef} className="w-36 border-l border-black flex flex-col shrink-0 bg-white">
      <div className="border-b border-black px-2 py-1">
        <button
          onClick={onDateClick}
          className="w-full text-left text-xs text-black hover:underline"
        >
          <span className="text-gray-500">F2</span>: Date
        </button>
      </div>

      {types.map(({ key, label }) => {
        const children = voucherTypeChildren[label];
        const hasChildren = children && children.length > 0;
        return (
          <div key={key} className="border-b border-gray-200 relative">
            <button
              onClick={() => {
                if (hasChildren) {
                  onSubDropdownToggle(label);
                } else {
                  if (subDropdownType) onSubDropdownToggle(subDropdownType);
                  onTypeChange(label);
                }
              }}
              className={`w-full text-left px-2 py-1 text-xs ${
                voucherType === label || children?.includes(voucherType)
                  ? "bg-black text-white font-semibold"
                  : "text-black hover:bg-gray-100"
              }`}
            >
              <span className={voucherType === label || children?.includes(voucherType) ? "text-gray-300" : "text-gray-500"}>
                {key}
              </span>
              : {label}
              {hasChildren && (
                <span className="ml-1 text-[9px] opacity-60">{subDropdownType === label ? "\u25B2" : "\u25BC"}</span>
              )}
            </button>
            {hasChildren && subDropdownType === label && (
              <div className="absolute left-0 right-0 top-full z-30 bg-white border border-zinc-300 shadow-lg rounded-b">
                <button
                  onClick={() => { onTypeChange(label); onSubDropdownToggle(label); }}
                  className={`w-full text-left px-2 py-1 text-xs ${
                    voucherType === label
                      ? "bg-black text-white font-semibold"
                      : "text-black hover:bg-gray-100"
                  }`}
                >
                  {label}
                </button>
                {children.map((child) => (
                  <button
                    key={child}
                    onClick={() => { onTypeChange(child); onSubDropdownToggle(label); }}
                    className={`w-full text-left pl-4 pr-2 py-1 text-xs ${
                      voucherType === child
                        ? "bg-black text-white font-semibold"
                        : "text-black hover:bg-gray-100"
                    }`}
                  >
                    {child}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="border-b border-gray-200">
        <button
          onClick={onOtherVouchersClick}
          className={`w-full text-left px-2 py-1 text-xs ${
            isOtherActive
              ? "bg-black text-white font-semibold"
              : "text-black hover:bg-gray-100"
          }`}
        >
          <span className={isOtherActive ? "text-gray-300" : "text-gray-500"}>F10</span>
          : Other Vouchers
        </button>
      </div>

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

export default function Vouchers() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const [voucherTypeChildren, setVoucherTypeChildren] = useState<Record<string, string[]>>({});
  const [voucherTypeParentMap, setVoucherTypeParentMap] = useState<Record<string, string>>({});

  const resolveEffectiveVoucherType = useCallback(
    (type: string) => voucherTypeParentMap[type] || type,
    [voucherTypeParentMap]
  );
  const form = useVoucherForm(resolveEffectiveVoucherType);

  const effectiveVoucherType = resolveEffectiveVoucherType(form.voucherType);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDispatchDetails, setShowDispatchDetails] = useState(false);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);
  const [showPartyDetails, setShowPartyDetails] = useState(false);
  const [showCreditNoteDetails, setShowCreditNoteDetails] = useState(false);
  const [showDebitNoteDetails, setShowDebitNoteDetails] = useState(false);
  const [showOtherVouchers, setShowOtherVouchers] = useState(false);
  const [subDropdownType, setSubDropdownType] = useState<string | null>(null);

  const hasAutoOpenedReceipt = useRef(false);
  const hasAutoOpenedDispatch = useRef(false);
  const hasAutoOpenedCreditNote = useRef(false);
  const hasAutoOpenedDebitNote = useRef(false);
  const hasAutoOpenedDeliveryDispatch = useRef(false);
  const hasAutoOpenedReceiptNote = useRef(false);

  const acceptRef = useRef<() => void>(() => {});

  const canAccept = useMemo(() => {
    if (form.isSubmitting) return false;

    if (effectiveVoucherType === "Receipt") {
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

    if (effectiveVoucherType === "Payment") {
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

    if (effectiveVoucherType === "Contra") {
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

    if (effectiveVoucherType === "Journal") {
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

    if (["Sales", "Purchase", "Credit Note", "Debit Note", "Delivery Note", "Receipt Note", "Rejection In", "Rejection Out", "Material In", "Material Out"].includes(effectiveVoucherType)) {
      const hasValidEntries = form.stockEntries.some((s) => !!s.stockItem && (Number(s.amountRaw) || 0) > 0);
      const allFilled = (effectiveVoucherType === "Credit Note" || effectiveVoucherType === "Debit Note" || effectiveVoucherType === "Rejection In" || effectiveVoucherType === "Rejection Out" || effectiveVoucherType === "Material In" || effectiveVoucherType === "Material Out")
        ? form.stockEntries.every((s) => !s.stockItem || (s.quantityRaw !== "" && s.rateRaw !== ""))
        : true;
      const needsLedger = ["Sales", "Purchase", "Credit Note", "Debit Note", "Delivery Note", "Receipt Note", "Rejection In", "Rejection Out"].includes(effectiveVoucherType);
      return (
        !!form.partyLedger &&
        (!needsLedger || !!form.salesPurchaseLedger) &&
        hasValidEntries &&
        allFilled
      );
    }

    if (effectiveVoucherType === "Manufacturing Journal") {
      const filledSource = form.sourceStockEntries.some((s) => !!s.stockItem && (Number(s.quantityRaw) || 0) > 0);
      const filledDest = form.destinationStockEntries.some((s) => !!s.stockItem && (Number(s.quantityRaw) || 0) > 0);
      return filledSource || filledDest;
    }

    // Order vouchers: party + at least one stock item with quantity
    if (["Purchase Order", "Sales Order", "Job Work In Order", "Job Work Out Order"].includes(effectiveVoucherType)) {
      return (
        !!form.partyLedger &&
        form.stockEntries.some((s) => !!s.stockItem && (Number(s.quantityRaw) || 0) > 0)
      );
    }

    if (effectiveVoucherType === "Memorandum") {
      return true;
    }

    if (effectiveVoucherType === "Reversing Journal") {
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

    if (effectiveVoucherType === "Attendance") {
      return form.attendanceEntries.some(
        (r) => !!r.employee && !!r.attendanceType && Number(r.valueRaw) > 0
      );
    }

    if (effectiveVoucherType === "Payroll") {
      return (
        !!form.accountLedger &&
        form.payrollEntries.some(
          (r) => !!r.employee && !!r.payHead && Number(r.amountRaw) > 0
        )
      );
    }

    return false;
  }, [
    form.isSubmitting,
    form.paymentEntryMode,
    form.journalEntryMode,
    effectiveVoucherType,
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
    form.attendanceEntries,
    form.payrollEntries,
  ]);

  useEffect(() => {
    if (effectiveVoucherType === "Sales" && form.partyLedger && !hasAutoOpenedDispatch.current) {
      hasAutoOpenedDispatch.current = true;
      setShowDispatchDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (effectiveVoucherType === "Purchase" && form.partyLedger && !hasAutoOpenedReceipt.current) {
      hasAutoOpenedReceipt.current = true;
      setShowReceiptDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (effectiveVoucherType === "Credit Note" && form.partyLedger && !hasAutoOpenedCreditNote.current) {
      hasAutoOpenedCreditNote.current = true;
      setShowCreditNoteDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (effectiveVoucherType === "Debit Note" && form.partyLedger && !hasAutoOpenedDebitNote.current) {
      hasAutoOpenedDebitNote.current = true;
      setShowDebitNoteDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (effectiveVoucherType === "Delivery Note" && form.partyLedger && !hasAutoOpenedDeliveryDispatch.current) {
      hasAutoOpenedDeliveryDispatch.current = true;
      setShowDispatchDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (effectiveVoucherType === "Receipt Note" && form.partyLedger && !hasAutoOpenedReceiptNote.current) {
      hasAutoOpenedReceiptNote.current = true;
      setShowReceiptDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (!form.partyLedger) {
      hasAutoOpenedReceipt.current = false;
      hasAutoOpenedDispatch.current = false;
      hasAutoOpenedCreditNote.current = false;
      hasAutoOpenedDebitNote.current = false;
      hasAutoOpenedDeliveryDispatch.current = false;
      hasAutoOpenedReceiptNote.current = false;
    }
  }, [form.partyLedger]);

  // ─── handleAccept ────────────────────────────────────────────────────

  const handleAccept = useCallback(() => {
    // ── Sales / Purchase / Credit Note / Debit Note: bill-wise for party ──────
    if (
      ["Sales", "Purchase", "Credit Note", "Debit Note", "Delivery Note", "Receipt Note", "Rejection In", "Rejection Out", "Material In", "Material Out"].includes(effectiveVoucherType) &&
      form.partyLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      const dcType = (effectiveVoucherType === "Sales" || effectiveVoucherType === "Credit Note" || effectiveVoucherType === "Debit Note" || effectiveVoucherType === "Delivery Note" || effectiveVoucherType === "Rejection In" || effectiveVoucherType === "Material Out") ? "Dr" : "Cr";
      form.setActiveAllocation({
        type: "billWiseParty",
        ledgerId: form.partyLedger.ledger_id,
        ledgerName: form.partyLedger.name,
        amount: form.totalAmount,
        dcType,
        initialAllocations: [],
      });
      return;
    }

    // ── Sales / Purchase / Credit Note / Debit Note: bank allocation for party ─
    if (
      ["Sales", "Purchase", "Credit Note", "Debit Note", "Delivery Note", "Receipt Note", "Rejection In", "Rejection Out", "Material In", "Material Out"].includes(effectiveVoucherType) &&
      form.partyLedger &&
      form.checkIsBank(form.partyLedger) &&
      !form.bankDetails
    ) {
      form.setActiveAllocation({
        type: "partyBankDetails",
        ledgerId: form.partyLedger.ledger_id,
        ledgerName: form.partyLedger.name,
        amount: form.totalAmount,
        initialDetails: form.bankDetails,
      });
      return;
    }

    // ── Receipt (single-entry) / Payment (single-entry): bill-wise for account ledger ────────
    if (
      ((effectiveVoucherType === "Payment" && form.paymentEntryMode === "single") ||
       (effectiveVoucherType === "Receipt" && form.receiptEntryMode === "single")) &&
      form.accountLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      form.setActiveAllocation({
        type: "billWiseParty",
        ledgerId: form.accountLedger.ledger_id,
        ledgerName: form.accountLedger.name,
        amount: form.particularsTotal,
        dcType: effectiveVoucherType === "Receipt" ? "Dr" : "Cr",
        initialAllocations: [],
      });
      return;
    }

    if (
      effectiveVoucherType === "Contra" &&
      form.contraEntryMode === "single" &&
      form.accountLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      form.setActiveAllocation({
        type: "billWiseParty",
        ledgerId: form.accountLedger.ledger_id,
        ledgerName: form.accountLedger.name,
        amount: form.particularsTotal,
        dcType: "Cr",
        initialAllocations: [],
      });
      return;
    }

    if (
      effectiveVoucherType === "Journal" &&
      form.journalEntryMode === "single" &&
      form.accountLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      form.setActiveAllocation({
        type: "billWiseParty",
        ledgerId: form.accountLedger.ledger_id,
        ledgerName: form.accountLedger.name,
        amount: form.particularsTotal,
        dcType: "Cr",
        initialAllocations: [],
      });
      return;
    }

    form.handleSubmit();
  }, [
    effectiveVoucherType,
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
    form.checkIsBank,
    form.bankDetails,
  ]);

  useEffect(() => { acceptRef.current = handleAccept; }, [handleAccept]);

  // ─── proceedToNextRow ────────────────────────────────────────────────

  const proceedToNextRow = useCallback(
    (idx: number) => {
      const isJDouble = effectiveVoucherType === "Journal" && form.journalEntryMode === "double";
      const isJSingle = effectiveVoucherType === "Journal" && form.journalEntryMode === "single";
      const isPayDouble = effectiveVoucherType === "Payment" && form.paymentEntryMode === "double";
      const isInv = ["Sales", "Purchase"].includes(effectiveVoucherType);
      const isContraDouble = effectiveVoucherType === "Contra" && form.contraEntryMode === "double";
      const isReceiptDouble = effectiveVoucherType === "Receipt" && form.receiptEntryMode === "double";
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
      effectiveVoucherType,
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

  // ─── Stock item entry focus flow ─────────────────────────────────────
  // item selected → qty → rate → next row (item name)

  const prevActiveFieldRef = useRef(form.activeField);

  useEffect(() => {
    const prev = prevActiveFieldRef.current;
    const curr = form.activeField;
    if (prev?.type === "stockItem" && curr === null) {
      const rowIdx = form.stockEntries.findIndex((e) => e.id === prev.rowId);
      if (rowIdx >= 0 && form.stockEntries[rowIdx].stockItem) {
        setTimeout(() => {
          const el = document.querySelector(
            `[data-stock-qty="${rowIdx + 1}"]`
          ) as HTMLInputElement | null;
          el?.focus();
        }, 50);
      }
    }
    prevActiveFieldRef.current = curr;
  }, [form.activeField, form.stockEntries]);

  const focusStockQty = useCallback((idx: number) => {
    setTimeout(() => {
      (document.querySelector(`[data-stock-qty="${idx + 1}"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  }, []);

  const focusStockRate = useCallback((idx: number) => {
    setTimeout(() => {
      (document.querySelector(`[data-stock-rate="${idx + 1}"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  }, []);

  const proceedToNextStockRow = useCallback(
    (idx: number) => {
      if (idx === form.stockEntries.length - 1) {
        form.handleAddStockRow();
      }
      setTimeout(() => {
        (document.querySelector(`[data-stock-item="${idx + 2}"]`) as HTMLInputElement | null)?.focus();
      }, 50);
    },
    [form.stockEntries.length, form.handleAddStockRow]
  );

  // ─── handleAmountConfirm ─────────────────────────────────────────────

  const handleAmountConfirm = useCallback(
    (row: any, idx: number) => {
      const { ledger, amountRaw, id } = row;
      const amount = Number(amountRaw) || 0;
      if (!ledger) { proceedToNextRow(idx); return; }

      // Contra / Receipt / Payment double-entry: bank allocation for any bank ledger
      if (
        effectiveVoucherType === "Contra" ||
        (effectiveVoucherType === "Receipt" && form.receiptEntryMode === "double") ||
        (effectiveVoucherType === "Payment" && form.paymentEntryMode === "double")
      ) {
        if (form.checkIsBank(ledger)) {
          const allowCash =
            (effectiveVoucherType === "Receipt" || effectiveVoucherType === "Contra")
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
          dcType: row.type ?? "Dr",
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
    [effectiveVoucherType, form.paymentEntryMode, form.receiptEntryMode, form.checkIsBank, form.checkIsCash, form.bankDetails, form.cashDenominations, form.setActiveAllocation, proceedToNextRow]
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
      const isJDouble = effectiveVoucherType === "Journal" && form.journalEntryMode === "double";
      const isJSingle = effectiveVoucherType === "Journal" && form.journalEntryMode === "single";
      const isPayDouble = effectiveVoucherType === "Payment" && form.paymentEntryMode === "double";
      const isInv = ["Sales", "Purchase"].includes(effectiveVoucherType);
      const isContraDouble = effectiveVoucherType === "Contra" && form.contraEntryMode === "double";
      const isReceiptDouble = effectiveVoucherType === "Receipt" && form.receiptEntryMode === "double";

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
      effectiveVoucherType,
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
      const isJDouble = effectiveVoucherType === "Journal" && form.journalEntryMode === "double";
      const isJSingle = effectiveVoucherType === "Journal" && form.journalEntryMode === "single";
      const isPayDouble = effectiveVoucherType === "Payment" && form.paymentEntryMode === "double";
      const isInv = ["Sales", "Purchase"].includes(effectiveVoucherType);
      const isContraDouble = effectiveVoucherType === "Contra" && form.contraEntryMode === "double";
      const isReceiptDouble = effectiveVoucherType === "Receipt" && form.receiptEntryMode === "double";

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
      effectiveVoucherType,
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

      if (alloc?.type === "partyBankDetails") {
        form.setBankDetails(details);
        form.setActiveAllocation(null);
        setTimeout(() => acceptRef.current(), 50);
        return;
      }

      form.setBankDetails(details);

      if (details.transaction_type === "Cash") {
        const shouldSkipDenomination =
          effectiveVoucherType === "Receipt" ||
          (alloc && alloc.type === "bankDetails" && alloc.allowCash === false);

        if (shouldSkipDenomination) {
          form.setActiveAllocation(null);
          if (alloc && "rowId" in alloc) {
            const isContraDouble = effectiveVoucherType === "Contra" && form.contraEntryMode === "double";
            const isReceiptDouble = effectiveVoucherType === "Receipt" && form.receiptEntryMode === "double";
            const isPayDouble = effectiveVoucherType === "Payment" && form.paymentEntryMode === "double";
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
        const isContraDouble = effectiveVoucherType === "Contra" && form.contraEntryMode === "double";
        const isReceiptDouble = effectiveVoucherType === "Receipt" && form.receiptEntryMode === "double";
        const isPayDouble = effectiveVoucherType === "Payment" && form.paymentEntryMode === "double";
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
    [form.activeAllocation, form.setBankDetails, form.setActiveAllocation, effectiveVoucherType, form.paymentEntryMode, form.contraEntryMode, form.receiptEntryMode, form.contraDoubleRows, form.receiptDoubleRows, form.paymentDoubleRows, form.particulars, form.cashDenominations, proceedToNextRow]
  );

  const handleSaveCashDenomination = useCallback(
    (details: any) => {
      const alloc = form.activeAllocation;
      form.setCashDenominations(details);
      form.setActiveAllocation(null);
      if (alloc && "rowId" in alloc) {
        const isContraDouble = effectiveVoucherType === "Contra" && form.contraEntryMode === "double";
        const isReceiptDouble = effectiveVoucherType === "Receipt" && form.receiptEntryMode === "double";
        const isPayDouble = effectiveVoucherType === "Payment" && form.paymentEntryMode === "double";
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
    [form.activeAllocation, form.setCashDenominations, form.setActiveAllocation, effectiveVoucherType, form.paymentEntryMode, form.contraEntryMode, form.receiptEntryMode, form.contraDoubleRows, form.receiptDoubleRows, form.paymentDoubleRows, form.particulars, proceedToNextRow]
  );

  const handleSaveDispatchDetails = useCallback(
    (details: any) => {
      form.setDispatchDetails(details);
      setShowDispatchDetails(false);
      setShowPartyDetails(true);
    },
    [form.setDispatchDetails]
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

  const handleSaveCreditNoteDetails = useCallback(
    (details: any) => {
      form.setCreditNoteDetails(details);
      setShowCreditNoteDetails(false);
      setShowPartyDetails(true);
    },
    [form.setCreditNoteDetails]
  );

  const handleSaveDebitNoteDetails = useCallback(
    (details: any) => {
      form.setDebitNoteDetails(details);
      setShowDebitNoteDetails(false);
      setShowPartyDetails(true);
    },
    [form.setDebitNoteDetails]
  );

  // ─── Ledger panel items ──────────────────────────────────────────────

  const panelOpen = !!form.activeField;

  const panelItems = useMemo(() => {
    const af = form.activeField;
    if (!af) return [];

    if (af.type === "stockItem") return form.allStockItems;
    if (af.type === "stockGodown") return form.allGodowns;
    if (af.type === "employee") return form.allEmployees;
    if (af.type === "attendanceType") return form.allAttendanceTypes;
    if (af.type === "payHead") return form.allPayHeads;

    if (af.type === "account") {
      if (effectiveVoucherType === "Journal") {
        return form.allLedgers.filter((l) => !form.checkIsCashOrBank(l));
      }
      if (effectiveVoucherType === "Payroll") {
        return form.allLedgers;
      }
      // Account field is always cash/bank for all three single-entry types
      return form.allLedgers.filter((l) => form.checkIsCashOrBank(l));
    }

    if (af.type === "party") {
      if (effectiveVoucherType === "Credit Note" || effectiveVoucherType === "Debit Note" || effectiveVoucherType === "Rejection In" || effectiveVoucherType === "Rejection Out" || effectiveVoucherType === "Material In" || effectiveVoucherType === "Material Out") {
        return form.allLedgers;
      }
      const isPurchaseLike = effectiveVoucherType === "Purchase" || effectiveVoucherType === "Receipt Note" || effectiveVoucherType === "Rejection Out" || effectiveVoucherType === "Material In";
      return form.allLedgers.filter((l) =>
        form.checkLedgerGroup(l, [
          "bank accounts",
          "bank od accounts",
          "bank od a/c",
          "cash-in-hand",
          isPurchaseLike ? "sundry creditors" : "sundry debtors",
        ])
      );
    }

    if (af.type === "salesPurchase") {
      if (effectiveVoucherType === "Credit Note" || effectiveVoucherType === "Debit Note" || effectiveVoucherType === "Rejection In" || effectiveVoucherType === "Rejection Out") {
        return form.allLedgers;
      }
      const isPurchaseLike = effectiveVoucherType === "Purchase" || effectiveVoucherType === "Receipt Note" || effectiveVoucherType === "Rejection Out";
      return form.allLedgers.filter((l) =>
        form.checkLedgerGroup(
          l,
          isPurchaseLike ? ["purchase accounts"] : ["sales accounts"]
        )
      );
    }

    // Journal Particulars: all ledgers except cash/bank
    if (effectiveVoucherType === "Journal" && af.type === "particular") {
      return form.allLedgers.filter((l) => !form.checkIsCashOrBank(l));
    }

    // Contra Particulars: also restricted to cash/bank (destination side)
    // In double-entry mode, all rows are restricted to cash/bank
    if (effectiveVoucherType === "Contra" && af.type === "particular") {
      return form.allLedgers.filter((l) => form.checkIsCashOrBank(l));
    }

    // Receipt double-entry: Dr rows = all ledgers, Cr rows = all ledgers
    if (effectiveVoucherType === "Receipt" && form.receiptEntryMode === "double" && af.type === "particular") {
      return form.allLedgers;
    }

    // Payment double-entry: all ledgers visible for both Dr and Cr
    if (effectiveVoucherType === "Payment" && form.paymentEntryMode === "double" && af.type === "particular") {
      return form.allLedgers;
    }

    // Payment single-entry: Particulars are Dr — all ledgers except cash/bank
    if (effectiveVoucherType === "Payment" && form.paymentEntryMode === "single" && af.type === "particular") {
      return form.allLedgers.filter((l) => !form.checkIsCashOrBank(l));
    }

    return form.allLedgers;
  }, [
    form.activeField,
    effectiveVoucherType,
    form.paymentEntryMode,
    form.journalEntryMode,
    form.receiptEntryMode,
    form.paymentDoubleRows,
    form.receiptDoubleRows,
    form.allLedgers,
    form.allStockItems,
    form.allGodowns,
    form.allEmployees,
    form.allAttendanceTypes,
    form.allPayHeads,
    form.checkIsCashOrBank,
    form.checkLedgerGroup,
  ]);

  const panelTitle = useMemo(() => {
    const af = form.activeField;
    if (!af) return "List of Ledger Accounts";
    if (af.type === "stockItem") return "List of Stock Items";
    if (af.type === "stockGodown") return "List of Godowns";
    if (af.type === "employee") return "List of Employees";
    if (af.type === "attendanceType") return "List of Attendance / Production Types";
    if (af.type === "payHead") return "List of Pay Heads";
    if (af.type === "account") {
      if (effectiveVoucherType === "Journal") return "List of Ledger Accounts";
      if (effectiveVoucherType === "Payroll") return "List of Ledger Accounts";
      return "List of Cash / Bank Accounts";
    }
    if (af.type === "party") return "List of Party Accounts";
    if (af.type === "salesPurchase") return `List of ${form.voucherType} Ledgers`;
    return "List of Ledger Accounts";
  }, [form.activeField, effectiveVoucherType, form.receiptEntryMode, form.receiptDoubleRows]);

  const panelSearchTerm =
    form.activeField?.type === "stockItem" ? form.stockSearchTerm : form.ledgerSearchTerm;

  const handlePanelSearchChange = useCallback(
    (v: string) => {
      if (form.activeField?.type === "stockItem") form.setStockSearchTerm(v);
      else form.setLedgerSearchTerm(v);
    },
    [form.activeField, form.setStockSearchTerm, form.setLedgerSearchTerm]
  );


  useEffect(() => {
    if (!selectedCompany) return;
    window.api.voucherType.getAll(selectedCompany.company_id).then((res) => {
      if (res.success && res.voucherTypes) {
        const childrenMap: Record<string, string[]> = {};
        const parentMap: Record<string, string> = {};
        for (const vt of res.voucherTypes) {
          if (vt.parent_vt_id && vt.vt_id) {
            const parent = res.voucherTypes.find((p) => p.vt_id === vt.parent_vt_id);
            if (parent) {
              if (!childrenMap[parent.name]) childrenMap[parent.name] = [];
              if (!childrenMap[parent.name].includes(vt.name)) childrenMap[parent.name].push(vt.name);
              parentMap[vt.name] = parent.name;
            }
          }
        }
        setVoucherTypeChildren(childrenMap);
        setVoucherTypeParentMap(parentMap);
      }
    }).catch(() => {});
  }, [selectedCompany]);

  const handleTypeKey = useCallback(
    (type: string) => {
      const children = voucherTypeChildren[type];
      if (children && children.length > 0) {
        setSubDropdownType((prev) => (prev === type ? null : type));
      } else {
        setSubDropdownType(null);
        form.setVoucherType(type);
      }
    },
    [voucherTypeChildren, form.setVoucherType]
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); setShowDatePicker(true); }
      if (e.key === "F4") { e.preventDefault(); handleTypeKey("Contra"); }
      if (e.key === "F5") { e.preventDefault(); handleTypeKey("Payment"); }
      if (e.key === "F6") { e.preventDefault(); handleTypeKey("Receipt"); }
      if (e.key === "F7") { e.preventDefault(); handleTypeKey("Journal"); }
      if (e.key === "F8") { e.preventDefault(); handleTypeKey("Sales"); }
      if (e.key === "F9") { e.preventDefault(); handleTypeKey("Purchase"); }
      if (e.key === "F10") {
        e.preventDefault();
        setShowOtherVouchers(true);
      }
      if (e.altKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        if (effectiveVoucherType === "Contra") {
          form.setContraEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
        } else if (effectiveVoucherType === "Receipt") {
          form.setReceiptEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
        } else if (effectiveVoucherType === "Payment") {
          form.setPaymentEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
        } else if (effectiveVoucherType === "Journal") {
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
        !showReceiptDetails &&
        !showCreditNoteDetails &&
        !showDebitNoteDetails &&
        !showOtherVouchers
      ) {
        e.preventDefault();
        if (subDropdownType) {
          setSubDropdownType(null);
        } else {
          navigate("/");
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [
    handleTypeKey,
    form.setPaymentEntryMode,
    form.setJournalEntryMode,
    form.setContraEntryMode,
    form.setReceiptEntryMode,
    effectiveVoucherType,
    form.activeField,
    form.activeAllocation,
    canAccept,
    handleAccept,
    showDatePicker,
    showDispatchDetails,
    showReceiptDetails,
    showCreditNoteDetails,
    showDebitNoteDetails,
    showOtherVouchers,
    subDropdownType,
    navigate,
  ]);



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
      {form.negativeStockWarnings?.length > 0 && (
        <AlertBanner
          type="error"
          message={`Negative Stock: ${form.negativeStockWarnings.join("; ")}`}
          onDismiss={() => {}}
        />
      )}

      {/* ── Title bar ── */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-black bg-white shrink-0">
        <span className="text-sm font-semibold text-black">{effectiveVoucherType === "Attendance" ? "Attendance Voucher Creation" : effectiveVoucherType === "Payroll" ? "Payroll Voucher Creation" : ["Delivery Note", "Receipt Note", "Rejection In", "Rejection Out", "Material In", "Material Out", "Physical Stock", "Stock Journal", "Manufacturing Journal"].includes(effectiveVoucherType) ? "Inventory Voucher Creation" : "Accounting Voucher Creation"}</span>
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

          {effectiveVoucherType === "Payment" && (
            <PaymentVoucher form={form} handleAmountConfirm={handleAmountConfirm} />
          )}
          {effectiveVoucherType === "Receipt" && (
            <ReceiptVoucher form={form} handleAmountConfirm={handleAmountConfirm} />
          )}
          {effectiveVoucherType === "Contra" && (
            <ContraVoucher form={form} handleAmountConfirm={handleAmountConfirm} />
          )}
          {effectiveVoucherType === "Journal" && (
            <JournalVoucher form={form} handleAmountConfirm={handleAmountConfirm} />
          )}
          {effectiveVoucherType === "Sales" && (
            <SalesVoucher
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Purchase" && (
            <PurchaseVoucher
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Credit Note" && (
            <CreditNoteVoucher
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Debit Note" && (
            <DebitNoteVoucher
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Physical Stock" && (
            <PhysicalStockVoucher
              form={form}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Stock Journal" && (
            <StockJournalVoucher form={form} />
          )}
          {effectiveVoucherType === "Delivery Note" && (
            <DeliveryNoteVoucher
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Receipt Note" && (
            <ReceiptNoteVoucher
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Rejection In" && (
            <RejectionInVoucher
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Rejection Out" && (
            <RejectionOutVoucher
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Material In" && (
            <MaterialInVoucher
              form={form}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Material Out" && (
            <MaterialOutVoucher
              form={form}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Manufacturing Journal" && (
            <ManufacturingJournalVoucher form={form} />
          )}
          {effectiveVoucherType === "Attendance" && (
            <AttendanceVoucher form={form} />
          )}
          {effectiveVoucherType === "Payroll" && (
            <PayrollVoucher form={form} />
          )}
          {effectiveVoucherType === "Purchase Order" && (
            <DeliveryNoteVoucher
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Sales Order" && (
            <DeliveryNoteVoucher
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Job Work In Order" && (
            <DeliveryNoteVoucher
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Job Work Out Order" && (
            <DeliveryNoteVoucher
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Memorandum" && (
            <JournalVoucher form={form} handleAmountConfirm={handleAmountConfirm} />
          )}
          {effectiveVoucherType === "Reversing Journal" && (
            <JournalVoucher form={form} handleAmountConfirm={handleAmountConfirm} />
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
            {form.totalAmount > 0 && (effectiveVoucherType !== "Contra" || form.contraEntryMode === "double") && (
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
            stockBalances={form.activeField?.type === "stockItem" ? form.stockBalances : undefined}
            allUnits={form.activeField?.type === "stockItem" ? form.allUnits : undefined}
          />
        )}

        {/* ── Right sidebar ── */}
        <RightSidebar
          voucherType={effectiveVoucherType}
          onTypeChange={form.setVoucherType}
          voucherTypeChildren={voucherTypeChildren}
          subDropdownType={subDropdownType}
          onSubDropdownToggle={(type) => setSubDropdownType((prev) => (prev === type ? null : type))}
          status={form.status}
          onStatusChange={() =>
            form.setStatus((p: string) => (p === "Regular" ? "Post-Dated" : "Regular"))
          }
          entryMode={
            effectiveVoucherType === "Receipt" ? form.receiptEntryMode
            : effectiveVoucherType === "Payment" ? form.paymentEntryMode
            : effectiveVoucherType === "Journal" ? form.journalEntryMode
            : form.contraEntryMode
          }
          onEntryModeChange={() => {
            if (effectiveVoucherType === "Receipt") {
              form.setReceiptEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
            } else if (effectiveVoucherType === "Payment") {
              form.setPaymentEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
            } else if (effectiveVoucherType === "Journal") {
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
          onOtherVouchersClick={() => setShowOtherVouchers(true)}
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
          initialDetails={form.dispatchDetails}
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
          buyerLabel={effectiveVoucherType === "Sales" ? "Buyer (Bill to)" : "Supplier (Bill from)"}
        />
      )}

      {showCreditNoteDetails && form.partyLedger && (
        <CreditNoteDetailsPopup
          initialDetails={form.creditNoteDetails}
          onClose={() => setShowCreditNoteDetails(false)}
          onSave={handleSaveCreditNoteDetails}
        />
      )}

      {showDebitNoteDetails && form.partyLedger && (
        <DebitNoteDetailsPopup
          initialDetails={form.debitNoteDetails}
          onClose={() => setShowDebitNoteDetails(false)}
          onSave={handleSaveDebitNoteDetails}
        />
      )}

      {showOtherVouchers && (
        <OtherVouchersPopup
          voucherType={effectiveVoucherType}
          onClose={() => setShowOtherVouchers(false)}
          onSelect={(type) => {
            form.setVoucherType(type);
            setShowOtherVouchers(false);
          }}
          voucherTypeChildren={voucherTypeChildren}
        />
      )}

      {form.activeAllocation?.type === "billWise" && (
        <BillWiseAllocationPopup
          ledgerId={form.activeAllocation.ledgerId}
          ledgerName={form.activeAllocation.ledgerName}
          totalAmount={form.activeAllocation.amount}
          dcType={form.activeAllocation.dcType ?? "Dr"}
          voucherDate={form.date}
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
          dcType={form.activeAllocation.dcType ?? "Cr"}
          voucherDate={form.date}
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

      {(form.activeAllocation?.type === "bankDetails" || form.activeAllocation?.type === "partyBankDetails") && (
        <BankAllocationPopup
          ledgerId={form.activeAllocation.ledgerId}
          ledgerName={form.activeAllocation.ledgerName}
          amount={form.activeAllocation.amount}
          initialDetails={form.bankDetails}
          allowCash={form.activeAllocation.type === "bankDetails" ? form.activeAllocation.allowCash !== false : true}
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
