import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";

import { useVoucherForm } from "./hooks/useVoucherForm";
import { hydrateVoucherForm } from "./hooks/hydrateVoucherForm";
import { formatDateDisplay } from "./hooks/useVoucherMeta";
import type { BatchAllocation, InventoryAllocationItem } from "./types";
import type { VoucherClassRow } from "@/types/entities/VoucherType";
import { makeStockRow } from "./utils/rowFactories";
import { AlertBanner, PageTitleBar } from "../../components/ui";
import { Button } from "@/components/shadcn/button";
import { cn } from "@/lib/utils";
import CompanyTaxRegistrationPopup from "./components/popups/CompanyTaxRegistrationPopup";
import BillWiseAllocationPopup from "./components/popups/BillWiseAllocationPopup";
import CostCentreAllocationPopup from "./components/popups/CostCentreAllocationPopup";
import BatchAllocationPopup from "./components/popups/BatchAllocationPopup";
import InventoryAllocationPopup from "./components/popups/InventoryAllocationPopup";
import OrderItemAllocationPopup from "./components/popups/OrderItemAllocationPopup";
import OrderDueOnAllocationPopup from "./components/popups/OrderDueOnAllocationPopup";
import ItemExciseDetailsPopup from "./components/popups/ItemExciseDetailsPopup";
import type { ExciseItemDetails } from "./components/popups/ItemExciseDetailsPopup";
import BankAllocationPopup from "./components/popups/BankAllocationPopup";
import DenominationPopup from "./components/popups/DenominationPopup";
import DispatchDetailsPopup from "./components/popups/DispatchDetailsPopup";
import ReceiptDetailsPopup from "./components/popups/ReceiptDetailsPopup";
import PartyDetailsPopup from "./components/popups/PartyDetailsPopup";
import DatePickerPopup from "./components/popups/DatePickerPopup";
import CreditNoteDetailsPopup from "./components/popups/CreditNoteDetailsPopup";
import DebitNoteDetailsPopup from "./components/popups/DebitNoteDetailsPopup";
import OtherVouchersPopup from "./components/popups/OtherVouchersPopup";
import ExciseDetailsPopup from "./components/popups/ExciseDetailsPopup";
import VatDetailsPopup from "./components/popups/VatDetailsPopup";
import DebitNoteExciseDetailsPopup from "./components/popups/DebitNoteExciseDetailsPopup";
import OrderDetailsPopup from "./components/popups/OrderDetailsPopup";
import PurchaseOrderDetailsPopup from "./components/popups/PurchaseOrderDetailsPopup";
import MaterialInAllocationPopup from "./components/popups/MaterialInAllocationPopup";
import JobWorkItemAllocationPopup from "./components/popups/JobWorkItemAllocationPopup";
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
import ReceiptNoteVoucher from "./vouchers/ReceiptNoteVoucher";
import RejectionInVoucher from "./vouchers/RejectionInVoucher";
import RejectionOutVoucher from "./vouchers/RejectionOutVoucher";
import MaterialInVoucher from "./vouchers/MaterialInVoucher";
import MaterialOutVoucher from "./vouchers/MaterialOutVoucher";
import ManufacturingJournalVoucher from "./vouchers/ManufacturingJournalVoucher";
import AttendanceVoucher from "./vouchers/AttendanceVoucher";
import PayrollVoucher from "./vouchers/PayrollVoucher";
import PurchaseOrderVoucher from "./vouchers/PurchaseOrderVoucher";
import SalesOrderVoucher from "./vouchers/SalesOrderVoucher";
import JobWorkInOrderVoucher from "./vouchers/JobWorkInOrderVoucher";
import JobWorkOutOrderVoucher from "./vouchers/JobWorkOutOrderVoucher";

// Voucher types whose entry screen is titled "Inventory Voucher Creation" — they
// share the centered company name + GST Registration header.
const INVENTORY_CREATION_TYPES = [
  "Delivery Note", "Receipt Note", "Rejection In", "Rejection Out",
  "Material In", "Material Out", "Physical Stock", "Stock Journal", "Manufacturing Journal",
];

