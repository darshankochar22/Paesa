import { describe, it, expect } from "vitest";
import { hydrateVoucherForm, EDITABLE_VOUCHER_TYPES } from "../pages/transactions/hooks/hydrateVoucherForm";

// A fake useVoucherForm: master arrays are real; every setX call is recorded so we can
// assert what the hydrator pushed into the form.
function makeForm(master: any) {
  const calls: Record<string, any> = {};
  return new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === "__calls") return calls;
        if (prop in master) return master[prop];
        return (v: any) => { calls[prop] = v; };
      },
    }
  ) as any;
}

const MASTER = {
  allLedgers: [
    { ledger_id: 1, name: "Customer" },
    { ledger_id: 2, name: "Sales A/c" },
    { ledger_id: 3, name: "CGST" },
  ],
  allStockItems: [{ item_id: 10, name: "Widget" }],
  allGodowns: [],
  allUnits: [],
  allEmployees: [],
  allPayHeads: [],
  ledgersLoading: false,
};

describe("hydrateVoucherForm", () => {
  it("Sales: party, revenue ledger (by stock subtotal), stock, tax-as-additional, bill-wise", () => {
    const form = makeForm(MASTER);
    hydrateVoucherForm(form, {
      voucher_type: "Sales", date: "2026-04-10", narration: "n", voucher_number: "S1",
      party_ledger_id: 1, place_of_supply: "MH",
      entries: [
        { entry_id: 100, ledger_id: 1, type: "Dr", amount: 1180 }, // party
        { entry_id: 101, ledger_id: 2, type: "Cr", amount: 1000 }, // sales == stock subtotal
        { entry_id: 102, ledger_id: 3, type: "Cr", amount: 180 },  // tax → additional
      ],
      stock_entries: [{ stock_item_id: 10, quantity: 10, rate: 100, amount: 1000, batches: [] }],
      bill_references: [{ ledger_id: 1, bill_name: "B1", bill_type: "New Ref", amount: 1180 }],
      cost_centres: [],
    });
    const c = form.__calls;
    expect(c.setVoucherType).toBe("Sales");
    expect(c.setDate).toBe("2026-04-10");
    expect(c.setVoucherNumber).toBe("S1");
    expect(c.setPartyLedger).toEqual({ ledger_id: 1, name: "Customer" });
    expect(c.setSalesPurchaseLedger).toEqual({ ledger_id: 2, name: "Sales A/c" });
    expect(c.setStockEntries).toHaveLength(1);
    expect(c.setStockEntries[0].stockItem).toEqual({ item_id: 10, name: "Widget" });
    expect(c.setStockEntries[0].quantityRaw).toBe("10");
    expect(c.setAdditionalEntries).toHaveLength(1);
    expect(c.setAdditionalEntries[0].ledger).toEqual({ ledger_id: 3, name: "CGST" });
    expect(c.setPartyBillReferences).toHaveLength(1);
    expect(c.setPartyBillReferences[0].bill_name).toBe("B1");
  });

  it("Journal: double mode, rows from entries, cost centres mapped back by entry_id", () => {
    const form = makeForm(MASTER);
    hydrateVoucherForm(form, {
      voucher_type: "Journal", date: "2026-04-11",
      entries: [
        { entry_id: 200, ledger_id: 2, type: "Dr", amount: 500 },
        { entry_id: 201, ledger_id: 3, type: "Cr", amount: 500 },
      ],
      stock_entries: [], bill_references: [],
      cost_centres: [{ entry_id: 200, cost_centre_id: 9, amount: 500 }],
    });
    const c = form.__calls;
    expect(c.setJournalEntryMode).toBe("double");
    expect(c.setJournalRows).toHaveLength(2);
    const dr = c.setJournalRows.find((r: any) => r.type === "Dr");
    expect(dr.ledger).toEqual({ ledger_id: 2, name: "Sales A/c" });
    expect(dr.amountRaw).toBe("500");
    expect(dr.costCentres).toEqual([{ cost_centre_id: 9, amount: 500 }]);
    // the other entry has no cost centres
    expect(c.setJournalRows.find((r: any) => r.type === "Cr").costCentres).toBeUndefined();
  });

  it("excludes Physical Stock & Attendance from the editable set", () => {
    expect(EDITABLE_VOUCHER_TYPES.has("Sales")).toBe(true);
    expect(EDITABLE_VOUCHER_TYPES.has("Payment")).toBe(true);
    expect(EDITABLE_VOUCHER_TYPES.has("Physical Stock")).toBe(false);
    expect(EDITABLE_VOUCHER_TYPES.has("Attendance")).toBe(false);
  });
});
