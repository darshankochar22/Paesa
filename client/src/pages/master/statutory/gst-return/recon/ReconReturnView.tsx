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
import { exportRowsToCsv } from '@/lib/exportCsv';
import PortalFetchPopup from '../components/PortalFetchPopup';
import ReconRightPanel, { type ReconPeriod } from './ReconRightPanel';
import {
  type ReconKind,
  type DualAmounts,
  ZERO,
  fmt,
  fmtCount,
  NUM,
  HEAD,
  PORTAL_ROW,
  ROW_HOVER,
  HEAD_HAIRLINE,
  EMPTY_CELL,
  portalTag,
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
        onClick && value > 0 ? cn('cursor-pointer', ROW_HOVER) : '',
      )}
    >
      <div className="flex-1">{label}</div>
      <div className="w-32 text-right">{fmtCount(value)}</div>
    </div>
  );
}

interface DataRow {
  type: 'data';
  key: string;
  label: string;
  // -1 for ITC-reversal rows: their amounts NET OFF the totals instead of adding.
  sign?: number;
  books: DualAmounts;
  portal: DualAmounts;
  status: string;
  drillable: boolean;
}
type ReturnRow =
  | { type: 'group'; label: string }
  | DataRow
  | { type: 'subtotal'; label: string; books: DualAmounts; portal: DualAmounts };

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
  // null = whole financial year (the default view); MMYYYY narrows to one return period.
  const [period, setPeriod] = useState<string | null>(null);

  const activeReg = location.state?.registration || fetchedReg;
  const registrationName = activeReg?.state_id
    ? `${activeReg.state_id} Registration`
    : 'All Registrations';

  const loadData = useCallback(async () => {
    if (!companyId || !fyId) return;
    let reg = location.state?.registration || fetchedReg;
    if (!reg) {
      try {
        const r = await window.api.gstRegistration.getAll(companyId);
        if (r.success && r.gstRegistrations?.length) {
          reg = r.gstRegistrations[0];
          setFetchedReg(reg);
        }
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
        // The books side must honour the registration named in the header.
        gst_registration_id: reg?.gst_id ?? null,
        return_period: period,
      });
      if (res.success) setData(res.payload);
      else setError(res.error || `Failed to load GSTR-${kind} reconciliation`);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, kind, location.state, fetchedReg, period]);

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
        // The server derives the return period from the file (fp / rtnprd) and validates
        // it against the financial year — never guess a period client-side.
        const call = kind === '2A' ? window.api.gst.importGSTR2A : window.api.gst.importGSTR2B;
        const res = await call({
          company_id: companyId,
          fy_id: fyId,
          return_period: null,
          payload,
        });
        if (res.success) {
          await loadData();
          alert(
            `GSTR-${kind} JSON imported for period ${res.return_period} ` +
              `(${res.documents} document(s)). Reconciliation updated.`,
          );
        } else setError(res.error || 'Failed to import JSON');
      } catch (err: any) {
        setError('Invalid JSON file: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  const rows: ReturnRow[] = data?.return_view ?? [];
  const dataRows = rows.filter((r): r is DataRow => r.type === 'data');
  const vs = data?.voucher_status ?? {};
  const periodLabel =
    data?.period_label ?? (activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '');
  const lastActivity = data?.last_gst_activity ?? 'No Activity Found';
  const periods: ReconPeriod[] = data?.periods ?? [];

  const grand = dataRows.reduce(
    (acc, s) => {
      // Reversal rows (sign -1) net off the amounts; counts always add.
      const sign = s.sign === -1 ? -1 : 1;
      (['books', 'portal'] as const).forEach((side) => {
        const a = acc[side];
        const v = s[side];
        a.count += v.count;
        a.taxable += sign * v.taxable;
        a.igst += sign * v.igst;
        a.cgst += sign * v.cgst;
        a.sgst += sign * v.sgst;
        a.cess += sign * v.cess;
        a.tax += sign * v.tax;
        a.invoice += sign * v.invoice;
      });
      return acc;
    },
    { books: { ...ZERO }, portal: { ...ZERO } },
  );

  const exportCsv = () => {
    if (dataRows.length === 0) return;
    exportRowsToCsv(
      `GSTR-${kind}_reconciliation.csv`,
      [
        { header: 'Section', value: (r: DataRow) => r.label },
        { header: 'Status', value: (r: DataRow) => r.status },
        { header: 'Books Count', value: (r: DataRow) => r.books.count },
        { header: 'Books Taxable', value: (r: DataRow) => r.books.taxable },
        { header: 'Books Tax', value: (r: DataRow) => r.books.tax },
        { header: 'Portal Count', value: (r: DataRow) => r.portal.count },
        { header: 'Portal Taxable', value: (r: DataRow) => r.portal.taxable },
        { header: 'Portal Tax', value: (r: DataRow) => r.portal.tax },
      ],
      dataRows,
      [`GSTR-${kind} Reconciliation`, selectedCompany?.name || '', periodLabel],
    );
  };

  const drillParty = (row: DataRow) =>
    navigate(`/master/statutory/gstr${kind.toLowerCase()}/reconciliation/party`, {
      state: {
        kind,
        section: row.key,
        sectionLabel: row.label,
        registration: activeReg,
        // Carry the selected period into the drill so the party summary matches this screen.
        returnPeriod: period,
      },
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

  // A group heading (2B's "Input Tax Credit Available - Part A", etc.).
  const groupRow = (label: string, idx: number) => (
    <TableRow key={`g-${idx}`} className="border-0 hover:bg-transparent">
      <TableCell colSpan={10} className="px-2 pt-2 pb-0.5 font-bold text-black">
        {label}
      </TableCell>
    </TableRow>
  );

  // One data/subtotal section = two table rows (books, then muted portal). Data rows
  // backed by real book documents drill to the party summary; subtotals do not.
  const dualRows = (
    key: string,
    label: string,
    books: DualAmounts,
    portal: DualAmounts,
    opts: { status?: string; drillable?: boolean; subtotal?: boolean } = {},
  ) =>
    (['books', 'portal'] as const).map((side) => {
      const v = side === 'books' ? books : portal;
      const clickable = !opts.subtotal && opts.drillable;
      return (
        <TableRow
          key={`${key}-${side}`}
          onClick={
            clickable
              ? () =>
                  drillParty({
                    type: 'data',
                    key,
                    label,
                    books,
                    portal,
                    status: opts.status || '',
                    drillable: true,
                  })
              : undefined
          }
          className={cn(
            'border-0',
            clickable && cn('cursor-pointer', ROW_HOVER),
            side === 'portal' && PORTAL_ROW,
            opts.subtotal && side === 'books' && 'border-t border-black font-bold',
            opts.subtotal && side === 'portal' && 'border-t border-gray-300',
          )}
        >
          <TableCell
            className={cn(
              'px-2 py-0.5 pl-6',
              side === 'books' && !opts.subtotal && 'font-medium',
              side === 'portal' && 'pl-10 text-[11px]',
            )}
          >
            {side === 'books' ? label : opts.subtotal ? '' : portalTag(kind)}
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
            {side === 'books' && opts.status ? (
              <span className="font-medium">{opts.status}</span>
            ) : (
              ''
            )}
          </TableCell>
        </TableRow>
      );
    });

  const renderRow = (row: ReturnRow, idx: number) => {
    if (row.type === 'group') return groupRow(row.label, idx);
    if (row.type === 'subtotal')
      return dualRows(`sub-${idx}`, row.label, row.books, row.portal, { subtotal: true });
    return dualRows(row.key, row.label, row.books, row.portal, {
      status: row.status,
      drillable: row.drillable,
    });
  };

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
      rightPanel={
        <ReconRightPanel
          periods={periods}
          selected={period}
          onSelect={setPeriod}
          onFetchPortal={() => setFetchOpen(true)}
          disabled={loading}
        />
      }
      rightSubtitle={
        <>
          <div>{periodLabel}</div>
          <div className="font-normal">Last online GST activity: {lastActivity}</div>
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
          <Button
            onClick={exportCsv}
            variant="ghost"
            size="xs"
            disabled={loading || dataRows.length === 0}
            className="h-auto p-0 font-bold text-black hover:underline hover:bg-transparent"
          >
            Alt+E: Export
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
          // Default the download to the period on screen, falling back to the FY's months —
          // never today's calendar month, which is usually outside the open FY.
          defaultPeriod={period}
          fyPeriods={periods.map((p) => p.period)}
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
            <div className="flex flex-col border-b border-gray-300">
              <div className="flex font-bold px-2 py-1 border-b border-gray-200">
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
                label="In Books, Period Not Fetched from Portal"
                value={vs.no_portal ?? 0}
                indent={2}
              />
              <StatusLine
                label="Uncertain Transactions (Corrections needed)"
                value={vs.uncertain ?? 0}
                bold
                onClick={drillUncertain}
              />
              <StatusLine
                label="Unregistered Purchases (Not on Portal)"
                value={vs.not_in_portal_scope ?? 0}
              />
            </div>

            {/* Return View — dual books/portal rows per section */}
            <Table className="text-xs table-fixed">
              <TableHeader>
                <TableRow className={cn(HEAD_HAIRLINE, 'hover:bg-transparent')}>
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
                {rows.length === 0 && (
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableCell colSpan={10} className={EMPTY_CELL}>
                      No inward documents. Use Fetch from Portal / Import JSON to reconcile.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map(renderRow)}
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
