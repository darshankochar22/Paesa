import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

interface VoucherRow {
  voucher_id: number;
  date: string;
  particulars: string;
  voucher_type: string;
  voucher_number: string | null;
  debit: number;
  credit: number;
}

const fmt = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

export default function MarkedVouchers() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!companyId || !fyId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await window.api.gst.getMarkedVouchers({ company_id: companyId, fy_id: fyId });
        if (res.success) setRows((res.vouchers as VoucherRow[]) || []);
        else {
          setError(res.error || 'Failed to load marked vouchers.');
          setRows([]);
        }
      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred.');
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, fyId]);

  const totalDebit = rows.reduce((s, r) => s + (r.debit || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (r.credit || 0), 0);
  const HEAD = 'h-auto px-2 py-1 align-bottom font-bold text-black text-xs whitespace-nowrap';

  return (
    <TallyReportLayout
      title="Marked Vouchers Register"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={<div className="font-bold">Marked Vouchers Register</div>}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading vouchers…" className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && !error && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className={cn(HEAD, 'w-24')}>Date</TableHead>
                <TableHead className={HEAD}>Particulars</TableHead>
                <TableHead className={cn(HEAD, 'w-28')}>Vch Type</TableHead>
                <TableHead className={cn(HEAD, 'w-16 text-center')}>Vch No.</TableHead>
                <TableHead className={cn(HEAD, 'w-32 text-right')}>Debit Amount</TableHead>
                <TableHead className={cn(HEAD, 'w-32 text-right')}>Credit Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState message="No vouchers found for this period." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow
                    key={r.voucher_id}
                    onClick={() => navigate(`/transactions/voucher/${r.voucher_id}`)}
                    className="border-0 cursor-pointer hover:bg-[#e6f2ff]"
                  >
                    <TableCell className="px-2 py-0.5">{r.date}</TableCell>
                    <TableCell className="px-2 py-0.5">{r.particulars}</TableCell>
                    <TableCell className="px-2 py-0.5">{r.voucher_type}</TableCell>
                    <TableCell className="px-2 py-0.5 text-center">
                      {r.voucher_number ?? ''}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right tabular-nums">
                      {fmt(r.debit)}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right tabular-nums">
                      {fmt(r.credit)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {rows.length > 0 && (
              <TableFooter className="bg-transparent">
                <TableRow className="border-t border-gray-400 hover:bg-transparent font-bold">
                  <TableCell colSpan={4} className="px-2 py-1">
                    Total
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right tabular-nums">
                    {fmt(totalDebit)}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right tabular-nums">
                    {fmt(totalCredit)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        )}
      </div>
    </TallyReportLayout>
  );
}
