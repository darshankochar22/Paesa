import { useMemo } from "react";
import type { ParticularRow, StockEntryRow } from "./useVoucherRows";
import type { VoucherType } from "./useVoucherMeta";

interface UseVoucherTotalsParams {
  voucherType: VoucherType;
  contraEntryMode: "single" | "double";
  particulars: ParticularRow[];
  journalRows: ParticularRow[];
  contraDoubleRows: ParticularRow[];
  stockEntries: StockEntryRow[];
  additionalEntries: ParticularRow[];
}

export function useVoucherTotals({
  voucherType,
  contraEntryMode,
  particulars,
  journalRows,
  contraDoubleRows,
  stockEntries,
  additionalEntries,
}: UseVoucherTotalsParams) {


  const particularsTotal = useMemo(
    () => particulars.reduce((s, p) => s + (Number(p.amountRaw) || 0), 0),
    [particulars]
  );


  const debitTotal = useMemo(() => {
    if (voucherType === "Journal") {
      return journalRows.reduce(
        (sum, r) => sum + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    if (voucherType === "Contra" && contraEntryMode === "double") {
      return contraDoubleRows.reduce(
        (sum, r) => sum + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    return particularsTotal;
  }, [voucherType, contraEntryMode, journalRows, contraDoubleRows, particularsTotal]);

  // ─── Credit total ──────────────────────────────────────────────────────────

  const creditTotal = useMemo(() => {
    if (voucherType === "Journal") {
      return journalRows.reduce(
        (sum, r) => sum + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    if (voucherType === "Contra" && contraEntryMode === "double") {
      return contraDoubleRows.reduce(
        (sum, r) => sum + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    return particularsTotal;
  }, [voucherType, contraEntryMode, journalRows, contraDoubleRows, particularsTotal]);

  // ─── Grand total ───────────────────────────────────────────────────────────

  const totalAmount = useMemo(() => {
    if (["Receipt", "Payment"].includes(voucherType)) {
      return particularsTotal;
    }

    if (voucherType === "Contra") {
      if (contraEntryMode === "double") return debitTotal;
      return particularsTotal;
    }

    if (voucherType === "Journal") {
      return debitTotal;
    }

    if (voucherType === "Sales" || voucherType === "Purchase") {
      const stockSum = stockEntries.reduce(
        (s, r) => s + (Number(r.amountRaw) || 0),
        0
      );
      const adjSum = additionalEntries.reduce((s, r) => {
        const amt = Number(r.amountRaw) || 0;
        if (voucherType === "Sales") return r.type === "Cr" ? s + amt : s - amt;
        return r.type === "Dr" ? s + amt : s - amt;
      }, 0);
      return Math.max(0, stockSum + adjSum);
    }

    return 0;
  }, [
    voucherType,
    contraEntryMode,
    particularsTotal,
    debitTotal,
    stockEntries,
    additionalEntries,
  ]);

  // ─── Public API ────────────────────────────────────────────────────────────

  return {
    particularsTotal,
    debitTotal,
    creditTotal,
    totalAmount,
  };
}