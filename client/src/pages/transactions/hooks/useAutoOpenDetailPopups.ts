import { useEffect, useRef, useState } from 'react';
import type { useVoucherForm } from './useVoucherForm';

// Owns the Tally-style detail sub-screen visibility (Dispatch/Receipt/Party/…)
// plus the auto-open chains that fire them the moment a party is picked for the
// relevant voucher type. Extracted from Vouchers.tsx; behaviour unchanged.
export function useAutoOpenDetailPopups(
  form: ReturnType<typeof useVoucherForm>,
  effectiveVoucherType: string,
) {
  const [showDispatchDetails, setShowDispatchDetails] = useState(false);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);
  const [showPartyDetails, setShowPartyDetails] = useState(false);
  const [showManufacturerDetails, setShowManufacturerDetails] = useState(false);
  const [showCreditNoteDetails, setShowCreditNoteDetails] = useState(false);
  const [showExciseDetails, setShowExciseDetails] = useState(false);
  const [showVatDetails, setShowVatDetails] = useState(false);
  const [showDebitNoteExcise, setShowDebitNoteExcise] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showDebitNoteDetails, setShowDebitNoteDetails] = useState(false);

  const hasAutoOpenedReceipt = useRef(false);
  // Sales: track the party the dispatch→party→VAT chain last fired for, so it
  // re-fires every time a DIFFERENT party is picked (not just the first time).
  const lastDispatchParty = useRef<number | null>(null);
  const hasAutoOpenedCreditNote = useRef(false);
  const hasAutoOpenedDebitNote = useRef(false);
  const hasAutoOpenedDeliveryDispatch = useRef(false);
  const hasAutoOpenedReceiptNote = useRef(false);
  const hasAutoOpenedMaterialIn = useRef(false);
  const hasAutoOpenedPurchaseOrder = useRef(false);
  const hasAutoOpenedSalesOrder = useRef(false);
  const hasAutoOpenedJobWorkIn = useRef(false);
  const hasAutoOpenedJobWorkOut = useRef(false);

  useEffect(() => {
    const partyId = form.partyLedger?.ledger_id ?? null;
    if (effectiveVoucherType === 'Sales' && partyId && lastDispatchParty.current !== partyId) {
      lastDispatchParty.current = partyId;
      setShowDispatchDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (effectiveVoucherType === 'Purchase' && form.partyLedger && !hasAutoOpenedReceipt.current) {
      hasAutoOpenedReceipt.current = true;
      setShowReceiptDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (
      effectiveVoucherType === 'Credit Note' &&
      form.partyLedger &&
      !hasAutoOpenedCreditNote.current
    ) {
      hasAutoOpenedCreditNote.current = true;
      setShowCreditNoteDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (
      effectiveVoucherType === 'Debit Note' &&
      form.partyLedger &&
      !hasAutoOpenedDebitNote.current
    ) {
      hasAutoOpenedDebitNote.current = true;
      setShowDebitNoteDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (
      effectiveVoucherType === 'Delivery Note' &&
      form.partyLedger &&
      !hasAutoOpenedDeliveryDispatch.current
    ) {
      hasAutoOpenedDeliveryDispatch.current = true;
      // Tally Delivery Note: party → Order Details → Party Details. The Order
      // Details popup also carries the dispatch fields; handleSaveOrderDetails
      // then chains to the Party Details popup.
      setShowOrderDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (
      effectiveVoucherType === 'Receipt Note' &&
      form.partyLedger &&
      !hasAutoOpenedReceiptNote.current
    ) {
      hasAutoOpenedReceiptNote.current = true;
      // Tally Receipt Note: party select → Order Details, then Party Details
      // (chained in handleSaveOrderDetails).
      setShowOrderDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (
      effectiveVoucherType === 'Purchase Order' &&
      form.partyLedger &&
      !hasAutoOpenedPurchaseOrder.current
    ) {
      hasAutoOpenedPurchaseOrder.current = true;
      // Tally Purchase Order: party select → Order Details, then Party Details
      // (chained in handleSaveOrderDetails).
      setShowOrderDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (
      effectiveVoucherType === 'Sales Order' &&
      form.partyLedger &&
      !hasAutoOpenedSalesOrder.current
    ) {
      hasAutoOpenedSalesOrder.current = true;
      setShowOrderDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (
      effectiveVoucherType === 'Job Work In Order' &&
      form.partyLedger &&
      !hasAutoOpenedJobWorkIn.current
    ) {
      hasAutoOpenedJobWorkIn.current = true;
      setShowDispatchDetails(true);
    }
    if (
      effectiveVoucherType === 'Job Work Out Order' &&
      form.partyLedger &&
      !hasAutoOpenedJobWorkOut.current
    ) {
      hasAutoOpenedJobWorkOut.current = true;
      setShowDispatchDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (
      (effectiveVoucherType === 'Material In' || effectiveVoucherType === 'Material Out') &&
      form.partyLedger &&
      !hasAutoOpenedMaterialIn.current
    ) {
      hasAutoOpenedMaterialIn.current = true;
      setShowOrderDetails(true);
    }
  }, [form.partyLedger, effectiveVoucherType]);

  useEffect(() => {
    if (!form.partyLedger) {
      hasAutoOpenedReceipt.current = false;
      lastDispatchParty.current = null;
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

  return {
    showDispatchDetails,
    setShowDispatchDetails,
    showReceiptDetails,
    setShowReceiptDetails,
    showPartyDetails,
    setShowPartyDetails,
    showManufacturerDetails,
    setShowManufacturerDetails,
    showCreditNoteDetails,
    setShowCreditNoteDetails,
    showExciseDetails,
    setShowExciseDetails,
    showVatDetails,
    setShowVatDetails,
    showDebitNoteExcise,
    setShowDebitNoteExcise,
    showOrderDetails,
    setShowOrderDetails,
    showDebitNoteDetails,
    setShowDebitNoteDetails,
  };
}
