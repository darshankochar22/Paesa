import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { EmptyState } from '@/components/blocks/EmptyState';
import { cn } from '@/lib/utils';

interface CollectionRow {
  label: string;
  assessable_prev: number;
  assessable_current: number;
  assessable_total: number;
  tax_collectable: number;
  collected_prev: number;
  collected_current: number;
  collected_total: number;
  balance: number;
}

const fmt = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

const NUM = 'px-2 py-0.5 text-right tabular-nums';

function CollectionCells({ r }: { r: CollectionRow }) {
  return (
    <>
      <td className={cn(NUM, 'w-24')}>{fmt(r.assessable_prev)}</td>
      <td className={cn(NUM, 'w-28')}>{fmt(r.assessable_current)}</td>
      <td className={cn(NUM, 'w-24 border-r border-gray-200')}>{fmt(r.assessable_total)}</td>
      <td className={cn(NUM, 'w-28 border-r border-gray-200')}>{fmt(r.tax_collectable)}</td>
      <td className={cn(NUM, 'w-24')}>{fmt(r.collected_prev)}</td>
      <td className={cn(NUM, 'w-28')}>{fmt(r.collected_current)}</td>
      <td className={cn(NUM, 'w-24 border-r border-gray-200')}>{fmt(r.collected_total)}</td>
      <td className={cn(NUM, 'w-28')}>{fmt(r.balance)}</td>
    </>
  );
}

const COLS_HEAD = (
  <thead>
    <tr>
      <th
        className="px-2 py-1 text-left align-bottom font-bold text-black text-xs border-b border-r border-gray-300 w-72"
        rowSpan={2}
      >
        P a r t i c u l a r s
      </th>
      <th
        className="px-2 py-0.5 text-center font-bold text-black text-xs border-b border-r border-gray-300"
        colSpan={3}
      >
        Assessable Value
      </th>
      <th
        className="px-2 py-1 text-right align-bottom font-bold text-black text-[10px] border-b border-r border-gray-300 whitespace-pre-line"
        rowSpan={2}
      >
        {'Tax\nCollectable'}
      </th>
      <th
        className="px-2 py-0.5 text-center font-bold text-black text-xs border-b border-r border-gray-300"
        colSpan={3}
      >
        Collected
      </th>
      <th
        className="px-2 py-1 text-right align-bottom font-bold text-black text-[10px] border-b border-gray-300 whitespace-pre-line"
        rowSpan={2}
      >
        {'Balance\nCollectable'}
      </th>
    </tr>
    <tr>
      {['Prev. Period', 'Current Period', 'Total', 'Prev. Period', 'Current Period', 'Total'].map(
        (h, i) => (
          <th
            key={i}
            className={cn(
              'px-2 py-1 text-right align-bottom font-bold text-black text-[10px] whitespace-pre-line',
              (i === 2 || i === 5) && 'border-r border-gray-300',
            )}
          >
            {h}
          </th>
        ),
      )}
    </tr>
  </thead>
);

