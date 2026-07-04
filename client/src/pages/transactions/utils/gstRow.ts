// Resolve a tax ledger's GST component. Prefers the configured gst_tax_type; falls back to
// inferring from the ledger NAME (so a ledger literally named "IGST"/"CGST"/"SGST" with no
// gst_tax_type set is still recognised — matches the server's classifyTaxLedgers).
export function gstComponentOf(ledger: any): "CGST" | "SGST" | "IGST" | "CESS" | null {
  // Prefer the configured tag; fall back to the ledger NAME unconditionally so an
  // "IGST"/"CGST"/"SGST"-named ledger is recognised even before the backend enrichment
  // (gst_tax_type / type_of_duty_tax) is live.
  const tagged = String((ledger && ledger.gst_tax_type) || "").toUpperCase();
  const name = String((ledger && ledger.name) || "").toUpperCase();
  const s = tagged || name;
  if (s.startsWith("CGST")) return "CGST";
  if (s.startsWith("SGST") || s.startsWith("UTGST")) return "SGST";
  if (s.startsWith("IGST")) return "IGST";
  if (s.startsWith("CESS")) return "CESS";
  return null;
}

// Display helper for a tax / additional ledger row on a Sales/Purchase invoice.
//
// - isGstRow: the picked ledger is a GST Duties & Taxes ledger (so we hide the Dr/Cr
//   selector — a GST line's side is implied by the voucher, like TallyPrime).
// - rateLabel: the GST % to show in the Rate column. Prefer the ledger's configured rate;
//   if that is 0/blank (common — many tax ledgers store no fixed rate), DERIVE it from the
//   line amount ÷ taxable subtotal, so "CGST" on an 18% item still shows "9%".
export function gstRowInfo(
  ledger: any,
  amountRaw: string | number | null | undefined,
  stockSubtotal: number,
): { isGstRow: boolean; rateLabel: string } {
  const isGstRow =
    gstComponentOf(ledger) !== null ||
    String((ledger && ledger.type_of_duty_tax) || "").toUpperCase() === "GST";

  const configuredRate = Number(ledger && ledger.gst_tax_rate) || 0;
  const amount = Number(amountRaw) || 0;
  const derivedRate = stockSubtotal > 0 && amount > 0 ? (amount / stockSubtotal) * 100 : 0;
  const rate = configuredRate > 0 ? configuredRate : derivedRate;

  return {
    isGstRow,
    rateLabel: isGstRow && rate > 0 ? `${Number(rate.toFixed(2))}%` : "",
  };
}
