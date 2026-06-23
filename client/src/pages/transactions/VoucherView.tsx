/**
 * VoucherView.tsx — Accounting Voucher Alteration (Secondary)
 *
 * Opens the SAME Vouchers.tsx UI pre-filled with existing voucher data.
 * On Accept it calls window.api.voucher.update(...) instead of create.
 *
 * Route: /transactions/voucher/:id  (already in router)
 */

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";

import { useVoucherForm } from "./hooks/useVoucherForm";
import { AlertBanner } from "../../components/ui";
import { Button } from "@/components/shadcn/button";
import { cn } from "@/lib/utils";
import CompanyTaxRegistrationPopup from "./components/popups/CompanyTaxRegistrationPopup";
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
import ExciseDetailsPopup from "./components/popups/ExciseDetailsPopup";
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

// ── uid helper ────────────────────────────────────────────────────────────────
let _uid = 0;
const uid = () => `prefill_${++_uid}`;

// ── Right Sidebar (identical to Vouchers.tsx) ─────────────────────────────────
function RightSidebar({
  voucherType, onTypeChange, voucherTypeChildren, subDropdownType,
  onSubDropdownToggle, status, onStatusChange, entryMode, onEntryModeChange,
  onDateClick, onCompanyTaxRegistrationClick, onCreateLedger, onAccept, onQuit,
  canAccept, onOtherVouchersClick,
}: {
  voucherType: string; onTypeChange: (t: string) => void;
  voucherTypeChildren: Record<string, string[]>; subDropdownType: string | null;
  onSubDropdownToggle: (type: string) => void; status: string;
  onStatusChange: () => void; entryMode: "single" | "double";
  onEntryModeChange: () => void; onDateClick: () => void;
  onCompanyTaxRegistrationClick: () => void; onCreateLedger: () => void;
  onAccept: () => void; onQuit: () => void; canAccept: boolean;
  onOtherVouchersClick: () => void;
}) {
  const types = [
    { key: "F4", label: "Contra" }, { key: "F5", label: "Payment" },
    { key: "F6", label: "Receipt" }, { key: "F7", label: "Journal" },
    { key: "F8", label: "Sales" }, { key: "F9", label: "Purchase" },
  ];
  const otherVoucherTypes = [
    "Attendance","Credit Note","Debit Note","Delivery Note","Job Work In Order",
    "Job Work Out Order","Material In","Material Out","Manufacturing Journal",
    "Memorandum","Payroll","Physical Stock","Purchase Order","Receipt Note",
    "Rejection In","Rejection Out","Reversing Journal","Sales Order","Stock Journal",
  ];
  const isOtherActive = otherVoucherTypes.includes(voucherType);
  const sidebarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!subDropdownType) return;
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node))
        onSubDropdownToggle(subDropdownType);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [subDropdownType, onSubDropdownToggle]);

  return (
    <div ref={sidebarRef} className="w-36 border-l border-black flex flex-col shrink-0 bg-white">
      <div className="border-b border-black px-2 py-1">
        <Button variant="ghost" onClick={onDateClick} className="w-full h-auto justify-start rounded-none p-0 text-xs font-normal text-black hover:bg-transparent hover:underline">
          <span className="text-gray-500">F2</span>: Date
        </Button>
      </div>
      <div className="border-b border-black px-2 py-1">
        <Button variant="ghost" onClick={onCompanyTaxRegistrationClick} className="w-full h-auto justify-start rounded-none p-0 text-xs font-normal text-black hover:bg-transparent hover:underline">
          <span className="text-gray-500">F3</span>: Company/Tax Registration
        </Button>
      </div>
      {types.map(({ key, label }) => {
        const children = voucherTypeChildren[label];
        const hasChildren = children && children.length > 0;
        return (
          <div key={key} className="border-b border-gray-200 relative">
            <Button variant="ghost"
              onClick={() => { if (hasChildren) onSubDropdownToggle(label); else { if (subDropdownType) onSubDropdownToggle(subDropdownType); onTypeChange(label); } }}
              className={cn("w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal",
                voucherType === label || children?.includes(voucherType) ? "bg-black text-white font-semibold hover:bg-black hover:text-white" : "text-black hover:bg-gray-100")}>
              <span className={voucherType === label || children?.includes(voucherType) ? "text-gray-300" : "text-gray-500"}>{key}</span>
              : {label}
              {hasChildren && <span className="ml-1 text-[9px] opacity-60">{subDropdownType === label ? "▲" : "▼"}</span>}
            </Button>
            {hasChildren && subDropdownType === label && (
              <div className="absolute left-0 right-0 top-full z-30 bg-white border border-zinc-300 shadow-lg rounded-b">
                <Button variant="ghost" onClick={() => { onTypeChange(label); onSubDropdownToggle(label); }}
                  className={cn("w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal",
                    voucherType === label ? "bg-black text-white font-semibold hover:bg-black hover:text-white" : "text-black hover:bg-gray-100")}>
                  {label}
                </Button>
                {children.map((child) => (
                  <Button key={child} variant="ghost" onClick={() => { onTypeChange(child); onSubDropdownToggle(label); }}
                    className={cn("w-full h-auto justify-start rounded-none pl-4 pr-2 py-1 text-xs font-normal",
                      voucherType === child ? "bg-black text-white font-semibold hover:bg-black hover:text-white" : "text-black hover:bg-gray-100")}>
                    {child}
                  </Button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="border-b border-gray-200">
        <Button variant="ghost" onClick={onOtherVouchersClick}
          className={cn("w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal",
            isOtherActive ? "bg-black text-white font-semibold hover:bg-black hover:text-white" : "text-black hover:bg-gray-100")}>
          <span className={isOtherActive ? "text-gray-300" : "text-gray-500"}>F10</span>: Other Vouchers
        </Button>
      </div>
      <div className="border-b border-gray-200">
        <Button variant="ghost" onClick={onCreateLedger} className="w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal text-black hover:bg-gray-100">
          <span className="text-gray-500">Alt+C</span>: Create Ldgr
        </Button>
      </div>
      <div className="border-b border-gray-200">
        <Button variant="ghost" onClick={onStatusChange} className="w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal text-black hover:bg-gray-100">
          <span className="text-gray-500">T</span>: {status === "Post-Dated" ? "✓ " : ""}Post-Dated
        </Button>
      </div>
      {["Contra","Receipt","Journal","Payment"].includes(voucherType) && (
        <div className="border-b border-gray-200">
          <Button variant="ghost" onClick={onEntryModeChange} className="w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal text-black hover:bg-gray-100">
            <span className="text-gray-500">H</span>: {entryMode === "double" ? "✓ " : ""}Double Entry
          </Button>
        </div>
      )}
      <div className="flex-1" />
      <div className="border-t border-black px-2 py-1">
        <Button variant="ghost" onClick={onAccept} disabled={!canAccept}
          className="w-full h-auto justify-start rounded-none p-0 text-xs font-normal text-black hover:bg-transparent hover:underline disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-100">
          <span className="text-gray-500">A</span>: Accept
        </Button>
      </div>
      <div className="border-t border-gray-300 px-2 py-1">
        <Button variant="ghost" onClick={onQuit} className="w-full h-auto justify-start rounded-none p-0 text-xs font-normal text-black hover:bg-transparent hover:underline">
          <span className="text-gray-500">Q</span>: Quit
        </Button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VoucherView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const [rawVoucher, setRawVoucher] = useState<any | null>(null);
  const [loadingVoucher, setLoadingVoucher] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Track if we've already injected data into the form
  const prefillDone = useRef(false);

  const [voucherTypeChildren, setVoucherTypeChildren] = useState<Record<string, string[]>>({});
  const [voucherTypeParentMap, setVoucherTypeParentMap] = useState<Record<string, string>>({});
  const [showTaxRegistrationPopup, setShowTaxRegistrationPopup] = useState(false);

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
  const [showExciseDetails, setShowExciseDetails] = useState(false);
  const [showOtherVouchers, setShowOtherVouchers] = useState(false);
  const [subDropdownType, setSubDropdownType] = useState<string | null>(null);

  const acceptRef = useRef<() => void>(() => {});

  // ── STEP 1: Load voucher from DB ────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoadingVoucher(true);
      setLoadError(null);
      prefillDone.current = false;
      try {
        const res = await window.api.voucher.getById(Number(id));
        if (res.success) setRawVoucher(res.voucher);
        else setLoadError(res.error || "Voucher not found");
      } catch (e: any) {
        setLoadError(e.message);
      } finally {
        setLoadingVoucher(false);
      }
    })();
  }, [id]);

  // ── STEP 2: Once voucher + masters loaded → SET voucher type → triggers form init ──
  useEffect(() => {
    if (!rawVoucher || prefillDone.current) return;
    // Set the voucher type — this causes useVoucherForm to set up the right row structure
    form.setVoucherType(rawVoucher.voucher_type);
  }, [rawVoucher]);

  // ── STEP 3: After voucher type is set + ledgers loaded → inject all data ────
  // We wait for allLedgers to be populated AND the form's voucherType to match
  useEffect(() => {
    if (!rawVoucher) return;
    if (prefillDone.current) return;
    if (form.ledgersLoading) return;
    if (form.allLedgers.length === 0) return;
    if (form.voucherType !== rawVoucher.voucher_type) return;

    // Mark done immediately so this only runs once
    prefillDone.current = true;

    const v = rawVoucher;
    const entries: any[] = v.entries || [];
    const allL = form.allLedgers;

    // Helper: find ledger object from masters by id
    const findLedger = (id: number) => allL.find((l: any) => l.ledger_id === id) ?? null;

    // ── Set date, narration, meta ────────────────────────────────────────────
    form.setDate(v.date || "");
    if (v.narration) form.setNarration(v.narration);
    if (v.reference_number) form.setReferenceNumber(v.reference_number);
    if (v.reference_date) form.setReferenceDate(v.reference_date);
    if (v.place_of_supply) form.setPlaceOfSupply(v.place_of_supply);
    if (v.status) form.setStatus(v.status);

    // ── Pre-fill by voucher type ─────────────────────────────────────────────
    const vt = v.voucher_type;

    // ── CONTRA ───────────────────────────────────────────────────────────────
    if (vt === "Contra") {
      if (entries.length >= 2) {
        // Use double entry mode
        form.setContraEntryMode("double");
        const rows = entries.map((e: any) => ({
          id: uid(),
          ledger: findLedger(e.ledger_id) ?? { ledger_id: e.ledger_id, name: e.ledger_name },
          ledgerBalance: "",
          type: e.type as "Dr" | "Cr",
          amountRaw: e.amount ? String(e.amount) : "",
          billReferences: [],
          costCentres: [],
        }));
        // Add one empty row at end
        rows.push({ id: uid(), ledger: null, ledgerBalance: "", type: "Dr" as const, amountRaw: "", billReferences: [], costCentres: [] });
        form.setContraDoubleRows(rows);
      }
    }

    // ── PAYMENT ──────────────────────────────────────────────────────────────
    else if (vt === "Payment") {
      if (entries.length >= 2) {
        form.setPaymentEntryMode("double");
        const rows = entries.map((e: any) => ({
          id: uid(),
          ledger: findLedger(e.ledger_id) ?? { ledger_id: e.ledger_id, name: e.ledger_name },
          ledgerBalance: "",
          type: e.type as "Dr" | "Cr",
          amountRaw: e.amount ? String(e.amount) : "",
          billReferences: [],
          costCentres: [],
        }));
        rows.push({ id: uid(), ledger: null, ledgerBalance: "", type: "Dr" as const, amountRaw: "", billReferences: [], costCentres: [] });
        form.setPaymentDoubleRows(rows);
      } else if (entries.length === 1) {
        // Single entry mode — the one entry is the account (Cr side)
        form.setPaymentEntryMode("single");
        const e = entries[0];
        const l = findLedger(e.ledger_id);
        if (l) form.setAccountLedger(l);
      }
    }

    // ── RECEIPT ──────────────────────────────────────────────────────────────
    else if (vt === "Receipt") {
      if (entries.length >= 2) {
        form.setReceiptEntryMode("double");
        const rows = entries.map((e: any) => ({
          id: uid(),
          ledger: findLedger(e.ledger_id) ?? { ledger_id: e.ledger_id, name: e.ledger_name },
          ledgerBalance: "",
          type: e.type as "Dr" | "Cr",
          amountRaw: e.amount ? String(e.amount) : "",
          billReferences: [],
          costCentres: [],
        }));
        rows.push({ id: uid(), ledger: null, ledgerBalance: "", type: "Dr" as const, amountRaw: "", billReferences: [], costCentres: [] });
        form.setReceiptDoubleRows(rows);
      } else if (entries.length === 1) {
        form.setReceiptEntryMode("single");
        const e = entries[0];
        const l = findLedger(e.ledger_id);
        if (l) form.setAccountLedger(l);
      }
    }

    // ── JOURNAL / REVERSING JOURNAL / MEMORANDUM ─────────────────────────────
    else if (vt === "Journal" || vt === "Reversing Journal" || vt === "Memorandum") {
      if (entries.length >= 2) {
        form.setJournalEntryMode("double");
        const rows = entries.map((e: any) => ({
          id: uid(),
          ledger: findLedger(e.ledger_id) ?? { ledger_id: e.ledger_id, name: e.ledger_name },
          ledgerBalance: "",
          type: e.type as "Dr" | "Cr",
          amountRaw: e.amount ? String(e.amount) : "",
          billReferences: [],
          costCentres: [],
        }));
        rows.push({ id: uid(), ledger: null, ledgerBalance: "", type: "Dr" as const, amountRaw: "", billReferences: [], costCentres: [] });
        form.setJournalRows(rows);
      }
    }

    // ── SALES / PURCHASE / CREDIT NOTE / DEBIT NOTE ───────────────────────────
    else if (["Sales", "Purchase", "Credit Note", "Debit Note"].includes(vt)) {
      // Party ledger
      if (v.party_ledger_id) {
        const pl = findLedger(v.party_ledger_id);
        if (pl) form.setPartyLedger(pl);
      }

      // Determine sales/purchase ledger (the non-party accounting entry)
      const isSalesLike = vt === "Sales" || vt === "Credit Note";
      const mainEntry = entries.find((e: any) =>
        isSalesLike ? e.type === "Cr" : e.type === "Dr"
      );
      if (mainEntry) {
        const sl = findLedger(mainEntry.ledger_id);
        if (sl) form.setSalesPurchaseLedger(sl);
      }

      // Additional entries (tax, freight etc.) — everything except party and main
      const partyId = v.party_ledger_id;
      const mainId = mainEntry?.ledger_id;
      const additionalE = entries.filter((e: any) => e.ledger_id !== partyId && e.ledger_id !== mainId);
      if (additionalE.length > 0) {
        const addRows = additionalE.map((e: any) => ({
          id: uid(),
          ledger: findLedger(e.ledger_id) ?? { ledger_id: e.ledger_id, name: e.ledger_name },
          ledgerBalance: "",
          type: e.type as "Dr" | "Cr",
          amountRaw: e.amount ? String(e.amount) : "",
          billReferences: [],
          costCentres: [],
        }));
        addRows.push({ id: uid(), ledger: null, ledgerBalance: "", type: "Cr" as const, amountRaw: "", billReferences: [], costCentres: [] });
        form.setAdditionalEntries(addRows);
      }

      // Stock entries
      if ((v.stock_entries || []).length > 0) {
        const stockRows = v.stock_entries.map((s: any) => {
          const stockItem = form.allStockItems.find((i: any) => i.item_id === s.stock_item_id)
            ?? { item_id: s.stock_item_id, name: s.item_name };
          const unit = form.allUnits.find((u: any) => u.unit_id === s.unit_id) ?? null;
          const godown = s.godown_id ? form.allGodowns.find((g: any) => g.godown_id === s.godown_id) ?? null : null;
          return {
            id: uid(),
            stockItem,
            unit,
            godown,
            quantityRaw: s.quantity ? String(s.quantity) : "",
            rateRaw: s.rate ? String(s.rate) : "",
            amountRaw: s.amount ? String(s.amount) : "",
            batchNo: "",
            lotNo: "",
            mfgDate: "",
            expiryDate: "",
          };
        });
        stockRows.push({ id: uid(), stockItem: null, unit: null, godown: null, quantityRaw: "", rateRaw: "", amountRaw: "", batchNo: "", lotNo: "", mfgDate: "", expiryDate: "" });
        form.setStockEntries(stockRows);
      }

      // Bill references
      if ((v.bill_references || []).length > 0) {
        form.setPartyBillReferences(v.bill_references);
      }

      // Extra details
      if (v.dispatch_details) form.setDispatchDetails(v.dispatch_details);
      if (v.receipt_details) form.setReceiptDetails(v.receipt_details);
      if (v.party_details) form.setPartyDetails(v.party_details);
      if (v.credit_note_details) form.setCreditNoteDetails(v.credit_note_details);
      if (v.debit_note_details) form.setDebitNoteDetails(v.debit_note_details);
    }

    // ── DELIVERY NOTE / RECEIPT NOTE / REJECTION IN / REJECTION OUT / MATERIAL IN / MATERIAL OUT ──
    else if (["Delivery Note","Receipt Note","Rejection In","Rejection Out","Material In","Material Out"].includes(vt)) {
      if (v.party_ledger_id) {
        const pl = findLedger(v.party_ledger_id);
        if (pl) form.setPartyLedger(pl);
      }
      if ((v.stock_entries || []).length > 0) {
        const stockRows = v.stock_entries.map((s: any) => {
          const stockItem = form.allStockItems.find((i: any) => i.item_id === s.stock_item_id) ?? { item_id: s.stock_item_id, name: s.item_name };
          const unit = form.allUnits.find((u: any) => u.unit_id === s.unit_id) ?? null;
          return { id: uid(), stockItem, unit, godown: null, quantityRaw: s.quantity ? String(s.quantity) : "", rateRaw: s.rate ? String(s.rate) : "", amountRaw: s.amount ? String(s.amount) : "", batchNo: "", lotNo: "", mfgDate: "", expiryDate: "" };
        });
        stockRows.push({ id: uid(), stockItem: null, unit: null, godown: null, quantityRaw: "", rateRaw: "", amountRaw: "", batchNo: "", lotNo: "", mfgDate: "", expiryDate: "" });
        form.setStockEntries(stockRows);
      }
      if (v.dispatch_details) form.setDispatchDetails(v.dispatch_details);
      if (v.receipt_details) form.setReceiptDetails(v.receipt_details);
      if (v.party_details) form.setPartyDetails(v.party_details);
    }

    // ── PHYSICAL STOCK ────────────────────────────────────────────────────────
    else if (vt === "Physical Stock") {
      if ((v.stock_entries || []).length > 0) {
        const stockRows = v.stock_entries.map((s: any) => {
          const stockItem = form.allStockItems.find((i: any) => i.item_id === s.stock_item_id) ?? { item_id: s.stock_item_id, name: s.item_name };
          const unit = form.allUnits.find((u: any) => u.unit_id === s.unit_id) ?? null;
          return { id: uid(), stockItem, unit, godown: null, quantityRaw: s.quantity ? String(s.quantity) : "", rateRaw: s.rate ? String(s.rate) : "", amountRaw: s.amount ? String(s.amount) : "", batchNo: "", lotNo: "", mfgDate: "", expiryDate: "" };
        });
        stockRows.push({ id: uid(), stockItem: null, unit: null, godown: null, quantityRaw: "", rateRaw: "", amountRaw: "", batchNo: "", lotNo: "", mfgDate: "", expiryDate: "" });
        form.setStockEntries(stockRows);
      }
    }

    // ── STOCK JOURNAL / MANUFACTURING JOURNAL ─────────────────────────────────
    else if (vt === "Stock Journal" || vt === "Manufacturing Journal") {
      const sourceEntries = (v.stock_entries || []).filter((s: any) => s.is_source === 1);
      const destEntries   = (v.stock_entries || []).filter((s: any) => s.is_source === 0);
      const mapStock = (s: any) => {
        const stockItem = form.allStockItems.find((i: any) => i.item_id === s.stock_item_id) ?? { item_id: s.stock_item_id, name: s.item_name };
        const unit = form.allUnits.find((u: any) => u.unit_id === s.unit_id) ?? null;
        return { id: uid(), stockItem, unit, godown: null, quantityRaw: s.quantity ? String(s.quantity) : "", rateRaw: s.rate ? String(s.rate) : "", amountRaw: s.amount ? String(s.amount) : "", batchNo: "", lotNo: "", mfgDate: "", expiryDate: "" };
      };
      if (sourceEntries.length > 0) {
        const rows = sourceEntries.map(mapStock);
        rows.push({ id: uid(), stockItem: null, unit: null, godown: null, quantityRaw: "", rateRaw: "", amountRaw: "", batchNo: "", lotNo: "", mfgDate: "", expiryDate: "" });
        form.setSourceStockEntries(rows);
      }
      if (destEntries.length > 0) {
        const rows = destEntries.map(mapStock);
        rows.push({ id: uid(), stockItem: null, unit: null, godown: null, quantityRaw: "", rateRaw: "", amountRaw: "", batchNo: "", lotNo: "", mfgDate: "", expiryDate: "" });
        form.setDestinationStockEntries(rows);
      }
    }

    // ── PAYROLL ───────────────────────────────────────────────────────────────
    else if (vt === "Payroll") {
      if (v.party_ledger_id) {
        const pl = findLedger(v.party_ledger_id);
        if (pl) form.setAccountLedger(pl);
      }
      if ((v.payroll_entries || []).length > 0) {
        const rows = v.payroll_entries.map((p: any) => ({
          id: uid(),
          employee: p.employee_id ? { employee_id: p.employee_id, name: p.employee_name } : null,
          payHead: p.pay_head_id ? { pay_head_id: p.pay_head_id, name: p.pay_head_name } : null,
          amountRaw: p.amount ? String(p.amount) : "",
        }));
        rows.push({ id: uid(), employee: null, payHead: null, amountRaw: "" });
        form.setPayrollEntries(rows);
      }
    }

    // ── BANK DETAILS (for any voucher that has them) ──────────────────────────
    if (v.bank_details) form.setBankDetails(v.bank_details);

  }, [rawVoucher, form.ledgersLoading, form.allLedgers.length, form.voucherType]);

  // ── Voucher type children (same as Vouchers.tsx) ───────────────────────────
  useEffect(() => {
    if (!selectedCompany) return;
    window.api.voucherType.getAll(selectedCompany.company_id).then((res: any) => {
      if (res.success && res.voucherTypes) {
        const childrenMap: Record<string, string[]> = {};
        const parentMap: Record<string, string> = {};
        for (const vt of res.voucherTypes) {
          if (vt.is_predefined) continue;
          const parentName = vt.parent_vt_id
            ? res.voucherTypes.find((p: any) => p.vt_id === vt.parent_vt_id)?.name
            : vt.category;
          if (parentName && vt.name && parentName !== vt.name) {
            if (!childrenMap[parentName]) childrenMap[parentName] = [];
            if (!childrenMap[parentName].includes(vt.name)) childrenMap[parentName].push(vt.name);
            parentMap[vt.name] = parentName;
          }
        }
        setVoucherTypeChildren(childrenMap);
        setVoucherTypeParentMap(parentMap);
      }
    }).catch(() => {});
  }, [selectedCompany]);

  // ── canAccept (same as Vouchers.tsx) ──────────────────────────────────────
  const canAccept = useMemo(() => {
    if (form.isSubmitting) return false;
    if (effectiveVoucherType === "Receipt") {
      if (form.receiptEntryMode === "single") return !!form.accountLedger && form.particulars.some((p) => !!p.ledger && p.amountRaw !== "");
      const filled = form.receiptDoubleRows.filter((r) => !!r.ledger && r.amountRaw !== "");
      return filled.length >= 2 && Math.abs(form.debitTotal - form.creditTotal) < 0.01;
    }
    if (effectiveVoucherType === "Payment") {
      if (form.paymentEntryMode === "single") return !!form.accountLedger && form.particulars.some((p) => !!p.ledger && (Number(p.amountRaw) || 0) > 0);
      const filled = form.paymentDoubleRows.filter((r) => !!r.ledger && (Number(r.amountRaw) || 0) > 0);
      return filled.length >= 2 && Math.abs(form.debitTotal - form.creditTotal) < 0.01;
    }
    if (effectiveVoucherType === "Contra") {
      if (form.contraEntryMode === "single") return !!form.accountLedger && form.particulars.some((p) => !!p.ledger && p.amountRaw !== "");
      const filled = form.contraDoubleRows.filter((r) => !!r.ledger && r.amountRaw !== "");
      return filled.length >= 2 && Math.abs(form.debitTotal - form.creditTotal) < 0.01;
    }
    if (effectiveVoucherType === "Journal" || effectiveVoucherType === "Reversing Journal") {
      if (form.journalEntryMode === "single") return !!form.accountLedger && form.particulars.some((p) => !!p.ledger && (Number(p.amountRaw) || 0) > 0);
      const filled = form.journalRows.filter((r) => !!r.ledger && (Number(r.amountRaw) || 0) > 0);
      return filled.length >= 2 && Math.abs(form.debitTotal - form.creditTotal) < 0.01;
    }
    if (["Sales","Purchase","Credit Note","Debit Note","Delivery Note","Receipt Note","Rejection In","Rejection Out","Material In","Material Out"].includes(effectiveVoucherType)) {
      const hasValidEntries = form.stockEntries.some((s) => !!s.stockItem && (Number(s.amountRaw) || 0) > 0);
      const needsLedger = ["Sales","Purchase","Credit Note","Debit Note","Delivery Note","Receipt Note","Rejection In","Rejection Out"].includes(effectiveVoucherType);
      return !!form.partyLedger && (!needsLedger || !!form.salesPurchaseLedger) && hasValidEntries;
    }
    if (effectiveVoucherType === "Payroll") return !!form.accountLedger && form.payrollEntries.some((r) => !!r.employee && !!r.payHead && Number(r.amountRaw) > 0);
    if (effectiveVoucherType === "Attendance") return form.attendanceEntries.some((r) => !!r.employee && !!r.attendanceType && Number(r.valueRaw) > 0);
    if (["Physical Stock","Stock Journal","Manufacturing Journal"].includes(effectiveVoucherType)) return form.stockEntries.some((s) => !!s.stockItem && (Number(s.quantityRaw) || 0) > 0);
    return false;
  }, [form.isSubmitting, form.paymentEntryMode, form.journalEntryMode, effectiveVoucherType, form.contraEntryMode, form.receiptEntryMode, form.contraDoubleRows, form.receiptDoubleRows, form.paymentDoubleRows, form.accountLedger, form.particulars, form.journalRows, form.debitTotal, form.creditTotal, form.partyLedger, form.salesPurchaseLedger, form.stockEntries, form.attendanceEntries, form.payrollEntries]);

  // ── handleAccept → calls UPDATE ────────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    if (!rawVoucher || !canAccept) return;

    let entries: any[] = [];
    let stock_entries: any[] = [];

    if (effectiveVoucherType === "Receipt") {
      if (form.receiptEntryMode === "single") {
        entries.push({ ledger_id: form.accountLedger!.ledger_id, ledger_name: form.accountLedger!.name, type: "Dr", amount: form.particularsTotal });
        entries.push(...form.particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0).map((p) => ({ ledger_id: p.ledger!.ledger_id, ledger_name: p.ledger!.name, type: p.type, amount: Number(p.amountRaw) })));
      } else {
        entries = form.receiptDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) > 0).map((r) => ({ ledger_id: r.ledger!.ledger_id, ledger_name: r.ledger!.name, type: r.type, amount: Number(r.amountRaw) }));
      }
    } else if (effectiveVoucherType === "Payment") {
      if (form.paymentEntryMode === "single") {
        entries.push({ ledger_id: form.accountLedger!.ledger_id, ledger_name: form.accountLedger!.name, type: "Cr", amount: form.particularsTotal });
        entries.push(...form.particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0).map((p) => ({ ledger_id: p.ledger!.ledger_id, ledger_name: p.ledger!.name, type: p.type, amount: Number(p.amountRaw) })));
      } else {
        entries = form.paymentDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) > 0).map((r) => ({ ledger_id: r.ledger!.ledger_id, ledger_name: r.ledger!.name, type: r.type, amount: Number(r.amountRaw) }));
      }
    } else if (effectiveVoucherType === "Contra") {
      if (form.contraEntryMode === "single") {
        entries.push({ ledger_id: form.accountLedger!.ledger_id, ledger_name: form.accountLedger!.name, type: "Cr", amount: form.particularsTotal });
        entries.push(...form.particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0).map((p) => ({ ledger_id: p.ledger!.ledger_id, ledger_name: p.ledger!.name, type: p.type, amount: Number(p.amountRaw) })));
      } else {
        entries = form.contraDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) > 0).map((r) => ({ ledger_id: r.ledger!.ledger_id, ledger_name: r.ledger!.name, type: r.type, amount: Number(r.amountRaw) }));
      }
    } else if (effectiveVoucherType === "Journal" || effectiveVoucherType === "Reversing Journal") {
      if (form.journalEntryMode === "single") {
        entries.push({ ledger_id: form.accountLedger!.ledger_id, ledger_name: form.accountLedger!.name, type: "Cr", amount: form.particularsTotal });
        entries.push(...form.particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0).map((p) => ({ ledger_id: p.ledger!.ledger_id, ledger_name: p.ledger!.name, type: p.type, amount: Number(p.amountRaw) })));
      } else {
        entries = form.journalRows.filter((r) => r.ledger && Number(r.amountRaw) > 0).map((r) => ({ ledger_id: r.ledger!.ledger_id, ledger_name: r.ledger!.name, type: r.type, amount: Number(r.amountRaw) }));
      }
    } else if (["Sales","Purchase","Credit Note","Debit Note","Delivery Note","Receipt Note","Rejection In","Rejection Out","Material In","Material Out"].includes(effectiveVoucherType)) {
      const filledItems = form.stockEntries.filter((r) => r.stockItem && Number(r.quantityRaw) > 0 && Number(r.rateRaw) > 0);
      const stockSubtotal = filledItems.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0);
      stock_entries = filledItems.map((r) => ({ stock_item_id: r.stockItem!.item_id ?? null, item_name: r.stockItem!.name, quantity: Number(r.quantityRaw), rate: Number(r.rateRaw), amount: Number(r.amountRaw) }));
      const isInventoryOnly = ["Delivery Note","Receipt Note","Rejection In","Rejection Out","Material In","Material Out"].includes(effectiveVoucherType);
      if (!isInventoryOnly && form.partyLedger && form.salesPurchaseLedger) {
        const isPurchaseLike = effectiveVoucherType === "Purchase";
        entries = [
          { ledger_id: form.partyLedger.ledger_id, ledger_name: form.partyLedger.name, type: isPurchaseLike ? "Cr" : "Dr", amount: form.totalAmount },
          { ledger_id: form.salesPurchaseLedger.ledger_id, ledger_name: form.salesPurchaseLedger.name, type: isPurchaseLike ? "Dr" : "Cr", amount: stockSubtotal },
          ...form.additionalEntries.filter((p) => p.ledger && Number(p.amountRaw) > 0).map((p) => ({ ledger_id: p.ledger!.ledger_id, ledger_name: p.ledger!.name, type: p.type, amount: Number(p.amountRaw) })),
        ];
      }
    }

    const payload: any = {
      voucher_id: rawVoucher.voucher_id,
      date: form.date,
      narration: form.narration || null,
      reference_number: form.referenceNumber || null,
      reference_date: form.referenceDate || null,
      place_of_supply: form.placeOfSupply !== "Select" ? form.placeOfSupply : null,
      party_ledger_id: form.partyLedger?.ledger_id ?? null,
      party_name: form.partyLedger?.name ?? null,
      entries,
      bill_references: form.partyBillReferences.length > 0 ? form.partyBillReferences : undefined,
      bank_details: form.bankDetails || undefined,
      dispatch_details: form.dispatchDetails || undefined,
      receipt_details: form.receiptDetails || undefined,
      party_details: form.partyDetails || undefined,
      credit_note_details: form.creditNoteDetails || undefined,
      debit_note_details: form.debitNoteDetails || undefined,
      payroll_entries: effectiveVoucherType === "Payroll"
        ? form.payrollEntries.filter((r) => r.employee && r.payHead && Number(r.amountRaw) > 0)
            .map((r) => ({ employee_id: r.employee!.employee_id, pay_head_id: r.payHead!.pay_head_id, amount: Number(r.amountRaw) }))
        : undefined,
    };
    if (stock_entries.length > 0) payload.stock_entries = stock_entries;

    try {
      const res = await window.api.voucher.update(payload);
      if (res.success) {
        form.setSuccess(`Voucher ${rawVoucher.voucher_number} updated successfully.`);
      } else {
        form.setError(res.error || "Failed to update voucher.");
      }
    } catch (e: any) {
      form.setError(e?.message || "Unexpected error.");
    }
  }, [rawVoucher, canAccept, effectiveVoucherType, form]);

  useEffect(() => { acceptRef.current = handleAccept; }, [handleAccept]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!rawVoucher) return;
    if (!window.confirm(`Permanently delete voucher ${rawVoucher.voucher_number}?`)) return;
    try {
      const res = await window.api.voucher.delete(rawVoucher.voucher_id);
      if (res.success) navigate(-1);
      else form.setError(res.error || "Failed to delete");
    } catch (e: any) { form.setError(e.message); }
  };

  // ── Cancel voucher ─────────────────────────────────────────────────────────
  const handleCancelVch = async () => {
    if (!rawVoucher) return;
    if (!window.confirm(`Cancel voucher ${rawVoucher.voucher_number}?`)) return;
    try {
      const res = await window.api.voucher.cancel(rawVoucher.voucher_id);
      if (res.success) navigate(-1);
      else form.setError(res.error || "Failed to cancel");
    } catch (e: any) { form.setError(e.message); }
  };

  // ── proceedToNextRow ───────────────────────────────────────────────────────
  const proceedToNextRow = useCallback((idx: number) => {
    const isJDouble = effectiveVoucherType === "Journal" && form.journalEntryMode === "double";
    const isPayDouble = effectiveVoucherType === "Payment" && form.paymentEntryMode === "double";
    const isContraDouble = effectiveVoucherType === "Contra" && form.contraEntryMode === "double";
    const isReceiptDouble = effectiveVoucherType === "Receipt" && form.receiptEntryMode === "double";
    const isInv = ["Sales","Purchase"].includes(effectiveVoucherType);
    const list = isJDouble ? form.journalRows : isPayDouble ? form.paymentDoubleRows : isInv ? form.additionalEntries : isContraDouble ? form.contraDoubleRows : isReceiptDouble ? form.receiptDoubleRows : form.particulars;
    const addRow = isJDouble ? form.handleAddJournalRow : isPayDouble ? form.handleAddPaymentDoubleRow : isInv ? form.handleAddAdditionalRow : isContraDouble ? form.handleAddContraDoubleRow : isReceiptDouble ? form.handleAddReceiptDoubleRow : form.handleAddParticularRow;
    if (idx === list.length - 1) addRow();
    const sel = isInv ? `[data-additional-ledger="${idx + 2}"]` : `[data-particular-ledger="${idx + 2}"]`;
    setTimeout(() => (document.querySelector(sel) as HTMLInputElement | null)?.focus(), 50);
  }, [effectiveVoucherType, form.journalEntryMode, form.paymentEntryMode, form.contraEntryMode, form.receiptEntryMode, form.journalRows, form.paymentDoubleRows, form.additionalEntries, form.particulars, form.contraDoubleRows, form.receiptDoubleRows, form.handleAddJournalRow, form.handleAddPaymentDoubleRow, form.handleAddAdditionalRow, form.handleAddParticularRow, form.handleAddContraDoubleRow, form.handleAddReceiptDoubleRow]);

  const focusStockQty = useCallback((idx: number) => { setTimeout(() => (document.querySelector(`[data-stock-qty="${idx + 1}"]`) as HTMLInputElement | null)?.focus(), 50); }, []);
  const focusStockRate = useCallback((idx: number) => { setTimeout(() => (document.querySelector(`[data-stock-rate="${idx + 1}"]`) as HTMLInputElement | null)?.focus(), 50); }, []);
  const proceedToNextStockRow = useCallback((idx: number) => {
    if (idx === form.stockEntries.length - 1) form.handleAddStockRow();
    setTimeout(() => (document.querySelector(`[data-stock-item="${idx + 2}"]`) as HTMLInputElement | null)?.focus(), 50);
  }, [form.stockEntries.length, form.handleAddStockRow]);

  // ── handleAmountConfirm ────────────────────────────────────────────────────
  const handleAmountConfirm = useCallback((row: any, idx: number) => {
    const { ledger, amountRaw, id: rowId } = row;
    const amount = Number(amountRaw) || 0;
    if (!ledger) { proceedToNextRow(idx); return; }
    if (ledger.is_bill_wise === 1) {
      form.setActiveAllocation({ type: "billWise", rowId, ledgerId: ledger.ledger_id, ledgerName: ledger.name, amount, dcType: row.type ?? "Dr", initialAllocations: row.billReferences ?? [] });
    } else if (ledger.allow_cost_centres === 1) {
      form.setActiveAllocation({ type: "costCentre", rowId, ledgerId: ledger.ledger_id, ledgerName: ledger.name, amount, initialAllocations: row.costCentres ?? [] });
    } else {
      proceedToNextRow(idx);
    }
  }, [form.setActiveAllocation, proceedToNextRow]);

  // ── Ledger panel ───────────────────────────────────────────────────────────
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
      if (effectiveVoucherType === "Journal" || effectiveVoucherType === "Payroll") return form.allLedgers;
      return form.allLedgers.filter((l: any) => form.checkIsCashOrBank(l));
    }
    if (af.type === "party") return form.allLedgers;
    if (af.type === "salesPurchase") {
      const isPurchaseLike = ["Purchase","Receipt Note","Rejection Out"].includes(effectiveVoucherType);
      return form.allLedgers.filter((l: any) => form.checkLedgerGroup(l, isPurchaseLike ? ["purchase accounts"] : ["sales accounts"]));
    }
    if (effectiveVoucherType === "Journal" && af.type === "particular") return form.allLedgers.filter((l: any) => !form.checkIsCashOrBank(l));
    if (effectiveVoucherType === "Contra" && af.type === "particular") return form.allLedgers.filter((l: any) => form.checkIsCashOrBank(l));
    if (effectiveVoucherType === "Payment" && form.paymentEntryMode === "single" && af.type === "particular") return form.allLedgers.filter((l: any) => !form.checkIsCashOrBank(l));
    return form.allLedgers;
  }, [form.activeField, effectiveVoucherType, form.paymentEntryMode, form.receiptEntryMode, form.allLedgers, form.allStockItems, form.allGodowns, form.allEmployees, form.allAttendanceTypes, form.allPayHeads, form.checkIsCashOrBank, form.checkLedgerGroup]);

  const panelTitle = useMemo(() => {
    const af = form.activeField;
    if (!af) return "List of Ledger Accounts";
    if (af.type === "stockItem") return "List of Stock Items";
    if (af.type === "stockGodown") return "List of Godowns";
    if (af.type === "employee") return "List of Employees";
    if (af.type === "attendanceType") return "List of Attendance / Production Types";
    if (af.type === "payHead") return "List of Pay Heads";
    if (af.type === "account") return effectiveVoucherType === "Journal" ? "List of Ledger Accounts" : "List of Cash / Bank Accounts";
    if (af.type === "party") return "List of Party Accounts";
    if (af.type === "salesPurchase") return `List of ${form.voucherType} Ledgers`;
    return "List of Ledger Accounts";
  }, [form.activeField, effectiveVoucherType, form.voucherType]);

  const panelSearchTerm = form.activeField?.type === "stockItem" ? form.stockSearchTerm : form.ledgerSearchTerm;
  const handlePanelSearchChange = useCallback((v: string) => {
    if (form.activeField?.type === "stockItem") form.setStockSearchTerm(v);
    else form.setLedgerSearchTerm(v);
  }, [form.activeField, form.setStockSearchTerm, form.setLedgerSearchTerm]);

  // ── Allocation save handlers ───────────────────────────────────────────────
  const handleSaveBillWise = useCallback((allocations: any[]) => {
    if (form.activeAllocation?.type === "billWiseParty") {
      form.setPartyBillReferences(allocations);
      form.setActiveAllocation(null);
      setTimeout(() => acceptRef.current(), 50);
      return;
    }
    const alloc = form.activeAllocation;
    if (!alloc || !("rowId" in alloc)) return;
    form.handleUpdateParticularRow(alloc.rowId, { billReferences: allocations });
    form.setActiveAllocation(null);
    proceedToNextRow(form.particulars.findIndex((r: any) => r.id === alloc.rowId));
  }, [form, proceedToNextRow]);

  const handleSaveCostCentre = useCallback((allocations: any[]) => {
    const alloc = form.activeAllocation;
    if (!alloc || !("rowId" in alloc)) return;
    form.handleUpdateParticularRow(alloc.rowId, { costCentres: allocations });
    form.setActiveAllocation(null);
    proceedToNextRow(form.particulars.findIndex((r: any) => r.id === alloc.rowId));
  }, [form, proceedToNextRow]);

  const handleSaveBankDetails = useCallback((details: any) => {
    form.setBankDetails(details);
    form.setActiveAllocation(null);
  }, [form]);

  const handleSaveCashDenomination = useCallback((details: any) => {
    form.setCashDenominations(details);
    form.setActiveAllocation(null);
  }, [form]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  const handleTypeKey = useCallback((type: string) => {
    const children = voucherTypeChildren[type];
    if (children && children.length > 0) setSubDropdownType((prev) => (prev === type ? null : type));
    else { setSubDropdownType(null); form.setVoucherType(type); }
  }, [voucherTypeChildren, form.setVoucherType]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); setShowDatePicker(true); }
      if (e.key === "F4") { e.preventDefault(); handleTypeKey("Contra"); }
      if (e.key === "F5") { e.preventDefault(); handleTypeKey("Payment"); }
      if (e.key === "F6") { e.preventDefault(); handleTypeKey("Receipt"); }
      if (e.key === "F7") { e.preventDefault(); handleTypeKey("Journal"); }
      if (e.key === "F8") { e.preventDefault(); handleTypeKey("Sales"); }
      if (e.key === "F9") { e.preventDefault(); handleTypeKey("Purchase"); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); if (canAccept) handleAccept(); }
      if (e.altKey && (e.key === "c" || e.key === "C")) { e.preventDefault(); navigate("/master/create/ledger"); }
      if (e.key === "Escape" && !form.activeField && !form.activeAllocation && !showDatePicker) {
        e.preventDefault();
        if (subDropdownType) setSubDropdownType(null);
        else navigate(-1);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleTypeKey, form.activeField, form.activeAllocation, canAccept, handleAccept, showDatePicker, subDropdownType, navigate]);

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loadingVoucher) return <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs">Loading voucher…</div>;
  if (loadError) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-500 text-xs">
      <span className="text-red-600">{loadError}</span>
      <button onClick={() => navigate(-1)} className="text-xs text-zinc-500 underline">← Go Back</button>
    </div>
  );

  const getTitle = () => {
    if (!rawVoucher) return "Accounting Voucher Alteration (Secondary)";
    const vt = rawVoucher.voucher_type;
    if (vt === "Attendance") return "Attendance Voucher Alteration (Secondary)";
    if (vt === "Payroll") return "Payroll Voucher Alteration (Secondary)";
    if (["Delivery Note","Receipt Note","Rejection In","Rejection Out","Material In","Material Out","Physical Stock","Stock Journal","Manufacturing Journal"].includes(vt))
      return "Inventory Voucher Alteration (Secondary)";
    return "Accounting Voucher Alteration (Secondary)";
  };

  return (
    <div className="flex flex-col h-screen bg-white text-black text-sm select-none overflow-hidden">
      {form.error && <AlertBanner type="error" message={form.error} onDismiss={() => form.setError(null)} />}
      {form.success && <AlertBanner type="success" message={form.success} onDismiss={() => form.setSuccess(null)}
        actions={<button onClick={() => navigate(-1)} className="text-xs underline">← Back</button>} />}

      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-black bg-white shrink-0">
        <span className="text-sm font-semibold text-black">{getTitle()}</span>
        <span className="text-sm text-black">{selectedCompany?.name ?? ""}</span>
        <button onClick={() => navigate(-1)} className="text-black text-sm font-bold hover:opacity-60 leading-none">✕</button>
      </div>

      {/* Voucher type / number / date bar */}
      <div className="flex items-center px-3 py-1 border-b border-black bg-white shrink-0">
        <div className="text-sm font-bold text-white bg-black px-3 py-0.5 min-w-[80px] text-center uppercase">{form.voucherType}</div>
        <span className="text-sm text-black ml-3">No.</span>
        <span className="text-sm font-bold text-black ml-2 mr-6">{rawVoucher?.voucher_number}</span>
        <div className="flex-1" />
        <button onClick={() => setShowDatePicker(true)} className="text-sm font-semibold text-black hover:underline focus:outline-none" title="F2: Change Date">
          {form.dateDisplay}
        </button>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden border-r border-black">

          {/* Same voucher body components as Vouchers.tsx */}
          {effectiveVoucherType === "Payment" && <PaymentVoucher form={form} handleAmountConfirm={handleAmountConfirm} />}
          {effectiveVoucherType === "Receipt" && <ReceiptVoucher form={form} handleAmountConfirm={handleAmountConfirm} />}
          {effectiveVoucherType === "Contra" && <ContraVoucher form={form} handleAmountConfirm={handleAmountConfirm} />}
          {effectiveVoucherType === "Journal" && <JournalVoucher form={form} handleAmountConfirm={handleAmountConfirm} />}
          {effectiveVoucherType === "Sales" && <SalesVoucher form={form} handleAmountConfirm={handleAmountConfirm} focusStockQty={focusStockQty} focusStockRate={focusStockRate} proceedToNextStockRow={proceedToNextStockRow} />}
          {effectiveVoucherType === "Purchase" && <PurchaseVoucher form={form} handleAmountConfirm={handleAmountConfirm} focusStockQty={focusStockQty} focusStockRate={focusStockRate} proceedToNextStockRow={proceedToNextStockRow} />}
          {effectiveVoucherType === "Credit Note" && <CreditNoteVoucher form={form} handleAmountConfirm={handleAmountConfirm} focusStockQty={focusStockQty} focusStockRate={focusStockRate} proceedToNextStockRow={proceedToNextStockRow} />}
          {effectiveVoucherType === "Debit Note" && <DebitNoteVoucher form={form} handleAmountConfirm={handleAmountConfirm} focusStockQty={focusStockQty} focusStockRate={focusStockRate} proceedToNextStockRow={proceedToNextStockRow} />}
          {effectiveVoucherType === "Physical Stock" && <PhysicalStockVoucher form={form} focusStockQty={focusStockQty} focusStockRate={focusStockRate} proceedToNextStockRow={proceedToNextStockRow} />}
          {effectiveVoucherType === "Stock Journal" && <StockJournalVoucher form={form} />}
          {effectiveVoucherType === "Delivery Note" && <DeliveryNoteVoucher form={form} handleAmountConfirm={handleAmountConfirm} focusStockQty={focusStockQty} focusStockRate={focusStockRate} proceedToNextStockRow={proceedToNextStockRow} />}
          {effectiveVoucherType === "Receipt Note" && <ReceiptNoteVoucher form={form} handleAmountConfirm={handleAmountConfirm} focusStockQty={focusStockQty} focusStockRate={focusStockRate} proceedToNextStockRow={proceedToNextStockRow} />}
          {effectiveVoucherType === "Rejection In" && <RejectionInVoucher form={form} handleAmountConfirm={handleAmountConfirm} focusStockQty={focusStockQty} focusStockRate={focusStockRate} proceedToNextStockRow={proceedToNextStockRow} />}
          {effectiveVoucherType === "Rejection Out" && <RejectionOutVoucher form={form} handleAmountConfirm={handleAmountConfirm} focusStockQty={focusStockQty} focusStockRate={focusStockRate} proceedToNextStockRow={proceedToNextStockRow} />}
          {effectiveVoucherType === "Material In" && <MaterialInVoucher form={form} focusStockQty={focusStockQty} focusStockRate={focusStockRate} proceedToNextStockRow={proceedToNextStockRow} />}
          {effectiveVoucherType === "Material Out" && <MaterialOutVoucher form={form} focusStockQty={focusStockQty} focusStockRate={focusStockRate} proceedToNextStockRow={proceedToNextStockRow} />}
          {effectiveVoucherType === "Manufacturing Journal" && <ManufacturingJournalVoucher form={form} />}
          {effectiveVoucherType === "Attendance" && <AttendanceVoucher form={form} />}
          {effectiveVoucherType === "Payroll" && <PayrollVoucher form={form} />}
          {effectiveVoucherType === "Reversing Journal" && <JournalVoucher form={form} handleAmountConfirm={handleAmountConfirm} />}
          {effectiveVoucherType === "Memorandum" && <JournalVoucher form={form} handleAmountConfirm={handleAmountConfirm} />}

          {/* Narration */}
          <div className="flex items-center border-t border-black shrink-0 px-3 py-1 bg-white">
            <span className="text-sm text-black shrink-0 w-24">Narration</span>
            <span className="text-sm text-black shrink-0 mr-2">:</span>
            <input type="text" className="flex-1 text-sm bg-transparent outline-none border-b border-transparent focus:border-black px-1 py-0"
              value={form.narration} onChange={(e) => form.setNarration(e.target.value)} onFocus={() => form.handleFieldBlur()} />
            {form.totalAmount > 0 && (
              <span className="text-sm font-semibold text-black ml-4 shrink-0 tabular-nums">
                {form.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between border-t border-black shrink-0 px-3 py-1.5 bg-white">
            <button onClick={() => navigate(-1)} className="text-sm text-black hover:underline">
              <span className="underline">Q</span>: Quit
            </button>
            <div className="flex items-center gap-3">
              <button onClick={handleAccept} disabled={form.isSubmitting || !canAccept}
                className="text-sm px-6 py-0.5 bg-black text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800">
                <span className="underline">A</span>: Accept
              </button>
              {rawVoucher && !rawVoucher.is_cancelled && (
                <button onClick={handleCancelVch} className="text-sm px-3 py-0.5 border border-black text-black hover:bg-gray-100">
                  <span className="underline">X</span>: Cancel Vch
                </button>
              )}
              <button onClick={handleDelete} className="text-sm px-3 py-0.5 bg-red-700 text-white hover:bg-red-800">
                <span className="underline">D</span>: Delete
              </button>
            </div>
          </div>
        </div>

        {/* Ledger list panel */}
        {panelOpen && (
          <LedgerListPanel
            title={panelTitle} items={panelItems} searchTerm={panelSearchTerm}
            onSearchChange={handlePanelSearchChange} onSelect={form.handleLedgerPanelSelect}
            onClose={form.handleFieldBlur}
            onCreateNew={() => form.activeField?.type === "stockItem" ? navigate("/master/create/stock-item") : navigate("/master/create/ledger")}
            createLabel={form.activeField?.type === "stockItem" ? "Create Stock Item" : "Create"}
            stockBalances={form.activeField?.type === "stockItem" ? form.stockBalances : undefined}
            allUnits={form.activeField?.type === "stockItem" ? form.allUnits : undefined}
          />
        )}

        {/* Right sidebar */}
        <RightSidebar
          voucherType={effectiveVoucherType} onTypeChange={form.setVoucherType}
          voucherTypeChildren={voucherTypeChildren} subDropdownType={subDropdownType}
          onSubDropdownToggle={(type) => setSubDropdownType((prev) => (prev === type ? null : type))}
          status={form.status} onStatusChange={() => form.setStatus((p: string) => (p === "Regular" ? "Post-Dated" : "Regular"))}
          entryMode={effectiveVoucherType === "Receipt" ? form.receiptEntryMode : effectiveVoucherType === "Payment" ? form.paymentEntryMode : effectiveVoucherType === "Journal" ? form.journalEntryMode : form.contraEntryMode}
          onEntryModeChange={() => {
            if (effectiveVoucherType === "Receipt") form.setReceiptEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
            else if (effectiveVoucherType === "Payment") form.setPaymentEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
            else if (effectiveVoucherType === "Journal") form.setJournalEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
            else form.setContraEntryMode((p: "single" | "double") => (p === "single" ? "double" : "single"));
          }}
          onDateClick={() => setShowDatePicker(true)}
          onCompanyTaxRegistrationClick={() => setShowTaxRegistrationPopup(true)}
          onCreateLedger={() => navigate("/master/create/ledger")}
          onAccept={handleAccept} onQuit={() => navigate(-1)} canAccept={canAccept}
          onOtherVouchersClick={() => setShowOtherVouchers(true)}
        />
      </div>

      {/* Popups */}
      {showDatePicker && <DatePickerPopup initialDate={form.date} onClose={() => setShowDatePicker(false)} onConfirm={form.setDate} label="Voucher Date" />}
      {showTaxRegistrationPopup && (
        <CompanyTaxRegistrationPopup gstRegistrations={form.allGstRegistrations} taxUnits={form.allTaxUnits}
          onClose={() => setShowTaxRegistrationPopup(false)}
          onSelect={(selection) => {
            if (!selection) { form.setGstRegistration(null); form.setTaxUnit(null); }
            else if (selection.kind === "gst") { form.setGstRegistration(selection.raw); form.setTaxUnit(null); }
            else { form.setTaxUnit(selection.raw); form.setGstRegistration(null); }
            setShowTaxRegistrationPopup(false);
          }} />
      )}
      {showDispatchDetails && form.partyLedger && <DispatchDetailsPopup initialDetails={form.dispatchDetails} onClose={() => setShowDispatchDetails(false)} onSave={(d) => { form.setDispatchDetails(d); setShowDispatchDetails(false); }} />}
      {showReceiptDetails && form.partyLedger && <ReceiptDetailsPopup initialDetails={form.receiptDetails} onClose={() => setShowReceiptDetails(false)} onSave={(d) => { form.setReceiptDetails(d); setShowReceiptDetails(false); }} />}
      {showPartyDetails && form.partyLedger && (
        <PartyDetailsPopup partyLedger={form.partyLedger} allLedgers={form.allLedgers} initialDetails={form.partyDetails}
          onClose={() => setShowPartyDetails(false)} onSave={(d) => { form.setPartyDetails(d); if (d.state) form.setPlaceOfSupply(d.state); setShowPartyDetails(false); }}
          onCreateLedger={() => navigate("/master/create/ledger")}
          buyerLabel={["Sales","Credit Note","Delivery Note","Rejection In","Debit Note"].includes(effectiveVoucherType) ? "Buyer (Bill to)" : "Supplier (Bill from)"} />
      )}
      {showExciseDetails && form.partyLedger && <ExciseDetailsPopup initialDetails={form.exciseDetails} onClose={() => setShowExciseDetails(false)} onSave={(d) => { form.setExciseDetails(d); setShowExciseDetails(false); }} />}
      {showCreditNoteDetails && form.partyLedger && <CreditNoteDetailsPopup initialDetails={form.creditNoteDetails} onClose={() => setShowCreditNoteDetails(false)} onSave={(d) => { form.setCreditNoteDetails(d); setShowCreditNoteDetails(false); }} />}
      {showDebitNoteDetails && form.partyLedger && <DebitNoteDetailsPopup initialDetails={form.debitNoteDetails} onClose={() => setShowDebitNoteDetails(false)} onSave={(d) => { form.setDebitNoteDetails(d); setShowDebitNoteDetails(false); }} />}
      {showOtherVouchers && <OtherVouchersPopup voucherType={effectiveVoucherType} onClose={() => setShowOtherVouchers(false)} onSelect={(type) => { form.setVoucherType(type); setShowOtherVouchers(false); }} voucherTypeChildren={voucherTypeChildren} />}
      {form.activeAllocation?.type === "billWise" && <BillWiseAllocationPopup ledgerId={form.activeAllocation.ledgerId} ledgerName={form.activeAllocation.ledgerName} totalAmount={form.activeAllocation.amount} dcType={form.activeAllocation.dcType ?? "Dr"} voucherDate={form.date} initialAllocations={form.activeAllocation.initialAllocations ?? []} onClose={() => form.setActiveAllocation(null)} onSave={handleSaveBillWise} />}
      {form.activeAllocation?.type === "billWiseParty" && <BillWiseAllocationPopup ledgerId={form.activeAllocation.ledgerId} ledgerName={form.activeAllocation.ledgerName} totalAmount={form.activeAllocation.amount} dcType={form.activeAllocation.dcType ?? "Cr"} voucherDate={form.date} initialAllocations={form.partyBillReferences} onClose={() => form.setActiveAllocation(null)} onSave={handleSaveBillWise} />}
      {form.activeAllocation?.type === "costCentre" && <CostCentreAllocationPopup companyId={selectedCompany!.company_id} ledgerName={form.activeAllocation.ledgerName} totalAmount={form.activeAllocation.amount} initialAllocations={form.activeAllocation.initialAllocations ?? []} onClose={() => form.setActiveAllocation(null)} onSave={handleSaveCostCentre} />}
      {(form.activeAllocation?.type === "bankDetails" || form.activeAllocation?.type === "partyBankDetails") && <BankAllocationPopup ledgerId={form.activeAllocation.ledgerId} ledgerName={form.activeAllocation.ledgerName} amount={form.activeAllocation.amount} initialDetails={form.bankDetails} allowCash={form.activeAllocation.type === "bankDetails" ? form.activeAllocation.allowCash !== false : true} onClose={() => form.setActiveAllocation(null)} onSave={handleSaveBankDetails} />}
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