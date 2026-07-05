import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { EmptyState } from '@/components/blocks/EmptyState';
import { cn } from '@/lib/utils';

interface DeductionRow {
  label: string;
  assessable_prev: number;
  assessable_current: number;
  assessable_total: number;
  tax_deductable: number;
  deducted_prev: number;
  deducted_current: number;
  deducted_total: number;
  balance: number;
}

const fmt = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

const NUM = 'px-2 py-0.5 text-right tabular-nums';

function DeductionCells({ r }: { r: DeductionRow }) {
  return (
    <>
      <td className={cn(NUM, 'w-24')}>{fmt(r.assessable_prev)}</td>
      <td className={cn(NUM, 'w-28')}>{fmt(r.assessable_current)}</td>
      <td className={cn(NUM, 'w-24 border-r border-gray-200')}>{fmt(r.assessable_total)}</td>
      <td className={cn(NUM, 'w-28 border-r border-gray-200')}>{fmt(r.tax_deductable)}</td>
      <td className={cn(NUM, 'w-24')}>{fmt(r.deducted_prev)}</td>
      <td className={cn(NUM, 'w-28')}>{fmt(r.deducted_current)}</td>
      <td className={cn(NUM, 'w-24 border-r border-gray-200')}>{fmt(r.deducted_total)}</td>
      <td className={cn(NUM, 'w-28')}>{fmt(r.balance)}</td>
    </>
  );
}

// Form 27Q — quarterly TDS return for payments to non-residents. Same layout as Form 26Q;
// the count rows drill: Total → Statistics, Not Relevant → voucher-type breakdown,
// Uncertain → exception tree (mirrors the GST return drill pattern).
export default function Form27Q() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!companyId || !fyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await window.api.tds.getForm27Q({ company_id: companyId, fy_id: fyId });
      if (res.success) setData(res.payload);
      else setError(res.error || 'Failed to load Form 27Q.');
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId, fyId]);

  const vs = data?.voucher_status ?? { total: 0, included: 0, not_relevant: 0, uncertain: 0 };
  const deductions: DeductionRow[] = data?.deduction_details ?? [];
  const totalDeducted: DeductionRow = data?.total_deducted ?? {
    label: 'Total Deducted',
    assessable_prev: 0,
    assessable_current: 0,
    assessable_total: 0,
    tax_deductable: 0,
    deducted_prev: 0,
    deducted_current: 0,
    deducted_total: 0,
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

  const SUBHEAD =
    'px-2 py-1 text-right align-bottom font-bold text-black text-[10px] whitespace-pre-line';

  return (
    <TallyReportLayout
      title="Form 27Q"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{period}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Computing Form 27Q…" className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && data && (
          <>
            {/* Voucher status summary — each count row drills down */}
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
                onClick={() => navigate('/reports/statutory/tds/form-27q/not-relevant')}
              >
                <div className="flex-1">Not Relevant in this Return</div>
                <div className="w-24 text-right">{vs.not_relevant || ''}</div>
              </div>
              <div
                className="flex px-4 py-0.5 pb-2 text-orange-600 font-semibold cursor-pointer hover:bg-[#e6f2ff]"
                onClick={() => navigate('/reports/statutory/tds/form-27q/uncertain')}
              >
                <div className="flex-1">Uncertain Transactions (Corrections needed)</div>
                <div className="w-24 text-right">{vs.uncertain || ''}</div>
              </div>
            </div>

            {/* Deduction Details */}
            <div className="overflow-x-auto w-full">
              <table className="text-xs min-w-[1400px] border-collapse mt-1">
                <thead>
                  <tr>
                    <th
                      rowSpan={2}
                      className="px-2 py-1 text-left align-bottom font-bold text-black text-xs border-b border-r border-gray-300 w-72"
                    >
                      P a r t i c u l a r s
                    </th>
                    <th
                      colSpan={3}
                      className="px-2 py-0.5 text-center font-bold text-black text-xs border-b border-r border-gray-300"
                    >
                      Assessable Value
                    </th>
                    <th
                      rowSpan={2}
                      className="px-2 py-1 text-right align-bottom font-bold text-black text-[10px] border-b border-r border-gray-300 whitespace-pre-line"
                    >
                      {'Tax\nDeductable'}
                    </th>
                    <th
                      colSpan={3}
                      className="px-2 py-0.5 text-center font-bold text-black text-xs border-b border-r border-gray-300"
                    >
                      Deducted
                    </th>
                    <th
                      rowSpan={2}
                      className="px-2 py-1 text-right align-bottom font-bold text-black text-[10px] border-b border-gray-300 whitespace-pre-line"
                    >
                      {'Balance\nDeductable'}
                    </th>
                  </tr>
                  <tr>
                    <th className={SUBHEAD}>Prev. Period</th>
                    <th className={SUBHEAD}>Current Period</th>
                    <th className={cn(SUBHEAD, 'border-r border-gray-300')}>Total</th>
                    <th className={SUBHEAD}>Prev. Period</th>
                    <th className={SUBHEAD}>Current Period</th>
                    <th className={cn(SUBHEAD, 'border-r border-gray-300')}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={9} className="px-2 pt-2 pb-0.5 font-bold text-black">
                      Deduction Details
                    </td>
                  </tr>
                  {deductions.map((r) => (
                    <tr key={r.label} className="hover:bg-[#e6f2ff]">
                      <td className="px-2 py-0.5 pl-6 border-r border-gray-200">{r.label}</td>
                      <DeductionCells r={r} />
                    </tr>
                  ))}
                  <tr className="border-t border-gray-400 font-bold">
                    <td className="px-2 py-1 border-r border-gray-200">Total Deducted</td>
                    <DeductionCells r={totalDeducted} />
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
                <div className="flex-1">TDS Paid (Challans)</div>
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
