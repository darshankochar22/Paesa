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

interface CategoryRow {
  label: string;
  count: number;
  types: { voucher_type: string; count: number }[];
}

// "Not Relevant for This Return" drill: Non-GST transaction categories (level 1),
// a category's voucher types (level 2), then the shared voucher register.
export default function GSTRNotRelevant() {
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
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [otherReturns, setOtherReturns] = useState<{ label: string; count: number } | null>(null);
  const [nonGstCount, setNonGstCount] = useState(0);
  const [openCategory, setOpenCategory] = useState<CategoryRow | null>(null);

  useEffect(() => {
    async function load() {
      if (!companyId || !fyId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await window.api.gst.getNotRelevantBreakdown({
          company_id: companyId,
          fy_id: fyId,
          return_period: `${month}${year}`,
          return_type: returnType,
          gst_registration_id: registration?.gst_id ?? null,
          annual,
        });
        if (res.success && res.breakdown) {
          setCategories(res.breakdown.non_gst.categories);
          setNonGstCount(res.breakdown.non_gst.count);
          setOtherReturns(res.breakdown.other_returns);
        } else {
          setError(res.error || 'Failed to load breakdown.');
        }
      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, fyId, month, year, returnType, registration?.gst_id]);

  const openRegister = (category: string, voucherType?: string, subtitle?: string) => {
    navigate('/master/statutory/gst/voucher-register', {
      state: {
        registration,
        month,
        year,
        returnType,
        annual,
        bucket: 'not_relevant',
        category,
        voucherType,
        subtitle: `${subtitle || category} (Not Relevant for This Return)`,
      },
    });
  };

  // A bold parent row (Non-GST transactions / Transactions of Other GST Returns)
  // opens ALL of its vouchers as one list, via the classifier's group.
  const openGroup = (group: string, label: string) => {
    navigate('/master/statutory/gst/voucher-register', {
      state: {
        registration,
        month,
        year,
        returnType,
        annual,
        bucket: 'not_relevant',
        group,
        subtitle: `${label} (Not Relevant for This Return)`,
      },
    });
  };

  const total = nonGstCount + (otherReturns?.count || 0);

  return (
    <TallyReportLayout
      title={`${returnType === 'ANNUAL' ? 'Annual Computation' : returnType === 'GSTR3B' ? 'GSTR-3B' : 'GSTR-1'} - Not Relevant for This Return`}
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
        ) : openCategory ? (
          // Level 2 — voucher types inside a category (Tally shows this as its own screen).
          <DataTableCard
            columns={[
              { header: 'Particulars' },
              { header: 'Voucher Count', className: 'text-right w-32' },
            ]}
            maxHeight="100%"
          >
            <TableRow
              className="hover:bg-transparent cursor-pointer"
              onClick={() => setOpenCategory(null)}
            >
              <TableCell colSpan={2} className="px-2 py-1 font-bold text-black bg-[#ffeb9c]">
                ← {openCategory.label}
              </TableCell>
            </TableRow>
            {openCategory.types.map((t) => (
              <TableRow
                key={t.voucher_type}
                className="hover:bg-[#e6f2ff] cursor-pointer"
                onClick={() => openRegister(openCategory.label, t.voucher_type, t.voucher_type)}
              >
                <TableCell className="px-4 py-0.5">{t.voucher_type}</TableCell>
                <TableCell className="px-2 py-0.5 text-right w-32">{t.count}</TableCell>
              </TableRow>
            ))}
            <TableRow className="hover:bg-transparent font-bold border-t border-gray-300">
              <TableCell className="px-2 py-1">Total</TableCell>
              <TableCell className="px-2 py-1 text-right w-32">{openCategory.count}</TableCell>
            </TableRow>
          </DataTableCard>
        ) : (
          // Level 1 — Non-GST categories + Transactions of Other GST Returns.
          <DataTableCard
            columns={[
              { header: 'Particulars' },
              { header: 'Voucher Count', className: 'text-right w-32' },
            ]}
            maxHeight="100%"
          >
            {total === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={2} className="p-0">
                  <EmptyState message="Every voucher of this period is relevant for the return." />
                </TableCell>
              </TableRow>
            ) : (
              <>
                <TableRow
                  className="hover:bg-[#e6f2ff] cursor-pointer"
                  onClick={() => openGroup('non_gst', 'Non-GST transactions')}
                >
                  <TableCell className="px-2 py-1 font-bold text-black">
                    Non-GST transactions
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right w-32 font-bold">
                    {nonGstCount || ''}
                  </TableCell>
                </TableRow>
                {categories.map((c) => (
                  <TableRow
                    key={c.label}
                    className="hover:bg-[#e6f2ff] cursor-pointer"
                    onClick={() => setOpenCategory(c)}
                  >
                    <TableCell className="px-6 py-0.5">{c.label}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right w-32">{c.count}</TableCell>
                  </TableRow>
                ))}
                {otherReturns && (
                  <TableRow
                    className="hover:bg-[#e6f2ff] cursor-pointer"
                    onClick={() => openGroup('other_returns', otherReturns.label)}
                  >
                    <TableCell className="px-2 py-1 font-bold text-black">
                      {otherReturns.label}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-right w-32 font-bold">
                      {otherReturns.count || ''}
                    </TableCell>
                  </TableRow>
                )}
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
