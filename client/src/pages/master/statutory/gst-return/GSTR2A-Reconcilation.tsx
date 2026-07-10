import { useState, useEffect } from 'react';
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
import PortalFetchPopup from './components/PortalFetchPopup';
import ReconMismatchLists from './components/ReconMismatchLists';

interface ReconciliationRow {
  vch_count: number;
  taxable_amount: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  tax_amount: number;
  invoice_amount: number;
  status?: 'Reconciled' | 'Unreconciled' | 'Uncertain' | '';
}

const ZERO_ROW: ReconciliationRow = {
  vch_count: 0,
  taxable_amount: 0,
  igst: 0,
  cgst: 0,
  sgst: 0,
  cess: 0,
  tax_amount: 0,
  invoice_amount: 0,
};

function fmt(n: number) {
  return n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

function fmtCount(n: number) {
  return n ? String(n) : '';
}

function addRow(a: ReconciliationRow, b: ReconciliationRow): ReconciliationRow {
  return {
    vch_count: a.vch_count + b.vch_count,
    taxable_amount: a.taxable_amount + b.taxable_amount,
    igst: a.igst + b.igst,
    cgst: a.cgst + b.cgst,
    sgst: a.sgst + b.sgst,
    cess: a.cess + b.cess,
    tax_amount: a.tax_amount + b.tax_amount,
    invoice_amount: a.invoice_amount + b.invoice_amount,
  };
}

type RowDef =
  | { type: 'subhead'; label: string }
  | { type: 'data'; label: string; row: ReconciliationRow; indent?: 1 | 2 }
  | { type: 'divider' };

const NUM = 'px-2 py-0.5 text-right text-xs tabular-nums';
const HEAD =
  'h-auto px-2 py-1 text-right align-bottom font-bold text-black text-xs whitespace-nowrap';

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const cls =
    status === 'Reconciled'
      ? 'text-green-700'
      : status === 'Unreconciled'
        ? 'text-red-600'
        : status === 'Uncertain'
          ? 'text-orange-600'
          : 'text-gray-400';
  return <span className={cn('text-xs font-medium', cls)}>{status}</span>;
}

