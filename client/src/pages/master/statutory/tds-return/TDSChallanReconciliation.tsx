import { useState, useEffect } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/shadcn/table';
import { EmptyState } from '@/components/blocks/EmptyState';
import { cn } from '@/lib/utils';

interface ChallanRow {
  date: string;
  particulars: string;
  quarter_from: string;
  quarter_to: string;
  section_no: string;
  deductee_type: string;
  resident_type: string;
  cheque_dd_no: string;
  cheque_dd_date: string;
  bsr_code: string;
  challan_no: string;
  challan_date: string;
  vch_no: string;
  amount: number;
}

const fmt = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

const CELL = 'px-2 py-0.5 text-xs text-black border-r border-gray-200 whitespace-nowrap';
const NUMC =
  'px-2 py-0.5 text-xs text-black text-right border-r border-gray-200 whitespace-nowrap tabular-nums';
const HEAD =
  'h-auto px-2 py-1 font-bold text-black text-xs border-r border-gray-200 whitespace-nowrap align-bottom';

export default function TDSChallanReconciliation() {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [challans, setChallans] = useState<ChallanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodLabel, setPeriodLabel] = useState('');

  const loadData = async () => {
    if (!companyId || !fyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await window.api.tds.getChallanReconciliation({
        company_id: companyId,
        fy_id: fyId,
      });
      if (res.success) {
        setChallans(res.payload.challans || []);
        setPeriodLabel(res.payload.period_label || '');
      } else {
        setError(res.error || 'Failed to load TDS Challan reconciliation.');
      }
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId, fyId]);

  const total = challans.reduce((s, c) => s + (c.amount || 0), 0);
  const subtitlePeriod =
    periodLabel || (activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '');

  return (
    <TallyReportLayout
      title="TDS Challan Reconciliation"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{subtitlePeriod}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading TDS challan reconciliation…" className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && (
          <div className="overflow-x-auto w-full border border-gray-300">
            <Table className="text-xs table-auto min-w-[1600px]">
              <TableHeader className="bg-gray-50">
                <TableRow className="border-b border-gray-300 hover:bg-transparent">
                  <TableHead rowSpan={2} className={HEAD}>
                    Date
                  </TableHead>
                  <TableHead rowSpan={2} className={HEAD}>
                    Particulars
                  </TableHead>
                  <TableHead
                    colSpan={2}
                    className="h-auto px-2 py-0.5 text-center font-bold text-black text-xs border-r border-b border-gray-200"
                  >
                    E-TDS Quarter Period
                  </TableHead>
                  <TableHead rowSpan={2} className={HEAD}>
                    Section No.
                  </TableHead>
                  <TableHead rowSpan={2} className={HEAD}>
                    Deductee Type
                  </TableHead>
                  <TableHead rowSpan={2} className={HEAD}>
                    Resident Type
                  </TableHead>
                  <TableHead rowSpan={2} className={HEAD}>
                    Cheque/DD No.
                  </TableHead>
                  <TableHead rowSpan={2} className={HEAD}>
                    Cheque/DD Date
                  </TableHead>
                  <TableHead rowSpan={2} className={HEAD}>
                    BSR Code
                  </TableHead>
                  <TableHead rowSpan={2} className={HEAD}>
                    Challan No.
                  </TableHead>
                  <TableHead rowSpan={2} className={HEAD}>
                    Challan Date
                  </TableHead>
                  <TableHead rowSpan={2} className={HEAD}>
                    Vch No.
                  </TableHead>
                  <TableHead rowSpan={2} className={cn(HEAD, 'text-right border-r-0')}>
                    Amount
                  </TableHead>
                </TableRow>
                <TableRow className="border-b border-gray-300 hover:bg-transparent">
                  <TableHead className="h-auto px-2 py-0.5 text-center font-bold text-black text-xs border-r border-gray-200">
                    From
                  </TableHead>
                  <TableHead className="h-auto px-2 py-0.5 text-center font-bold text-black text-xs border-r border-gray-200">
                    To
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {challans.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={14} className="text-center py-4 text-gray-400 italic">
                      No TDS challan payments found for this Financial Year.
                    </TableCell>
                  </TableRow>
                ) : (
                  challans.map((c, idx) => (
                    <TableRow
                      key={idx}
                      className="border-b border-gray-100 hover:bg-[#e6f2ff] bg-white"
                    >
                      <TableCell className={CELL}>{c.date}</TableCell>
                      <TableCell className={CELL}>{c.particulars}</TableCell>
                      <TableCell className={CELL}>{c.quarter_from}</TableCell>
                      <TableCell className={CELL}>{c.quarter_to}</TableCell>
                      <TableCell className={CELL}>{c.section_no}</TableCell>
                      <TableCell className={CELL}>{c.deductee_type}</TableCell>
                      <TableCell className={CELL}>{c.resident_type}</TableCell>
                      <TableCell className={CELL}>{c.cheque_dd_no}</TableCell>
                      <TableCell className={CELL}>{c.cheque_dd_date}</TableCell>
                      <TableCell className={CELL}>{c.bsr_code}</TableCell>
                      <TableCell className={CELL}>{c.challan_no}</TableCell>
                      <TableCell className={CELL}>{c.challan_date}</TableCell>
                      <TableCell className={CELL}>{c.vch_no}</TableCell>
                      <TableCell className={cn(NUMC, 'border-r-0')}>{fmt(c.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>

              {challans.length > 0 && (
                <TableFooter className="bg-transparent border-t border-gray-300">
                  <TableRow className="hover:bg-transparent font-bold">
                    <TableCell
                      colSpan={13}
                      className="px-2 py-1 font-bold text-black border-r border-gray-200"
                    >
                      Total
                    </TableCell>
                    <TableCell className="px-2 py-1 text-right font-bold text-black tabular-nums">
                      {fmt(total)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        )}
      </div>
    </TallyReportLayout>
  );
}
