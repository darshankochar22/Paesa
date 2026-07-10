import type { BatchAllocation } from '../../types';
import { toLocalIsoDate } from '@/lib/dueDate';

// Shared types + pure helpers for the order-tracking Stock Item Allocations
// popup — extracted from OrderItemAllocationPopup.tsx (behaviour unchanged).

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
  rate?: number;
}

export interface GodownOption {
  godown_id?: number;
  name: string;
}

export const NA = '♦ Not Applicable';
export const EOL = '♦ End of List';

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

export const num = (v: number | undefined) =>
  Number.isFinite(v)
    ? (v as number).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

// Free-text expiry parsing — same behaviour as BatchAllocationPopup: an actual
// date, or a duration ("2 years", "6 months", "30 days") relative to baseIso.
export function parseExpiry(input: string, baseIso: string): string {
  const raw = (input || '').trim();
  if (!raw) return '';
  const direct = new Date(raw);
  if (
    !isNaN(direct.getTime()) &&
    /\d{4}|[A-Za-z]{3}/.test(raw) &&
    !/year|month|day|yr|mo|wk|week/i.test(raw)
  ) {
    return toLocalIsoDate(direct);
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
    return toLocalIsoDate(base);
  }
  return '';
}

// Per-godown balance label — Tally shows negatives as "(-)9 Box"; blank when zero.
export const fmtQty = (q: number | undefined, unit?: string) => {
  if (!q) return '';
  const u = unit || '';
  return q < 0 ? `(-)${Math.abs(q)} ${u}`.trim() : `${q} ${u}`.trim();
};

export const focusSel = (sel: string) =>
  setTimeout(() => (document.querySelector(sel) as HTMLElement | null)?.focus(), 30);

// A Tracking No. is "real" (Order No. + Due on apply) when it is set and is not
// the Not Applicable / End of List sentinel.
export const hasTracking = (r: BatchAllocation) =>
  !!r.tracking_no && r.tracking_no !== NA && r.tracking_no !== EOL;
