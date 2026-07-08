import { useState, useEffect } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { Button } from '@/components/shadcn/button';
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Return period is MMYYYY.
function periodLabel(p: string) {
  const m = Number(p.slice(0, 2));
  const y = p.slice(2);
  return m >= 1 && m <= 12 ? `${MONTHS[m - 1]} ${y}` : p;
}

function fmt(n: number) {
  return n
    ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
}

export default function GSTR1vs3BComparison() {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const loadData = async () => {
    if (!companyId || !fyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await window.api.gst.getGSTR1vs3BComparison({
        company_id: companyId,
        fy_id: fyId,
      });
      if (res.success) setData(res.payload);
      else setError(res.error || 'Failed to load GSTR-1 vs 3B comparison');
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, fyId]);

  const rows: any[] = data?.rows ?? [];
  const totals = data?.totals ?? {
    gstr1_taxable: 0,
    gstr1_tax: 0,
    gstr3b_taxable: 0,
    gstr3b_tax: 0,
  };

  return (
    <TallyReportLayout
      title="GSTR-1 vs GSTR-3B"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <div className="flex gap-4">
          <span className="w-36">Outward liability</span>
          <span className="font-bold">: GSTR-1 vs GSTR-3B (monthly)</span>
        </div>
      }
      rightSubtitle={
        <>
          <div>{data?.period_label ?? ''}</div>
          <div className="text-gray-500">
            {data ? `${data.mismatch_count} month(s) with a mismatch` : ''}
          </div>
        </>
      }
      footerControls={
        <Button
          onClick={loadData}
          variant="ghost"
          size="xs"
          disabled={loading}
          className="h-auto p-0 ml-4 font-bold text-black hover:underline hover:bg-transparent"
        >
          F5: Refresh
        </Button>
      }
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading GSTR-1 vs 3B comparison…" className="italic" />}
        {error && <div className="p-2 text-center font-bold">{error}</div>}

        {!loading && !error && rows.length === 0 && (
          <EmptyState message="No outward supplies found for this financial year." />
        )}

        {!loading && !error && rows.length > 0 && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                  Period
                </TableHead>
                <TableHead className="h-auto px-2 py-1 text-right align-bottom font-bold text-black">
                  GSTR-1 Taxable
                </TableHead>
                <TableHead className="h-auto px-2 py-1 text-right align-bottom font-bold text-black">
                  GSTR-1 Tax
                </TableHead>
                <TableHead className="h-auto px-2 py-1 text-right align-bottom font-bold text-black">
                  GSTR-3B Taxable
                </TableHead>
                <TableHead className="h-auto px-2 py-1 text-right align-bottom font-bold text-black">
                  GSTR-3B Tax
                </TableHead>
                <TableHead className="h-auto px-2 py-1 text-right align-bottom font-bold text-black">
                  Tax Diff
                </TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-center align-bottom font-bold text-black">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any) => {
                const mismatch = r.status === 'Mismatch';
                return (
                  <TableRow
                    key={r.period}
                    className={cn('border-0 hover:bg-[#e6f2ff]', mismatch && 'font-bold')}
                  >
                    <TableCell className="px-2 py-0.5">{periodLabel(r.period)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{fmt(r.gstr1_taxable)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{fmt(r.gstr1_tax)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">
                      {fmt(r.gstr3b_taxable)}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{fmt(r.gstr3b_tax)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{fmt(r.tax_diff)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-center">{r.status}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter className="bg-transparent">
              <TableRow className="border-t border-gray-300 hover:bg-transparent font-bold">
                <TableCell className="px-2 py-1">Total</TableCell>
                <TableCell className="px-2 py-1 text-right">{fmt(totals.gstr1_taxable)}</TableCell>
                <TableCell className="px-2 py-1 text-right">{fmt(totals.gstr1_tax)}</TableCell>
                <TableCell className="px-2 py-1 text-right">{fmt(totals.gstr3b_taxable)}</TableCell>
                <TableCell className="px-2 py-1 text-right">{fmt(totals.gstr3b_tax)}</TableCell>
                <TableCell className="px-2 py-1 text-right">{fmt(data?.tax_diff_total)}</TableCell>
                <TableCell className="px-2 py-1 text-center">
                  {data?.mismatch_count ? 'Mismatch' : 'Matched'}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>
    </TallyReportLayout>
  );
}
