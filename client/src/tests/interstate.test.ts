import { describe, it, expect } from "vitest";
import { computeInterstate, validateTaxLedgerSelection } from "../pages/transactions/utils/interstate";

describe("computeInterstate", () => {
  it("same state = intra-state", () => {
    expect(computeInterstate({ companyState: "Chhattisgarh", placeOfSupply: "Chhattisgarh" })).toBe(false);
  });
  it("different states = inter-state", () => {
    expect(computeInterstate({ companyState: "Chhattisgarh", placeOfSupply: "Maharashtra" })).toBe(true);
  });
  it("GSTIN prefix wins over the state name (like the server)", () => {
    // company GSTIN 22 = Chhattisgarh, party GSTIN 27 = Maharashtra ⇒ inter-state
    expect(computeInterstate({ companyGstin: "22AAMCS8857L1ZM", partyGstin: "27ABCDE1234F1Z5" })).toBe(true);
  });
  it("returns null when it cannot be determined", () => {
    expect(computeInterstate({ companyState: "", placeOfSupply: "" })).toBeNull();
  });
});

// The user's scenario: block the wrong tax ledger the moment it is picked.
describe("validateTaxLedgerSelection (block at selection time)", () => {
  const chhattisgarhSupply = { companyState: "Chhattisgarh", placeOfSupply: "Chhattisgarh" };
  const interStateSupply = { companyState: "Chhattisgarh", placeOfSupply: "Maharashtra" };

  it("BLOCKS IGST on a same-state (intra) supply", () => {
    const err = validateTaxLedgerSelection({ name: "IGST" }, chhattisgarhSupply);
    expect(err).toBeTruthy();
    expect(err).toMatch(/CGST \+ SGST/);
  });

  it("ALLOWS CGST/SGST on a same-state supply", () => {
    expect(validateTaxLedgerSelection({ name: "CGST", gst_tax_type: "CGST" }, chhattisgarhSupply)).toBeNull();
    expect(validateTaxLedgerSelection({ name: "SGST", gst_tax_type: "SGST/UTGST" }, chhattisgarhSupply)).toBeNull();
  });

  it("BLOCKS CGST/SGST on a different-state (inter) supply", () => {
    expect(validateTaxLedgerSelection({ name: "CGST", gst_tax_type: "CGST" }, interStateSupply)).toMatch(/IGST/);
    expect(validateTaxLedgerSelection({ name: "SGST", gst_tax_type: "SGST/UTGST" }, interStateSupply)).toMatch(/IGST/);
  });

  it("ALLOWS IGST on a different-state supply", () => {
    expect(validateTaxLedgerSelection({ name: "IGST" }, interStateSupply)).toBeNull();
  });

  it("does NOT block non-tax ledgers (freight etc.)", () => {
    expect(validateTaxLedgerSelection({ name: "Freight" }, chhattisgarhSupply)).toBeNull();
  });

  it("does NOT block when the supply state can't be determined (defers to save-time check)", () => {
    expect(validateTaxLedgerSelection({ name: "IGST" }, {})).toBeNull();
  });

  it("BLOCKS adding the same component twice (a second IGST)", () => {
    const existing = [{ name: "IGST" }];
    const err = validateTaxLedgerSelection({ name: "IGST" }, interStateSupply, existing);
    expect(err).toMatch(/already added/i);
  });

  it("BLOCKS a second CGST but ALLOWS the matching SGST", () => {
    const existing = [{ name: "CGST", gst_tax_type: "CGST" }];
    expect(validateTaxLedgerSelection({ name: "CGST", gst_tax_type: "CGST" }, chhattisgarhSupply, existing)).toMatch(/already added/i);
    expect(validateTaxLedgerSelection({ name: "SGST", gst_tax_type: "SGST/UTGST" }, chhattisgarhSupply, existing)).toBeNull();
  });

  it("ALLOWS the first IGST when none exists yet", () => {
    expect(validateTaxLedgerSelection({ name: "IGST" }, interStateSupply, [])).toBeNull();
  });

  it("wrong-side rule takes priority over duplicate (IGST on intra still says use CGST+SGST)", () => {
    const err = validateTaxLedgerSelection({ name: "IGST" }, chhattisgarhSupply, [{ name: "IGST" }]);
    expect(err).toMatch(/CGST \+ SGST/);
  });
});
