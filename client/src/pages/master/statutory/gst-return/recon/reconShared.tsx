// Shared helpers + types for the Tally-style GSTR-2A/2B reconciliation drill
// (dual books-vs-portal comparison → party summary → voucher register).

export type ReconKind = '2A' | '2B';

export interface DualAmounts {
  count: number;
  taxable: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  tax: number;
  invoice: number;
}

export const ZERO: DualAmounts = {
  count: 0,
  taxable: 0,
  igst: 0,
  cgst: 0,
  sgst: 0,
  cess: 0,
  tax: 0,
  invoice: 0,
};

export function fmt(n?: number) {
  if (!n) return '';
  const neg = n < 0;
  const s = Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return neg ? `(-)${s}` : s;
}

export function fmtCount(n?: number) {
  return n ? String(n) : '';
}

// Column widths shared across the drill tables (numbers right-aligned, tabular).
export const NUM = 'px-2 py-0.5 text-right text-xs tabular-nums';
export const HEAD =
  'h-auto px-2 py-1 text-right align-bottom font-bold text-black text-xs whitespace-nowrap';

// The portal row of a books-vs-portal pair is shown italic (strict B/W theme — no blue
// like Tally, no grey text; the distinction is style + an explicit label, not hue).
export const PORTAL_ROW = 'italic';

// Hairline separators + hover, from the strict-B/W token set (no zinc/grey fills).
export const HEAD_HAIRLINE = 'border-b border-gray-300';
export const ROW_HOVER = 'hover:bg-black/[0.03]';
export const EMPTY_CELL = 'px-2 py-3 text-center italic text-black';

// Label shown in the portal row of every books-vs-portal pair so the muted second
// row is unambiguous in a colourless theme.
export const portalTag = (kind: ReconKind) => `As per GSTR-${kind} (Portal)`;