// Order vouchers — titled "Order Voucher Creation" but share the same centered
// company name + GST Registration / Tax Unit header as inventory vouchers.
const ORDER_CREATION_TYPES = ["Purchase Order", "Sales Order", "Job Work In Order", "Job Work Out Order"];

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
  onCompanyTaxRegistrationClick, 
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
  onCompanyTaxRegistrationClick: () => void;
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
        <Button
          variant="ghost"
          onClick={onDateClick}
          className="w-full h-auto justify-start rounded-none p-0 text-xs font-normal text-black hover:bg-transparent hover:underline"
        >
          <span className="text-gray-500">F2</span>: Date
        </Button>
      </div>

      <div className="border-b border-black px-2 py-1">
        <Button
          variant="ghost"
          onClick={onCompanyTaxRegistrationClick}
          className="w-full h-auto justify-start rounded-none p-0 text-xs font-normal text-black hover:bg-transparent hover:underline"
        >
          <span className="text-gray-500">F3</span>: Company/Tax Registration
        </Button>
      </div>


      {types.map(({ key, label }) => {
        const children = voucherTypeChildren[label];
        const hasChildren = children && children.length > 0;
        return (
          <div key={key} className="border-b border-gray-200 relative">
            <Button
              variant="ghost"
              onClick={() => {
                if (hasChildren) {
                  onSubDropdownToggle(label);
                } else {
                  if (subDropdownType) onSubDropdownToggle(subDropdownType);
                  onTypeChange(label);
                }
              }}
              className={cn(
                "w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal",
                voucherType === label || children?.includes(voucherType)
                  ? "bg-black text-white font-semibold hover:bg-black hover:text-white"
                  : "text-black hover:bg-gray-100"
              )}
            >
              <span className={voucherType === label || children?.includes(voucherType) ? "text-gray-300" : "text-gray-500"}>
                {key}
              </span>
              : {label}
              {hasChildren && (
                <span className="ml-1 text-[9px] opacity-60">{subDropdownType === label ? "\u25B2" : "\u25BC"}</span>
              )}
            </Button>
            {hasChildren && subDropdownType === label && (
              <div className="absolute left-0 right-0 top-full z-30 bg-white border border-zinc-300 shadow-lg rounded-b">
                <Button
                  variant="ghost"
                  onClick={() => { onTypeChange(label); onSubDropdownToggle(label); }}
                  className={cn(
                    "w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal",
                    voucherType === label
                      ? "bg-black text-white font-semibold hover:bg-black hover:text-white"
                      : "text-black hover:bg-gray-100"
                  )}
                >
                  {label}
                </Button>
                {children.map((child) => (
                  <Button
                    key={child}
                    variant="ghost"
                    onClick={() => { onTypeChange(child); onSubDropdownToggle(label); }}
                    className={cn(
                      "w-full h-auto justify-start rounded-none pl-4 pr-2 py-1 text-xs font-normal",
                      voucherType === child
                        ? "bg-black text-white font-semibold hover:bg-black hover:text-white"
                        : "text-black hover:bg-gray-100"
                    )}
                  >
                    {child}
                  </Button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="border-b border-gray-200">
        <Button
          variant="ghost"
          onClick={onOtherVouchersClick}
          className={cn(
            "w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal",
            isOtherActive
              ? "bg-black text-white font-semibold hover:bg-black hover:text-white"
              : "text-black hover:bg-gray-100"
          )}
        >
          <span className={isOtherActive ? "text-gray-300" : "text-gray-500"}>F10</span>
          : Other Vouchers
        </Button>
      </div>

      <div className="border-b border-gray-200">
        <Button
          variant="ghost"
          onClick={onCreateLedger}
          className="w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal text-black hover:bg-gray-100"
        >
          <span className="text-gray-500">Alt+C</span>: Create Ldgr
        </Button>
      </div>

      <div className="border-b border-gray-200">
        <Button
          variant="ghost"
          onClick={onStatusChange}
          className="w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal text-black hover:bg-gray-100"
        >
          <span className="text-gray-500">T</span>:{" "}
          {status === "Post-Dated" ? "✓ " : ""}Post-Dated
        </Button>
      </div>

      {["Contra", "Receipt", "Journal", "Payment"].includes(voucherType) && (
        <div className="border-b border-gray-200">
          <Button
            variant="ghost"
            onClick={onEntryModeChange}
            className="w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal text-black hover:bg-gray-100"
          >
            <span className="text-gray-500">H</span>:{" "}
            {entryMode === "double" ? "✓ " : ""}Double Entry
          </Button>
        </div>
      )}

      <div className="flex-1" />

      <div className="border-t border-black px-2 py-1">
        <Button
          variant="ghost"
          onClick={onAccept}
          disabled={!canAccept}
          className="w-full h-auto justify-start rounded-none p-0 text-xs font-normal text-black hover:bg-transparent hover:underline disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-100"
        >
          <span className="text-gray-500">A</span>: Accept
        </Button>
      </div>
      <div className="border-t border-gray-300 px-2 py-1">
        <Button
          variant="ghost"
          onClick={onQuit}
          className="w-full h-auto justify-start rounded-none p-0 text-xs font-normal text-black hover:bg-transparent hover:underline"
        >
          <span className="text-gray-500">Q</span>: Quit
        </Button>
      </div>
    </div>
  );
}

export default function Vouchers() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const [voucherTypeChildren, setVoucherTypeChildren] = useState<Record<string, string[]>>({});
  const [voucherTypeParentMap, setVoucherTypeParentMap] = useState<Record<string, string>>({});
  const [voucherTypeIdByName, setVoucherTypeIdByName] = useState<Record<string, number>>({});
  const [availableVoucherClasses, setAvailableVoucherClasses] = useState<VoucherClassRow[]>([]);
  const [showTaxRegistrationPopup, setShowTaxRegistrationPopup] = useState(false);

  const resolveEffectiveVoucherType = useCallback(
    (type: string) => voucherTypeParentMap[type] || type,
    [voucherTypeParentMap]
  );

  // Edit mode: /transactions/voucher/:id/edit re-uses this entry screen, hydrated from
  // the saved voucher, and saves via voucher.update instead of create.
  const { id: editIdParam } = useParams<{ id: string }>();
  const editVoucherId = editIdParam ? Number(editIdParam) : null;

  const form = useVoucherForm(
    resolveEffectiveVoucherType,
    editVoucherId,
    editVoucherId ? () => navigate(`/transactions/voucher/${editVoucherId}`) : undefined,
  );

  // Load the voucher once master data (ledgers/items) is ready, then populate the form.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!editVoucherId || hydratedRef.current) return;
    if (form.ledgersLoading || !(form.allLedgers && form.allLedgers.length)) return;
    hydratedRef.current = true;
    (async () => {
      try {
        const res = await window.api.voucher.getById(editVoucherId);
        if (res.success && res.voucher) hydrateVoucherForm(form, res.voucher);
        else form.setError(res.error || "Failed to load voucher for editing.");
      } catch (e: any) {
        form.setError(e?.message || "Failed to load voucher for editing.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editVoucherId, form.ledgersLoading, form.allLedgers]);

  const effectiveVoucherType = resolveEffectiveVoucherType(form.voucherType);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showApplicableUptoPicker, setShowApplicableUptoPicker] = useState(false);
  // Inventory Allocations sub-screen for a Journal/Reversing Journal ledger row
  // whose ledger affects inventory (Purchase/Sales A/c).
  const [inventoryAlloc, setInventoryAlloc] = useState<
    { rowId: string; ledgerName: string; isInward: boolean; dcType: "Dr" | "Cr"; allowCostCentres: boolean } | null
  >(null);
  const [showDispatchDetails, setShowDispatchDetails] = useState(false);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);
  const [showPartyDetails, setShowPartyDetails] = useState(false);
  const [showCreditNoteDetails, setShowCreditNoteDetails] = useState(false);
  const [showExciseDetails, setShowExciseDetails] = useState(false);
  const [showVatDetails, setShowVatDetails] = useState(false);
  const [showDebitNoteExcise, setShowDebitNoteExcise] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [itemExcise, setItemExcise] = useState<
    { rowId: string; itemName: string; initial: ExciseItemDetails | null } | null
  >(null);
  const [showDebitNoteDetails, setShowDebitNoteDetails] = useState(false);
  const [showOtherVouchers, setShowOtherVouchers] = useState(false);
  const [subDropdownType, setSubDropdownType] = useState<string | null>(null);

  const hasAutoOpenedReceipt = useRef(false);
  const hasAutoOpenedDispatch = useRef(false);
  const hasAutoOpenedCreditNote = useRef(false);
  const hasAutoOpenedDebitNote = useRef(false);
  const hasAutoOpenedDeliveryDispatch = useRef(false);
  const hasAutoOpenedReceiptNote = useRef(false);
  const hasAutoOpenedMaterialIn = useRef(false);
  const hasAutoOpenedPurchaseOrder = useRef(false);
  const hasAutoOpenedSalesOrder = useRef(false);
  const hasAutoOpenedJobWorkIn = useRef(false);
  const hasAutoOpenedJobWorkOut = useRef(false);

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
      const needsLedger = ["Sales", "Purchase", "Credit Note", "Debit Note"].includes(effectiveVoucherType);
      return (
        !!form.partyLedger &&
        (!needsLedger || !!form.salesPurchaseLedger) &&
        hasValidEntries &&
        allFilled
      );
    }

    if (effectiveVoucherType === "Stock Journal" || effectiveVoucherType === "Manufacturing Journal") {
      const filledSource = form.sourceStockEntries.some((s) => !!s.stockItem && (Number(s.quantityRaw) || 0) > 0);
      const filledDest = form.destinationStockEntries.some((s) => !!s.stockItem && (Number(s.quantityRaw) || 0) > 0);
      return filledSource || filledDest;
    }

    // Physical Stock: inventory-only, no party/ledger — valid once any item has a quantity.
    if (effectiveVoucherType === "Physical Stock") {
      return form.stockEntries.some((s) => !!s.stockItem && (Number(s.quantityRaw) || 0) > 0);
    }

    // Order vouchers: party + at least one stock item with quantity
    if (["Purchase Order", "Sales Order", "Job Work In Order", "Job Work Out Order"].includes(effectiveVoucherType)) {
      return (
        !!form.partyLedger &&
        form.stockEntries.some((s) => !!s.stockItem && (Number(s.quantityRaw) || 0) > 0)
      );
    }

    if (effectiveVoucherType === "Memorandum") {
      const filled = form.journalRows.filter(
        (r) => !!r.ledger && (Number(r.amountRaw) || 0) > 0
      );
      return (
        filled.length >= 2 &&
        Math.abs(form.debitTotal - form.creditTotal) < 0.01
      );
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
        ((form as any).payrollEntriesFromGroups ?? form.payrollEntries).some(
          (r: any) => !!r.employee && !!r.payHead && Number(r.amountRaw) > 0
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
    form.sourceStockEntries,
    form.destinationStockEntries,
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
      // Tally Delivery Note: party → Order Details → Party Details. The Order
      // Details popup also carries the dispatch fields; handleSaveOrderDetails
      // then chains to the Party Details popup.
      setShowOrderDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (effectiveVoucherType === "Receipt Note" && form.partyLedger && !hasAutoOpenedReceiptNote.current) {
      hasAutoOpenedReceiptNote.current = true;
      // Tally Receipt Note: party select → Order Details, then Party Details
      // (chained in handleSaveOrderDetails).
      setShowOrderDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (effectiveVoucherType === "Purchase Order" && form.partyLedger && !hasAutoOpenedPurchaseOrder.current) {
      hasAutoOpenedPurchaseOrder.current = true;
      // Tally Purchase Order: party select → Order Details, then Party Details
      // (chained in handleSaveOrderDetails).
      setShowOrderDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (effectiveVoucherType === "Sales Order" && form.partyLedger && !hasAutoOpenedSalesOrder.current) {
      hasAutoOpenedSalesOrder.current = true;
      setShowOrderDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (effectiveVoucherType === "Job Work In Order" && form.partyLedger && !hasAutoOpenedJobWorkIn.current) {
      hasAutoOpenedJobWorkIn.current = true;
      setShowDispatchDetails(true);
    }
    if (effectiveVoucherType === "Job Work Out Order" && form.partyLedger && !hasAutoOpenedJobWorkOut.current) {
      hasAutoOpenedJobWorkOut.current = true;
      setShowDispatchDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if ((effectiveVoucherType === "Material In" || effectiveVoucherType === "Material Out") && form.partyLedger && !hasAutoOpenedMaterialIn.current) {
      hasAutoOpenedMaterialIn.current = true;
      setShowOrderDetails(true);
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
      hasAutoOpenedMaterialIn.current = false;
      hasAutoOpenedPurchaseOrder.current = false;
      hasAutoOpenedSalesOrder.current = false;
      hasAutoOpenedJobWorkIn.current = false;
      hasAutoOpenedJobWorkOut.current = false;
    }
  }, [form.partyLedger]);

  // ─── handleAccept ────────────────────────────────────────────────────

  const handleAccept = useCallback(() => {
    // ── Sales / Purchase / Credit Note / Debit Note: bill-wise for party ──────
    if (
      // Delivery Note, Receipt Note, Rejection In & Rejection Out are non-accounting
      // inventory vouchers — no bill-wise prompt (no voucher_entries row is ever
      // created for the party ledger, so a bill reference would be orphaned).
      ["Sales", "Purchase", "Credit Note", "Debit Note"].includes(effectiveVoucherType) &&
      form.partyLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      // Credit Note (sales return) credits the customer → "Cr"; Debit Note
      // (purchase return) debits the supplier → "Dr".
      const dcType = (effectiveVoucherType === "Sales" || effectiveVoucherType === "Debit Note") ? "Dr" : "Cr";
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
    // Receipt Note & Rejection In/Out are inventory-only — no bank-allocation prompt.
    if (
      ["Sales", "Purchase", "Credit Note", "Debit Note", "Delivery Note", "Material In", "Material Out"].includes(effectiveVoucherType) &&
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

    // ── Payroll: bank allocation for the account ledger ──────────────────────
    if (
      effectiveVoucherType === "Payroll" &&
      form.accountLedger &&
      form.checkIsBank(form.accountLedger) &&
      !form.bankDetails
    ) {
      form.setActiveAllocation({
        type: "partyBankDetails",
        ledgerId: form.accountLedger.ledger_id,
        ledgerName: form.accountLedger.name,
        amount: form.totalAmount,
        initialDetails: form.bankDetails,
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
      const isJDouble = (effectiveVoucherType === "Journal" || effectiveVoucherType === "Reversing Journal" || effectiveVoucherType === "Memorandum") && form.journalEntryMode === "double";
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

  const advanceStockRow = useCallback(
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

  // Inward voucher types — mirrors the backend INWARD_TYPES; determines whether
  // the batch popup label reads Inward (new lots) or Outward (consume balances).
  const INWARD_VOUCHER_TYPES = ["Purchase", "Receipt Note", "Rejection In", "Material In", "Purchase Order"];

  const proceedToNextStockRow = useCallback(
    (idx: number) => {
      const row = form.stockEntries[idx];
      const item = row?.stockItem;
      const qty = Number(row?.quantityRaw) || 0;
      // Batch-tracked item → open the Stock Item Allocations sub-screen first.
      if (item && Number((item as any).track_batches) === 1 && qty > 0 && item.item_id) {
        form.setActiveAllocation({
          type: "batch",
          rowId: row.id,
          itemId: item.item_id,
          itemName: item.name,
          quantity: qty,
          rate: Number(row.rateRaw) || 0,
          unitSymbol: row.unit?.symbol,
          trackMfg: Number((item as any).track_date_of_manufacturing) === 1,
          trackExpiry: Number((item as any).track_expiry) === 1,
          isInward: INWARD_VOUCHER_TYPES.includes(effectiveVoucherType),
          initialAllocations: row.batchAllocations,
        });
        return; // advance happens after the popup is accepted
      }
      advanceStockRow(idx);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.stockEntries, form.setActiveAllocation, effectiveVoucherType, advanceStockRow]
  );

  // Physical Stock: after entering a godown's quantity, add another godown row for
  // the SAME item and open its "List of Godowns" picker (instead of going to Rate).
  const handlePhysicalStockQtyEnter = useCallback(
    (idx: number) => {
      const row = form.stockEntries[idx];
      if (!row?.stockItem) { advanceStockRow(idx); return; }
      const newRow = makeStockRow();
      newRow.stockItem = row.stockItem;
      newRow.unit = row.unit;
      const newIdx = form.stockEntries.length; // appended at the end
      form.setStockEntries((prev) => [...prev, newRow]);
      setTimeout(() => {
        (document.querySelector(`[data-stock-godown="${newIdx + 1}"]`) as HTMLInputElement | null)?.focus();
      }, 50);
    },
    [form.stockEntries, form.setStockEntries, advanceStockRow]
  );

  // Physical Stock: end item entry (End of List / empty Enter on an item row) →
  // move to the Narration field.
  const physicalStockEndEntry = useCallback(() => {
    form.handleFieldBlur();
    setTimeout(() => {
      (document.querySelector(`[data-narration="true"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  }, [form.handleFieldBlur]);

  // Physical Stock: "End of List" (or empty Enter) on a godown row finishes the
  // current item and starts a new one — the row becomes a fresh item row and the
  // List of Stock Items opens.
  const physicalStockGodownNewItem = useCallback((rowId: string) => {
    const idx = form.stockEntries.findIndex((r) => r.id === rowId);
    form.setStockEntries((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, stockItem: null, godown: null, unit: null } : r))
    );
    form.handleFieldBlur();
    setTimeout(() => {
      (document.querySelector(`[data-stock-item="${idx + 1}"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  }, [form.stockEntries, form.setStockEntries, form.handleFieldBlur]);

  // Stock Journal / Manufacturing Journal: a blank Enter on an empty item row means
  // "done with this side". From a Source row → jump to the Destination's first item;
  // from a Destination row → finish and move to Narration (ready to Accept).
  const handleStockJournalItemEndOfList = useCallback(() => {
    const af = form.activeField;
    if (af?.type !== "stockItem") return;
    const onSource = form.sourceStockEntries.some((r) => r.id === af.rowId);
    form.handleFieldBlur();
    setTimeout(() => {
      const sel = onSource ? `[data-dest-item="1"]` : `[data-narration="true"]`;
      (document.querySelector(sel) as HTMLInputElement | null)?.focus();
    }, 50);
  }, [form.activeField, form.sourceStockEntries, form.handleFieldBlur]);

  // Journal / Reversing Journal / Memorandum: a blank Enter (or "End of List") on an
  // empty ledger row means "done entering" — close the picker and jump straight to
  // Narration (ready to Accept) instead of selecting the highlighted ledger.
  const journalParticularEndOfList = useCallback(() => {
    form.handleFieldBlur();
    setTimeout(() => {
      (document.querySelector(`[data-narration="true"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  }, [form.handleFieldBlur]);

  const handleSaveBatchAllocations = useCallback(
    (allocations: BatchAllocation[]) => {
      const alloc = form.activeAllocation;
      if (alloc?.type !== "batch") return;
      const rowId = alloc.rowId;

      // Stock Journal / Manufacturing Journal keep Source & Destination in separate
      // arrays — derive line qty/rate from the batch rows, write back to the side that
      // owns this row, then advance to the next item row on that same side.
      const sjSrcIdx = form.sourceStockEntries.findIndex((e) => e.id === rowId);
      const sjDestIdx = form.destinationStockEntries.findIndex((e) => e.id === rowId);
      if (
        (effectiveVoucherType === "Stock Journal" || effectiveVoucherType === "Manufacturing Journal") &&
        (sjSrcIdx >= 0 || sjDestIdx >= 0)
      ) {
        const onSource = sjSrcIdx >= 0;
        const totalBilled = allocations.reduce((s, a) => s + (Number(a.quantity) || 0), 0);
        const totalAmt = allocations.reduce(
          (s, a) => s + (Number(a.quantity) || 0) * (Number(a.rate) || 0) * (1 - (Number(a.disc_percent) || 0) / 100),
          0
        );
        const effRate = totalBilled > 0 ? totalAmt / totalBilled : 0;
        const firstGodownName = allocations.find((a) => a.godown)?.godown;
        const godownObj = firstGodownName
          ? (form.allGodowns.find((g: any) => g.name === firstGodownName) ?? null)
          : null;
        const updateRow = onSource ? form.handleUpdateSourceStockRow : form.handleUpdateDestinationStockRow;
        updateRow(rowId, {
          batchAllocations: allocations,
          quantityRaw: totalBilled ? String(totalBilled) : "",
          rateRaw: effRate ? String(effRate) : "",
          ...(godownObj ? { godown: godownObj } : {}),
        });
        form.setActiveAllocation(null);
        const list = onSource ? form.sourceStockEntries : form.destinationStockEntries;
        const idx = onSource ? sjSrcIdx : sjDestIdx;
        if (idx === list.length - 1) {
          (onSource ? form.handleAddSourceStockRow : form.handleAddDestinationStockRow)();
        }
        const sideAttr = onSource ? "source" : "dest";
        setTimeout(() => {
          (document.querySelector(`[data-${sideAttr}-item="${idx + 2}"]`) as HTMLInputElement | null)?.focus();
        }, 50);
        return;
      }

      if (alloc.quantityDriven) {
        // Line qty (actual/billed) & rate are derived from the batch rows. The
        // effective rate folds in per-batch discount so the line amount matches
        // the popup total exactly (Tally behaviour).
        const totalActual = allocations.reduce((s, a) => s + (Number(a.actual_quantity ?? a.quantity) || 0), 0);
        const totalBilled = allocations.reduce((s, a) => s + (Number(a.quantity) || 0), 0);
        const totalAmt = allocations.reduce(
          (s, a) => s + (Number(a.quantity) || 0) * (Number(a.rate) || 0) * (1 - (Number(a.disc_percent) || 0) / 100),
          0
        );
        const effRate = totalBilled > 0 ? totalAmt / totalBilled : 0;
        form.handleUpdateStockRow(rowId, {
          batchAllocations: allocations,
          quantityRaw: totalActual ? String(totalActual) : "",
          billedQtyRaw: totalBilled ? String(totalBilled) : "",
          rateRaw: effRate ? String(effRate) : "",
        });
      } else {
        form.handleUpdateStockRow(rowId, { batchAllocations: allocations });
      }
      form.setActiveAllocation(null);
      const idx = form.stockEntries.findIndex((e) => e.id === rowId);
      // Credit Note: prompt per-item Excise Details right after the allocation.
      const row = form.stockEntries.find((e) => e.id === rowId);
      if (effectiveVoucherType === "Credit Note") {
        setItemExcise({
          rowId,
          itemName: row?.stockItem?.name ?? "",
          initial: row?.exciseItemDetails ?? null,
        });
        return;
      }
      if (idx >= 0) advanceStockRow(idx);
    },
    [
      form.activeAllocation, form.handleUpdateStockRow, form.setActiveAllocation, form.stockEntries,
      effectiveVoucherType, advanceStockRow,
      form.sourceStockEntries, form.destinationStockEntries,
      form.handleUpdateSourceStockRow, form.handleUpdateDestinationStockRow,
      form.handleAddSourceStockRow, form.handleAddDestinationStockRow, form.allGodowns,
    ]
  );

  const handleSaveMaterialInAllocations = useCallback(
    (allocations: BatchAllocation[]) => {
      const alloc = form.activeAllocation;
      if (alloc?.type !== "materialIn") return;
      const rowId = alloc.rowId;
      const totalQty = allocations.reduce((s, a) => s + (Number(a.quantity) || 0), 0);
      const totalAmt = allocations.reduce((s, a) => s + (Number(a.quantity) || 0) * (Number(a.rate) || 0), 0);
      const effRate = totalQty > 0 ? totalAmt / totalQty : 0;
      form.handleUpdateStockRow(rowId, {
        batchAllocations: allocations,
        quantityRaw: totalQty ? String(totalQty) : "",
        rateRaw: effRate ? String(effRate) : "",
      });
      form.setActiveAllocation(null);
      const idx = form.stockEntries.findIndex((e) => e.id === rowId);
      if (idx >= 0) advanceStockRow(idx);
    },
    [form.activeAllocation, form.handleUpdateStockRow, form.setActiveAllocation, form.stockEntries, advanceStockRow]
  );

  const handleSaveJobWorkAllocations = useCallback(
    (allocations: import("./types").JobWorkItemAllocationRow[]) => {
      const alloc = form.activeAllocation;
      if (alloc?.type !== "jobWork") return;
      const { rowId } = alloc;
      const totalQty = allocations.reduce((s, a) => s + (Number(a.quantity) || 0), 0);
      const totalAmount = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
      const effRate = totalQty > 0 ? totalAmount / totalQty : 0;
      form.handleUpdateStockRow(rowId, {
        jobWorkAllocations: allocations,
        quantityRaw: String(totalQty),
        rateRaw: String(effRate),
        amountRaw: String(totalAmount),
      });
      form.setActiveAllocation(null);
      const idx = form.stockEntries.findIndex((e) => e.id === rowId);
      if (idx >= 0) advanceStockRow(idx);
    },
    [form.activeAllocation, form.handleUpdateStockRow, form.setActiveAllocation, form.stockEntries, advanceStockRow]
  );

  const handleSaveItemExcise = useCallback(
    (details: ExciseItemDetails) => {
      if (!itemExcise) return;
      const rowId = itemExcise.rowId;
      form.handleUpdateStockRow(rowId, { exciseItemDetails: details });
      setItemExcise(null);
      const idx = form.stockEntries.findIndex((e) => e.id === rowId);
      if (idx >= 0) advanceStockRow(idx);
    },
    [itemExcise, form.handleUpdateStockRow, form.stockEntries, advanceStockRow]
  );

  // Inventory Allocations accepted for a Journal/Reversing Journal ledger row:
  // write the stock lines onto the row, derive the ledger amount from their total,
  // and aggregate their per-item cost centres onto the ledger entry.
  const handleSaveInventoryAllocation = useCallback(
    (allocItems: InventoryAllocationItem[]) => {
      if (!inventoryAlloc) return;
      const rowId = inventoryAlloc.rowId;
      const total = allocItems.reduce((s, it) => s + (Number(it.amount) || 0), 0);
      const ccMap = new Map<number, number>();
      allocItems.forEach((it) =>
        (it.cost_centres ?? []).forEach((c) =>
          ccMap.set(c.cost_centre_id, (ccMap.get(c.cost_centre_id) ?? 0) + (Number(c.amount) || 0))
        )
      );
      const costCentres = Array.from(ccMap.entries()).map(([cost_centre_id, amount]) => ({ cost_centre_id, amount }));
      form.handleUpdateJournalRow(rowId, {
        inventoryAllocations: allocItems,
        amountRaw: total ? String(total) : "",
        costCentres: costCentres.length ? costCentres : undefined,
      });
      setInventoryAlloc(null);
      const idx = form.journalRows.findIndex((r) => r.id === rowId);
      if (idx === form.journalRows.length - 1) form.handleAddJournalRow();
      setTimeout(() => {
        (document.querySelector(`[data-particular-ledger="${idx + 2}"]`) as HTMLInputElement | null)?.focus();
      }, 50);
    },
    [inventoryAlloc, form.handleUpdateJournalRow, form.journalRows, form.handleAddJournalRow]
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
        // Non-bank: only party ledgers (Sundry Debtors/Creditors) or bill-wise
        // ledgers continue to the bill-wise popup; anything else just advances.
        if (!(form.checkIsParty(ledger) || ledger.is_bill_wise === 1)) {
          proceedToNextRow(idx);
          return;
        }
      }

      if (form.checkIsParty(ledger) || ledger.is_bill_wise === 1) {
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
    [effectiveVoucherType, form.paymentEntryMode, form.receiptEntryMode, form.checkIsBank, form.checkIsParty, form.checkIsCash, form.bankDetails, form.cashDenominations, form.setActiveAllocation, proceedToNextRow]
  );

  // In a double-entry voucher the balancing row's amount auto-fills the moment
  // its ledger is picked — so the user never presses Enter in the amount field,
  // and the allocation popup (bank / bill-wise / cost-centre), which only opens
  // from that Enter via handleAmountConfirm, is skipped. Detect a ledger that
  // needs an allocation and open it anyway, using the same balancing amount
  // (row state updates async, so we recompute it here).
  const handleLedgerSelectWithAllocation = useCallback(
    (item: any) => {
      const field = form.activeField;
      form.handleLedgerPanelSelect(item);

      // Payroll hierarchy auto-advance: category → first employee, employee → first
      // pay head, pay head → its amount. Mirrors TallyPrime's cursor flow.
      if (field?.type === "payrollCategory") {
        const { groupId } = field as any;
        setTimeout(() => {
          const nodes = document.querySelectorAll(`[data-payroll-emp^="${groupId}-"]`);
          (nodes[0] as HTMLInputElement | null)?.focus();
        }, 50);
        return;
      }
      if (field?.type === "payrollEmployee") {
        const { groupId, empRowId } = field as any;
        setTimeout(() => {
          const nodes = document.querySelectorAll(`[data-payroll-ph^="${groupId}-${empRowId}-"]`);
          (nodes[0] as HTMLInputElement | null)?.focus();
        }, 50);
        return;
      }
      if (field?.type === "payrollPayHead") {
        const { groupId, empRowId, phRowId } = field as any;
        setTimeout(() => {
          (document.querySelector(`[data-payroll-amt="${groupId}-${empRowId}-${phRowId}"]`) as HTMLInputElement | null)?.focus();
        }, 50);
        return;
      }

      // Attendance: pick employee → Attendance/Production Type field; pick type → Value.
      if (effectiveVoucherType === "Attendance" && (field?.type === "employee" || field?.type === "attendanceType")) {
        const idx = form.attendanceEntries.findIndex((r) => r.id === field.rowId);
        if (idx >= 0) {
          const sel = field.type === "employee" ? `[data-att-type="${idx + 1}"]` : `[data-att-value="${idx + 1}"]`;
          setTimeout(() => {
            (document.querySelector(sel) as HTMLInputElement | null)?.focus();
          }, 50);
          return;
        }
      }

      // Journal / Reversing Journal / Memorandum: an inventory-affecting ledger
      // (Purchase/Sales Accounts) opens the Inventory Allocations sub-screen instead
      // of a typed amount — the ledger's amount is derived from the stock total.
      if (
        (effectiveVoucherType === "Journal" || effectiveVoucherType === "Reversing Journal" || effectiveVoucherType === "Memorandum") &&
        field?.type === "particular" &&
        form.checkLedgerGroup(item, ["purchase accounts", "sales accounts"])
      ) {
        const row = form.journalRows.find((r) => r.id === field.rowId);
        setInventoryAlloc({
          rowId: field.rowId,
          ledgerName: item.name,
          isInward: form.checkLedgerGroup(item, ["purchase accounts"]),
          dcType: row?.type ?? "Dr",
          allowCostCentres: item.allow_cost_centres === 1,
        });
        return;
      }

      // Physical Stock: pick item → open the godown picker (with per-godown balances);
      // pick godown → move to Batch (batch item) or Quantity.
      if (effectiveVoucherType === "Physical Stock" && field?.type === "stockItem" && item?.item_id) {
        form.fetchGodownBalances(item.item_id);
        const idx = form.stockEntries.findIndex((r) => r.id === field.rowId);
        setTimeout(() => {
          (document.querySelector(`[data-stock-godown="${idx + 1}"]`) as HTMLInputElement | null)?.focus();
        }, 50);
        return;
      }
      if (effectiveVoucherType === "Physical Stock" && field?.type === "stockGodown") {
        const idx = form.stockEntries.findIndex((r) => r.id === field.rowId);
        const row = form.stockEntries[idx];
        const isBatch = Number((row?.stockItem as any)?.track_batches) === 1;
        setTimeout(() => {
          const sel = isBatch ? `[data-stock-batch="${idx + 1}"]` : `[data-stock-qty="${idx + 1}"]`;
          (document.querySelector(sel) as HTMLInputElement | null)?.focus();
        }, 50);
        return;
      }

      // Stock Journal / Manufacturing Journal: pick item → godown picker (or, for a
      // batch-tracked item, the Stock Item Allocations popup); pick godown → quantity.
      // Rows live in two arrays (source = Consumption, destination = Production), so
      // resolve which side owns the active row to target the right field / direction.
      if (
        (effectiveVoucherType === "Stock Journal" || effectiveVoucherType === "Manufacturing Journal") &&
        (field?.type === "stockItem" || field?.type === "stockGodown")
      ) {
        const srcIdx = form.sourceStockEntries.findIndex((r) => r.id === field.rowId);
        const onSource = srcIdx >= 0;
        const side = onSource ? "source" : "dest";
        const idx = onSource ? srcIdx : form.destinationStockEntries.findIndex((r) => r.id === field.rowId);
        if (idx >= 0) {
          // Batch-tracked item → Stock Item Allocations popup (Godown + Batch/Lot + Qty + Rate).
          if (field.type === "stockItem" && item?.item_id && Number(item?.track_batches) === 1) {
            const unit = form.allUnits.find((u: any) => u.unit_id === item.unit_id) ?? null;
            form.setActiveAllocation({
              type: "batch",
              rowId: field.rowId,
              itemId: item.item_id,
              itemName: item.name,
              quantity: 0,
              rate: 0,
              unitSymbol: unit?.symbol,
              trackMfg: Number(item.track_date_of_manufacturing) === 1,
              trackExpiry: Number(item.track_expiry) === 1,
              // Source consumes existing stock (outward); Destination produces it (inward).
              isInward: !onSource,
              showBatch: true,
              quantityDriven: true,
            });
            return;
          }
          const col = field.type === "stockItem" ? "godown" : "qty";
          setTimeout(() => {
            (document.querySelector(`[data-${side}-${col}="${idx + 1}"]`) as HTMLInputElement | null)?.focus();
          }, 50);
          return;
        }
      }

      // Material In / Material Out (job work): order-tracked Stock Item Allocations
      // popup. Batch items additionally get Batch/Lot No. + Mfg/Expiry columns.
      if ((effectiveVoucherType === "Material In" || effectiveVoucherType === "Material Out") && field?.type === "stockItem" && item?.item_id) {
        const isBatch = Number(item?.track_batches) === 1;
        const unit = form.allUnits.find((u: any) => u.unit_id === item.unit_id) ?? null;
        form.setActiveAllocation({
          type: "materialIn",
          rowId: field.rowId,
          itemId: item.item_id,
          itemName: item.name,
          rate: 0,
          unitSymbol: unit?.symbol,
          showBatch: isBatch,
          trackMfg: isBatch && Number(item.track_date_of_manufacturing) === 1,
          trackExpiry: isBatch && Number(item.track_expiry) === 1,
        });
        return;
      }

      // Job Work In/Out Order: open Job Work Item Allocations popup (godown + qty + rate,
      // with optional component sub-allocation when Track Components = Yes).
      if (
        (effectiveVoucherType === "Job Work In Order" || effectiveVoucherType === "Job Work Out Order") &&
        field?.type === "stockItem" &&
        item?.item_id
      ) {
        const unit = form.allUnits.find((u: any) => u.unit_id === item.unit_id) ?? null;
        const existingRow = form.stockEntries.find((e) => e.id === field.rowId);
        form.setActiveAllocation({
          type: "jobWork",
          rowId: field.rowId,
          itemId: item.item_id,
          itemName: item.name,
          unitSymbol: unit?.symbol,
          orderNo: form.orderDetails?.order_nos,
          initialAllocations: existingRow?.jobWorkAllocations,
        });
        return;
      }

      // Sales / Purchase / Credit Note / Debit Note / Receipt Note (Tally behaviour):
      // the moment a stock item is picked, open the Stock Item Allocations popup.
      // Items that "maintain in batches" get the Batch/Lot columns; others get a
      // godown-only allocation (Godown + Tracking No.). Quantity & rate are entered
      // inside and written back on Accept.
      if (
        ["Sales", "Purchase", "Credit Note", "Debit Note", "Receipt Note", "Delivery Note", "Rejection In", "Rejection Out", "Purchase Order", "Sales Order"].includes(effectiveVoucherType) &&
        field?.type === "stockItem" &&
        item?.item_id
      ) {
        const isBatch = Number(item?.track_batches) === 1;
        const unit = form.allUnits.find((u: any) => u.unit_id === item.unit_id) ?? null;
        form.setActiveAllocation({
          type: "batch",
          rowId: field.rowId,
          itemId: item.item_id,
          itemName: item.name,
          quantity: 0,
          rate: 0,
          unitSymbol: unit?.symbol,
          trackMfg: isBatch && Number(item.track_date_of_manufacturing) === 1,
          trackExpiry: isBatch && Number(item.track_expiry) === 1,
          // Credit Note (sales return) brings stock in; Debit Note (purchase return) sends it out.
          // Purchase Order is inward — lets you allocate to a new/existing batch lot.
          isInward: ["Purchase", "Receipt Note", "Rejection In", "Material In", "Credit Note", "Purchase Order"].includes(effectiveVoucherType),
          showBatch: isBatch,
          quantityDriven: true,
        });
        return;
      }

      if (field?.type !== "particular") return;

      const dbl =
        effectiveVoucherType === "Contra"
          ? form.contraDoubleRows
          : effectiveVoucherType === "Receipt" && form.receiptEntryMode === "double"
          ? form.receiptDoubleRows
          : effectiveVoucherType === "Payment" && form.paymentEntryMode === "double"
          ? form.paymentDoubleRows
          : (effectiveVoucherType === "Journal" || effectiveVoucherType === "Reversing Journal" || effectiveVoucherType === "Memorandum") && form.journalEntryMode === "double"
          ? form.journalRows
          : null;
      if (!dbl) return;

      const isBankAllocVoucher =
        effectiveVoucherType === "Contra" ||
        (effectiveVoucherType === "Receipt" && form.receiptEntryMode === "double") ||
        (effectiveVoucherType === "Payment" && form.paymentEntryMode === "double");

      // Only act for ledgers that actually open an allocation popup — bank (in a
      // bank-allocation voucher), a party (Sundry Debtor/Creditor), any bill-wise
      // ledger, or a cost-centre ledger. Anything else is left untouched.
      const opensPopup =
        (isBankAllocVoucher && form.checkIsBank(item)) ||
        form.checkIsParty(item) ||
        item.is_bill_wise === 1 ||
        item.allow_cost_centres === 1;
      if (!opensPopup) return;

      const idx = dbl.findIndex((r) => r.id === field.rowId);
      const row = dbl[idx];
      if (!row) return;

      const drTotal = dbl.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
      const crTotal = dbl.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
      const existing = Number(row.amountRaw) || 0;
      const amount =
        existing > 0
          ? existing
          : Math.abs(row.type === "Dr" ? crTotal - drTotal : drTotal - crTotal);

      // First row has no balancing figure yet → let the user type it (Enter then
      // opens the allocation through the normal path).
      if (amount <= 0.01) return;

      handleAmountConfirm({ ...row, ledger: item, amountRaw: String(amount) }, idx);
    },
    [
      form.activeField,
      form.handleLedgerPanelSelect,
      form.checkIsBank,
      form.checkIsParty,
      form.sourceStockEntries,
      form.destinationStockEntries,
      form.attendanceEntries,
      form.contraDoubleRows,
      form.receiptDoubleRows,
      form.paymentDoubleRows,
      form.journalRows,
      form.receiptEntryMode,
      form.paymentEntryMode,
      form.journalEntryMode,
      form.setActiveAllocation,
      form.allUnits,
      form.checkLedgerGroup,
      form.stockEntries,
      form.orderDetails,
      effectiveVoucherType,
      handleAmountConfirm,
    ]
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
      const isJDouble = (effectiveVoucherType === "Journal" || effectiveVoucherType === "Reversing Journal" || effectiveVoucherType === "Memorandum") && form.journalEntryMode === "double";
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
      const isJDouble = (effectiveVoucherType === "Journal" || effectiveVoucherType === "Reversing Journal" || effectiveVoucherType === "Memorandum") && form.journalEntryMode === "double";
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
          ledgerName: details.bank_name || (form.activeAllocation && "ledgerName" in form.activeAllocation ? form.activeAllocation.ledgerName : "") || "Cash",
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

  const handleSaveOrderDetails = useCallback(
    (details: any) => {
      form.setOrderDetails(details);
      setShowOrderDetails(false);
      setShowPartyDetails(true);
    },
    [form.setOrderDetails]
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
    if (effectiveVoucherType === "Credit Note") {
      setShowExciseDetails(true);
    } else if (effectiveVoucherType === "Debit Note") {
      setShowDebitNoteExcise(true);
    }
  },
  [form.setPartyDetails, form.setPlaceOfSupply, effectiveVoucherType]
);
const handleSaveExciseDetails = useCallback(
  (details: any) => {
    form.setExciseDetails(details);
    setShowExciseDetails(false);
  },
  [form.setExciseDetails]
);

const handleSaveDebitNoteExcise = useCallback(
  (details: any) => {
    form.setDebitNoteDetails({ ...form.debitNoteDetails, ...details });
    setShowDebitNoteExcise(false);
  },
  [form.setDebitNoteDetails, form.debitNoteDetails]
);

const handleSaveVatDetails = useCallback(
  (details: any) => {
    form.setVatDetails({ ...form.vatDetails, ...details });
    setShowVatDetails(false);
  },
  [form.setVatDetails, form.vatDetails]
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
    // Only user-created attendance/production types appear — the old pre-seeded
    // (predefined) ones are hidden so the list starts at just "Create".
    if (af.type === "attendanceType") return form.allAttendanceTypes.filter((t: any) => !t.is_predefined);
    if (af.type === "payHead") return form.allPayHeads;

    if (af.type === "account") {
      if (effectiveVoucherType === "Journal") {
        return form.allLedgers.filter((l) => !form.checkIsCashOrBank(l));
      }
      if (effectiveVoucherType === "Payroll") {
        return form.allLedgers.filter((l) => form.checkIsCashOrBank(l));
      }
      // Account field is always cash/bank for all three single-entry types
      return form.allLedgers.filter((l) => form.checkIsCashOrBank(l));
    }

    if (af.type === "payrollCategory") {
      return (form as any).allEmployeeCategories ?? [];
    }

    if (af.type === "payrollEmployee") {
      return form.allEmployees;
    }

    if (af.type === "payrollPayHead") {
      return form.allPayHeads;
    }

    if (af.type === "party") {
      // Credit Note: party may be Cash, a Bank Accounts ledger, Sundry Debtor,
      // Sundry Creditor or Bank OD ledger only.
      if (effectiveVoucherType === "Credit Note") {
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
      if (effectiveVoucherType === "Debit Note" || effectiveVoucherType === "Material In" || effectiveVoucherType === "Material Out") {
        return form.allLedgers;
      }
      // Purchase Order / Sales Order / Delivery Note / Rejection In / Rejection Out —
      // Tally's "List of Ledger Accounts": parties (Sundry Debtors + Creditors),
      // Bank Accounts, Bank OD A/c, Branch/Divisions, Cash.
      if (effectiveVoucherType === "Purchase Order" || effectiveVoucherType === "Sales Order" || effectiveVoucherType === "Delivery Note" || effectiveVoucherType === "Receipt Note" || effectiveVoucherType === "Rejection In" || effectiveVoucherType === "Rejection Out" || effectiveVoucherType === "Job Work In Order" || effectiveVoucherType === "Job Work Out Order") {
        return form.allLedgers.filter((l) =>
          form.checkLedgerGroup(l, [
            "sundry debtors",
            "sundry creditors",
            "bank accounts",
            "bank od accounts",
            "bank od a/c",
            "branch/divisions",
            "branch / divisions",
            "cash-in-hand",
          ])
        );
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
      // Credit Note: ledger account is a Sales or Purchase Accounts ledger only.
      if (effectiveVoucherType === "Credit Note") {
        return form.allLedgers.filter((l) =>
          form.checkLedgerGroup(l, ["sales accounts", "purchase accounts"])
        );
      }
      if (effectiveVoucherType === "Debit Note" || effectiveVoucherType === "Rejection In" || effectiveVoucherType === "Rejection Out") {
        return form.allLedgers;
      }
      const isPurchaseLike = effectiveVoucherType === "Purchase" || effectiveVoucherType === "Receipt Note" || effectiveVoucherType === "Rejection Out" || effectiveVoucherType === "Purchase Order";
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
    if (af.type === "payrollCategory") return "List of Categories";
    if (af.type === "payrollEmployee") return "List of Employees";
    if (af.type === "payrollPayHead") return "List of Pay Heads";
    if (af.type === "account") {
      if (effectiveVoucherType === "Journal") return "List of Ledger Accounts";
      if (effectiveVoucherType === "Payroll") return "List of Cash / Bank Accounts";
      return "List of Cash / Bank Accounts";
    }
    if (af.type === "party") return (effectiveVoucherType === "Credit Note" || effectiveVoucherType === "Purchase Order" || effectiveVoucherType === "Sales Order" || effectiveVoucherType === "Delivery Note" || effectiveVoucherType === "Rejection In" || effectiveVoucherType === "Rejection Out" || effectiveVoucherType === "Job Work In Order" || effectiveVoucherType === "Job Work Out Order") ? "List of Ledger Accounts" : "List of Party Accounts";
    if (af.type === "salesPurchase") return (effectiveVoucherType === "Credit Note" || effectiveVoucherType === "Purchase Order" || effectiveVoucherType === "Sales Order") ? "List of Ledger Accounts" : `List of ${form.voucherType} Ledgers`;
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
        const idMap: Record<string, number> = {};
        for (const vt of res.voucherTypes) {
          if (vt.name && vt.vt_id) idMap[vt.name] = vt.vt_id;
          // Predefined types ARE the base buttons (Contra/Payment/Receipt/...). Skip them.
          if (vt.is_predefined) continue;
          // Nest a custom voucher type under its explicit parent, else under its
          // "Select type of voucher" category — so parent-less custom types aren't ignored.
          const parentName = vt.parent_vt_id
            ? res.voucherTypes.find((p) => p.vt_id === vt.parent_vt_id)?.name
            : vt.category;
          if (parentName && vt.name && parentName !== vt.name) {
            if (!childrenMap[parentName]) childrenMap[parentName] = [];
            if (!childrenMap[parentName].includes(vt.name)) childrenMap[parentName].push(vt.name);
            parentMap[vt.name] = parentName;
          }
        }
        setVoucherTypeChildren(childrenMap);
        setVoucherTypeParentMap(parentMap);
        setVoucherTypeIdByName(idMap);
      }
    }).catch(() => {});
  }, [selectedCompany]);

  // Load the selected voucher type's Name-of-Class list (if any), so a "Class" selector
  // can be shown next to it — matches TallyPrime's behaviour of hiding the Class field
  // entirely when no classes are defined for that voucher type.
  useEffect(() => {
    const vtId = voucherTypeIdByName[effectiveVoucherType];
    if (!vtId) { setAvailableVoucherClasses([]); return; }
    let active = true;
    window.api.voucherType.getConfig(vtId).then((res) => {
      if (!active) return;
      setAvailableVoucherClasses(res.success && res.config?.voucher_classes ? res.config.voucher_classes : []);
    }).catch(() => { if (active) setAvailableVoucherClasses([]); });
    return () => { active = false; };
  }, [effectiveVoucherType, voucherTypeIdByName]);

  const handleTypeKey = useCallback(
    (type: string) => {
      const children = voucherTypeChildren[type];
      if (children && children.length > 0) {
        setSubDropdownType((prev) => (prev === type ? null : type));
      } else {
        setSubDropdownType(null);
        form.setVoucherType(type);
        form.setVoucherClass("");
      }
    },
    [voucherTypeChildren, form.setVoucherType, form.setVoucherClass]
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); setShowDatePicker(true); }
      if (e.key === "F3") { e.preventDefault(); setShowTaxRegistrationPopup(true); }
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
        !showApplicableUptoPicker &&
        !showDispatchDetails &&
        !showReceiptDetails &&
        !showCreditNoteDetails &&
        !showDebitNoteDetails &&
        !showVatDetails &&
        !showOrderDetails &&
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
    showApplicableUptoPicker,
    showDispatchDetails,
    showReceiptDetails,
    showCreditNoteDetails,
    showDebitNoteDetails,
    showVatDetails,
    showOrderDetails,
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
      <PageTitleBar
        title={`${effectiveVoucherType === "Attendance" ? "Attendance" : effectiveVoucherType === "Payroll" ? "Payroll" : ["Purchase Order", "Sales Order", "Job Work In Order", "Job Work Out Order"].includes(effectiveVoucherType) ? "Order" : INVENTORY_CREATION_TYPES.includes(effectiveVoucherType) ? "Inventory" : "Accounting"} Voucher ${editVoucherId ? "Alteration" : "Creation"}`}
        subtitle={selectedCompany?.name ?? ""}
        subtitleCenter={INVENTORY_CREATION_TYPES.includes(effectiveVoucherType) || ORDER_CREATION_TYPES.includes(effectiveVoucherType) || effectiveVoucherType === "Attendance"}
        actions={
          <button
            onClick={() => navigate("/")}
            className="text-white text-sm font-bold hover:opacity-60 leading-none"
          >
            ✕
          </button>
        }
      />
    {/* ── GST Registration / Tax Unit ── */}
    {(["Sales", "Purchase", "Contra", "Payment", "Journal", "Receipt","Credit Note","Debit Note","Attendance"].includes(effectiveVoucherType) || INVENTORY_CREATION_TYPES.includes(effectiveVoucherType) || ORDER_CREATION_TYPES.includes(effectiveVoucherType)) && (
      <div className="flex justify-center gap-2 px-3 py-1 border-b border-zinc-200 bg-white shrink-0 text-sm">
        <div className="text-right text-zinc-500">
          <div>GST Registration</div>
          {["Sales", "Purchase", "Stock Journal", "Manufacturing Journal", "Purchase Order", "Sales Order", "Job Work In Order", "Job Work Out Order", "Receipt Note"].includes(effectiveVoucherType) && <div>Tax Unit</div>}
        </div>
        <div className="text-zinc-500">
          <div>:</div>
          {["Sales", "Purchase", "Stock Journal", "Manufacturing Journal", "Purchase Order", "Receipt Note"].includes(effectiveVoucherType) && <div>:</div>}
        </div>
        <div className="font-semibold text-black">
          <div>
            {form.gstRegistration
              ? (form.gstRegistration.state_id
                  ? `${form.gstRegistration.state_id} Registration`
                  : (form.gstRegistration.legal_name ?? form.gstRegistration.trade_name ?? form.gstRegistration.name ?? form.gstRegistration.gstin))
            : "♦ Not Applicable"}
          </div>
          {["Sales", "Purchase", "Stock Journal", "Manufacturing Journal", "Purchase Order", "Sales Order", "Job Work In Order", "Job Work Out Order", "Receipt Note"].includes(effectiveVoucherType) && (
            <div>{form.taxUnit ? form.taxUnit.name : "♦ Not Applicable"}</div>
          )}
        </div>
      </div>
    )}

      {/* ── Voucher type / number / date bar ── */}
      <div className="flex items-center px-3 py-1 border-b border-black bg-white shrink-0">
        <div className="text-xs font-bold text-white bg-black px-3 py-0.5 min-w-[80px] text-center uppercase">
          {form.voucherType}
        </div>
        <span className="text-sm text-black ml-3">No.</span>
        <span className="text-sm font-bold text-black ml-2 mr-6">{form.voucherNumber}</span>
        {availableVoucherClasses.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-black">Class</span>
            <select
              className="text-sm border border-black px-1 py-0 outline-none bg-white"
              value={form.voucherClass}
              onChange={(e) => form.setVoucherClass(e.target.value)}
            >
              <option value="">Not Applicable</option>
              {availableVoucherClasses.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex-1" />
        {form.status === "Post-Dated" && (
          <span className="text-xs text-black border border-black px-2 py-0 mr-4">
            Post-Dated
          </span>
        )}
        <button
          onClick={() => setShowDatePicker(true)}
          className="text-right leading-tight text-black hover:underline focus:outline-none"
          title="F2: Change Date"
        >
          <div className="text-sm font-semibold">{form.dateDisplay}</div>
          <div className="text-[10px] font-normal text-zinc-500">
            {(() => {
              const d = new Date(form.date);
              return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { weekday: "long" });
            })()}
          </div>
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
              physicalStockQtyEnter={handlePhysicalStockQtyEnter}
            />
          )}
          {effectiveVoucherType === "Stock Journal" && (
            <StockJournalVoucher form={form} />
          )}
          {effectiveVoucherType === "Delivery Note" && (
            // Tally Delivery Note uses the sales-invoice layout (Party + Sales
            // ledger + Actual/Billed/Rate/Disc%/Amount). Reuse SalesVoucher, hiding
            // the Sales-only VAT toggle and additional-ledger rows (a Delivery Note
            // is inventory-only — those lines aren't persisted for it).
            <SalesVoucher
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
              hideVatDetails
              hideAdditionalLedgers
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
            <PurchaseOrderVoucher
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Sales Order" && (
            <SalesOrderVoucher
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Job Work In Order" && (
            <JobWorkInOrderVoucher
              form={form}
              handleAmountConfirm={handleAmountConfirm}
              focusStockQty={focusStockQty}
              focusStockRate={focusStockRate}
              proceedToNextStockRow={proceedToNextStockRow}
            />
          )}
          {effectiveVoucherType === "Job Work Out Order" && (
            <JobWorkOutOrderVoucher
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

          {/* ── Reversing Journal: Applicable Upto date ── */}
          {effectiveVoucherType === "Reversing Journal" && (
            <div className="flex items-center border-t border-black shrink-0 px-3 py-1 bg-white">
              <span className="text-sm text-black shrink-0">Applicable Upto</span>
              <span className="text-sm text-black shrink-0 mx-2">:</span>
              <button
                onClick={() => setShowApplicableUptoPicker(true)}
                className="text-sm font-semibold text-black hover:underline focus:outline-none"
                title="Change Applicable Upto date"
              >
                {formatDateDisplay(form.applicableUpto || form.date)}
              </button>
            </div>
          )}

          {/* ── Narration + grand total ── */}
          <div className="flex items-center border-t border-black shrink-0 px-3 py-1 bg-white">
            <span className="text-sm text-black shrink-0 w-24">Narration</span>
            <span className="text-sm text-black shrink-0 mr-2">:</span>
           <input
              type="text"
              data-narration="true"
             className="flex-1 text-sm bg-transparent outline-none border-b border-transparent focus:border-black px-1 py-0"
             value={form.narration}
            onChange={(e) => form.setNarration(e.target.value)}
            onFocus={() => form.handleFieldBlur()}
            onKeyDown={(e) => {
              // Enter at Narration accepts the voucher, completing the keyboard flow.
              // Journal / Reversing Journal / Memorandum reach here via "End of List"
              // on the final blank ledger row (Stock/Mfg Journal via their item grid).
              if (
                e.key === "Enter" &&
                ["Stock Journal", "Manufacturing Journal", "Journal", "Reversing Journal", "Memorandum"].includes(effectiveVoucherType) &&
                canAccept && !form.isSubmitting
              ) {
                e.preventDefault();
                handleAccept();
              }
            }}
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
            onSelect={handleLedgerSelectWithAllocation}
            onClose={form.handleFieldBlur}
            onCreateNew={() => {
              const t = form.activeField?.type;
              if (t === "stockItem") navigate("/master/create/stock-item");
              else if (t === "employee" || t === "payrollEmployee") navigate("/master/create/employee");
              else if (t === "attendanceType") navigate("/master/create/attendance-type");
              else if (t === "payrollCategory") navigate("/master/create/employee-category");
              else navigate("/master/create/ledger");
            }}
            createLabel={
              form.activeField?.type === "stockItem" ? "Create Stock Item"
                : (form.activeField?.type === "employee" || form.activeField?.type === "payrollEmployee") ? "Create Employee"
                : form.activeField?.type === "attendanceType" ? "Create Attendance Type"
                : form.activeField?.type === "payrollPayHead" ? "Create Pay Head"
                : form.activeField?.type === "payrollCategory" ? "Create Category"
                : "Create"
            }
            onEndOfList={
              form.activeField?.type === "stockItem"
                ? (effectiveVoucherType === "Physical Stock" ? physicalStockEndEntry : () => form.handleFieldBlur())
                : (form.activeField?.type === "stockGodown" && effectiveVoucherType === "Physical Stock")
                ? () => physicalStockGodownNewItem((form.activeField as any).rowId)
                : (form.activeField?.type === "particular" &&
                   ["Journal", "Reversing Journal", "Memorandum"].includes(effectiveVoucherType))
                ? journalParticularEndOfList
                : undefined
            }
            onEnterEmpty={
              // Payroll: blank Enter on a Pay Head → finish this employee, add & focus a new
              // employee under the same category (drops the trailing empty pay-head row first).
              form.activeField?.type === "payrollPayHead"
                ? () => {
                    const { groupId, empRowId, phRowId } = form.activeField as any;
                    form.handleFieldBlur();
                    form.handleRemovePayrollPayHeadRow?.(groupId, empRowId, phRowId);
                    form.handleAddPayrollEmployeeRow?.(groupId);
                    setTimeout(() => {
                      const nodes = document.querySelectorAll(`[data-payroll-emp^="${groupId}-"]`);
                      (nodes[nodes.length - 1] as HTMLInputElement | null)?.focus();
                    }, 60);
                  }
                : // Payroll: blank Enter on an Employee → finish this category, add & focus a new group's category.
                  form.activeField?.type === "payrollEmployee"
                ? () => {
                    form.handleFieldBlur();
                    form.handleAddPayrollGroup?.();
                    setTimeout(() => {
                      const nodes = document.querySelectorAll(`[data-payroll-cat]`);
                      (nodes[nodes.length - 1] as HTMLInputElement | null)?.focus();
                    }, 60);
                  }
                : form.activeField?.type === "stockGodown" && effectiveVoucherType === "Physical Stock"
                ? () => physicalStockGodownNewItem((form.activeField as any).rowId)
                : (form.activeField?.type === "stockItem" && effectiveVoucherType === "Physical Stock")
                ? physicalStockEndEntry
                : (form.activeField?.type === "stockItem" &&
                   (effectiveVoucherType === "Stock Journal" || effectiveVoucherType === "Manufacturing Journal"))
                ? handleStockJournalItemEndOfList
                : (form.activeField?.type === "particular" &&
                   ["Journal", "Reversing Journal", "Memorandum"].includes(effectiveVoucherType))
                ? journalParticularEndOfList
                : undefined
            }
            stockBalances={form.activeField?.type === "stockItem" ? form.stockBalances : undefined}
            godownBalances={
              form.activeField?.type === "stockGodown" && effectiveVoucherType === "Physical Stock"
                ? form.godownBalances
                : undefined
            }
            balanceUnit={
              form.activeField?.type === "stockGodown"
                ? (form.stockEntries.find((r) => r.id === (form.activeField as any).rowId)?.unit?.symbol ?? "")
                : undefined
            }
            allUnits={form.activeField?.type === "stockItem" ? form.allUnits : undefined}
            columns={
              (form.activeField?.type === "employee" || form.activeField?.type === "payrollEmployee")
                ? [
                    { header: "Name", render: (e: any) => e.name, className: "flex-1 min-w-0" },
                    { header: "Emp No.", render: (e: any) => e.employee_code ?? "", className: "w-16 text-right font-mono" },
                    { header: "Group", render: (e: any) => e.group_name ?? e.designation ?? "", className: "w-24" },
                  ]
                : form.activeField?.type === "attendanceType"
                ? [
                    { header: "Name", render: (t: any) => t.name, className: "flex-1 min-w-0" },
                    { header: "Parent", render: () => "♦ Primary", className: "w-24 text-gray-600" },
                    { header: "Unit", render: (t: any) => t.unit_name ?? "Days", className: "w-16 text-right text-gray-600" },
                  ]
                : undefined
            }
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
         onCompanyTaxRegistrationClick={() => setShowTaxRegistrationPopup(true)}
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
      {showApplicableUptoPicker && (
        <DatePickerPopup
          initialDate={form.applicableUpto || form.date}
          onClose={() => setShowApplicableUptoPicker(false)}
          onConfirm={form.setApplicableUpto}
          label="Applicable Upto"
        />
      )}
      {showTaxRegistrationPopup && (
  <CompanyTaxRegistrationPopup
    gstRegistrations={form.allGstRegistrations}
    taxUnits={form.allTaxUnits}
    onClose={() => setShowTaxRegistrationPopup(false)}
    onSelect={(selection) => {
      if (!selection) {
        form.setGstRegistration(null);
        form.setTaxUnit(null);
      } else if (selection.kind === "gst") {
        form.setGstRegistration(selection.raw);
        form.setTaxUnit(null);
      } else {
        form.setTaxUnit(selection.raw);
        form.setGstRegistration(null);
      }
      setShowTaxRegistrationPopup(false);
    }}
  />
)}

      {showDispatchDetails && form.partyLedger && (
        <DispatchDetailsPopup
          initialDetails={form.dispatchDetails}
          onClose={() => setShowDispatchDetails(false)}
          onSave={handleSaveDispatchDetails}
          variant={(effectiveVoucherType === "Job Work In Order" || effectiveVoucherType === "Job Work Out Order") ? "jobWork" : undefined}
        />
      )}

      {showOrderDetails && form.partyLedger && (
        (effectiveVoucherType === "Purchase Order" || effectiveVoucherType === "Sales Order") ? (
          <PurchaseOrderDetailsPopup
            initialDetails={form.orderDetails}
            onClose={() => setShowOrderDetails(false)}
            onSave={handleSaveOrderDetails}
          />
        ) : (
          <OrderDetailsPopup
            initialDetails={form.orderDetails}
            receiptVariant={effectiveVoucherType === "Receipt Note"}
            onClose={() => setShowOrderDetails(false)}
            onSave={handleSaveOrderDetails}
          />
        )
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
    buyerLabel={
      ["Sales", "Credit Note", "Delivery Note", "Rejection In","Debit Note"].includes(effectiveVoucherType)
        ? "Buyer (Bill to)"
        : "Supplier (Bill from)"
    }
    natureOfReturnLabel={
      effectiveVoucherType === "Credit Note" ? "Nature of Sales Return"
      : undefined
    }
  />
)}
{showExciseDetails && form.partyLedger && (
  <ExciseDetailsPopup
    initialDetails={form.exciseDetails}
    onClose={() => setShowExciseDetails(false)}
    onSave={handleSaveExciseDetails}
  />
)}
{showDebitNoteExcise && form.partyLedger && (
  <DebitNoteExciseDetailsPopup
    initialDetails={form.debitNoteDetails}
    onClose={() => setShowDebitNoteExcise(false)}
    onSave={handleSaveDebitNoteExcise}
  />
)}
{showVatDetails && form.partyLedger && (
  <VatDetailsPopup
    initialDetails={form.vatDetails}
    onClose={() => setShowVatDetails(false)}
    onSave={handleSaveVatDetails}
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

      {inventoryAlloc && (
        <InventoryAllocationPopup
          companyId={selectedCompany!.company_id}
          ledgerName={inventoryAlloc.ledgerName}
          dcType={inventoryAlloc.dcType}
          isInward={inventoryAlloc.isInward}
          allowCostCentres={inventoryAlloc.allowCostCentres}
          voucherDate={form.date}
          allStockItems={form.allStockItems}
          allGodowns={form.allGodowns}
          allUnits={form.allUnits}
          initialItems={form.journalRows.find((r) => r.id === inventoryAlloc.rowId)?.inventoryAllocations ?? []}
          onClose={() => setInventoryAlloc(null)}
          onSave={handleSaveInventoryAllocation}
        />
      )}

      {form.activeAllocation?.type === "batch" && (
        // Purchase / Sales Order: simple "Due on" allocation (Due on period/date +
        // Godown + Batch-Lot + Actual/Billed + Rate + Disc). No Tracking/Order No.
        ORDER_CREATION_TYPES.includes(effectiveVoucherType) ? (
          <OrderDueOnAllocationPopup
            companyId={selectedCompany!.company_id}
            itemId={form.activeAllocation.itemId}
            itemName={form.activeAllocation.itemName}
            rate={form.activeAllocation.rate}
            unitSymbol={form.activeAllocation.unitSymbol}
            voucherDate={form.date}
            trackMfg={form.activeAllocation.trackMfg}
            trackExpiry={form.activeAllocation.trackExpiry}
            isInward={form.activeAllocation.isInward}
            godowns={form.allGodowns}
            initialAllocations={form.activeAllocation.initialAllocations}
            showBatch={form.activeAllocation.showBatch}
            onClose={() => form.setActiveAllocation(null)}
            onSave={handleSaveBatchAllocations}
          />
        ) :
        // Order-tracking allocation (Tracking No. / Order No. / Due on + New Number
        // popups, List of Godowns, batch lots). Used for the quantity-driven
        // item-select flow on every party stock voucher (Sales, Purchase,
        // Credit/Debit Note, Receipt/Delivery Note). The plain batch popup
        // stays for the fixed-total split flow (Rejection In/Out) and the internal
        // transfers (Stock / Manufacturing Journal), which have no order to track.
        (form.activeAllocation.quantityDriven && !["Stock Journal", "Manufacturing Journal"].includes(effectiveVoucherType)) ? (
          <OrderItemAllocationPopup
            companyId={selectedCompany!.company_id}
            itemId={form.activeAllocation.itemId}
            itemName={form.activeAllocation.itemName}
            rate={form.activeAllocation.rate}
            unitSymbol={form.activeAllocation.unitSymbol}
            voucherDate={form.date}
            trackMfg={form.activeAllocation.trackMfg}
            trackExpiry={form.activeAllocation.trackExpiry}
            isInward={form.activeAllocation.isInward}
            godowns={form.allGodowns}
            initialAllocations={form.activeAllocation.initialAllocations}
            showBatch={form.activeAllocation.showBatch}
            onClose={() => form.setActiveAllocation(null)}
            onSave={handleSaveBatchAllocations}
          />
        ) : (
          <BatchAllocationPopup
            companyId={selectedCompany!.company_id}
            itemId={form.activeAllocation.itemId}
            itemName={form.activeAllocation.itemName}
            totalQuantity={form.activeAllocation.quantity}
            rate={form.activeAllocation.rate}
            unitSymbol={form.activeAllocation.unitSymbol}
            voucherDate={form.date}
            trackMfg={form.activeAllocation.trackMfg}
            trackExpiry={form.activeAllocation.trackExpiry}
            isInward={form.activeAllocation.isInward}
            godowns={form.allGodowns}
            initialAllocations={form.activeAllocation.initialAllocations}
            quantityDriven={form.activeAllocation.quantityDriven}
            showBatch={form.activeAllocation.showBatch}
            onClose={() => form.setActiveAllocation(null)}
            onSave={handleSaveBatchAllocations}
          />
        )
      )}

      {form.activeAllocation?.type === "materialIn" && (
        <MaterialInAllocationPopup
          itemName={form.activeAllocation.itemName}
          rate={form.activeAllocation.rate}
          unitSymbol={form.activeAllocation.unitSymbol}
          godowns={form.allGodowns}
          stockItems={form.allStockItems}
          showBatch={form.activeAllocation.showBatch}
          trackMfg={form.activeAllocation.trackMfg}
          trackExpiry={form.activeAllocation.trackExpiry}
          initialAllocations={form.activeAllocation.initialAllocations}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveMaterialInAllocations}
        />
      )}

      {form.activeAllocation?.type === "jobWork" && (
        <JobWorkItemAllocationPopup
          itemName={form.activeAllocation.itemName}
          orderNo={form.activeAllocation.orderNo}
          unitSymbol={form.activeAllocation.unitSymbol}
          voucherDate={form.date}
          allGodowns={form.allGodowns}
          allStockItems={form.allStockItems}
          allUnits={form.allUnits}
          initialAllocations={form.activeAllocation.initialAllocations}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveJobWorkAllocations}
        />
      )}

      {itemExcise && (
        <ItemExciseDetailsPopup
          itemName={itemExcise.itemName}
          initialDetails={itemExcise.initial}
          onClose={() => setItemExcise(null)}
          onSave={handleSaveItemExcise}
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
