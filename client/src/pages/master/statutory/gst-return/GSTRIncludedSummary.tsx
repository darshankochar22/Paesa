import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { TableRow, TableCell } from '@/components/shadcn/table';
import { DataTableCard } from '@/components/blocks/DataTableCard';
import { EmptyState } from '@/components/blocks/EmptyState';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function periodLabelFor(month: string, year: string) {
  const m = Number(month);
  const y = Number(year);
  const lastDay = new Date(y, m, 0).getDate();
  const yy = String(y).slice(-2);
  return `1-${MONTHS[m - 1]}-${yy} to ${lastDay}-${MONTHS[m - 1]}-${yy}`;
}

// "GSTR-1 - Included in Return": the voucher-type summary Tally shows when drilling
// the Included in Return / Ready for Upload / Not Uploaded lines. Each type opens the
// shared voucher register scoped to the included bucket, titled after the drilled line
// (e.g. "Sales (Ready for Upload)").
export default function GSTRIncludedSummary() {
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
  const annual = !!location.state?.annual;
  // "Included in Return" | "Ready for Upload" | "Not Uploaded" — labels the register.
  const statusLabel = location.state?.statusLabel || 'Included in Return';
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
  const [rows, setRows] = useState<{ voucher_type: string; count: number }[]>([]);

  useEffect(() => {
    async function load() {
      if (!companyId || !fyId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await window.api.gst.getReturnStatistics({
          company_id: companyId,
          fy_id: fyId,
          return_period: `${month}${year}`,
          return_type: returnType,
          gst_registration_id: registration?.gst_id ?? null,
          annual,
        });
        if (res.success && res.statistics) {
          setRows(
            (res.statistics.rows || [])
              .map((r: any) => ({
                voucher_type: r.voucher_type,
                count: (r.included_pending || 0) + (r.included_ok || 0),
              }))
              .filter((r: any) => r.count > 0),
          );
        } else {
          setError(res.error || 'Failed to load included vouchers.');
        }
      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, fyId, month, year, returnType, registration?.gst_id, annual]);

  const total = rows.reduce((acc, r) => acc + r.count, 0);
  const reportName =
    returnType === 'ANNUAL' ? 'Annual Computation' : returnType === 'GSTR3B' ? 'GSTR-3B' : 'GSTR-1';

  return (
    <TallyReportLayout
      title={`${reportName} - Included in Return`}
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <div className="flex gap-4">
          <span className="w-32">GST Registration</span>
          <span className="font-bold">: {registrationName}</span>
        </div>
      }
      rightSubtitle={<div>{periodText}</div>}
    >
      <div className="w-full font-sans text-xs">
        {loading ? (
          <EmptyState message="Loading..." className="italic" />
        ) : error ? (
          <div className="p-2 text-center text-red-600 font-bold">{error}</div>
        ) : (
          <DataTableCard
            columns={[
              { header: 'P a r t i c u l a r s' },
              { header: 'Voucher Count', className: 'text-right w-32' },
            ]}
            maxHeight="100%"
          >
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={2} className="p-0">
                  <EmptyState message="No vouchers included in the return for this period." />
                </TableCell>
              </TableRow>
            ) : (
              <>
                {rows.map((r) => (
                  <TableRow
                    key={r.voucher_type}
                    className="hover:bg-[#e6f2ff] cursor-pointer"
                    onClick={() =>
                      navigate('/master/statutory/gst/voucher-register', {
                        state: {
                          registration,
                          month,
                          year,
                          returnType,
                          annual,
                          bucket: 'included',
                          voucherType: r.voucher_type,
                          // Tally's Included/Ready-for-Upload/Not-Uploaded registers show
                          // the accounting Debit/Credit columns, not the tax split.
                          columns: 'accounting',
                          subtitle: `${r.voucher_type} (${statusLabel})`,
                        },
                      })
                    }
                  >
                    <TableCell className="px-2 py-0.5 font-bold">{r.voucher_type}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right w-32">{r.count}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="hover:bg-transparent font-bold border-t border-gray-300">
                  <TableCell className="px-2 py-1">Total</TableCell>
                  <TableCell className="px-2 py-1 text-right w-32">{total}</TableCell>
                </TableRow>
              </>
            )}
          </DataTableCard>
        )}
      </div>
    </TallyReportLayout>
  );
}
