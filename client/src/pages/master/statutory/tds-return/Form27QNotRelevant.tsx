import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { EmptyState } from '@/components/blocks/EmptyState';

const fmt = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

// Form 27Q → "Not Relevant in this Return" — voucher-type breakdown; a row drills to the
// filtered voucher register below (?type=), and a register row opens the voucher.
export function Form27QNotRelevant() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [rows, setRows] = useState<{ voucher_type: string; count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !fyId) return;
    (async () => {
      setLoading(true);
      const res = await window.api.tds.getForm27QDrill({
        company_id: companyId,
        fy_id: fyId,
        view: 'not_relevant',
      });
      if (res.success) {
        setRows(res.payload.breakdown ?? []);
        setTotal(res.payload.total ?? 0);
      }
      setLoading(false);
    })();
  }, [companyId, fyId]);

  return (
    <TallyReportLayout
      title="Form 27Q - Not Relevant in this Return"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading…" className="italic" />}
        {!loading && (
          <>
            <div className="flex font-bold px-2 py-1 border-b border-gray-300">
              <div className="flex-1">P a r t i c u l a r s</div>
              <div className="w-32 text-right">No. of Vouchers</div>
            </div>
            {rows.map((r) => (
              <div
                key={r.voucher_type}
                className="flex px-2 py-0.5 font-semibold cursor-pointer hover:bg-[#ffcc00]"
                onClick={() =>
                  navigate(
                    `/reports/statutory/tds/form-27q/register?type=${encodeURIComponent(r.voucher_type)}&bucket=not_relevant`,
                  )
                }
              >
                <div className="flex-1">{r.voucher_type}</div>
                <div className="w-32 text-right">{r.count}</div>
              </div>
            ))}
            <div className="flex font-bold px-2 py-1 mt-2 border-t border-gray-400">
              <div className="flex-1">Total</div>
              <div className="w-32 text-right">{total || ''}</div>
            </div>
          </>
        )}
      </div>
    </TallyReportLayout>
  );
}

// Form 27Q → Voucher Register — vouchers of one type inside one bucket
// (e.g. "Credit Note (Not Relevant)"); a row opens the voucher itself.
export function Form27QVoucherRegister() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const voucherType = params.get('type') || '';
  const bucket = params.get('bucket') || 'not_relevant';
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !fyId) return;
    (async () => {
      setLoading(true);
      const res = await window.api.tds.getForm27QDrill({
        company_id: companyId,
        fy_id: fyId,
        view: 'register',
        bucket,
        voucher_type: voucherType || undefined,
      });
      if (res.success) setRows(res.payload.vouchers ?? []);
      setLoading(false);
    })();
  }, [companyId, fyId, voucherType, bucket]);

  const bucketLabel = bucket === 'not_relevant' ? 'Not Relevant' : 'Uncertain';

  return (
    <TallyReportLayout
      title="Form 27Q - Voucher Register"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        <div className="px-2 py-1 border-b border-gray-300">
          <span className="text-gray-600">Vouchers of&nbsp;&nbsp;:&nbsp;</span>
          <span className="font-bold">
            {voucherType || 'All'} ({bucketLabel})
          </span>
        </div>
        {loading && <EmptyState message="Loading…" className="italic" />}
        {!loading && (
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr className="border-b border-gray-300 font-bold text-black">
                <th className="px-2 py-1 text-left w-20">Date</th>
                <th className="px-2 py-1 text-left">Particulars</th>
                <th className="px-2 py-1 text-right w-28">Vch Type</th>
                <th className="px-2 py-1 text-right w-20">Vch No.</th>
                <th className="px-2 py-1 text-right w-28">Debit Amount</th>
                <th className="px-2 py-1 text-right w-28">Credit Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.voucher_id}
                  className="cursor-pointer hover:bg-[#ffcc00]"
                  onClick={() => navigate(`/transactions/voucher/${r.voucher_id}`)}
                >
                  <td className="px-2 py-0.5">{r.date}</td>
                  <td className="px-2 py-0.5 font-semibold">{r.particulars}</td>
                  <td className="px-2 py-0.5 text-right font-semibold">{r.voucher_type}</td>
                  <td className="px-2 py-0.5 text-right">{r.voucher_number}</td>
                  <td className="px-2 py-0.5 text-right tabular-nums" />
                  <td className="px-2 py-0.5 text-right tabular-nums">{fmt(r.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-400 font-bold">
                <td className="px-2 py-1" colSpan={4}>
                  Total
                </td>
                <td className="px-2 py-1 text-right" />
                <td className="px-2 py-1 text-right tabular-nums">
                  {fmt(rows.reduce((s, r) => s + (r.amount || 0), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </TallyReportLayout>
  );
}

export default Form27QNotRelevant;
