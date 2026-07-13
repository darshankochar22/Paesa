import { gstComponentOf } from './gstRow';

// GST state name (lowercase) → 2-digit state code. Mirrors the server's STATE_CODE_MAP
// (server/gst/gstTaxEngine.js) so the client's interstate check matches save-time validation.
const STATE_CODE_MAP: Record<string, string> = {
  'jammu and kashmir': '01',
  'himachal pradesh': '02',
  punjab: '03',
  chandigarh: '04',
  uttarakhand: '05',
  haryana: '06',
  delhi: '07',
  rajasthan: '08',
  'uttar pradesh': '09',
  bihar: '10',
  sikkim: '11',
  'arunachal pradesh': '12',
  nagaland: '13',
  manipur: '14',
  mizoram: '15',
  tripura: '16',
  meghalaya: '17',
  assam: '18',
  'west bengal': '19',
  jharkhand: '20',
  odisha: '21',
  chhattisgarh: '22',
  'madhya pradesh': '23',
  gujarat: '24',
  'daman and diu': '26',
  'dadra and nagar haveli and daman and diu': '26',
  maharashtra: '27',
  'andhra pradesh': '37',
  karnataka: '29',
  goa: '30',
  lakshadweep: '31',
  kerala: '32',
  'tamil nadu': '33',
  puducherry: '34',
  'andaman and nicobar islands': '35',
  telangana: '36',
  ladakh: '38',
};

// Resolve a 2-digit state code, preferring a GSTIN's first two digits (like the server),
// else the state name. Returns "" when it can't be determined.
export function resolveStateCode(stateName?: string | null, gstin?: string | null): string {
  const g = String(gstin || '').trim();
  if (g.length >= 2 && /^\d{2}$/.test(g.slice(0, 2))) return g.slice(0, 2);
  const n = String(stateName || '')
    .trim()
    .toLowerCase();
  return STATE_CODE_MAP[n] || '';
}

export interface SupplyContext {
  companyState?: string | null;
  companyGstin?: string | null;
  placeOfSupply?: string | null;
  partyState?: string | null;
  partyGstin?: string | null;
}

// Same rule as the server: company registration state vs the destination (place of supply,
// else party state). Returns null when it can't be determined confidently.
export function computeInterstate(ctx: SupplyContext): boolean | null {
  const companyCode = resolveStateCode(ctx.companyState, ctx.companyGstin);
  const destState = ctx.placeOfSupply || ctx.partyState || ctx.companyState || '';
  const destCode = resolveStateCode(destState, ctx.partyGstin);
  if (!companyCode || !destCode) return null;
  return companyCode !== destCode;
}

// Validate a tax ledger the user is trying to ADD, at selection time. Returns an error
// message to block the selection, or null to allow it.
//   - Interstate rule: only blocks when interstate status is known confidently, otherwise
//     defers to the authoritative save-time check.
//   - Duplicate rule: the same GST component (CGST/SGST/IGST/Cess) can't be added twice.
//     `existingLedgers` are the tax ledgers already on OTHER rows of this voucher.
export function validateTaxLedgerSelection(
  ledger: any,
  ctx: SupplyContext,
  existingLedgers: any[] = [],
): string | null {
  const component = gstComponentOf(ledger);
  if (!component) return null; // not a GST ledger (freight, discount, …)

  // Wrong-side rule (primary components only).
  if (component === 'CGST' || component === 'SGST' || component === 'IGST') {
    const interstate = computeInterstate(ctx);
    if (interstate === true && (component === 'CGST' || component === 'SGST')) {
      return 'Inter-state supply — Place of Supply is a different state from your GST registration. Use IGST, not CGST/SGST.';
    }
    if (interstate === false && component === 'IGST') {
      return 'Intra-state supply — Place of Supply is the same state as your GST registration. Use CGST + SGST, not IGST.';
    }
  }

  // Mutual-exclusivity rule — a single invoice is either inter-state (IGST) or
  // intra-state (CGST + SGST), never both. This holds even when the supply state
  // can't be resolved (party state unknown), which is exactly when the wrong-side
  // rule above defers. Without it, IGST + CGST + SGST can all be stacked, double-
  // taxing the invoice.
  const existingComponents = existingLedgers
    .map((l) => gstComponentOf(l))
    .filter((c): c is 'CGST' | 'SGST' | 'IGST' | 'CESS' => c !== null);
  if (component === 'IGST' && existingComponents.some((c) => c === 'CGST' || c === 'SGST')) {
    return "CGST/SGST is already on this voucher — an invoice can't have both IGST and CGST/SGST. Remove one.";
  }
  if ((component === 'CGST' || component === 'SGST') && existingComponents.includes('IGST')) {
    return "IGST is already on this voucher — an invoice can't have both IGST and CGST/SGST. Remove it first.";
  }

  // Duplicate rule — one ledger per GST component.
  const alreadyPresent = existingLedgers.some((l) => gstComponentOf(l) === component);
  if (alreadyPresent) {
    const label = component === 'SGST' ? 'SGST/UTGST' : component;
    return `${label} is already added on this voucher — each GST component can be added only once.`;
  }
  return null;
}
