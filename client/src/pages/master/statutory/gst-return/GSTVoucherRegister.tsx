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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function periodLabelFor(month: string, year: string) {
  const m = Number(month);
  const y = Number(year);
  const lastDay = new Date(y, m, 0).getDate();
  const yy = String(y).slice(-2);
  return `1-${MONTHS[m - 1]}-${yy} to ${lastDay}-${MONTHS[m - 1]}-${yy}`;
}

interface RegisterRow {
  voucher_id: number;
  date: string;
  particulars: string;
  voucher_type: string;
  voucher_number: string | null;
  taxable: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  tax: number;
  invoice: number;
  debit: number;
  credit: number;
}

const amt = (n: number) => (n ? n.toFixed(2) : '');

// Shared voucher register for every GST return drill (statistics voucher-type,
// Not-Relevant category, section voucher-wise view). Rows open the voucher itself.
export default function GSTVoucherRegister() {
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
  const group = location.state?.group;
  const category = location.state?.category;
  const voucherType = location.state?.voucherType;
  const subtitle = location.state?.subtitle || '';
  const annual = !!location.state?.annual;
  const periodText = annual
    ? activeFY
      ? `${activeFY.start_date} to ${activeFY.end_date}`
      : ''
    : periodLabelFor(month, year);
  // 'accounting' → Debit/Credit columns (statistics & Not-Relevant drills, like Tally);
  // 'tax' → Taxable/IGST/… columns (GST section drills). Default follows the bucket.
  const columns: 'accounting' | 'tax' =
    location.state?.columns ||
    (bucket === 'not_relevant' || bucket === 'all' ? 'accounting' : 'tax');

  const registrationName = registration?.state_id
    ? `${registration.state_id} Registration`
    : registration?.name || ' All Registrations';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<RegisterRow[]>([]);

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
          group,
          category,
          voucher_type: voucherType,
          section: location.state?.section,
          direction: location.state?.direction,
          annual_category: location.state?.annualCategory,
        });
        if (res.success) setRows((res.rows as RegisterRow[]) || []);
        else {
          setError(res.error || 'Failed to load vouchers.');
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
    group,
    category,
    voucherType,
    registration?.gst_id,
    annual,
    location.state?.section,
    location.state?.direction,
    location.state?.annualCategory,
  ]);

  const totals = rows.reduce(
    (acc, r) => ({
      taxable: acc.taxable + r.taxable,
      igst: acc.igst + r.igst,
      cgst: acc.cgst + r.cgst,
      sgst: acc.sgst + r.sgst,
      cess: acc.cess + r.cess,
      tax: acc.tax + r.tax,
      invoice: acc.invoice + r.invoice,
      debit: acc.debit + r.debit,
      credit: acc.credit + r.credit,
    }),
    { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, tax: 0, invoice: 0, debit: 0, credit: 0 },
  );

  return (
    <TallyReportLayout
      title={`${returnType === 'ANNUAL' ? 'Annual Computation' : returnType === 'GSTR3B' ? 'GSTR-3B' : 'GSTR-1'} - Voucher Register`}
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
        {loading && <EmptyState message="Loading vouchers..." className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && !error && columns === 'accounting' && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto w-24 px-2 py-1 align-bottom font-bold text-black">
                  Date
                </TableHead>
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                  Particulars
                </TableHead>
                <TableHead className="h-auto w-28 px-2 py-1 align-bottom font-bold text-black">
                  Vch Type
                </TableHead>
                <TableHead className="h-auto w-16 px-2 py-1 text-center align-bottom font-bold text-black">
                  Vch No.
                </TableHead>
                <TableHead className="h-auto w-32 px-2 py-1 text-right align-bottom font-bold text-black">
                  Debit
                  <br />
                  Amount
                </TableHead>
                <TableHead className="h-auto w-32 px-2 py-1 text-right align-bottom font-bold text-black">
                  Credit
                  <br />
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState message="No vouchers in this view for the period." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow
                    key={r.voucher_id}
                    className="border-0 cursor-pointer hover:bg-[#e6f2ff]"
                    onClick={() => navigate(`/transactions/voucher/${r.voucher_id}`)}
                  >
                    <TableCell className="px-2 py-0.5">{r.date}</TableCell>
                    <TableCell className="px-2 py-0.5">{r.particulars}</TableCell>
                    <TableCell className="px-2 py-0.5">{r.voucher_type}</TableCell>
                    <TableCell className="px-2 py-0.5 text-center">
                      {r.voucher_number ?? ''}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{amt(r.debit)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{amt(r.credit)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {rows.length > 0 && (
              <TableFooter className="bg-transparent">
                <TableRow className="border-t border-gray-300 hover:bg-transparent font-bold">
                  <TableCell colSpan={4} className="px-2 py-1">
                    Total
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right">{amt(totals.debit)}</TableCell>
                  <TableCell className="px-2 py-1 text-right">{amt(totals.credit)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        )}

        {!loading && !error && columns === 'tax' && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto w-20 px-2 py-1 align-bottom font-bold text-black">
                  Date
                </TableHead>
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                  Particulars
                </TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 align-bottom font-bold text-black">
                  Vch Type
                </TableHead>
                <TableHead className="h-auto w-16 px-2 py-1 text-center align-bottom font-bold text-black">
                  Vch No.
                </TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">
                  Taxable
                  <br />
                  Amount
                </TableHead>
                <TableHead className="h-auto w-20 px-2 py-1 text-right align-bottom font-bold text-black">
                  IGST
                </TableHead>
                <TableHead className="h-auto w-20 px-2 py-1 text-right align-bottom font-bold text-black">
                  CGST
                </TableHead>
                <TableHead className="h-auto w-20 px-2 py-1 text-right align-bottom font-bold text-black">
                  SGST/
                  <br />
                  UTGST
                </TableHead>
                <TableHead className="h-auto w-16 px-2 py-1 text-right align-bottom font-bold text-black">
                  Cess
                </TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">
                  Tax
                  <br />
                  Amount
                </TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">
                  Invoice
                  <br />
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={11} className="p-0">
                    <EmptyState message="No vouchers in this view for the period." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow
                    key={r.voucher_id}
                    className="border-0 cursor-pointer hover:bg-[#e6f2ff]"
                    onClick={() => navigate(`/transactions/voucher/${r.voucher_id}`)}
                  >
                    <TableCell className="px-2 py-0.5">{r.date}</TableCell>
                    <TableCell className="px-2 py-0.5">{r.particulars}</TableCell>
                    <TableCell className="px-2 py-0.5">{r.voucher_type}</TableCell>
                    <TableCell className="px-2 py-0.5 text-center">
                      {r.voucher_number ?? ''}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{amt(r.taxable)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{amt(r.igst)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{amt(r.cgst)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{amt(r.sgst)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{amt(r.cess)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{amt(r.tax)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{amt(r.invoice)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>

            {rows.length > 0 && (
              <TableFooter className="bg-transparent">
                <TableRow className="border-t border-gray-300 hover:bg-transparent font-bold">
                  <TableCell colSpan={4} className="px-2 py-1">
                    Total
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right">{amt(totals.taxable)}</TableCell>
                  <TableCell className="px-2 py-1 text-right">{amt(totals.igst)}</TableCell>
                  <TableCell className="px-2 py-1 text-right">{amt(totals.cgst)}</TableCell>
                  <TableCell className="px-2 py-1 text-right">{amt(totals.sgst)}</TableCell>
                  <TableCell className="px-2 py-1 text-right">{amt(totals.cess)}</TableCell>
                  <TableCell className="px-2 py-1 text-right">{amt(totals.tax)}</TableCell>
                  <TableCell className="px-2 py-1 text-right">{amt(totals.invoice)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        )}
      </div>
    </TallyReportLayout>
  );
}
