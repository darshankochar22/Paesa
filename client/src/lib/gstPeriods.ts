// Shared GST return-period helpers. A monthly GST return (GSTR-1 / GSTR-3B) is filtered
// server-side by period × fy_id, so the only valid periods are the months of the active FY.
// Defaulting a picker to the current calendar month silently empties the report for any
// company whose active FY doesn't contain today (see gst-return-period-default-trap).

export interface FyPeriod {
  value: string; // MMYYYY, matches the server's return_period
  label: string; // e.g. "Apr 2025"
  month: string; // MM
  year: string; // YYYY
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Every month belonging to the active FY, oldest→newest.
export function fyPeriods(fy?: { start_date?: string; end_date?: string } | null): FyPeriod[] {
  if (!fy?.start_date || !fy?.end_date) return [];
  const [sy, sm] = fy.start_date.split('-').map(Number);
  const [ey, em] = fy.end_date.split('-').map(Number);
  const out: FyPeriod[] = [];
  let y = sy;
  let m = sm;
  for (let i = 0; i < 240 && (y < ey || (y === ey && m <= em)); i++) {
    const mm = String(m).padStart(2, '0');
    out.push({ value: `${mm}${y}`, label: `${MONTHS[m - 1]} ${y}`, month: mm, year: String(y) });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

// Today's month if it falls inside the active FY, otherwise the FY's last month — so a
// report/dialog opens on a period that actually has vouchers.
export function defaultPeriod(today: Date, periods: FyPeriod[]) {
  const tm = String(today.getMonth() + 1).padStart(2, '0');
  const ty = String(today.getFullYear());
  const todayVal = `${tm}${ty}`;
  if (periods.some((p) => p.value === todayVal)) return { month: tm, year: ty };
  const last = periods[periods.length - 1];
  return last ? { month: last.month, year: last.year } : { month: tm, year: ty };
}
