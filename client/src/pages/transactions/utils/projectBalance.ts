import { formatIndianCurrency } from './formatCurrency';
import type { ParticularRow } from '../types';

// A ledger is Dr-nature (asset/expense) unless it is a Liability or Income
// account — the SAME rule the backend's getLedgerBalance uses to decide the
// Dr/Cr side, so the projected label always agrees with the stored one.
const isDrNatureLedger = (nature?: string): boolean =>
  nature !== 'Liabilities' && nature !== 'Income';

/**
 * TallyPrime shows a ledger's *running* balance during voucher entry — the
 * stored balance plus the effect of the amount just keyed on this line. So a
 * fresh Cash ledger (0.00) receiving 8,000 reads "8,000.00 Dr" the instant the
 * amount is entered, and the Capital A/c credited 8,000 reads "8,000.00 Cr".
 *
 * `rawBalance` is the signed balance from the backend (positive on the ledger's
 * natural side). Returns the "X.XX Dr/Cr" label including this line's amount.
 */
export function projectedBalanceLabel(
  rawBalance: number,
  nature: string | undefined,
  type: 'Dr' | 'Cr',
  amount: number,
): string {
  const isDrNature = isDrNatureLedger(nature);
  // Posting on the ledger's natural side grows the balance; the opposite side shrinks it.
  const effect = isDrNature ? (type === 'Dr' ? amount : -amount) : type === 'Cr' ? amount : -amount;
  const projected = rawBalance + effect;
  const abs = Math.abs(projected);
  if (abs <= 0.01) return '0.00';
  // A positive projected balance sits on the ledger's natural side.
  const side = isDrNature === projected > 0 ? 'Dr' : 'Cr';
  return `${formatIndianCurrency(abs)} ${side}`;
}

/**
 * Projected running balance for a Dr/Cr or single-entry particular row, computed
 * entirely from the row's own fields (stored raw balance + this line's amount).
 * Falls back to the fetched label until a balance is loaded.
 */
export function rowBalanceLabel(row: ParticularRow): string {
  if (!row.ledger) return row.ledgerBalanceLabel || '';
  const raw = Number(row.ledgerBalance);
  const amount = Number(row.amountRaw) || 0;
  return projectedBalanceLabel(Number.isFinite(raw) ? raw : 0, row.ledger.nature, row.type, amount);
}