// Form 27EQ (#204) — the quarterly TCS return; TCS twin of Form 27Q. Count rows drill:
// Total → Statistics, Not Relevant → breakdown, Uncertain → exception tree; a Collection
// Details row drills to its per-bucket detail screen.
export default function Form27EQ() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !fyId) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await window.api.tcs.getForm27EQ({ company_id: companyId, fy_id: fyId });
        if (res.success) setData(res.payload);
        else setError(res.error || 'Failed to load Form 27EQ.');
      } catch (e: any) {
        setError(e.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId, fyId]);

  const vs = data?.voucher_status ?? { total: 0, included: 0, not_relevant: 0, uncertain: 0 };
  const collections: CollectionRow[] = data?.collection_details ?? [];
  const totalCollected: CollectionRow = data?.total_collected ?? {
    label: 'Total Collected',
    assessable_prev: 0,
    assessable_current: 0,
    assessable_total: 0,
    tax_collectable: 0,
    collected_prev: 0,
    collected_current: 0,
    collected_total: 0,
    balance: 0,
  };
  const payment = data?.payment ?? {
    included: 0,
    uncertain: 0,
    paid_amount: 0,
    balance_payable: 0,
  };
  const period =
    data?.period_label ?? (activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '');

  return (
    <TallyReportLayout
      title="Form 27EQ"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{period}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Computing Form 27EQ…" className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && data && (
          <>
            {/* Voucher status summary — count rows drill */}
            <div className="flex flex-col border-b border-gray-300">
              <div className="flex font-bold px-2 py-1 border-b border-gray-200">
                <div className="flex-1">P a r t i c u l a r s</div>
                <div className="w-24 text-right">Count</div>
              </div>
              <div
                className="flex px-2 py-0.5 font-bold bg-[#ffcc00] cursor-pointer hover:brightness-95"
                onClick={() => navigate('/reports/accounts/statistics')}
              >
                <div className="flex-1">Total Vouchers</div>
                <div className="w-24 text-right">{vs.total || ''}</div>
              </div>
              <div className="flex px-4 py-0.5">
                <div className="flex-1">Included in return</div>
                <div className="w-24 text-right">{vs.included || ''}</div>
              </div>
              <div
                className="flex px-4 py-0.5 text-gray-500 cursor-pointer hover:bg-[#e6f2ff]"
                onClick={() => navigate('/reports/statutory/tcs/form-27eq/not-relevant')}
              >
                <div className="flex-1">Not Relevant in this Return</div>
                <div className="w-24 text-right">{vs.not_relevant || ''}</div>
              </div>
              <div
                className="flex px-4 py-0.5 pb-2 text-orange-600 font-semibold cursor-pointer hover:bg-[#e6f2ff]"
                onClick={() => navigate('/reports/statutory/tcs/form-27eq/uncertain')}
              >
                <div className="flex-1">Uncertain Transactions (Corrections needed)</div>
                <div className="w-24 text-right">{vs.uncertain || ''}</div>
              </div>
            </div>

            {/* Collection Details — each bucket row drills to its detail screen */}
            <div className="overflow-x-auto w-full">
              <table className="text-xs min-w-[1400px] border-collapse mt-1">
                {COLS_HEAD}
                <tbody>
                  <tr>
                    <td colSpan={9} className="px-2 pt-2 pb-0.5 font-bold text-black">
                      Collection Details
                    </td>
                  </tr>
                  {collections.map((r) => (
                    <tr
                      key={r.label}
                      className="hover:bg-[#e6f2ff] cursor-pointer"
                      onClick={() =>
                        navigate(
                          `/reports/statutory/tcs/form-27eq/collection-details?bucket=${encodeURIComponent(r.label)}`,
                        )
                      }
                    >
                      <td className="px-2 py-0.5 pl-6 border-r border-gray-200">{r.label}</td>
                      <CollectionCells r={r} />
                    </tr>
                  ))}
                  <tr className="border-t border-gray-400 font-bold">
                    <td className="px-2 py-1 border-r border-gray-200">Total Collected</td>
                    <CollectionCells r={totalCollected} />
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Details */}
            <div className="flex flex-col border-t border-gray-300 mt-3">
              <div className="flex font-bold px-2 py-1">
                <div className="flex-1">Payment Details</div>
                <div className="w-32 text-right">{period}</div>
              </div>
              <div className="flex px-4 py-0.5">
                <div className="flex-1">Included in return</div>
                <div className="w-24 text-right">{payment.included || ''}</div>
              </div>
              <div className="flex px-4 py-0.5 pb-2 text-gray-500">
                <div className="flex-1">Uncertain Transactions</div>
                <div className="w-24 text-right">{payment.uncertain || ''}</div>
              </div>
              <div className="flex font-bold px-2 py-1 border-t border-gray-200">
                <div className="flex-1">P a r t i c u l a r s</div>
                <div className="w-32 text-right">Paid Amount</div>
                <div className="w-32 text-right">Amount</div>
              </div>
              <div className="flex px-4 py-0.5">
                <div className="flex-1">TCS Paid (Challans)</div>
                <div className="w-32 text-right tabular-nums">{fmt(payment.paid_amount)}</div>
                <div className="w-32 text-right tabular-nums">{fmt(payment.paid_amount)}</div>
              </div>
              <div className="flex font-bold px-2 py-1 border-t border-gray-400">
                <div className="flex-1">Balance Payable</div>
                <div className="w-32 text-right" />
                <div className="w-32 text-right tabular-nums">{fmt(payment.balance_payable)}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </TallyReportLayout>
  );
}

// Form 27EQ → Collection Details — per-bucket breakdown ("Details of : <bucket>");
// rows appear once a TCS collection engine computes bucket-wise values.
export function Form27EQCollectionDetails() {
  const { selectedCompany, activeFY } = useCompany();
  const [params] = useSearchParams();
  const bucket = params.get('bucket') || '';
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !fyId) return;
    (async () => {
      setLoading(true);
      const res = await window.api.tcs.getForm27EQDrill({
        company_id: companyId,
        fy_id: fyId,
        view: 'collection_details',
        bucket,
      });
      if (res.success) setRows(res.payload.rows ?? []);
      setLoading(false);
    })();
  }, [companyId, fyId, bucket]);

  return (
    <TallyReportLayout
      title="Form 27EQ - Collection Details"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        <div className="px-2 py-1 border-b border-gray-300">
          <span className="text-gray-600">Details of&nbsp;&nbsp;:&nbsp;</span>
          <span className="font-bold">{bucket}</span>
        </div>
        {loading && <EmptyState message="Loading…" className="italic" />}
        {!loading && (
          <div className="overflow-x-auto w-full">
            <table className="text-xs min-w-[1400px] border-collapse mt-1">
              {COLS_HEAD}
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-4 text-gray-400 italic">
                      No collections recorded under this rate bucket.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </TallyReportLayout>
  );
}
