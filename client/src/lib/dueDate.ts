// Tally-style "Due on" input parsing. Users type either a duration ("9 Days",
// "2 Months", "1 Year", or bare "9" = days) or an actual date. Reports and
// order-outstanding logic need a real ISO date, so allocations store BOTH:
// the raw text the user typed (display) and the resolved ISO date (logic).

const DUR_RE = /^\s*(\d+)\s*(d|day|days|w|week|weeks|m|month|months|y|year|years)?\s*$/i;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Resolve a "Due on" entry to an ISO date (YYYY-MM-DD), relative to `baseDate`
 * (the voucher date, ISO). Returns null when the text is unparseable.
 */
export function parseDueOn(
  text: string | null | undefined,
  baseDate?: string | null,
): string | null {
  const raw = (text || '').trim();
  if (!raw) return null;

  // Already an ISO date?
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // Duration form: "9", "9 Days", "2 Months", "1 Year".
  const m = raw.match(DUR_RE);
  if (m) {
    const n = Number(m[1]);
    const unit = (m[2] || 'd').toLowerCase();
    const base = baseDate && /^\d{4}-\d{2}-\d{2}/.test(baseDate) ? new Date(baseDate) : new Date();
    if (Number.isNaN(base.getTime())) return null;
    const d = new Date(base);
    if (unit.startsWith('d') || unit.startsWith('w')) {
      d.setDate(d.getDate() + n * (unit.startsWith('w') ? 7 : 1));
    } else if (unit.startsWith('m')) {
      d.setMonth(d.getMonth() + n);
    } else {
      d.setFullYear(d.getFullYear() + n);
    }
    return toIso(d);
  }

  // Date-ish forms: "1-Jul-26", "01/07/2026", "1 Jul 2026".
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return toIso(parsed);
  return null;
}

/** Local-timezone ISO date (avoids the toISOString UTC shift). */
export function toLocalIsoDate(d: Date): string {
  return toIso(d);
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Parse a Tally-style typed date into ISO (YYYY-MM-DD). Tally is DAY-first, so
 * "01-4-2026" / "1/4/26" / "1-Apr-2026" all mean 1 April 2026. A bare number is
 * treated as a day within `refIso`'s month/year (Tally shortcut). 2-digit years
 * map to 2000-2099. Returns null when unparseable.
 */
export function parseTallyDate(text: string, refIso?: string | null): string | null {
  const raw = (text || '').trim();
  const raw = (text || '').trim();
  if (!raw) return null;

  // Already ISO.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const ref = refIso && /^\d{4}-\d{2}-\d{2}/.test(refIso) ? new Date(refIso) : new Date();
  const refYear = ref.getFullYear();
  const refMonth = ref.getMonth() + 1;

  const norm = (y: number) => (y < 100 ? 2000 + y : y);
  const build = (day: number, month: number, year: number): string | null => {
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day);
    // Reject overflow (e.g. 31 Apr rolling into May).
    if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return toIso(d);
  };

  // Bare day number → day within reference month/year.
  if (/^\d{1,2}$/.test(raw)) return build(Number(raw), refMonth, refYear);

  // day <sep> month(name|num) [<sep> year]
  const parts = raw.split(/[-/. ]+/).filter(Boolean);
  if (parts.length < 2) return null;

  const day = Number(parts[0]);
  if (!Number.isInteger(day)) return null;

  let month: number;
  if (/^\d{1,2}$/.test(parts[1])) {
    month = Number(parts[1]);
  } else {
    const mi = MONTHS.indexOf(parts[1].slice(0, 3).toLowerCase());
    if (mi === -1) return null;
    month = mi + 1;
  }

  const year = parts[2] != null && /^\d{1,4}$/.test(parts[2]) ? norm(Number(parts[2])) : refYear;
  return build(day, month, year);
}

/** Format an ISO date as Tally's "1-Apr-26" display form. */
export function formatTallyDate(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const mon = MONTHS[m - 1];
  return `${d}-${mon.charAt(0).toUpperCase() + mon.slice(1)}-${String(y).slice(2)}`;
}
