import { describe, it, expect } from "vitest";
import {
  partyGroupIds,
  filterPartyGroups,
  filterPartyLedgers,
} from "../lib/outstandingParties";

// Mirrors the predefined seed: Sundry Debtors under Current Assets,
// Sundry Creditors under Current Liabilities, plus a couple of user sub-groups
// and unrelated groups.
const GROUPS = [
  { group_id: 1, name: "Current Assets", parent_group_id: null },
  { group_id: 2, name: "Current Liabilities", parent_group_id: null },
  { group_id: 3, name: "Sundry Debtors", parent_group_id: 1 },
  { group_id: 4, name: "Sundry Creditors", parent_group_id: 2 },
  { group_id: 5, name: "North Debtors", parent_group_id: 3 }, // sub-group of Sundry Debtors
  { group_id: 6, name: "Local Creditors", parent_group_id: 4 }, // sub-group of Sundry Creditors
  { group_id: 7, name: "Bank Accounts", parent_group_id: 1 }, // unrelated
  { group_id: 8, name: "Duties & Taxes", parent_group_id: 2 }, // unrelated
];

describe("partyGroupIds", () => {
  it("includes both party groups and their descendant sub-groups", () => {
    const ids = partyGroupIds(GROUPS);
    expect([...ids].sort()).toEqual([3, 4, 5, 6]);
  });

  it("excludes unrelated groups and their parents", () => {
    const ids = partyGroupIds(GROUPS);
    expect(ids.has(1)).toBe(false); // Current Assets (parent, not a party)
    expect(ids.has(2)).toBe(false); // Current Liabilities
    expect(ids.has(7)).toBe(false); // Bank Accounts
    expect(ids.has(8)).toBe(false); // Duties & Taxes
  });

  it("does not loop forever on a cyclic parent chain", () => {
    const cyclic = [
      { group_id: 10, name: "A", parent_group_id: 11 },
      { group_id: 11, name: "B", parent_group_id: 10 },
    ];
    expect(partyGroupIds(cyclic).size).toBe(0);
  });
});

describe("filterPartyGroups", () => {
  it("keeps only party groups + sub-groups, dropping everything else", () => {
    const kept = filterPartyGroups(GROUPS).map((g) => g.name).sort();
    expect(kept).toEqual(["Local Creditors", "North Debtors", "Sundry Creditors", "Sundry Debtors"]);
  });
});

describe("filterPartyLedgers", () => {
  it("keeps ledgers under party groups (incl. sub-groups), drops the rest", () => {
    const ledgers = [
      { ledger_id: 1, name: "ABC Customers", group_id: 3 }, // Sundry Debtors
      { ledger_id: 2, name: "Bharat Suppliers", group_id: 4 }, // Sundry Creditors
      { ledger_id: 3, name: "Delhi Debtor", group_id: 5 }, // North Debtors (sub-group)
      { ledger_id: 4, name: "HDFC Bank", group_id: 7 }, // Bank Accounts — excluded
      { ledger_id: 5, name: "CGST", group_id: 8 }, // Duties & Taxes — excluded
      { ledger_id: 6, name: "Orphan", group_id: null }, // no group — excluded
    ];
    const kept = filterPartyLedgers(ledgers, GROUPS).map((l) => l.name).sort();
    expect(kept).toEqual(["ABC Customers", "Bharat Suppliers", "Delhi Debtor"]);
  });
});
