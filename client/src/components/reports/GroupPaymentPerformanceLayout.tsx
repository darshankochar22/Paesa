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
const fmtDays = (v: number) =>
  !v
    ? ''
    : `${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)} days`;
const fmtDaysTotal = (v: number) =>
  `${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)} days`;

/* ── Types ─────────────────────────────────────────────────────────── */
interface PerfRow {
  ledger_id: number;
  party: string;
  closing: number;
  total_sales: number;
  receivables_days: number;
  actual_days: number;
}

/* Group Payment Performance — the drill behind Ratio Analysis "Recv. Turnover
 * in days". One row per debtor with the receivables-formula performance and the
 * actual-bill-clearance performance; a row drills to its Ledger Payment
 * Performance. Group + name come from the URL (Ratio Analysis passes them). */
export default function GroupPaymentPerformanceLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany, activeFY } = useCompany();

  const [groupId, setGroupId] = React.useState<number | null>(() => {
    const p = new URLSearchParams(location.search);
    const id = p.get('group_id');
    return id ? Number(id) : ((location.state as any)?.group_id ?? null);
  });
  const [groupName, setGroupName] = React.useState<string>(() => {
    const p = new URLSearchParams(location.search);
    return p.get('group_name') || (location.state as any)?.group_name || 'Sundry Debtors';
  });

  const [rows, setRows] = React.useState<PerfRow[]>([]);
  const [totalReceivables, setTotRecv] = React.useState(0);
  const [totalActual, setTotActual] = React.useState(0);
  const [as_on, setAsOn] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIdx, setFocused] = React.useState(0);

  const fromDate = activeFY?.start_date || '';
  const cid = selectedCompany?.company_id;
  const fyid = activeFY?.fy_id;
  const companyName =
    (selectedCompany as any)?.name || (selectedCompany as any)?.company_name || '';

  /* If no group was passed, resolve Sundry Debtors from the group list. */
  React.useEffect(() => {
    if (groupId || !cid) return;
    (window as any).api.group.getAll(cid).then((res: any) => {
      const list = Array.isArray(res) ? res : (res?.groups ?? res?.data ?? []);
      const debtors = list.find((g: any) => (g.name || '').toLowerCase().includes('debtors'));
      if (debtors) {
        setGroupId(debtors.group_id);
        setGroupName(debtors.name);
      }
    });
  }, [cid, groupId]);

  /* Load performance data. */
  React.useEffect(() => {
    if (!groupId || !cid || !fyid) return;
    setLoading(true);
    setError(null);
    setFocused(0);
    (window as any).api.report
      .groupPaymentPerformance(cid, fyid, groupId)
      .then((res: any) => {
        if (res?.success) {
          setRows(res.rows || []);
          setTotRecv(res.totalReceivables || 0);
          setTotActual(res.totalActual || 0);
          setAsOn(res.as_on || '');
        } else {
          setError(res?.error || 'Failed to load.');
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [groupId, cid, fyid]);

  const openRow = React.useCallback(
    (row: PerfRow) => {
      if (row.ledger_id != null) {
        navigate(
          `/reports/accounts/ledger-payment-performance?ledger_id=${row.ledger_id}&ledger_name=${encodeURIComponent(row.party)}`,
        );
      }
    },
    [navigate],
  );

  /* Keyboard nav. */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocused((p) => Math.min(rows.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocused((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (rows[focusedIdx]) openRow(rows[focusedIdx]);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows, focusedIdx, openRow, navigate]);

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        Loading Group Payment Performance...
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
    { key: 'F4', label: 'Group' },
    { key: '', label: '', spacer: true },
    { key: 'F5', label: 'Ledger-wise' },
    { key: '', label: '', spacer: true },
    { key: 'B', label: 'Basis of Values' },
    { key: 'H', label: 'Change View' },
    { key: 'J', label: 'Exception Reports' },
    { key: 'L', label: 'Save View' },
    { key: '', label: '', spacer: true },
    { key: 'E', label: 'Apply Filter' },
    { key: 'C', label: 'New Column' },
    { key: 'A', label: 'Alter Column' },
    { key: 'N', label: 'Auto Column' },
  ];

  return (
    <div className="flex h-full w-full bg-white font-mono overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sub-header */}
        <div className="bg-white border-b border-gray-200 px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
          <span>
            Group : <span className="font-bold">{groupName}</span>
          </span>
          <span className="ml-auto text-right">
            {companyName && <span className="font-bold">{companyName}</span>}
            {companyName && '  ·  '}
            {as_on ? `${fmtDate(fromDate)} to ${fmtDate(as_on)}` : ''}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead className="sticky top-0 bg-white z-10 select-none">
              <tr className="border-b border-gray-200">
                <th className="px-3 py-1 text-left align-bottom font-bold" rowSpan={2}>
                  Particulars
                </th>
                <th className="px-3 py-1 text-right font-bold w-[25%] italic">
                  Using Receivables
                  <br />
                  Formula
                </th>
                <th className="px-3 py-1 text-right font-bold w-[25%] italic">
                  Using Actual Bill
                  <br />
                  Clearance Dates
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-black italic">
                    No parties under this group.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const isFocused = focusedIdx === idx;
                  return (
                    <tr
                      key={row.ledger_id}
                      className={`border-b border-gray-200 cursor-pointer select-none transition-colors ${isFocused ? 'bg-black/[0.06] text-black' : 'hover:bg-black/[0.03] text-black'}`}
                      onClick={() => {
                        setFocused(idx);
                        openRow(row);
                      }}
                    >
                      <td className="px-3 py-1.5">{row.party}</td>
                      <td className="px-3 py-1.5 text-right">{fmtDays(row.receivables_days)}</td>
                      <td className="px-3 py-1.5 text-right">{fmtDays(row.actual_days)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Total row */}
        <div className="border-t border-gray-200 bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black select-none">
          <span className="flex-1">Performance for the Group</span>
          <span className="w-[25%] text-right">{fmtDaysTotal(totalReceivables)}</span>
          <span className="w-[25%] text-right pr-3">{fmtDaysTotal(totalActual)}</span>
        </div>
      </div>

      <OutstandingsRightPanel items={panelItems} />
    </div>
  );
}
