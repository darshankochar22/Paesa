import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import PortalFetchPopup from '../components/PortalFetchPopup';
import {
  type ReconKind,
  type DualAmounts,
  ZERO,
  fmt,
  fmtCount,
  NUM,
  HEAD,
  PORTAL_ROW,
} from './reconShared';

function StatusLine({
  label,
  value,
  indent,
  onClick,
  bold,
}: {
  label: string;
  value: number;
  indent?: number;
  onClick?: () => void;
  bold?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex py-0.5',
        indent ? (indent === 2 ? 'px-8' : 'px-4') : 'px-2',
        bold && 'font-bold',
        onClick && value > 0 ? 'cursor-pointer hover:bg-zinc-50' : '',
      )}
    >
      <div className="flex-1">{label}</div>
      <div className="w-32 text-right">{fmtCount(value)}</div>
    </div>
  );
}

interface SectionRow {
  key: string;
  label: string;
  books: DualAmounts;
  portal: DualAmounts;
  status: string;
}

// Tally-style GSTR-2A/2B main reconciliation: dual books-vs-portal Return View +
// nested voucher-status block. Section rows drill to the party-wise summary.
export default function ReconReturnView({ kind }: { kind: ReconKind }) {
  const { selectedCompany, activeFY } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [fetchedReg, setFetchedReg] = useState<any>(null);
  const [fetchOpen, setFetchOpen] = useState(false);

  const activeReg = location.state?.registration || fetchedReg;
  const registrationName = activeReg?.state_id
    ? `${activeReg.state_id} Registration`
    : 'All Registrations';

  const loadData = useCallback(async () => {
    if (!companyId || !fyId) return;
    if (!location.state?.registration && !fetchedReg) {
      try {
        const r = await window.api.gstRegistration.getAll(companyId);
        if (r.success && r.gstRegistrations?.length) setFetchedReg(r.gstRegistrations[0]);
      } catch {
        /* ignore */
      }
    }
    try {
      setLoading(true);
      setError(null);
      const res = await window.api.gst.getReconSummary({
        company_id: companyId,
        fy_id: fyId,
        kind,
      });
      if (res.success) setData(res.payload);
      else setError(res.error || `Failed to load GSTR-${kind} reconciliation`);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, kind, location.state, fetchedReg]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Import a downloaded portal JSON (fallback to the one-click Fetch from Portal).
  const handleImportJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        setLoading(true);
        const payload = JSON.parse(await file.text());
        const period =
          payload.fp ||
          `${String(new Date().getMonth() + 1).padStart(2, '0')}${new Date().getFullYear()}`;
        const call = kind === '2A' ? window.api.gst.importGSTR2A : window.api.gst.importGSTR2B;
        const res = await call({
          company_id: companyId,
          fy_id: fyId,
          return_period: period,
          payload,
        });
        if (res.success) {
          await loadData();
          alert(`GSTR-${kind} JSON imported. Reconciliation updated.`);
        } else setError(res.error || 'Failed to import JSON');
      } catch (err: any) {
        setError('Invalid JSON file: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  const sections: SectionRow[] = data?.return_view ?? [];
  const vs = data?.voucher_status ?? {};
  const periodLabel =
    data?.period_label ?? (activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '');
  const lastActivity = data?.last_gst_activity ?? 'No Activity Found';

  const grand = sections.reduce(
    (acc, s) => {
      (['books', 'portal'] as const).forEach((side) => {
        const a = acc[side];
        const v = s[side];
        a.count += v.count;
        a.taxable += v.taxable;
        a.igst += v.igst;
        a.cgst += v.cgst;
        a.sgst += v.sgst;
        a.cess += v.cess;
        a.tax += v.tax;
        a.invoice += v.invoice;
      });
      return acc;
    },
    { books: { ...ZERO }, portal: { ...ZERO } },
  );

  const drillParty = (section: SectionRow) =>
    navigate(`/master/statutory/gstr${kind.toLowerCase()}/reconciliation/party`, {
      state: { kind, section: section.key, sectionLabel: section.label, registration: activeReg },
    });

  const drillUncertain = () =>
    (vs.uncertain ?? 0) > 0 &&
    navigate(`/master/statutory/gstr${kind.toLowerCase()}/reconciliation/uncertain`, {
      state: {
        registration: null,
        returnType: `GSTR${kind}`,
        reportTitle: `GSTR-${kind} Reconciliation`,
        supplyGroupLabel: 'Inward Supplies',
        reconciliation: true,
      },
    });

  // One section = two table rows (books, then muted portal).
  const dualRows = (s: SectionRow) =>
    (['books', 'portal'] as const).map((side) => {
      const v = s[side];
      return (
        <TableRow
          key={`${s.key}-${side}`}
          onClick={() => drillParty(s)}
          className={cn(
            'border-0 cursor-pointer hover:bg-zinc-50',
            side === 'portal' && PORTAL_ROW,
          )}
        >
          <TableCell className={cn('px-2 py-0.5 pl-6', side === 'books' && 'font-medium')}>
            {side === 'books' ? s.label : ''}
          </TableCell>
          <TableCell className={NUM}>{fmtCount(v.count)}</TableCell>
          <TableCell className={NUM}>{fmt(v.taxable)}</TableCell>
          <TableCell className={NUM}>{fmt(v.igst)}</TableCell>
          <TableCell className={NUM}>{fmt(v.cgst)}</TableCell>
          <TableCell className={NUM}>{fmt(v.sgst)}</TableCell>
          <TableCell className={NUM}>{fmt(v.cess)}</TableCell>
          <TableCell className={NUM}>{fmt(v.tax)}</TableCell>
          <TableCell className={NUM}>{fmt(v.invoice)}</TableCell>
          <TableCell className="px-2 py-0.5 text-xs">
            {side === 'books' ? <span className="font-medium">{s.status}</span> : ''}
          </TableCell>
        </TableRow>
      );
    });

  return (
    <TallyReportLayout
      title={`GSTR-${kind} Reconciliation`}
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <>
          <div className="flex gap-4">
            <span className="w-36">GST Registration</span>
            <span className="font-bold">: {registrationName}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-36">Status</span>
            <span className="font-bold">
              : {(vs.unreconciled ?? 0) > 0 ? 'Unreconciled' : 'Reconciled'}
            </span>
          </div>
        </>
      }
      rightSubtitle={
        <>
          <div>{periodLabel}</div>
          <div className="text-zinc-500">Last online GST activity: {lastActivity}</div>
        </>
      }
      footerControls={
        <div className="flex items-center gap-4 ml-4">
          <Button
            onClick={loadData}
            variant="ghost"
            size="xs"
            disabled={loading}
            className="h-auto p-0 font-bold text-black hover:underline hover:bg-transparent"
          >
            F5: Refresh
          </Button>
          <Button
            onClick={() => setFetchOpen(true)}
            variant="ghost"
            size="xs"
            disabled={loading}
            className="h-auto p-0 font-bold text-black hover:underline hover:bg-transparent"
          >
            Fetch from Portal
          </Button>
          <Button
            onClick={handleImportJson}
            variant="ghost"
            size="xs"
            disabled={loading}
            className="h-auto p-0 font-bold text-black hover:underline hover:bg-transparent"
          >
            Import JSON
          </Button>
        </div>
      }
    >
      {companyId && fyId && (
        <PortalFetchPopup
          open={fetchOpen}
          kind={kind}
          companyId={companyId}
          fyId={fyId}
          onClose={() => setFetchOpen(false)}
          onImported={loadData}
        />
      )}

      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && (
          <EmptyState message={`Loading GSTR-${kind} reconciliation…`} className="italic" />
        )}
        {error && (
          <div className="p-2 text-center font-bold text-black border-l-2 border-black">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Voucher-status block (nested, matching Tally) */}
            <div className="flex flex-col border-b border-zinc-300">
              <div className="flex font-bold px-2 py-1 border-b border-zinc-200">
                <div className="flex-1">P a r t i c u l a r s</div>
                <div className="w-32 text-right">Voucher Count</div>
              </div>
              <StatusLine label="Reconciled" value={vs.reconciled ?? 0} bold />
              <StatusLine label="Unreconciled" value={vs.unreconciled ?? 0} bold />
              <StatusLine label="Mismatched" value={vs.mismatch ?? 0} indent={2} />
              <StatusLine
                label="Available Only in Books"
                value={vs.only_in_books ?? 0}
                indent={2}
              />
              <StatusLine
                label="Available Only on Portal"
                value={vs.only_in_portal ?? 0}
                indent={2}
              />
              <StatusLine
                label="Uncertain Transactions (Corrections needed)"
                value={vs.uncertain ?? 0}
                bold
                onClick={drillUncertain}
              />
            </div>

            {/* Return View — dual books/portal rows per section */}
            <Table className="text-xs table-fixed">
              <TableHeader>
                <TableRow className="border-b border-zinc-300 hover:bg-transparent">
                  <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                    Return View (Comparison of Books &amp; Portal Values)
                  </TableHead>
                  <TableHead className={cn(HEAD, 'w-24')}>Voucher Count</TableHead>
                  <TableHead className={cn(HEAD, 'w-28')}>Taxable Amount</TableHead>
                  <TableHead className={cn(HEAD, 'w-24')}>IGST</TableHead>
                  <TableHead className={cn(HEAD, 'w-24')}>CGST</TableHead>
                  <TableHead className={cn(HEAD, 'w-24')}>SGST/UTGST</TableHead>
                  <TableHead className={cn(HEAD, 'w-20')}>Cess</TableHead>
                  <TableHead className={cn(HEAD, 'w-24')}>Tax Amount</TableHead>
                  <TableHead className={cn(HEAD, 'w-28')}>Invoice Amount</TableHead>
                  <TableHead className={cn(HEAD, 'w-24')}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.length === 0 && (
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableCell colSpan={10} className="px-2 py-3 text-center text-zinc-400">
                      No inward documents. Use Fetch from Portal / Import JSON to reconcile.
                    </TableCell>
                  </TableRow>
                )}
                {sections.map(dualRows)}
              </TableBody>
              <TableFooter className="bg-transparent">
                <TableRow className="border-t border-black hover:bg-transparent font-bold">
                  <TableCell className="px-2 py-1">Total (Books)</TableCell>
                  <TableCell className={cn(NUM, 'font-bold')}>
                    {fmtCount(grand.books.count)}
                  </TableCell>
                  <TableCell className={cn(NUM, 'font-bold')}>{fmt(grand.books.taxable)}</TableCell>
                  <TableCell className={cn(NUM, 'font-bold')}>{fmt(grand.books.igst)}</TableCell>
                  <TableCell className={cn(NUM, 'font-bold')}>{fmt(grand.books.cgst)}</TableCell>
                  <TableCell className={cn(NUM, 'font-bold')}>{fmt(grand.books.sgst)}</TableCell>
                  <TableCell className={cn(NUM, 'font-bold')}>{fmt(grand.books.cess)}</TableCell>
                  <TableCell className={cn(NUM, 'font-bold')}>{fmt(grand.books.tax)}</TableCell>
                  <TableCell className={cn(NUM, 'font-bold')}>{fmt(grand.books.invoice)}</TableCell>
                  <TableCell className={NUM} />
                </TableRow>
                <TableRow className={cn('hover:bg-transparent', PORTAL_ROW)}>
                  <TableCell className="px-2 py-1">Total (Portal)</TableCell>
                  <TableCell className={NUM}>{fmtCount(grand.portal.count)}</TableCell>
                  <TableCell className={NUM}>{fmt(grand.portal.taxable)}</TableCell>
                  <TableCell className={NUM}>{fmt(grand.portal.igst)}</TableCell>
                  <TableCell className={NUM}>{fmt(grand.portal.cgst)}</TableCell>
                  <TableCell className={NUM}>{fmt(grand.portal.sgst)}</TableCell>
                  <TableCell className={NUM}>{fmt(grand.portal.cess)}</TableCell>
                  <TableCell className={NUM}>{fmt(grand.portal.tax)}</TableCell>
                  <TableCell className={NUM}>{fmt(grand.portal.invoice)}</TableCell>
                  <TableCell className={NUM} />
                </TableRow>
              </TableFooter>
            </Table>
          </>
        )}
      </div>
    </TallyReportLayout>
  );
}
