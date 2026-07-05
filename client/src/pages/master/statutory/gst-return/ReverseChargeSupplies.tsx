import { useState, useEffect } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/shadcn/table';
import { EmptyState } from '@/components/blocks/EmptyState';
import { cn } from '@/lib/utils';

interface RcmRow {
  particulars: string;
  total: number;
  booked: number;
  balance: number;
}

const fmt = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

export default function ReverseChargeSupplies() {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [rows, setRows] = useState<RcmRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!companyId || !fyId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await window.api.gst.getReverseChargeSupplies({
          company_id: companyId,
          fy_id: fyId,
        });
        if (res.success) setRows((res.rows as RcmRow[]) || []);
        else {
          setError(res.error || 'Failed to load reverse charge supplies.');
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

  const HEAD = 'h-auto px-2 py-1 align-bottom font-bold text-black text-xs whitespace-nowrap';

  return (
    <TallyReportLayout
      title="Reverse Charge Supplies"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <div className="flex gap-4">
          <span className="w-36">GST Registration</span>
          <span className="font-bold">: All Registrations</span>
        </div>
      }
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading reverse charge supplies…" className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && !error && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className={HEAD}>P a r t i c u l a r s</TableHead>
                <TableHead className={cn(HEAD, 'w-32 text-right')}>
                  Total
                  <br />
                  Liability/ITC
                </TableHead>
                <TableHead className={cn(HEAD, 'w-32 text-right')}>
                  Liability/ITC
                  <br />
                  Booked
                </TableHead>
                <TableHead className={cn(HEAD, 'w-32 text-right')}>
                  Balance to Be
                  <br />
                  Booked
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="p-0">
                    <EmptyState message="No reverse charge supplies for this period." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, idx) => (
                  <TableRow key={idx} className="border-0 hover:bg-[#e6f2ff]">
                    <TableCell className="px-2 py-0.5">{r.particulars}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right tabular-nums">
                      {fmt(r.total)}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right tabular-nums">
                      {fmt(r.booked)}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right tabular-nums">
                      {fmt(r.balance)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </TallyReportLayout>
  );
}
