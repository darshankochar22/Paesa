import { useState, useCallback, useRef } from "react";
import type { LedgerType } from "../../../types/api";
import type { ParticularRow, StockEntryRow } from "./useVoucherRows";
import type { VoucherType } from "./useVoucherMeta";

type VoucherStatus = "Regular" | "Post-Dated";

interface UseVoucherSubmitParams {
  companyId: number | null;
  fyId: number | null;
  voucherType: VoucherType;
  date: string;
  status: VoucherStatus;
  supplierInvoiceNo: string;
  supplierInvoiceDate: string;
  referenceNumber: string;
  referenceDate: string;
  placeOfSupply: string;
  narration: string;
  voucherNumber: string;
  contraEntryMode: "single" | "double";
  accountLedger: LedgerType | null;
  particulars: ParticularRow[];
  contraDoubleRows: ParticularRow[];
  journalRows: ParticularRow[];
  partyLedger: LedgerType | null;
  salesPurchaseLedger: LedgerType | null;
  stockEntries: StockEntryRow[];
  additionalEntries: ParticularRow[];
  partyBillReferences: any[];
  bankDetails: any | null;
  cashDenominations: any | null;
  // totals
  particularsTotal: number;
  debitTotal: number;
  creditTotal: number;
  totalAmount: number;
  // helpers
  checkIsCashOrBank: (ledger: LedgerType | null) => boolean;
  fetchContextData: () => Promise<void>;
}

