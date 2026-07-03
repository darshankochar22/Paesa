import type { VoucherRow } from "./ItemVoucherAnalysis";
import type { PartyMov, MovSection } from "./ItemMovementAnalysis";

// Shared helpers for the Movement Analysis drill chain (Stock Group / Stock
// Item / … Analysis). Classify each voucher row by TYPE FAMILY, not goods
// direction, so purchase returns (Debit Note) net inside the supplier's inward
// group and sales returns (Credit Note) net inside the buyer's outward group —
// matching TallyPrime.

const isSalesFamily = (vt: string) => /credit note|sales|sale/i.test(vt || "");

/** Which movement section a voucher row belongs to, by voucher-type family. */
export const rowFamily = (r: VoucherRow): MovSection =>
  isSalesFamily(r.voucher_type) ? "outward" : "inward";

/** Aggregate item voucher rows into per-party inward / outward movement totals. */
export function aggregateParties(rows: VoucherRow[]): { inward: PartyMov[]; outward: PartyMov[] } {
  const inMap = new Map<string, PartyMov>();
  const outMap = new Map<string, PartyMov>();
  const add = (m: Map<string, PartyMov>, name: string, qty: number, basic: number, addl: number) => {
    const prev = m.get(name) ?? { name, qty: 0, basicValue: 0, addl: 0 };
    prev.qty += qty; prev.basicValue += basic; prev.addl += addl;
    m.set(name, prev);
  };
  for (const r of rows) {
    if (!r.voucher_id) continue; // Opening Balance
    const addl = Number(r.addl_cost) || 0;
    const inQty = Number(r.inwards_qty) || 0,  outQty = Number(r.outwards_qty) || 0;
    const inVal = Number(r.inwards_value) || 0, outVal = Number(r.outwards_value) || 0;
    if (rowFamily(r) === "inward") add(inMap,  r.particulars, inQty - outQty, inVal - outVal, addl);
    else                          add(outMap, r.particulars, outQty - inQty, outVal - inVal, addl);
  }
  const sort = (m: Map<string, PartyMov>) =>
    [...m.values()].sort((a, b) => (b.basicValue + b.addl) - (a.basicValue + a.addl));
  return { inward: sort(inMap), outward: sort(outMap) };
}
