import type { StockItemType } from '@/types/entities/StockItem';
import type { UnitType } from '@/types/entities/Unit';

// Shared row types + formatting helpers for the Dealer Excise Opening Stock
// screens — extracted from DealerExciseOpeningStockCreate.tsx (unchanged).

export interface GodownAllocation {
  godown_id: number | null;
  godown_name: string;
  actualRaw: string;
  billedRaw: string;
  rateRaw: string;
  discPercentRaw: string;
}

export interface StockRow {
  id: number;
  stockItem: StockItemType | null;
  quantityRaw: string;
  billedQtyRaw: string;
  rateRaw: string;
  discPercentRaw: string;
  unit: UnitType | null;
  godownAllocations: GodownAllocation[];
}

let rowSeq = 1;
export const blankRow = (): StockRow => ({
  id: rowSeq++,
  stockItem: null,
  quantityRaw: '',
  billedQtyRaw: '',
  rateRaw: '',
  discPercentRaw: '',
  unit: null,
  godownAllocations: [],
});

export const inr = (n: number) =>
  n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Tally-style quantity: integer or 2dp, suffixed with the unit symbol — e.g. "2 nos". */
export const qty = (n: number, unit?: string) => {
  if (!n) return '';
  const num = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return unit ? `${num} ${unit}` : num;
};

export const rowAmount = (r: StockRow): number => {
  const q = Number(r.billedQtyRaw || r.quantityRaw) || 0;
  const rate = Number(r.rateRaw) || 0;
  const disc = Number(r.discPercentRaw) || 0;
  const gross = q * rate;
  return gross - (gross * disc) / 100;
};

export const focusSel = (sel: string) =>
  setTimeout(() => (document.querySelector(sel) as HTMLInputElement | null)?.focus(), 40);