export function useVoucherSubmit(p: UseVoucherSubmitParams) {

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetFormRef = useRef<() => void>(() => {});
  const setResetForm = useCallback((fn: () => void) => {
    resetFormRef.current = fn;
  }, []);

  const validate = useCallback((): string | null => {
    if (!p.companyId) return "No company selected.";
    if (!p.fyId)      return "No active financial year.";

    if (["Receipt", "Payment"].includes(p.voucherType)) {
      if (!p.accountLedger) return "Account (cash/bank ledger) is required.";
      const filled = p.particulars.filter(
        (r) => r.ledger && Number(r.amountRaw) > 0
      );
      if (filled.length < 1)
        return "At least one Particulars entry with an amount is required.";
      if (p.particularsTotal <= 0)
        return "Total amount must be greater than zero.";
    }

    if (p.voucherType === "Contra") {
      if (p.contraEntryMode === "single") {
        if (!p.accountLedger) return "Account (cash/bank ledger) is required.";
        if (!p.checkIsCashOrBank(p.accountLedger))
          return "Contra Account must be a Cash or Bank ledger.";
        const filled = p.particulars.filter(
          (r) => r.ledger && Number(r.amountRaw) >= 0
        );
        if (filled.length < 1)
          return "At least one Particulars entry with an amount is required.";
        for (const row of filled) {
          if (!p.checkIsCashOrBank(row.ledger))
            return "Contra vouchers may only use Cash/Bank ledgers on both sides.";
        }
        if (p.particularsTotal < 0)
          return "Total amount must be greater than or equal to zero.";
      } else {
        const filled = p.contraDoubleRows.filter(
          (r) => r.ledger && Number(r.amountRaw) >= 0
        );
        if (filled.length < 2)
          return "At least two valid entries are required.";
        for (const row of filled) {
          if (!p.checkIsCashOrBank(row.ledger))
            return "Contra vouchers may only use Cash/Bank ledgers.";
        }
        if (Math.abs(p.debitTotal - p.creditTotal) > 0.01)
          return `Debit (${p.debitTotal.toFixed(2)}) and Credit (${p.creditTotal.toFixed(2)}) totals must balance.`;
        if (p.debitTotal < 0)
          return "Amount must be greater than or equal to zero.";
      }
    }

    if (p.voucherType === "Journal") {
      const filled = p.journalRows.filter(
        (r) => r.ledger && Number(r.amountRaw) > 0
      );
      if (filled.length < 2)
        return "At least two valid Journal entries are required.";
      if (Math.abs(p.debitTotal - p.creditTotal) > 0.01)
        return `Debit (${p.debitTotal.toFixed(2)}) and Credit (${p.creditTotal.toFixed(2)}) totals must balance.`;
      if (p.debitTotal <= 0)
        return "Journal amount must be greater than zero.";
    }

    if (["Sales", "Purchase"].includes(p.voucherType)) {
      if (!p.partyLedger)         return "Party A/c Name is required.";
      if (!p.salesPurchaseLedger) return `${p.voucherType} Ledger is required.`;
      if (p.partyLedger.ledger_id === p.salesPurchaseLedger.ledger_id)
        return `Party and ${p.voucherType} ledger cannot be the same account.`;
      const filledItems = p.stockEntries.filter(
        (r) => r.stockItem && Number(r.quantityRaw) > 0 && Number(r.rateRaw) > 0
      );
      if (filledItems.length === 0)
        return "At least one Stock Item with quantity and rate is required.";
      if (p.totalAmount <= 0)
        return "Total amount must be greater than zero.";
    }

    return null;
  }, [p]);

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let entries: any[] = [];
      let stock_entries: any[] = [];

      if (["Receipt", "Payment"].includes(p.voucherType)) {
        const accountType: "Dr" | "Cr" = p.voucherType === "Receipt" ? "Dr" : "Cr";
        entries.push({
          ledger_id:   p.accountLedger!.ledger_id,
          ledger_name: p.accountLedger!.name,
          type:        accountType,
          amount:      p.particularsTotal,
          currency:    "INR",
        });
        const filled = p.particulars.filter(
          (r) => r.ledger && Number(r.amountRaw) > 0
        );
        entries.push(
          ...filled.map((r) => ({
            ledger_id:    r.ledger!.ledger_id,
            ledger_name:  r.ledger!.name,
            type:         r.type,
            amount:       Number(r.amountRaw),
            currency:     "INR",
            cost_centres: r.costCentres,
          }))
        );

      } else if (p.voucherType === "Contra") {
        if (p.contraEntryMode === "single") {
          entries.push({
            ledger_id:   p.accountLedger!.ledger_id,
            ledger_name: p.accountLedger!.name,
            type:        "Cr" as const,
            amount:      p.particularsTotal,
            currency:    "INR",
          });
          const filled = p.particulars.filter(
            (r) => r.ledger && Number(r.amountRaw) > 0
          );
          entries.push(
            ...filled.map((r) => ({
              ledger_id:    r.ledger!.ledger_id,
              ledger_name:  r.ledger!.name,
              type:         r.type,
              amount:       Number(r.amountRaw),
              currency:     "INR",
              cost_centres: r.costCentres,
            }))
          );
        } else {
          const filled = p.contraDoubleRows.filter(
            (r) => r.ledger && Number(r.amountRaw) > 0
          );
          entries = filled.map((r) => ({
            ledger_id:    r.ledger!.ledger_id,
            ledger_name:  r.ledger!.name,
            type:         r.type,
            amount:       Number(r.amountRaw),
            currency:     "INR",
            cost_centres: r.costCentres,
          }));
        }

      } else if (p.voucherType === "Journal") {
        const filled = p.journalRows.filter(
          (r) => r.ledger && Number(r.amountRaw) > 0
        );
        entries = filled.map((r) => ({
          ledger_id:    r.ledger!.ledger_id,
          ledger_name:  r.ledger!.name,
          type:         r.type,
          amount:       Number(r.amountRaw),
          currency:     "INR",
          cost_centres: r.costCentres,
        }));

      } else if (["Sales", "Purchase"].includes(p.voucherType)) {
        const filledItems = p.stockEntries.filter(
          (r) => r.stockItem && Number(r.quantityRaw) > 0 && Number(r.rateRaw) > 0
        );
        const stockSubtotal = filledItems.reduce(
          (s, r) => s + (Number(r.amountRaw) || 0),
          0
        );
        stock_entries = filledItems.map((r) => ({
          stock_item_id: r.stockItem!.item_id ?? null,
          item_name:     r.stockItem!.name,
          godown_id:     r.godown?.godown_id ?? null,
          unit_id:       r.unit?.unit_id ?? null,
          quantity:      Number(r.quantityRaw),
          rate:          Number(r.rateRaw),
          amount:        Number(r.amountRaw),
        }));

        const partyType: "Dr" | "Cr" = p.voucherType === "Sales" ? "Dr" : "Cr";
        const spType:    "Dr" | "Cr" = p.voucherType === "Sales" ? "Cr" : "Dr";

        entries = [
          {
            ledger_id:   p.partyLedger!.ledger_id,
            ledger_name: p.partyLedger!.name,
            type:        partyType,
            amount:      p.totalAmount,
            currency:    "INR",
          },
          {
            ledger_id:   p.salesPurchaseLedger!.ledger_id,
            ledger_name: p.salesPurchaseLedger!.name,
            type:        spType,
            amount:      stockSubtotal,
            currency:    "INR",
          },
          ...p.additionalEntries
            .filter((r) => r.ledger && Number(r.amountRaw) > 0)
            .map((r) => ({
              ledger_id:    r.ledger!.ledger_id,
              ledger_name:  r.ledger!.name,
              type:         r.type,
              amount:       Number(r.amountRaw),
              currency:     "INR",
              cost_centres: r.costCentres,
            })),
        ];
      }

      let finalBillReferences: any[] = [];

      if (["Receipt", "Payment"].includes(p.voucherType)) {
        finalBillReferences = p.particulars
          .filter((r) => r.ledger && r.billReferences?.length)
          .flatMap((r) =>
            r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id }))
          );
      } else if (p.voucherType === "Contra") {
        if (p.contraEntryMode === "single") {
          finalBillReferences = p.particulars
            .filter((r) => r.ledger && r.billReferences?.length)
            .flatMap((r) =>
              r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id }))
            );
        } else {
          finalBillReferences = p.contraDoubleRows
            .filter((r) => r.ledger && r.billReferences?.length)
            .flatMap((r) =>
              r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id }))
            );
        }
      } else if (p.voucherType === "Journal") {
        finalBillReferences = p.journalRows
          .filter((r) => r.ledger && r.billReferences?.length)
          .flatMap((r) =>
            r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id }))
          );
      } else if (["Sales", "Purchase"].includes(p.voucherType)) {
        if (p.partyLedger && p.partyBillReferences.length > 0) {
          finalBillReferences = p.partyBillReferences.map((b) => ({
            ...b,
            ledger_id: p.partyLedger!.ledger_id,
          }));
        }
        const additionalRefs = p.additionalEntries
          .filter((r) => r.ledger && r.billReferences?.length)
          .flatMap((r) =>
            r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id }))
          );
        finalBillReferences = [...finalBillReferences, ...additionalRefs];
      }

      const payload = {
        company_id:            p.companyId!,
        fy_id:                 p.fyId!,
        voucher_type:          p.voucherType,
        date:                  p.date,
        status:                p.status,
        supplier_invoice_no:   p.supplierInvoiceNo || null,
        supplier_invoice_date: p.supplierInvoiceDate || null,
        reference_number:      p.referenceNumber || null,
        reference_date:        p.referenceDate || null,
        place_of_supply:       p.placeOfSupply !== "Select" ? p.placeOfSupply : null,
        narration:             p.narration || null,
        party_ledger_id:       ["Sales", "Purchase"].includes(p.voucherType)
                                 ? p.partyLedger?.ledger_id ?? null : null,
        party_name:            ["Sales", "Purchase"].includes(p.voucherType)
                                 ? p.partyLedger?.name ?? null : null,
        is_accounting_voucher: 1,
        is_invoice:            ["Sales", "Purchase"].includes(p.voucherType) ? 1 : 0,
        is_inventory_voucher:  ["Sales", "Purchase"].includes(p.voucherType) ? 1 : 0,
        is_post_dated:         p.status === "Post-Dated" ? 1 : 0,
        entries,
        stock_entries,
        bill_references:       finalBillReferences.length > 0 ? finalBillReferences : undefined,
        bank_details:          p.bankDetails || undefined,
        cash_denominations:    p.cashDenominations || undefined,
      };

      const res = await window.api.voucher.create(payload);
      if (res.success) {
        const savedNumber = p.voucherNumber;
        resetFormRef.current();
        setSuccess(`Voucher No. ${savedNumber} saved successfully.`);
        await p.fetchContextData();
      } else {
        setError(res.error || "Failed to save voucher.");
      }
    } catch (e: any) {
      setError(e?.message || "Unexpected error.");
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, p]);

  return {
    isSubmitting,
    error,
    setError,
    success,
    setSuccess,
    validate,
    handleSubmit,
    setResetForm,
  };
}
