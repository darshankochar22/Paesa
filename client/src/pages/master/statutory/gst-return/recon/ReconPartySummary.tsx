import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

interface PartyRow {
  gstin: string;
  party_name: string;
  books: DualAmounts;
  portal: DualAmounts;
  status: string;
}

// Drill level 2: a section's party-wise summary — one supplier GSTIN per two rows
// (books, then muted portal). Row click → that supplier's voucher register.
export default function ReconPartySummary() {
  const { selectedCompany, activeFY } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const kind: ReconKind = location.state?.kind || '2A';
  const section: string = location.state?.section || 'b2b';
  const sectionLabel: string = location.state?.sectionLabel || 'B2B Invoices';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parties, setParties] = useState<PartyRow[]>([]);
  const [periodLabel, setPeriodLabel] = useState('');

  const load = useCallback(async () => {
    if (!companyId || !fyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await window.api.gst.getReconPartySummary({
        company_id: companyId,
        fy_id: fyId,
        kind,
        section,
      });
      if (res.success) {
        setParties(res.payload.parties || []);
        setPeriodLabel(res.payload.period_label || '');
      } else setError(res.error || 'Failed to load party summary');
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, kind, section]);

  useEffect(() => {
    load();
  }, [load]);

  const drillVouchers = (p: PartyRow) =>
    navigate(`/master/statutory/gstr${kind.toLowerCase()}/reconciliation/register`, {
      state: { kind, section, sectionLabel, gstin: p.gstin, partyName: p.party_name },
    });

  const grand = parties.reduce(
    (acc, p) => {
      (['books', 'portal'] as const).forEach((side) => {
        const a = acc[side];
        const v = p[side];
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

  const dualRows = (p: PartyRow) =>
    (['books', 'portal'] as const).map((side) => {
      const v = p[side];
      return (
        <TableRow
          key={`${p.gstin}-${side}`}
          onClick={() => drillVouchers(p)}
          className={cn(
            'border-0 cursor-pointer hover:bg-zinc-50',
            side === 'portal' && PORTAL_ROW,
          )}
        >
          <TableCell className="px-2 py-0.5">{side === 'books' ? p.gstin : ''}</TableCell>
          <TableCell className="px-2 py-0.5">{side === 'books' ? p.party_name : ''}</TableCell>
          <TableCell className={NUM}>{fmtCount(v.count)}</TableCell>
          <TableCell className={NUM}>{fmt(v.taxable)}</TableCell>
          <TableCell className={NUM}>{fmt(v.igst)}</TableCell>
          <TableCell className={NUM}>{fmt(v.cgst)}</TableCell>
          <TableCell className={NUM}>{fmt(v.sgst)}</TableCell>
          <TableCell className={NUM}>{fmt(v.cess)}</TableCell>
          <TableCell className={NUM}>{fmt(v.tax)}</TableCell>
          <TableCell className={NUM}>{fmt(v.invoice)}</TableCell>
        </TableRow>
      );
    });

  return (
    <TallyReportLayout
      title={`GSTR-${kind} Reconciliation — Summary`}
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <>
          <div className="flex gap-4">
            <span className="w-24">Details of</span>
            <span className="font-bold">
              : {sectionLabel} (Comparison of Books &amp; Portal Values)
            </span>
          </div>
        </>
      }
      rightSubtitle={<div>{periodLabel}</div>}
      breadcrumb={[
        {
          label: `GSTR-${kind} Reconciliation`,
          to: `/master/statutory/gstr${kind.toLowerCase()}/reconciliation`,
        },
        { label: sectionLabel },
      ]}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading party summary…" className="italic" />}
        {error && (
          <div className="p-2 text-center font-bold text-black border-l-2 border-black">
            {error}
          </div>
        )}
        {!loading && !error && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-zinc-300 hover:bg-transparent">
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black w-40">
                  GSTIN
                </TableHead>
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                  Party Name
                </TableHead>
                <TableHead className={cn(HEAD, 'w-20')}>Voucher Count</TableHead>
                <TableHead className={cn(HEAD, 'w-28')}>Taxable Amount</TableHead>
                <TableHead className={cn(HEAD, 'w-24')}>IGST</TableHead>
                <TableHead className={cn(HEAD, 'w-24')}>CGST</TableHead>
                <TableHead className={cn(HEAD, 'w-24')}>SGST/UTGST</TableHead>
                <TableHead className={cn(HEAD, 'w-20')}>Cess</TableHead>
                <TableHead className={cn(HEAD, 'w-24')}>Tax Amount</TableHead>
                <TableHead className={cn(HEAD, 'w-28')}>Invoice Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parties.length === 0 && (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell colSpan={10} className="px-2 py-3 text-center text-zinc-400">
                    No documents in this section.
                  </TableCell>
                </TableRow>
              )}
              {parties.map(dualRows)}
            </TableBody>
            <TableFooter className="bg-transparent">
              <TableRow className="border-t border-black hover:bg-transparent font-bold">
                <TableCell className="px-2 py-1" colSpan={2}>
                  Total (Books)
                </TableCell>
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
              </TableRow>
              <TableRow className={cn('hover:bg-transparent', PORTAL_ROW)}>
                <TableCell className="px-2 py-1" colSpan={2}>
                  Total (Portal)
                </TableCell>
                <TableCell className={NUM}>{fmtCount(grand.portal.count)}</TableCell>
                <TableCell className={NUM}>{fmt(grand.portal.taxable)}</TableCell>
                <TableCell className={NUM}>{fmt(grand.portal.igst)}</TableCell>
                <TableCell className={NUM}>{fmt(grand.portal.cgst)}</TableCell>
                <TableCell className={NUM}>{fmt(grand.portal.sgst)}</TableCell>
                <TableCell className={NUM}>{fmt(grand.portal.cess)}</TableCell>
                <TableCell className={NUM}>{fmt(grand.portal.tax)}</TableCell>
                <TableCell className={NUM}>{fmt(grand.portal.invoice)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>
    </TallyReportLayout>
  );
}
