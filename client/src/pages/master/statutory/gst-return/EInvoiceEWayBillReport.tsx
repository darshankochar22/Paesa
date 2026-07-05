import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { cn } from '@/lib/utils';

type Mode = 'einvoice' | 'eway';

const CFG: Record<
  Mode,
  {
    title: string;
    returnType: string;
    supplyGroupLabel: string;
    registerLabel: string;
    portalLabel: string;
    portalUrl: string;
    idKey: string;
    idHead: string;
  }
> = {
  einvoice: {
    title: 'e-Invoice',
    returnType: 'GSTR1',
    supplyGroupLabel: 'Outward Supplies',
    registerLabel: 'F5: IRN Register',
    portalLabel: 'V: Open e-Invoice Portal',
    portalUrl: 'https://einvoice1.gst.gov.in',
    idKey: 'irn',
    idHead: 'IRN',
  },
  eway: {
    title: 'e-Way Bill',
    returnType: 'GSTR3B',
    supplyGroupLabel: 'Inward and Outward Supplies',
    registerLabel: 'F5: EWB Register',
    portalLabel: 'V: Open EWB Portal',
    portalUrl: 'https://ewaybillgst.gov.in',
    idKey: 'ewb_no',
    idHead: 'EWB No.',
  },
};

export default function EInvoiceEWayBillReport({ mode }: { mode: Mode }) {
  const cfg = CFG[mode];
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [view, setView] = useState<'summary' | 'register'>('summary');
  const [records, setRecords] = useState<any[]>([]);
  const [uncertain, setUncertain] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!companyId || !fyId) return;
      try {
        setLoading(true);
        setError(null);
        const api = mode === 'einvoice' ? window.api.eInvoice : window.api.ewayBill;
        const [recRes, statRes] = await Promise.all([
          api.getRecords(companyId),
          window.api.gst.getReturnStatistics({
            company_id: companyId,
            fy_id: fyId,
            return_period: null,
            return_type: cfg.returnType,
            annual: true,
          }),
        ]);
        if (recRes.success) setRecords(recRes.records || []);
        setUncertain(statRes.success ? statRes.statistics.totals.uncertain || 0 : 0);
      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, fyId, mode]);

  // Group records by status for the summary.
  const byStatus = new Map<string, number>();
  for (const r of records) {
    const s = String(r.status || 'Generated');
    byStatus.set(s, (byStatus.get(s) || 0) + 1);
  }
  const statusRows = [...byStatus.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const period = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '';

  const openUncertain = () =>
    uncertain > 0 &&
    navigate('/master/statutory/gst/exchange-uncertain', {
      state: {
        registration: null,
        returnType: cfg.returnType,
        reportTitle: cfg.title,
        supplyGroupLabel: cfg.supplyGroupLabel,
      },
    });

  return (
    <TallyReportLayout
      title={cfg.title}
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <div className="flex gap-4">
          <span className="w-36">GST Registration</span>
          <span className="font-bold">: All Registrations</span>
        </div>
      }
      rightSubtitle={<div>{period}</div>}
      footerControls={
        <>
          <Button
            onClick={() => setView((v) => (v === 'summary' ? 'register' : 'summary'))}
            variant="ghost"
            size="xs"
            className="h-auto p-0 ml-4 font-bold text-black hover:underline hover:bg-transparent"
          >
            {view === 'summary' ? cfg.registerLabel : 'F5: Summary'}
          </Button>
          <Button
            onClick={() => window.open(cfg.portalUrl, '_blank')}
            variant="ghost"
            size="xs"
            className="h-auto p-0 ml-4 font-bold text-black hover:underline hover:bg-transparent"
          >
            {cfg.portalLabel}
          </Button>
        </>
      }
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading…" className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && !error && view === 'summary' && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                  Particulars
                </TableHead>
                <TableHead className="h-auto w-32 px-2 py-1 text-right align-bottom font-bold text-black">
                  Voucher Count
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statusRows.length === 0 && uncertain === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={2} className="p-0">
                    <EmptyState message={`No ${cfg.title} transactions for this period.`} />
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {statusRows.map(([status, count]) => (
                    <TableRow key={status} className="border-0 hover:bg-transparent">
                      <TableCell className="px-2 py-0.5 pl-4">{status}</TableCell>
                      <TableCell className="px-2 py-0.5 text-right tabular-nums">{count}</TableCell>
                    </TableRow>
                  ))}
                  {uncertain > 0 && (
                    <TableRow
                      onClick={openUncertain}
                      className="border-0 cursor-pointer text-orange-600 font-semibold hover:bg-[#e6f2ff]"
                    >
                      <TableCell className="px-2 py-0.5">
                        Uncertain Transactions (Corrections needed)
                      </TableCell>
                      <TableCell className="px-2 py-0.5 text-right tabular-nums">
                        {uncertain}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        )}

        {!loading && !error && view === 'register' && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto w-24 px-2 py-1 align-bottom font-bold text-black">
                  Date
                </TableHead>
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                  Party
                </TableHead>
                <TableHead className="h-auto w-56 px-2 py-1 align-bottom font-bold text-black">
                  {cfg.idHead}
                </TableHead>
                <TableHead className="h-auto w-28 px-2 py-1 align-bottom font-bold text-black">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="p-0">
                    <EmptyState message={`No ${cfg.title} records generated yet.`} />
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r, idx) => (
                  <TableRow
                    key={idx}
                    onClick={() =>
                      r.voucher_id && navigate(`/transactions/voucher/${r.voucher_id}`)
                    }
                    className={cn('border-0', r.voucher_id && 'cursor-pointer hover:bg-[#e6f2ff]')}
                  >
                    <TableCell className="px-2 py-0.5">{r.date || r.created_at || ''}</TableCell>
                    <TableCell className="px-2 py-0.5">{r.party_name || r.party || ''}</TableCell>
                    <TableCell className="px-2 py-0.5 tabular-nums">{r[cfg.idKey] || ''}</TableCell>
                    <TableCell className="px-2 py-0.5">{r.status || ''}</TableCell>
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
