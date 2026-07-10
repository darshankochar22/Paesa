import { useState, useEffect } from 'react';
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
import { posStateLabel } from './GSTR-3B';

interface TaxAmount {
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  cess: number;
}

const ZERO: TaxAmount = { txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 };

const fmt = (n: number) => (n ? n.toFixed(2) : '');
const taxTotal = (t: TaxAmount) => t.iamt + t.camt + t.samt + t.cess;
const sumTax = (list: TaxAmount[]): TaxAmount =>
  list.reduce(
    (acc, r) => ({
      txval: acc.txval + (r?.txval || 0),
      iamt: acc.iamt + (r?.iamt || 0),
      camt: acc.camt + (r?.camt || 0),
      samt: acc.samt + (r?.samt || 0),
      cess: acc.cess + (r?.cess || 0),
    }),
    { ...ZERO },
  );

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function periodLabelFor(month: string, year: string) {
  const m = Number(month);
  const y = Number(year);
  const lastDay = new Date(y, m, 0).getDate();
  const yy = String(y).slice(-2);
  return `1-${MONTHS[m - 1]}-${yy} to ${lastDay}-${MONTHS[m - 1]}-${yy}`;
}

interface SummaryRow {
  label: string;
  data: TaxAmount;
  // Register filters for the row's voucher drill; rows without a real voucher-level
  // mapping in our books (imports, ISD, reverse charge) stay non-clickable.
  drill?: {
    voucherType?: string;
    section?: string;
    direction?: 'outward' | 'inward';
    excludeSections?: string[];
    subtitle: string;
  } | null;
}

