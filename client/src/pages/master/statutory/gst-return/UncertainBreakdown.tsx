import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function periodLabelFor(month: string, year: string) {
  const m = Number(month);
  const y = Number(year);
  if (!m || !y) return '';
  const lastDay = new Date(y, m, 0).getDate();
  const yy = String(y).slice(-2);
  return `1-${MONTHS[m - 1]}-${yy} to ${lastDay}-${MONTHS[m - 1]}-${yy}`;
}

interface UncertainVoucher {
  voucher_id: number;
  voucher_type: string;
  exceptions: string[];
}

// Concrete exceptions from the shared classifier, grouped into the category headers
// TallyPrime shows under "Transactions with Incomplete/Mismatch in Information".
const CATEGORY_OF = (exception: string): string =>
  /no item or tax details/i.test(exception)
    ? 'Incomplete Information'
    : 'Invalid or Missing Information';

const TOP_LABEL = 'Transactions with Incomplete/Mismatch in Information';

type TreeRow =
  | { type: 'top'; label: string; count: number }
  | { type: 'spacer' }
  | { type: 'group'; label: string }
  | { type: 'category'; label: string }
  | { type: 'exception'; label: string; count: number };

// Shared "Uncertain Transactions" breakdown tree — the correction reasons behind a GST
// report's "Uncertain Transactions (Corrections needed)" line. Used by both GSTR-1
// Reconciliation (outward only) and Annual Computation (inward + outward). Each concrete
// exception drills to the resolution voucher list. Driven entirely by location.state:
//   returnType        'GSTR1' | 'ANNUAL' | 'GSTR3B'  (which classifier to run)
//   reportTitle       report name for the header
//   supplyGroupLabel  'Outward Supplies' | 'Inward and Outward Supplies'
//   reconciliation    forwarded so the voucher list titles itself correctly
export default function UncertainBreakdown() {
  const { selectedCompany, activeFY } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const registration = location.state?.registration;
  const returnType = location.state?.returnType || 'GSTR1';
  const reportTitle = location.state?.reportTitle || 'GSTR-1 Reconciliation';
  const supplyGroupLabel = location.state?.supplyGroupLabel || 'Outward Supplies';
  const reconciliation = !!location.state?.reconciliation;
  // Reconciliation / Annual callers span the whole FY; the monthly GSTR-1 / GSTR-3B
  // return views pass annual:false + month/year so this tree scopes to that period.
  const annual = location.state?.annual ?? true;
  const month = location.state?.month;
  const year = location.state?.year;

  const registrationName = registration?.state_id
    ? `${registration.state_id} Registration`
    : 'All Registrations';
  const periodText = annual
    ? activeFY
      ? `${activeFY.start_date} to ${activeFY.end_date}`
      : ''
    : periodLabelFor(month, year);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<UncertainVoucher[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      if (!companyId || !fyId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await window.api.gst.getReturnVouchers({
          company_id: companyId,
          fy_id: fyId,
          return_period: annual ? null : `${month}${year}`,
          return_type: returnType,
          gst_registration_id: registration?.gst_id ?? null,
          annual,
          bucket: 'uncertain',
        });
        if (res.success) setVouchers((res.rows as UncertainVoucher[]) || []);
        else {
          setError(res.error || 'Failed to load uncertain transactions.');
          setVouchers([]);
        }
      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred.');
        setVouchers([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, fyId, registration?.gst_id, returnType, annual, month, year]);

  // Count vouchers per concrete exception, then bucket exceptions into categories.
  const exceptionCounts = new Map<string, number>();
  for (const v of vouchers) {
    for (const ex of v.exceptions || []) {
      exceptionCounts.set(ex, (exceptionCounts.get(ex) || 0) + 1);
    }
  }
  const categories = new Map<string, Array<{ label: string; count: number }>>();
  for (const [label, count] of exceptionCounts) {
    const cat = CATEGORY_OF(label);
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push({ label, count });
  }

  const rows: TreeRow[] = [{ type: 'top', label: TOP_LABEL, count: vouchers.length }];
  if (categories.size > 0) {
    rows.push({ type: 'spacer' });
    rows.push({ type: 'group', label: supplyGroupLabel });
    for (const [cat, exceptions] of categories) {
      rows.push({ type: 'category', label: cat });
      exceptions
        .sort((a, b) => a.label.localeCompare(b.label))
        .forEach((ex) => rows.push({ type: 'exception', label: ex.label, count: ex.count }));
    }
  }

  // The company-registration exception has a dedicated resolution screen (edit the
  // registration to clear it); every other exception drills to the voucher list.
  const REGISTRATION_EXCEPTION =
    'GST Registration Details of the Company are invalid or not specified';

  const drill = (exception?: string, detailsLabel?: string) => {
    if (exception === REGISTRATION_EXCEPTION) {
      navigate('/master/statutory/gst/uncertain/registration', {
        state: { registration, returnType, month, year, reconciliation, reportName: reportTitle },
      });
      return;
    }
    navigate('/master/statutory/gst/uncertain', {
      state: {
        registration,
        returnType,
        annual,
        month,
        year,
        reconciliation,
        reportName: reportTitle,
        exception,
        detailsLabel: detailsLabel || TOP_LABEL,
      },
    });
  };

  return (
    <TallyReportLayout
      title={`${reportTitle} - Uncertain Transactions`}
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <>
          <div className="flex gap-4">
            <span className="w-32">GST Registration</span>
            <span className="font-bold">: {registrationName}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-32">Details of</span>
            <span className="font-bold">: Uncertain Transactions (Corrections needed)</span>
          </div>
        </>
      }
      rightSubtitle={<div>{periodText}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Scanning transactions..." className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && !error && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                  P a r t i c u l a r s
                </TableHead>
                <TableHead className="h-auto w-36 px-2 py-1 text-right align-bottom font-bold text-black">
                  Voucher
                  <br />
                  Count
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {vouchers.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={2} className="p-0">
                    <EmptyState message="No uncertain transactions — nothing needs correction." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => {
                  if (row.type === 'spacer') {
                    return (
                      <TableRow key={idx} className="border-0 h-2 hover:bg-transparent">
                        <TableCell colSpan={2} className="p-0" />
                      </TableRow>
                    );
                  }
                  if (row.type === 'group') {
                    return (
                      <TableRow key={idx} className="border-0 hover:bg-transparent">
                        <TableCell colSpan={2} className="px-2 py-0.5 font-bold text-black">
                          {row.label}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  if (row.type === 'category') {
                    return (
                      <TableRow key={idx} className="border-0 hover:bg-transparent">
                        <TableCell className="px-2 py-0.5 pl-6 font-bold text-black">
                          {row.label}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    );
                  }
                  const isTop = row.type === 'top';
                  const isSelected = selected === idx;
                  return (
                    <TableRow
                      key={idx}
                      onClick={() => {
                        setSelected(idx);
                        if (isTop) drill(undefined, TOP_LABEL);
                        else drill(row.label, row.label);
                      }}
                      className={cn(
                        'border-0 cursor-pointer hover:bg-[#e6f2ff]',
                        isSelected ? 'bg-[#ffcc00] hover:bg-[#ffcc00]' : '',
                      )}
                    >
                      <TableCell className={cn('px-2 py-0.5', isTop ? 'font-bold' : 'pl-10')}>
                        {row.label}
                      </TableCell>
                      <TableCell
                        className={cn('px-2 py-0.5 text-right tabular-nums', isTop && 'font-bold')}
                      >
                        {row.count || ''}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </TallyReportLayout>
  );
}
