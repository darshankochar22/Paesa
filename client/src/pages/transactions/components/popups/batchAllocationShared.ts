import type { BatchAllocation } from '../../types';

// Shared types + pure helpers for the Stock Item (Batch/Lot) allocation popup —
// extracted from BatchAllocationPopup.tsx (behaviour unchanged).

// Saved allocation — BatchAllocation plus the resolved ISO due date (additive).
export type SavedAllocation = BatchAllocation & { due_on_date?: string };

export interface ActiveBatch {
  name: string;
  mfg_date: string | null;
  expiry_date: string | null;
  balance: number;
}

export interface TrackingOption {
  name: string;
  batch?: string | null;
  godown?: string | null;
  date?: string | null;
  balance?: number;
  rate?: number;
}

export interface OrderOption {
  name: string;
  batch?: string | null;
  godown?: string | null;
  due_on?: string | null;
  balance?: number;
}

export const NOT_APPLICABLE = '◆ Not Applicable';

export interface GodownOption {
  godown_id?: number;
  name: string;
  parent_godown_id?: number;
}

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseExpiry(input: string, baseIso: string): string {
  const raw = (input || '').trim();
  if (!raw) return '';
  const direct = new Date(raw);
  if (
    !isNaN(direct.getTime()) &&
    /\d{4}|[A-Za-z]{3}/.test(raw) &&
    !/year|month|day|yr|mo|wk|week/i.test(raw)
  ) {
    return toIso(direct);
  }
  const m = raw.match(/^(\d+)\s*(year|years|yr|month|months|mo|week|weeks|wk|day|days)$/i);
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    const base = new Date(baseIso);
    if (isNaN(base.getTime())) return '';
    if (unit.startsWith('year') || unit === 'yr') base.setFullYear(base.getFullYear() + n);
    else if (unit.startsWith('mo')) base.setMonth(base.getMonth() + n);
    else if (unit.startsWith('week') || unit === 'wk') base.setDate(base.getDate() + n * 7);
    else base.setDate(base.getDate() + n);
    return toIso(base);
  }
  return '';
}

export const num = (v: number | undefined) =>
  Number.isFinite(v)
    ? (v as number).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

export const round2 = (v: number) => Math.round(v * 100) / 100;

// Per-godown balance label — Tally shows negatives as "(-)9 Box"; blank when zero.
export const fmtQty = (q: number | undefined, unit?: string) => {
  if (!q) return '';
  const u = unit || '';
  return q < 0 ? `(-)${Math.abs(q)} ${u}`.trim() : `${q} ${u}`.trim();
};