// "GSTR-3B - Summary" — the intermediate breakdown Tally opens when a section row of
// the GSTR-3B return view is drilled: 3.1 → tables 3.1a–3.1e, 4A → ITC lines 1–5,
// 3.2 → per-recipient interstate rows. Each concrete row drills to the shared
// voucher register scoped to the vouchers that produced it.
export default function GSTR3BSectionSummary() {
  const { selectedCompany, activeFY } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const today = new Date();
  const month = location.state?.month || String(today.getMonth() + 1).padStart(2, '0');
  const year = location.state?.year || String(today.getFullYear());
  const registration = location.state?.registration;
  const sectionKey: string = location.state?.sectionKey || '3.1';

  const registrationName = registration?.state_id
    ? `${registration.state_id} Registration`
    : registration?.name || 'All Registrations';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<any>(null);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      if (!companyId || !fyId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await window.api.gst.getGSTR3B({
          company_id: companyId,
          fy_id: fyId,
          return_period: `${month}${year}`,
          gst_registration_id: registration?.gst_id ?? null,
        });
        if (res.success) setPayload(res.payload);
        else setError(res.error || 'Failed to load GSTR-3B data.');
      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, fyId, month, year, registration?.gst_id]);

  // ── Section definitions ─────────────────────────────────────────────────────

  let detailsLabel = '';
  let rows: SummaryRow[] = [];
  // Tally's 4A summary drops the Taxable Amount column (pure ITC figures).
  const showTaxable = sectionKey !== '4A';

  if (sectionKey === '3.1') {
    detailsLabel = 'Tax on Outward and Reverse Charge Inward Supplies';
    rows = [
      {
        label:
          '3.1a. Outward Taxable Supplies (other than Zero Rated, Nil Rated, and Exempted Supplies)',
        data: payload?.sup_details?.osup_det ?? ZERO,
        drill: {
          direction: 'outward',
          excludeSections: ['nil', 'exports'],
          subtitle:
            'Outward Taxable Supplies (other than Zero Rated, Nil Rated, and Exempted Supplies)',
        },
      },
      {
        label: '3.1b. Outward Taxable Supplies (Zero Rated)',
        data: payload?.sup_details?.osup_zero ?? ZERO,
        drill: {
          direction: 'outward',
          section: 'exports',
          subtitle: 'Outward Taxable Supplies (Zero Rated)',
        },
      },
      {
        label: '3.1c. Other Outward Supplies (Nil Rated and Exempted)',
        data: payload?.sup_details?.osup_nil_exmp ?? ZERO,
        drill: {
          direction: 'outward',
          section: 'nil',
          subtitle: 'Other Outward Supplies (Nil Rated and Exempted)',
        },
      },
      {
        label: '3.1d. Inward Supplies (applicable for Reverse Charge)',
        data: payload?.sup_details?.isup_rev ?? ZERO,
        drill: null,
      },
      {
        label: '3.1e. Non-GST Outward Supplies',
        data: payload?.sup_details?.osup_nongst ?? ZERO,
        drill: null,
      },
    ];
  } else if (sectionKey === '4A') {
    detailsLabel = 'Input Tax Credit Available (either in part or in full)';
    const avl = payload?.itc_elg?.itc_avl || [];
    rows = [
      { label: '1. Import of Goods', data: avl[0] ?? ZERO, drill: null },
      { label: '2. Import of Services', data: avl[1] ?? ZERO, drill: null },
      {
        label: '3. Inward Supplies applicable for Reverse Charge (other than lines 1 & 2)',
        data: avl[2] ?? ZERO,
        drill: null,
      },
      { label: '4. Inward Supplies from ISD', data: avl[3] ?? ZERO, drill: null },
      {
        label: '5. All other Input Tax Credit',
        data: avl[4] ?? ZERO,
        drill: { direction: 'inward', subtitle: 'All other Input Tax Credit' },
      },
    ];
  } else if (sectionKey === '3.2') {
    detailsLabel = 'Interstate Supplies';
    const build = (label: string, details: any[]): SummaryRow[] =>
      (details || [])
        .filter((r: any) => r && (r.txval || r.iamt))
        .map((r: any) => ({
          label: `${label} — ${posStateLabel(r.pos)}`,
          data: { txval: r.txval || 0, iamt: r.iamt || 0, camt: 0, samt: 0, cess: 0 },
          drill: null,
        }));
    rows = [
      ...build('Supplies made to Unregistered Persons', payload?.inter_sup?.unreg_details),
      ...build('Supplies made to Composition Taxable Persons', payload?.inter_sup?.comp_details),
      ...build('Supplies made to UIN holders', payload?.inter_sup?.uin_details),
    ];
    if (rows.length === 0)
      rows = [
        { label: 'Supplies made to Unregistered Persons', data: ZERO, drill: null },
        { label: 'Supplies made to Composition Taxable Persons', data: ZERO, drill: null },
        { label: 'Supplies made to UIN holders', data: ZERO, drill: null },
      ];
  }

  const totals = sumTax(rows.map((r) => r.data));

  const openRegister = (drill: NonNullable<SummaryRow['drill']>) => {
    navigate('/master/statutory/gst/voucher-register', {
      state: {
        registration,
        month,
        year,
        returnType: 'GSTR3B',
        bucket: 'included',
        columns: 'tax',
        voucherType: drill.voucherType,
        section: drill.section,
        direction: drill.direction,
        excludeSections: drill.excludeSections,
        subtitle: drill.subtitle,
      },
    });
  };

  return (
    <TallyReportLayout
      title="GSTR-3B - Summary"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <>
          <div className="flex gap-4">
            <span className="w-32">GST Registration</span>
            <span className="font-bold">: {registrationName}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-32">Details of</span>
            <span className="font-bold">: {detailsLabel}</span>
          </div>
        </>
      }
      rightSubtitle={<div>{periodLabelFor(month, year)}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading..." className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && !error && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                  P a r t i c u l a r s
                </TableHead>
                {showTaxable && (
                  <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">
                    Taxable
                    <br />
                    Amount
                  </TableHead>
                )}
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">
                  IGST
                </TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">
                  CGST
                </TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">
                  SGST/
                  <br />
                  UTGST
                </TableHead>
                <TableHead className="h-auto w-20 px-2 py-1 text-right align-bottom font-bold text-black">
                  Cess
                </TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">
                  Tax
                  <br />
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((row, idx) => {
                const isSelected = selected === idx;
                const hasData = taxTotal(row.data) !== 0 || row.data.txval !== 0;
                const clickable = !!row.drill;
                return (
                  <TableRow
                    key={idx}
                    onClick={() => {
                      if (!clickable) return;
                      setSelected(idx);
                      openRegister(row.drill!);
                    }}
                    className={cn(
                      'border-0',
                      clickable && 'cursor-pointer hover:bg-[#e6f2ff]',
                      isSelected
                        ? 'bg-[#ffcc00] font-bold hover:bg-[#ffcc00]'
                        : hasData
                          ? 'text-black'
                          : 'text-gray-500',
                    )}
                  >
                    <TableCell className="px-2 py-0.5">{row.label}</TableCell>
                    {showTaxable && (
                      <TableCell className="px-2 py-0.5 text-right">
                        {fmt(row.data.txval)}
                      </TableCell>
                    )}
                    <TableCell className="px-2 py-0.5 text-right">{fmt(row.data.iamt)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{fmt(row.data.camt)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{fmt(row.data.samt)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{fmt(row.data.cess)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">
                      {fmt(taxTotal(row.data))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>

            <TableFooter className="bg-transparent">
              <TableRow className="border-t border-gray-300 hover:bg-transparent font-bold">
                <TableCell className="px-2 py-1">Total</TableCell>
                {showTaxable && (
                  <TableCell className="px-2 py-1 text-right">{fmt(totals.txval)}</TableCell>
                )}
                <TableCell className="px-2 py-1 text-right">{fmt(totals.iamt)}</TableCell>
                <TableCell className="px-2 py-1 text-right">{fmt(totals.camt)}</TableCell>
                <TableCell className="px-2 py-1 text-right">{fmt(totals.samt)}</TableCell>
                <TableCell className="px-2 py-1 text-right">{fmt(totals.cess)}</TableCell>
                <TableCell className="px-2 py-1 text-right">{fmt(taxTotal(totals))}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>
    </TallyReportLayout>
  );
}
