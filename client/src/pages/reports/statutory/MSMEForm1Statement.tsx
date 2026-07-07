import { useEffect, useState } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { EmptyState } from '@/components/blocks/EmptyState';

interface Form1Row {
  ledger_id: number;
  date: string;
  ref_no: string;
  party: string;
  pan: string;
  amount_pending: number;
  due_on: string;
  overdue_days: number;
}

const fmtAmount = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

const fmtDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const TH = 'px-3 py-1 text-left font-bold text-black align-bottom';
const THR = 'px-3 py-1 text-right font-bold text-black align-bottom';

// MSME Form 1 Statement — dues to Micro/Small enterprise suppliers unpaid beyond the
// MSME due date (MSMED Act §15). Half-yearly MCA MSME-1 return. Reads real overdue
// payables via window.api.msme.getForm1; empty until such dues exist.
export default function MSMEForm1Statement() {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${fmtDate(activeFY.start_date)} to ${fmtDate(activeFY.end_date)}` : '';

  const [rows, setRows] = useState<Form1Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !fyId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await window.api.msme.getForm1(companyId, fyId, activeFY?.end_date, null);
        if (cancelled) return;
        if (res.success) {
          setRows(res.payload.rows ?? []);
          setTotal(res.payload.total ?? 0);
        } else {
          setError(res.error || 'Failed to load MSME Form 1 Statement');
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, fyId, activeFY?.end_date]);

  return (
    <TallyReportLayout
      title="MSME Form 1 Statement"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <span>
          Group&nbsp;&nbsp;:&nbsp;<span className="font-bold">All Items</span>
        </span>
      }
      rightSubtitle={<span>{periodLabel}</span>}
    >
      <div className="w-full flex flex-col font-sans text-xs h-full">
        {error ? (
          <EmptyState message={error} className="italic" />
        ) : loading ? (
          <EmptyState message="Loading MSME Form 1 Statement…" className="italic" />
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="text-xs border-collapse w-full">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-black">
                  <th className={TH}>Date</th>
                  <th className={TH}>Ref. No.</th>
                  <th className={TH}>Party&apos;s Name</th>
                  <th className={TH}>PAN/IT No.</th>
                  <th className={THR}>
                    Amount Pending
                    <div className="font-normal italic text-[10px] text-black/60">
                      after Due Date (as per MSME)
                    </div>
                  </th>
                  <th className={THR}>Due on</th>
                  <th className={THR}>
                    Overdue
                    <div className="font-normal italic text-[10px] text-black/60">by days</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gray-400 italic">
                      No amounts overdue to Micro/Small enterprises for this period.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={`${r.ledger_id}-${r.ref_no}-${i}`} className="border-b border-black/10 hover:bg-black/[0.04]">
                      <td className="px-3 py-1 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="px-3 py-1">{r.ref_no || '—'}</td>
                      <td className="px-3 py-1 font-semibold">{r.party}</td>
                      <td className="px-3 py-1">{r.pan || '—'}</td>
                      <td className="px-3 py-1 text-right tabular-nums">{fmtAmount(r.amount_pending)}</td>
                      <td className="px-3 py-1 text-right whitespace-nowrap">{fmtDate(r.due_on)}</td>
                      <td className="px-3 py-1 text-right tabular-nums">{r.overdue_days || ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-black font-bold">
                    <td className="px-3 py-1.5" colSpan={4}>
                      Total
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtAmount(total)}</td>
                    <td />
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </TallyReportLayout>
  );
}
