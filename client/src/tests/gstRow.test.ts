import { describe, it, expect } from "vitest";
import { gstRowInfo, gstComponentOf } from "../pages/transactions/utils/gstRow";

// Recognising a tax ledger's GST component — from gst_tax_type OR the ledger name.
describe("gstComponentOf", () => {
  it("uses the configured gst_tax_type when present", () => {
    expect(gstComponentOf({ gst_tax_type: "CGST" })).toBe("CGST");
    expect(gstComponentOf({ gst_tax_type: "SGST/UTGST" })).toBe("SGST");
    expect(gstComponentOf({ gst_tax_type: "IGST" })).toBe("IGST");
  });

  it("falls back to the ledger name when gst_tax_type is missing (the user's IGST ledger)", () => {
    expect(gstComponentOf({ name: "IGST", gst_tax_type: null })).toBe("IGST");
    expect(gstComponentOf({ name: "CGST", gst_tax_type: null })).toBe("CGST");
    expect(gstComponentOf({ name: "SGST", gst_tax_type: null })).toBe("SGST");
  });

  it("returns null for a non-tax ledger", () => {
    expect(gstComponentOf({ name: "Freight & Forwarding" })).toBeNull();
    expect(gstComponentOf({ name: "Round Off" })).toBeNull();
    expect(gstComponentOf(null)).toBeNull();
  });
});

// A GST tax row shows its % automatically and hides the Dr/Cr selector.
describe("gstRowInfo", () => {
  it("derives the % from amount ÷ subtotal when the ledger rate is 0 (CGST on an 18% item = 9%)", () => {
    // Ledger tagged GST but with no configured rate (the real-world case).
    const ledger = { gst_tax_type: "CGST", type_of_duty_tax: "GST", gst_tax_rate: 0 };
    const info = gstRowInfo(ledger, 18000, 200000);
    expect(info.isGstRow).toBe(true);
    expect(info.rateLabel).toBe("9%");
  });

  it("prefers the ledger's configured rate when present", () => {
    const ledger = { gst_tax_type: "IGST", type_of_duty_tax: "GST", gst_tax_rate: 18 };
    const info = gstRowInfo(ledger, 9999, 100000); // amount deliberately inconsistent
    expect(info.rateLabel).toBe("18%");
  });

  it("recognises a GST ledger even when gst_tax_type is missing (type_of_duty_tax = GST)", () => {
    const ledger = { gst_tax_type: null, type_of_duty_tax: "GST", gst_tax_rate: 0 };
    const info = gstRowInfo(ledger, 3600, 20000);
    expect(info.isGstRow).toBe(true);
    expect(info.rateLabel).toBe("18%");
  });

  it("treats a non-GST ledger (freight/discount) as a normal row: no % and Dr/Cr shown", () => {
    const ledger = { name: "Freight", gst_tax_type: null, type_of_duty_tax: null };
    const info = gstRowInfo(ledger, 500, 20000);
    expect(info.isGstRow).toBe(false);
    expect(info.rateLabel).toBe("");
  });

  it("shows no % until the amount is filled", () => {
    const ledger = { gst_tax_type: "SGST/UTGST", type_of_duty_tax: "GST", gst_tax_rate: 0 };
    expect(gstRowInfo(ledger, "", 200000).rateLabel).toBe("");
    expect(gstRowInfo(ledger, 0, 200000).rateLabel).toBe("");
  });
});
