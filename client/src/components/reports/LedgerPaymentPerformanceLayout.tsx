import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { OutstandingsRightPanel } from './OutstandingsRightPanel';

/* ── Formatters ────────────────────────────────────────────────────── */
const fmtDate = (d: string) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${dt.getDate()}-${dt.toLocaleString('en-IN', { month: 'short' })}-${String(dt.getFullYear()).slice(-2)}`;
};
const fmtAmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Math.abs(v),
  );
// Signed amount with a Dr / Cr suffix (Dr = positive), Tally-style.
const fmtSigned = (v: number) => `${fmtAmt(v)} ${v >= 0 ? 'Dr' : 'Cr'}`;
const fmtDays = (v: number) =>
  `${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)} days`;

/* ── Types ─────────────────────────────────────────────────────────── */
interface Perf {
  ledger_name: string;
  closing_balance: number;
  total_sales: number;
  number_of_days: number;
  receivables_days: number;
  actual_days: number;
  as_on: string;
}

/* Ledger Payment Performance — the formula breakdown Tally shows when you drill
 * a party from Group Payment Performance:
 *   Performance by Formula (Closing Balance / Total Sales) * Number of Days :
 *   (74,508.00 Dr / 7,571.00 Dr) * 336 = 3,306.65 days                     */
export default function LedgerPaymentPerformanceLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany, activeFY } = useCompany();

  const ledgerId = React.useMemo(() => {
    const p = new URLSearchParams(location.search);
    const id = p.get('ledger_id');
    return id ? Number(id) : ((location.state as any)?.ledger_id ?? null);
  }, [location.search, location.state]);
  const ledgerNameParam = React.useMemo(() => {
    const p = new URLSearchParams(location.search);
    return p.get('ledger_name') || (location.state as any)?.ledger_name || '';
  }, [location.search, location.state]);

  const [data, setData] = React.useState<Perf | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fromDate = activeFY?.start_date || '';
  const cid = selectedCompany?.company_id;
  const fyid = activeFY?.fy_id;

  React.useEffect(() => {
    if (!ledgerId || !cid || !fyid) return;
    setLoading(true);
    setError(null);
    (window as any).api.report
      .ledgerPaymentPerformance(cid, fyid, ledgerId)
      .then((res: any) => {
        if (res?.success) setData(res);
        else setError(res?.error || 'Failed to load.');
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ledgerId, cid, fyid]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        Loading Ledger Payment Performance...
      </div>
    );
  if (error)
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs px-8 text-center">
        {error}
      </div>
    );

  const panelItems = [
    { key: 'F2', label: 'Period' },
    { key: 'F3', label: 'Company' },
    { key: 'F4', label: 'Ledger' },
    { key: '', label: '', spacer: true },
    { key: 'B', label: 'Basis of Values' },
    { key: 'H', label: 'Change View' },
    { key: 'J', label: 'Exception Reports' },
    { key: 'L', label: 'Save View' },
    { key: '', label: '', spacer: true },
    { key: 'E', label: 'Apply Filter' },
  ];

  const name = data?.ledger_name || ledgerNameParam;

  return (
    <div className="flex h-full w-full bg-white font-mono overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sub-header */}
        <div className="bg-white border-b border-gray-200 px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
          <span>
            Ledger : <span className="font-bold">{name}</span>
          </span>
          <span className="ml-auto">
            {data?.as_on ? `${fmtDate(fromDate)} to ${fmtDate(data.as_on)}` : ''}
          </span>
        </div>

        {data && (
          <div className="px-4 py-4 text-[11px] font-mono text-black leading-relaxed">
            <div className="italic">
              Performance by Formula (Closing Balance / Total Sales) * Number of Days :
            </div>
            <div className="mt-1 font-bold">
              ( {fmtSigned(data.closing_balance)} / {fmtSigned(data.total_sales)} ) *{' '}
              {data.number_of_days} = {fmtDays(data.receivables_days)}
            </div>

            {data.actual_days > 0 && (
              <div className="mt-4">
                <div className="italic">Using Actual Bill Clearance Dates :</div>
                <div className="mt-1 font-bold">{fmtDays(data.actual_days)}</div>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto border-t border-gray-200 bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black select-none">
          <span className="flex-1">Average Performance</span>
          <span className="text-right pr-3">{data ? fmtDays(data.receivables_days) : ''}</span>
        </div>
      </div>

      <OutstandingsRightPanel items={panelItems} />
    </div>
  );
}
