// hooks/useVoucherMeta.ts
// ─── Voucher metadata: type, number, date, status, narration, allocation state ──

import { useState, useCallback, useMemo } from 'react';
import type { ActiveAllocation } from '../types';

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const formatDateDisplay = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}-${MONTH_NAMES[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};

export const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseVoucherMetaOptions {
  initialVoucherType?: string;
  initialNarration?: string;
  initialReferenceNumber?: string;
  initialPlaceOfSupply?: string;
  initialPartyBillReferences?: any[];
  initialBankDetails?: any;
}

export function useVoucherMeta({
  initialVoucherType = 'Receipt',
  initialNarration = '',
  initialReferenceNumber = '',
  initialPlaceOfSupply = 'Select',
  initialPartyBillReferences = [],
  initialBankDetails = null,
}: UseVoucherMetaOptions = {}) {
  // ── Voucher type ──────────────────────────────────────────────────────────────
  const [voucherType, setVoucherType] = useState<string>(initialVoucherType);
  const [voucherNumber, setVoucherNumber] = useState<string>('1');
  const [voucherNumberLoading, setVoucherNumberLoading] = useState(true);

  // ── Date / status ─────────────────────────────────────────────────────────────
  const [date, setDate] = useState<string>(todayStr());
  const [status, setStatus] = useState<'Regular' | 'Post-Dated'>('Regular');
  // Optional (L:Optional) — independent of Post-Dated. When true the voucher is excluded
  // from the books (ledger balances/reports) and appears only in the Optional Voucher
  // Register. Toggled from the right action panel.
  const [isOptional, setIsOptional] = useState(false);
  // Reversing Journal — date the entry is applicable up to (defaults to voucher date).
  const [applicableUpto, setApplicableUpto] = useState<string>('');

  // ── Narration / invoice fields ────────────────────────────────────────────────
  const [narration, setNarration] = useState<string>(initialNarration);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState<string>('');
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>(initialReferenceNumber);
  const [referenceDate, setReferenceDate] = useState<string>(todayStr());
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(initialPlaceOfSupply);
  // Selected Voucher Type Class ("Name of Class") — "" means none selected.
  const [voucherClass, setVoucherClass] = useState<string>('');

  // ── Submission state ──────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Advanced allocation state ─────────────────────────────────────────────────
  const [activeAllocation, setActiveAllocation] = useState<ActiveAllocation>(null);
  const [partyBillReferences, setPartyBillReferences] = useState<any[]>(initialPartyBillReferences);
  const [bankDetails, setBankDetails] = useState<any | null>(initialBankDetails);
  const [cashDenominations, setCashDenominations] = useState<any | null>(null);
  const [receiptDetails, setReceiptDetails] = useState<any | null>(null);
  const [partyDetails, setPartyDetails] = useState<any | null>(null);
  const [dispatchDetails, setDispatchDetails] = useState<any | null>(null);
  const [creditNoteDetails, setCreditNoteDetails] = useState<any | null>(null);
  const [debitNoteDetails, setDebitNoteDetails] = useState<any | null>(null);
  const [exciseDetails, setExciseDetails] = useState<any | null>(null);
  const [vatDetails, setVatDetails] = useState<any | null>(null);
  // "Provide GST/e-Way Bill details" Statutory Details (Sales/Credit/Debit Note).
  const [gstEwayDetails, setGstEwayDetails] = useState<any | null>(null);
  // "Provide e-Invoice details" toggle + Place-of-Party (Sales/Credit/Debit Note).
  const [provideEInvoice, setProvideEInvoice] = useState<'Yes' | 'No'>('No');
  const [eInvoiceDetails, setEInvoiceDetails] = useState<{
    bill_to_place: string;
    ship_to_place: string;
  } | null>(null);
  // Purchase (excise) "Manufacturer / Importer Details" — shown after Party Details.
  const [manufacturerImporterDetails, setManufacturerImporterDetails] = useState<any | null>(null);
  const [orderDetails, setOrderDetails] = useState<any | null>(null);
  const [sourceGodown, setSourceGodown] = useState<any | null>(null);

  // ── Derived display ───────────────────────────────────────────────────────────
  const dateDisplay = useMemo(() => formatDateDisplay(date), [date]);

  // ── Exposed reset helper (called by full resetForm) ───────────────────────────
  const resetMeta = useCallback(() => {
    setNarration('');
    setError(null);
    setSuccess(null);
    setReferenceNumber('');
    setSupplierInvoiceNo('');
    setSupplierInvoiceDate('');
    setStatus('Regular');
    setIsOptional(false);
    setDate(todayStr());
    setApplicableUpto('');
    setActiveAllocation(null);
    setPartyBillReferences([]);
    setBankDetails(null);
    setCashDenominations(null);
    setReceiptDetails(null);
    setPartyDetails(null);
    setDispatchDetails(null);
    setCreditNoteDetails(null);
    setDebitNoteDetails(null);
    setExciseDetails(null);
    setVatDetails(null);
    setGstEwayDetails(null);
    setProvideEInvoice('No');
    setEInvoiceDetails(null);
    setManufacturerImporterDetails(null);
    setOrderDetails(null);
    setSourceGodown(null);
    setVoucherClass('');
  }, []);

  return {
    // voucher type
    voucherType,
    setVoucherType,
    voucherNumber,
    setVoucherNumber,
    voucherNumberLoading,
    setVoucherNumberLoading,
    // date / status
    date,
    setDate,
    dateDisplay,
    status,
    setStatus,
    isOptional,
    setIsOptional,
    applicableUpto,
    setApplicableUpto,
    // narration / invoice
    narration,
    setNarration,
    supplierInvoiceNo,
    setSupplierInvoiceNo,
    supplierInvoiceDate,
    setSupplierInvoiceDate,
    referenceNumber,
    setReferenceNumber,
    referenceDate,
    setReferenceDate,
    placeOfSupply,
    setPlaceOfSupply,
    voucherClass,
    setVoucherClass,
    // submission
    isSubmitting,
    setIsSubmitting,
    error,
    setError,
    success,
    setSuccess,
    // allocations
    activeAllocation,
    setActiveAllocation,
    partyBillReferences,
    setPartyBillReferences,
    bankDetails,
    setBankDetails,
    cashDenominations,
    setCashDenominations,
    receiptDetails,
    setReceiptDetails,
    partyDetails,
    setPartyDetails,
    dispatchDetails,
    setDispatchDetails,
    creditNoteDetails,
    setCreditNoteDetails,
    debitNoteDetails,
    setDebitNoteDetails,
    exciseDetails,
    setExciseDetails,
    vatDetails,
    setVatDetails,
    gstEwayDetails,
    setGstEwayDetails,
    provideEInvoice,
    setProvideEInvoice,
    eInvoiceDetails,
    setEInvoiceDetails,
    manufacturerImporterDetails,
    setManufacturerImporterDetails,
    orderDetails,
    setOrderDetails,
    sourceGodown,
    setSourceGodown,
    // reset
    resetMeta,
  };
}
