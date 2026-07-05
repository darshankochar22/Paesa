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
  | { type: 'section'; label: string }
  | { type: 'subhead'; label: string }
  | { type: 'data'; label: string; row: ReconciliationRow; indent?: 1 | 2 }
  | { type: 'total'; label: string; row: ReconciliationRow }
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

export default function GSTR1Reconciliation() {
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

      const result = await window.api.gst.getGSTR1Reconciliation({
        company_id: companyId,
        fy_id: fyId,
      });
      if (result.success) setData(result.payload);
      else setError(result.error || 'Failed to load GSTR-1 reconciliation data.');
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
  const b2c_large: ReconciliationRow = d.b2c_large ?? ZERO_ROW;
  const exports: ReconciliationRow = d.exports ?? ZERO_ROW;
  const cdn_reg: ReconciliationRow = d.cdn_registered ?? ZERO_ROW;
  const cdn_unreg: ReconciliationRow = d.cdn_unreg ?? ZERO_ROW;
  const amend_b2b: ReconciliationRow = d.amend_b2b ?? ZERO_ROW;
  const amend_b2c: ReconciliationRow = d.amend_b2c ?? ZERO_ROW;
  const amend_exports: ReconciliationRow = d.amend_exports ?? ZERO_ROW;
  const amend_cdn_reg: ReconciliationRow = d.amend_cdn_reg ?? ZERO_ROW;
  const amend_cdn_unreg: ReconciliationRow = d.amend_cdn_unreg ?? ZERO_ROW;
  const b2c_small: ReconciliationRow = d.b2c_small ?? ZERO_ROW;
  const nil_rated: ReconciliationRow = d.nil_rated ?? ZERO_ROW;
  const amend_b2c_small: ReconciliationRow = d.amend_b2c_small ?? ZERO_ROW;
  const tax_liability_advances: ReconciliationRow = d.tax_liability_advances ?? ZERO_ROW;
  const adjustment_advances: ReconciliationRow = d.adjustment_advances ?? ZERO_ROW;
  const amend_tax_liability: ReconciliationRow = d.amend_tax_liability ?? ZERO_ROW;
  const amend_adjustment: ReconciliationRow = d.amend_adjustment ?? ZERO_ROW;
  const hsn_summary: ReconciliationRow = d.hsn_summary ?? ZERO_ROW;
  const doc_summary: ReconciliationRow = d.doc_summary ?? ZERO_ROW;

  const reconciled = data?.voucher_status?.reconciled ?? 0;
  const unreconciled = data?.voucher_status?.unreconciled ?? 0;
  const uncertain = data?.voucher_status?.uncertain ?? 0;

  const periodLabel =
    data?.period_label ?? (activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '');
  const lastActivity = data?.last_gst_activity ?? 'No Activity Found';

  const grandTotal = [
    b2b,
    b2c_large,
    exports,
    cdn_reg,
    cdn_unreg,
    amend_b2b,
    amend_b2c,
    amend_exports,
    amend_cdn_reg,
    amend_cdn_unreg,
    b2c_small,
    nil_rated,
    amend_b2c_small,
    tax_liability_advances,
    adjustment_advances,
    amend_tax_liability,
    amend_adjustment,
  ].reduce(addRow, ZERO_ROW);

  const rows: RowDef[] = [
    { type: 'subhead', label: 'Return View (Comparison of Books & Portal Values)' },
    { type: 'data', label: 'B2B Invoices - 4A, 4B, 4C, 6B, 6C', row: b2b, indent: 1 },
    { type: 'data', label: 'B2C (Large) Invoices - 5A, 5B', row: b2c_large, indent: 1 },
    { type: 'data', label: 'Exports Invoices - 6A', row: exports, indent: 1 },
    { type: 'data', label: 'Credit or Debit Notes (Registered) - 9B', row: cdn_reg, indent: 1 },
    { type: 'data', label: 'Credit or Debit Notes (Unregistered) - 9B', row: cdn_unreg, indent: 1 },
    { type: 'data', label: 'Amended B2B Invoices - 9A', row: amend_b2b, indent: 1 },
    { type: 'data', label: 'Amended B2C (Large) Invoices - 9A', row: amend_b2c, indent: 1 },
    { type: 'data', label: 'Amended Exports Invoices - 9A', row: amend_exports, indent: 1 },
    {
      type: 'data',
      label: 'Amended Credit or Debit Notes (Registered) - 9C',
      row: amend_cdn_reg,
      indent: 1,
    },
    {
      type: 'data',
      label: 'Amended Credit or Debit Notes (Unregistered) - 9C',
      row: amend_cdn_unreg,
      indent: 1,
    },
    { type: 'data', label: 'B2C (Small) Invoices - 7', row: b2c_small, indent: 1 },
    { type: 'data', label: 'Nil Rated Invoices - 8A, 8B, 8C, 8D', row: nil_rated, indent: 1 },
    { type: 'data', label: 'Amendment B2C (Small) Invoices - 10', row: amend_b2c_small, indent: 1 },
    {
      type: 'data',
      label: 'Tax Liability (Advances Received) - 11A(1), 11A(2)',
      row: tax_liability_advances,
      indent: 1,
    },
    {
      type: 'data',
      label: 'Adjustment of Advances - 11B(1), 11B(2)',
      row: adjustment_advances,
      indent: 1,
    },
    {
      type: 'data',
      label: 'Amended Tax Liability (Advances Received) - 11A',
      row: amend_tax_liability,
      indent: 1,
    },
    {
      type: 'data',
      label: 'Amendment of Adjusted Advances - 11B',
      row: amend_adjustment,
      indent: 1,
    },
    { type: 'data', label: 'HSN Summary - 12 (B2B - B2C Supplies)', row: hsn_summary, indent: 1 },
    { type: 'data', label: 'Document Summary - 13', row: doc_summary, indent: 1 },
  ];

  return (
    <TallyReportLayout
      title="GSTR-1 Reconciliation"
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
        {loading && <EmptyState message="Loading GSTR-1 reconciliation data…" className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && (
          <>
            {/* ── Voucher Status Summary ────────────────────────────────── */}
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

              <div
                onClick={() =>
                  uncertain > 0 &&
                  // Company-wide, matching this report's company-wide uncertain count.
                  navigate('/master/statutory/gstr1/reconciliation/uncertain', {
                    state: {
                      registration: null,
                      returnType: 'GSTR1',
                      reportTitle: 'GSTR-1 Reconciliation',
                      supplyGroupLabel: 'Outward Supplies',
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

            {/* ── Main Reconciliation Table ─────────────────────────────── */}
            <Table className="text-xs table-fixed">
              <TableHeader>
                <TableRow className="border-b border-gray-300 hover:bg-transparent">
                  <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                    P a r t i c u l a r s
                  </TableHead>
                  <TableHead className={cn(HEAD, 'w-20')}>
                    Vch Count
                    <br />
                    (Summary)
                  </TableHead>
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

                  if (row.type === 'section') {
                    return (
                      <TableRow key={idx} className="border-0 hover:bg-transparent">
                        <TableCell
                          colSpan={10}
                          className="px-2 pt-2 pb-0.5 font-bold text-black underline"
                        >
                          {row.label}
                        </TableCell>
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

                  if (row.type === 'total') {
                    return (
                      <TableRow
                        key={idx}
                        className="border-t border-b border-gray-300 bg-gray-100 hover:bg-gray-100 font-semibold"
                      >
                        <TableCell className="px-2 py-0.5 font-semibold">{row.label}</TableCell>
                        <TableCell className={NUM}>{fmtCount(row.row.vch_count)}</TableCell>
                        <TableCell className={NUM}>{fmt(row.row.taxable_amount)}</TableCell>
                        <TableCell className={NUM}>{fmt(row.row.igst)}</TableCell>
                        <TableCell className={NUM}>{fmt(row.row.cgst)}</TableCell>
                        <TableCell className={NUM}>{fmt(row.row.sgst)}</TableCell>
                        <TableCell className={NUM}>{fmt(row.row.cess)}</TableCell>
                        <TableCell className={NUM}>{fmt(row.row.tax_amount)}</TableCell>
                        <TableCell className={NUM}>{fmt(row.row.invoice_amount)}</TableCell>
                        <TableCell className={NUM} />
                      </TableRow>
                    );
                  }

                  // data row
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
          </>
        )}
      </div>
    </TallyReportLayout>
  );
}
