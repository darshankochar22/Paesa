import { Fragment, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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
import {
  type ReconKind,
  fmt,
  NUM,
  HEAD,
  PORTAL_ROW,
  ROW_HOVER,
  HEAD_HAIRLINE,
  EMPTY_CELL,
  portalTag,
} from './reconShared';

interface VchSide {
  doc_no: string;
  date?: string;
  party_name?: string;
  vch_type?: string;
  vch_no?: string;
  doc_date?: string;
  taxable: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess?: number;
  tax: number;
  invoice: number;
}
interface Pair {
  book: VchSide | null;
  // GSTR-2B additionally states whether the ITC on a document may be claimed
  // (`itc_available` 'N' = not available) and the portal's reason code.
  portal:
    | (VchSide & {
        gstin?: string;
        itc_available?: string;
        itc_reason?: string;
        // The portal gave no note type, so the reversal direction was inferred.
        note_type_assumed?: boolean;
      })
    | null;
}
interface Groups {
  mismatch: Pair[];
  only_portal: Pair[];
  only_books: Pair[];
  no_portal: Pair[];
  reconciled: Pair[];
}

// Ordered like Tally's register: issues first, reconciled last.
const GROUP_ORDER: { key: keyof Groups; label: string }[] = [
  { key: 'mismatch', label: 'Mismatched' },
  { key: 'only_portal', label: 'Available Only on Portal' },
  { key: 'only_books', label: 'Available Only in Books' },
  { key: 'no_portal', label: 'In Books, Period Not Fetched from Portal' },
  { key: 'reconciled', label: 'Reconciled' },
];

// Drill level 3: a supplier's vouchers grouped by reconciliation status, each with the
// book row and (muted) portal row side by side — the actionable mismatch view.
export default function ReconVoucherRegister() {
  const { selectedCompany, activeFY } = useCompany();
  const location = useLocation();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const kind: ReconKind = location.state?.kind || '2A';
  const section: string = location.state?.section || 'b2b';
  const sectionLabel: string = location.state?.sectionLabel || 'B2B Invoices';
  const gstin: string = location.state?.gstin || '';
  const partyName: string = location.state?.partyName || '';
  const registration = location.state?.registration || null;
  // MMYYYY carried down from the recon screen's period selector; null = whole FY.
  const returnPeriod: string | null = location.state?.returnPeriod ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Groups | null>(null);
  const [periodLabel, setPeriodLabel] = useState('');

  const load = useCallback(async () => {
    if (!companyId || !fyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await window.api.gst.getReconVoucherRegister({
        company_id: companyId,
        fy_id: fyId,
        kind,
        section,
        gstin,
        gst_registration_id: registration?.gst_id ?? null,
        return_period: returnPeriod,
      });
      if (res.success) {
        setGroups(res.payload.groups);
        setPeriodLabel(res.payload.period_label || '');
      } else setError(res.error || 'Failed to load voucher register');
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, kind, section, gstin, registration, returnPeriod]);

  useEffect(() => {
    load();
  }, [load]);

  // `group` prefixes the row keys — indexes alone collide across the status groups
  // (mismatch[0] and reconciled[0] would both render as key "0-b").
  const pairRows = (p: Pair, i: number, group: string) => {
    const rows = [];
    if (p.book) {
      rows.push(
        <TableRow key={`${group}-${i}-b`} className={cn('border-0', ROW_HOVER)}>
          <TableCell className="px-2 py-0.5">{p.book.date}</TableCell>
          <TableCell className="px-2 py-0.5">{p.book.party_name || partyName}</TableCell>
          <TableCell className="px-2 py-0.5">{p.book.vch_type}</TableCell>
          <TableCell className="px-2 py-0.5">{p.book.vch_no}</TableCell>
          <TableCell className="px-2 py-0.5">{p.book.doc_no}</TableCell>
          <TableCell className="px-2 py-0.5">{p.book.doc_date}</TableCell>
          <TableCell className={NUM}>{fmt(p.book.taxable)}</TableCell>
          <TableCell className={NUM}>{fmt(p.book.igst)}</TableCell>
          <TableCell className={NUM}>{fmt(p.book.cgst)}</TableCell>
          <TableCell className={NUM}>{fmt(p.book.sgst)}</TableCell>
          <TableCell className={NUM}>{fmt(p.book.cess)}</TableCell>
          <TableCell className={NUM}>{fmt(p.book.tax)}</TableCell>
          <TableCell className={NUM}>{fmt(p.book.invoice)}</TableCell>
        </TableRow>,
      );
    }
    if (p.portal) {
      rows.push(
        <TableRow key={`${group}-${i}-p`} className={cn('border-0', ROW_HOVER, PORTAL_ROW)}>
          <TableCell className="px-2 py-0.5">{p.book ? '' : p.portal.doc_date}</TableCell>
          <TableCell className="px-2 py-0.5">
            {p.book ? portalTag(kind) : partyName}
            {/* ITC ineligibility is the single most consequential thing GSTR-2B says
                about a document — flag it by weight, not colour, per the B/W theme. */}
            {p.portal.itc_available === 'N' && (
              <span className="ml-2 font-bold not-italic">
                ITC not available{p.portal.itc_reason ? ` (${p.portal.itc_reason})` : ''}
              </span>
            )}
            {/* The portal stated no note type, so credit-vs-debit was inferred. Say so
                rather than presenting the direction as fact. */}
            {p.portal.note_type_assumed && (
              <span className="ml-2 not-italic">(note direction assumed)</span>
            )}
          </TableCell>
          <TableCell className="px-2 py-0.5" />
          <TableCell className="px-2 py-0.5" />
          <TableCell className="px-2 py-0.5">{p.portal.doc_no}</TableCell>
          <TableCell className="px-2 py-0.5">{p.portal.doc_date}</TableCell>
          <TableCell className={NUM}>{fmt(p.portal.taxable)}</TableCell>
          <TableCell className={NUM}>{fmt(p.portal.igst)}</TableCell>
          <TableCell className={NUM}>{fmt(p.portal.cgst)}</TableCell>
          <TableCell className={NUM}>{fmt(p.portal.sgst)}</TableCell>
          <TableCell className={NUM}>{fmt(p.portal.cess)}</TableCell>
          <TableCell className={NUM}>{fmt(p.portal.tax)}</TableCell>
          <TableCell className={NUM}>{fmt(p.portal.invoice)}</TableCell>
        </TableRow>,
      );
    }
    return rows;
  };

  const totalCount = groups ? GROUP_ORDER.reduce((n, g) => n + (groups[g.key]?.length || 0), 0) : 0;

  return (
    <TallyReportLayout
      title={`GSTR-${kind} Reconciliation — Voucher Register`}
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <div className="flex gap-4">
          <span className="w-20">Vouchers of</span>
          <span className="font-bold">
            : {partyName} {gstin && `(${gstin})`}
          </span>
        </div>
      }
      rightSubtitle={<div>{periodLabel}</div>}
      breadcrumb={[
        {
          label: `GSTR-${kind} Reconciliation`,
          to: `/master/statutory/gstr${kind.toLowerCase()}/reconciliation`,
          state: { registration },
        },
        {
          label: sectionLabel,
          to: `/master/statutory/gstr${kind.toLowerCase()}/reconciliation/party`,
          state: { kind, section, sectionLabel, registration, returnPeriod },
        },
        { label: partyName || gstin },
      ]}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading voucher register…" className="italic" />}
        {error && (
          <div className="p-2 text-center font-bold text-black border-l-2 border-black">
            {error}
          </div>
        )}
        {!loading && !error && groups && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className={cn(HEAD_HAIRLINE, 'hover:bg-transparent')}>
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black w-24">
                  Date
                </TableHead>
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                  Particulars
                </TableHead>
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black w-24">
                  Vch Type
                </TableHead>
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black w-20">
                  Vch No
                </TableHead>
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black w-24">
                  Doc No
                </TableHead>
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black w-24">
                  Doc Date
                </TableHead>
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
              {totalCount === 0 && (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell colSpan={13} className={EMPTY_CELL}>
                    No vouchers for this supplier.
                  </TableCell>
                </TableRow>
              )}
              {GROUP_ORDER.map(({ key, label }) => {
                const list = groups[key] || [];
                if (!list.length) return null;
                return (
                  <Fragment key={key}>
                    <TableRow className="border-0 hover:bg-transparent">
                      <TableCell
                        colSpan={13}
                        className="px-2 pt-2 pb-0.5 font-bold text-black underline"
                      >
                        {label} ({list.length})
                      </TableCell>
                    </TableRow>
                    {list.flatMap((p, i) => pairRows(p, i, key))}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </TallyReportLayout>
  );
}
