import { useState, useEffect } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { Button } from '@/components/shadcn/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/shadcn/table';
import { EmptyState } from '@/components/blocks/EmptyState';

function fmt(n: number) {
  return n
    ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
}

export default function GSTR9CReconciliation() {
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
      const res = await window.api.gst.getGSTR9C({ company_id: companyId, fy_id: fyId });
      if (res.success) setData(res.payload);
      else setError(res.error || 'Failed to load GSTR-9C');
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

  const t5 = data?.table5_turnover;
  const tax: any[] = data?.table9_tax ?? [];
  const itc: any[] = data?.table12_itc ?? [];

  return (
    <TallyReportLayout
      title="GSTR-9C (Reconciliation Statement)"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <div className="flex gap-4">
          <span className="w-36">Audited books</span>
          <span className="font-bold">: vs Annual Return (GSTR-9)</span>
        </div>
      }
      rightSubtitle={<div>{data?.fy_label ?? ''}</div>}
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
      <div className="w-full flex flex-col font-sans text-xs pb-4 gap-4">
        {loading && <EmptyState message="Loading GSTR-9C…" className="italic" />}
        {error && <div className="p-2 text-center font-bold">{error}</div>}

        {!loading && !error && data && (
          <>
            {/* Table 5 — Reconciliation of gross turnover */}
            <div>
              <div className="font-bold px-2 py-1 border-b border-gray-300">
                Table 5 — Reconciliation of Gross Turnover
              </div>
              <Table className="text-xs">
                <TableBody>
                  <TableRow className="border-0">
                    <TableCell className="px-2 py-0.5">
                      (A) Turnover as per audited financial statements
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right">
                      {fmt(t5?.audited_turnover)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-0">
                    <TableCell className="px-2 py-0.5">
                      (P) Turnover as declared in Annual Return (GSTR-9)
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right">
                      {fmt(t5?.return_turnover)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-t border-gray-300 font-bold">
                    <TableCell className="px-2 py-1">(Q) Unreconciled turnover</TableCell>
                    <TableCell className="px-2 py-1 text-right">{fmt(t5?.unreconciled)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {data.note && <div className="px-2 py-1 text-gray-500 italic">{data.note}</div>}
            </div>

            {/* Table 9 — Reconciliation of tax paid */}
            <div>
              <div className="font-bold px-2 py-1 border-b border-gray-300">
                Table 9 — Reconciliation of Tax Paid
              </div>
              <Table className="text-xs table-fixed">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 hover:bg-transparent">
                    <TableHead className="h-auto px-2 py-1 font-bold text-black">Head</TableHead>
                    <TableHead className="h-auto px-2 py-1 text-right font-bold text-black">
                      As per Books
                    </TableHead>
                    <TableHead className="h-auto px-2 py-1 text-right font-bold text-black">
                      As per Return
                    </TableHead>
                    <TableHead className="h-auto px-2 py-1 text-right font-bold text-black">
                      Difference
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tax.map((r) => (
                    <TableRow key={r.head} className="border-0">
                      <TableCell className="px-2 py-0.5">{r.head}</TableCell>
                      <TableCell className="px-2 py-0.5 text-right">
                        {fmt(r.as_per_books)}
                      </TableCell>
                      <TableCell className="px-2 py-0.5 text-right">
                        {fmt(r.as_per_return)}
                      </TableCell>
                      <TableCell className="px-2 py-0.5 text-right">{fmt(r.difference)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Table 12 — Reconciliation of ITC */}
            <div>
              <div className="font-bold px-2 py-1 border-b border-gray-300">
                Table 12 — Reconciliation of Net Input Tax Credit
              </div>
              <Table className="text-xs table-fixed">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 hover:bg-transparent">
                    <TableHead className="h-auto px-2 py-1 font-bold text-black">Head</TableHead>
                    <TableHead className="h-auto px-2 py-1 text-right font-bold text-black">
                      As per Books
                    </TableHead>
                    <TableHead className="h-auto px-2 py-1 text-right font-bold text-black">
                      As per Return
                    </TableHead>
                    <TableHead className="h-auto px-2 py-1 text-right font-bold text-black">
                      Difference
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itc.map((r) => (
                    <TableRow key={r.head} className="border-0">
                      <TableCell className="px-2 py-0.5">{r.head}</TableCell>
                      <TableCell className="px-2 py-0.5 text-right">
                        {fmt(r.as_per_books)}
                      </TableCell>
                      <TableCell className="px-2 py-0.5 text-right">
                        {fmt(r.as_per_return)}
                      </TableCell>
                      <TableCell className="px-2 py-0.5 text-right">{fmt(r.difference)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </TallyReportLayout>
  );
}
