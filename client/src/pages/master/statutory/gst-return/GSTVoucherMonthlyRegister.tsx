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

const MONTHS_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MONTHS_FULL = [
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'January',
  'February',
  'March',
];

// Financial-year month ordering (Apr..Mar) so months list top-to-bottom like Tally.
const FY_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

function periodLabelFor(month: string, year: string) {
  const m = Number(month);
  const y = Number(year);
  const lastDay = new Date(y, m, 0).getDate();
  const yy = String(y).slice(-2);
  return `1-${MONTHS_ABBR[m - 1]}-${yy} to ${lastDay}-${MONTHS_ABBR[m - 1]}-${yy}`;
}

interface RegisterRow {
  voucher_id: number;
  date: string; // YYYY-MM-DD
  voucher_type: string;
}

interface MonthRow {
  ym: string; // YYYY-MM
  month: string; // MM
  year: string; // YYYY
  label: string; // full month name
  count: number;
}

// Voucher Monthly Register — the month-wise step between the GST return Statistics
// drill and the Voucher Register (matching Tally: Statistics → Monthly → Register →
// Voucher). Shared across GSTR-1 / GSTR-3B / Annual Computation. Groups the same
// return vouchers by month client-side; no extra backend call shape needed.
export default function GSTVoucherMonthlyRegister() {
  const { selectedCompany, activeFY } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const today = new Date();
  const month = location.state?.month || String(today.getMonth() + 1).padStart(2, '0');
  const year = location.state?.year || String(today.getFullYear());
  const registration = location.state?.registration;
  const returnType = location.state?.returnType || 'GSTR1';
  const bucket = location.state?.bucket || 'all';
  const category = location.state?.category;
  const voucherType = location.state?.voucherType;
  const subtitle = location.state?.subtitle || voucherType || '';
  const annual = !!location.state?.annual;
  const periodText = annual
    ? activeFY
      ? `${activeFY.start_date} to ${activeFY.end_date}`
      : ''
    : periodLabelFor(month, year);

  const registrationName = registration?.state_id
    ? `${registration.state_id} Registration`
    : registration?.name || ' All Registrations';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MonthRow[]>([]);

  useEffect(() => {
    async function load() {
      if (!companyId || !fyId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await window.api.gst.getReturnVouchers({
          company_id: companyId,
          fy_id: fyId,
          return_period: `${month}${year}`,
          return_type: returnType,
          gst_registration_id: registration?.gst_id ?? null,
          annual,
          bucket,
          category,
          voucher_type: voucherType,
          section: location.state?.section,
          direction: location.state?.direction,
          annual_category: location.state?.annualCategory,
        });
        if (res.success) {
          const counts = new Map<string, number>();
          for (const v of (res.rows as RegisterRow[]) || []) {
            const ym = String(v.date).substring(0, 7); // YYYY-MM
            counts.set(ym, (counts.get(ym) ?? 0) + 1);
          }
          const grouped: MonthRow[] = [...counts.entries()]
            .map(([ym, count]) => {
              const yyyy = ym.substring(0, 4);
              const mm = ym.substring(5, 7);
              return {
                ym,
                month: mm,
                year: yyyy,
                label: MONTHS_FULL[FY_ORDER.indexOf(Number(mm))],
                count,
              };
            })
            .sort((a, b) => FY_ORDER.indexOf(Number(a.month)) - FY_ORDER.indexOf(Number(b.month)));
          setRows(grouped);
        } else {
          setError(res.error || 'Failed to load monthly register.');
          setRows([]);
        }
      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred.');
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [
    companyId,
    fyId,
    month,
    year,
    returnType,
    bucket,
    category,
    voucherType,
    registration?.gst_id,
    annual,
    location.state?.section,
    location.state?.direction,
    location.state?.annualCategory,
  ]);

  const grandTotal = rows.reduce((acc, r) => acc + r.count, 0);

  const openRegister = (row: MonthRow) => {
    navigate('/master/statutory/gst/voucher-register', {
      state: {
        ...location.state,
        month: row.month,
        year: row.year,
        annual: false, // register scoped to the clicked month
        subtitle,
      },
    });
  };

  return (
    <TallyReportLayout
      title="Voucher Monthly Register"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <>
          <div className="flex gap-4">
            <span className="w-32">GST Registration</span>
            <span className="font-bold">: {registrationName}</span>
          </div>
          {subtitle && (
            <div className="flex gap-4">
              <span className="w-32">Vouchers of</span>
              <span className="font-bold">: {subtitle}</span>
            </div>
          )}
        </>
      }
      rightSubtitle={<div>{periodText}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading monthly register..." className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && !error && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                  P a r t i c u l a r s
                </TableHead>
                <TableHead className="h-auto w-40 px-2 py-1 text-right align-bottom font-bold text-black">
                  Total Vouchers
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={2} className="p-0">
                    <EmptyState message="No vouchers in this view for the period." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.ym}
                    className="border-0 cursor-pointer hover:bg-[#e6f2ff]"
                    onClick={() => openRegister(row)}
                  >
                    <TableCell className="px-2 py-0.5 pl-4">{row.label}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{row.count}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>

            {rows.length > 0 && (
              <TableFooter className="bg-transparent">
                <TableRow className="border-t border-gray-300 hover:bg-transparent font-bold">
                  <TableCell className="px-2 py-1 pl-4">Grand Total</TableCell>
                  <TableCell className="px-2 py-1 text-right">{grandTotal}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        )}
      </div>
    </TallyReportLayout>
  );
}