export default function GSTR2AReconciliation() {
  const { selectedCompany, activeFY } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [fetchedRegistration, setFetchedRegistration] = useState<any>(null);
  const [fetchOpen, setFetchOpen] = useState(false);

  const activeRegistration = location.state?.registration || fetchedRegistration;
  const registrationName = activeRegistration?.state_id
    ? `${activeRegistration.state_id} Registration`
    : 'All Registrations';

  const loadData = async () => {
    if (!companyId || !fyId) return;

    if (!location.state?.registration && !fetchedRegistration) {
      try {
        const regRes = await window.api.gstRegistration.getAll(companyId);
        if (regRes.success && regRes.gstRegistrations?.length > 0) {
          setFetchedRegistration(regRes.gstRegistrations[0]);
        }
      } catch (err) {
        console.error('Failed to fetch registrations', err);
      }
    }

    try {
      setLoading(true);
      setError(null);
      const res = await window.api.gst.getGSTR2AReconciliation({
        company_id: companyId,
        fy_id: fyId,
      });
      if (res.success) setData(res.payload);
      else setError(res.error || 'Failed to load GSTR-2A reconciliation');
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId, fyId]);

  const d = data?.return_view ?? {};

  const b2b: ReconciliationRow = d.b2b ?? ZERO_ROW;
  const amend_b2b: ReconciliationRow = d.amend_b2b ?? ZERO_ROW;
  const cdn: ReconciliationRow = d.cdn ?? ZERO_ROW;
  const amend_cdn: ReconciliationRow = d.amend_cdn ?? ZERO_ROW;
  const isd: ReconciliationRow = d.isd ?? ZERO_ROW;
  const import_boe: ReconciliationRow = d.import_boe ?? ZERO_ROW;
  const import_sez_boe: ReconciliationRow = d.import_sez_boe ?? ZERO_ROW;

  const reconciled = data?.voucher_status?.reconciled ?? 0;
  const unreconciled = data?.voucher_status?.unreconciled ?? 0;
  const uncertain = data?.voucher_status?.uncertain ?? 0;
  // Detailed unreconciled breakdown from the service.
  const mismatch = data?.voucher_status?.mismatch ?? 0;
  const missingInPortal = data?.voucher_status?.missing_in_portal ?? 0;
  const missingInBooks = data?.voucher_status?.missing_in_books ?? 0;
  const mismatches = data?.mismatches ?? [];
  const portalOnly = data?.portal_only ?? [];

  // Import a downloaded GSTR-2A JSON (portal) and re-run the reconciliation. The return
  // period comes from the file's `fp`; mirrors the GSTR-2B import flow.
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
        if (!payload.fp) {
          setError('This GSTR-2A JSON has no return period (fp). Please use a portal export.');
          return;
        }
        const res = await window.api.gst.importGSTR2A({
          company_id: companyId,
          fy_id: fyId,
          return_period: payload.fp,
          payload,
        });
        if (res.success) {
          await loadData();
          alert('GSTR-2A JSON imported successfully! Reconciliation updated.');
        } else {
          setError(res.error || 'Failed to import JSON');
        }
      } catch (err: any) {
        setError('Invalid JSON file: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  const periodLabel =
    data?.period_label ?? (activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '');
  const lastActivity = data?.last_gst_activity ?? 'No Activity Found';

  const grandTotal = [b2b, amend_b2b, cdn, amend_cdn, isd, import_boe, import_sez_boe].reduce(
    addRow,
    ZERO_ROW,
  );

  const rows: RowDef[] = [
    { type: 'subhead', label: 'Return View (Comparison of Books & Portal Values)' },
    { type: 'data', label: 'B2B Invoices', row: b2b, indent: 1 },
    { type: 'data', label: 'Amendments to B2B Invoices', row: amend_b2b, indent: 1 },
    { type: 'data', label: 'Credit/Debit Notes', row: cdn, indent: 1 },
    { type: 'data', label: 'Amendments to Credit/Debit Notes', row: amend_cdn, indent: 1 },
    { type: 'data', label: 'ISD Credits', row: isd, indent: 1 },
    {
      type: 'data',
      label: 'Import of Goods from overseas on Bill of Entry',
      row: import_boe,
      indent: 1,
    },
    {
      type: 'data',
      label: 'Import of Goods from SEZ Units/Developers on Bill of Entry',
      row: import_sez_boe,
      indent: 1,
    },
  ];

  return (
    <TallyReportLayout
      title="GSTR-2A Reconciliation"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <>
          <div className="flex gap-4">
            <span className="w-36">GST Registration</span>
            <span className="font-bold">: {registrationName}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-36">Status</span>
            <span className="font-bold">: Unreconciled</span>
          </div>
        </>
      }
      rightSubtitle={
        <>
          <div>{periodLabel}</div>
          <div className="text-gray-500">Last online GST activity: {lastActivity}</div>
        </>
      }
      footerControls={
        <>
          <Button
            onClick={loadData}
            variant="ghost"
            size="xs"
            disabled={loading}
            className="h-auto p-0 ml-4 font-bold text-black hover:underline hover:bg-transparent"
          >
            F5: Refresh
          </Button>
          <Button
            onClick={() => setFetchOpen(true)}
            variant="ghost"
            size="xs"
            disabled={loading}
            className="h-auto p-0 ml-4 font-bold text-black hover:underline hover:bg-transparent"
          >
            Fetch from Portal
          </Button>
          <Button
            onClick={handleImportJson}
            variant="ghost"
            size="xs"
            disabled={loading}
            className="h-auto p-0 ml-4 font-bold text-black hover:underline hover:bg-transparent"
          >
            Import GSTR-2A JSON
          </Button>
        </>
      }
    >
      {companyId && fyId && (
        <PortalFetchPopup
          open={fetchOpen}
          kind="2A"
          companyId={companyId}
          fyId={fyId}
          onClose={() => setFetchOpen(false)}
          onImported={loadData}
        />
      )}
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && (
          <EmptyState message="Loading GSTR-2A reconciliation data…" className="italic" />
        )}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && (
          <>
            <div className="flex flex-col border-b border-gray-300">
              <div className="flex font-bold px-2 py-1 border-b border-gray-200">
                <div className="flex-1">P a r t i c u l a r s</div>
                <div className="w-32 text-right">Voucher Count</div>
              </div>

              <div className="flex px-2 py-0.5 font-bold bg-[#ffcc00]">
                <div className="flex-1">Reconciled</div>
                <div className="w-32 text-right text-green-700">{fmtCount(reconciled)}</div>
              </div>

              <div className="flex px-4 py-0.5 text-red-600">
                <div className="flex-1">Unreconciled</div>
                <div className="w-32 text-right font-semibold">{fmtCount(unreconciled)}</div>
              </div>

              {/* Breakdown of what's unreconciled — value mismatches vs one-sided documents. */}
              <div className="flex px-8 py-0.5 text-gray-600">
                <div className="flex-1">Value mismatch (books vs portal)</div>
                <div className="w-32 text-right">{fmtCount(mismatch)}</div>
              </div>
              <div className="flex px-8 py-0.5 text-gray-600">
                <div className="flex-1">In books, not yet filed by vendor</div>
                <div className="w-32 text-right">{fmtCount(missingInPortal)}</div>
              </div>
              <div className="flex px-8 py-0.5 text-gray-600">
                <div className="flex-1">Filed by vendor, not in books</div>
                <div className="w-32 text-right">{fmtCount(missingInBooks)}</div>
              </div>

              <div
                onClick={() =>
                  uncertain > 0 &&
                  // Company-wide, matching this report's company-wide uncertain count.
                  navigate('/master/statutory/gstr2a/reconciliation/uncertain', {
                    state: {
                      registration: null,
                      returnType: 'GSTR2A',
                      reportTitle: 'GSTR-2A Reconciliation',
                      supplyGroupLabel: 'Inward Supplies',
                      reconciliation: true,
                    },
                  })
                }
                className={cn(
                  'flex px-4 py-0.5 pb-2 text-orange-600 font-semibold',
                  uncertain > 0 ? 'cursor-pointer hover:bg-[#e6f2ff]' : 'text-gray-400',
                )}
              >
                <div className="flex-1">Uncertain Transactions (Corrections needed)</div>
                <div className="w-32 text-right">{fmtCount(uncertain)}</div>
              </div>
            </div>

            <Table className="text-xs table-fixed">
              <TableHeader>
                <TableRow className="border-b border-gray-300 hover:bg-transparent">
                  <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                    P a r t i c u l a r s
                  </TableHead>
                  <TableHead className={cn(HEAD, 'w-24')}>Voucher Count</TableHead>
                  <TableHead className={cn(HEAD, 'w-28')}>
                    Taxable
                    <br />
                    Amount
                  </TableHead>
                  <TableHead className={cn(HEAD, 'w-24')}>IGST</TableHead>
                  <TableHead className={cn(HEAD, 'w-24')}>CGST</TableHead>
                  <TableHead className={cn(HEAD, 'w-24')}>
                    SGST/
                    <br />
                    UTGST
                  </TableHead>
                  <TableHead className={cn(HEAD, 'w-20')}>Cess</TableHead>
                  <TableHead className={cn(HEAD, 'w-24')}>
                    Tax
                    <br />
                    Amount
                  </TableHead>
                  <TableHead className={cn(HEAD, 'w-28')}>
                    Invoice
                    <br />
                    Amount
                  </TableHead>
                  <TableHead className={cn(HEAD, 'w-24')}>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row, idx) => {
                  if (row.type === 'divider') {
                    return (
                      <TableRow key={idx} className="border-0 h-2 hover:bg-transparent">
                        <TableCell colSpan={10} className="p-0 border-t border-gray-200" />
                      </TableRow>
                    );
                  }

                  if (row.type === 'subhead') {
                    return (
                      <TableRow key={idx} className="border-0 hover:bg-transparent">
                        <TableCell colSpan={10} className="px-2 py-1 font-bold text-black">
                          {row.label}
                        </TableCell>
                      </TableRow>
                    );
                  }

                  const isSelected = selectedRow === idx;
                  const hasData = row.row.vch_count > 0 || row.row.taxable_amount !== 0;
                  const indentCls = row.indent === 2 ? 'pl-10' : 'pl-6';

                  return (
                    <TableRow
                      key={idx}
                      onClick={() => setSelectedRow(idx)}
                      className={cn(
                        'border-0 cursor-pointer hover:bg-[#e6f2ff]',
                        isSelected
                          ? 'bg-[#ffcc00] text-black font-bold hover:bg-[#ffcc00]'
                          : hasData
                            ? 'text-black'
                            : 'text-gray-400',
                      )}
                    >
                      <TableCell className={cn('px-2 py-0.5', indentCls)}>{row.label}</TableCell>
                      <TableCell className={NUM}>{fmtCount(row.row.vch_count)}</TableCell>
                      <TableCell className={NUM}>{fmt(row.row.taxable_amount)}</TableCell>
                      <TableCell className={NUM}>{fmt(row.row.igst)}</TableCell>
                      <TableCell className={NUM}>{fmt(row.row.cgst)}</TableCell>
                      <TableCell className={NUM}>{fmt(row.row.sgst)}</TableCell>
                      <TableCell className={NUM}>{fmt(row.row.cess)}</TableCell>
                      <TableCell className={NUM}>{fmt(row.row.tax_amount)}</TableCell>
                      <TableCell className={NUM}>{fmt(row.row.invoice_amount)}</TableCell>
                      <TableCell className="px-2 py-0.5 text-xs">
                        <StatusBadge status={row.row.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>

              <TableFooter className="bg-transparent">
                <TableRow className="border-t border-gray-400 hover:bg-transparent font-bold">
                  <TableCell className="px-2 py-1">Total</TableCell>
                  <TableCell className={cn(NUM, 'font-bold')}>
                    {fmtCount(grandTotal.vch_count)}
                  </TableCell>
                  <TableCell className={cn(NUM, 'font-bold')}>
                    {fmt(grandTotal.taxable_amount)}
                  </TableCell>
                  <TableCell className={cn(NUM, 'font-bold')}>{fmt(grandTotal.igst)}</TableCell>
                  <TableCell className={cn(NUM, 'font-bold')}>{fmt(grandTotal.cgst)}</TableCell>
                  <TableCell className={cn(NUM, 'font-bold')}>{fmt(grandTotal.sgst)}</TableCell>
                  <TableCell className={cn(NUM, 'font-bold')}>{fmt(grandTotal.cess)}</TableCell>
                  <TableCell className={cn(NUM, 'font-bold')}>
                    {fmt(grandTotal.tax_amount)}
                  </TableCell>
                  <TableCell className={cn(NUM, 'font-bold')}>
                    {fmt(grandTotal.invoice_amount)}
                  </TableCell>
                  <TableCell className={NUM} />
                </TableRow>
              </TableFooter>
            </Table>

            <ReconMismatchLists mismatches={mismatches} portalOnly={portalOnly} />
          </>
        )}
      </div>
    </TallyReportLayout>
  );
}
