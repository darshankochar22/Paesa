import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { EmptyState } from '@/components/blocks/EmptyState';

const fmt = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

interface SummaryRow {
  label: string;
  payable: number;
  paid: number;
}
interface SummarySection {
  component: string;
  key: string;
  rows: SummaryRow[];
}

// Payroll Statutory Summary (#206) — "Payroll Statutory Computation": PF/ESI/NPS/PT/IT
// sections × Payable/Paid; a category row drills to its Pay Head Details.
export default function PayrollStatutorySummary() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;

  const [sections, setSections] = useState<SummarySection[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const res = await window.api.payrollStatutory.getSummary({ company_id: companyId });
      if (res.success) {
        setSections(res.payload.sections ?? []);
        setGrandTotal(res.payload.grand_total ?? 0);
      }
      setLoading(false);
    })();
  }, [companyId]);

  return (
    <TallyReportLayout
      title="Payroll Statutory Summary"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        <div className="px-2 py-1 border-b border-gray-200 font-bold">
          Payroll Statutory Computation
        </div>
        {loading && <EmptyState message="Computing…" className="italic" />}
        {!loading && (
          <>
            <div className="flex font-bold px-2 py-1 border-b border-gray-200">
              <div className="flex-1">P a r t i c u l a r s</div>
              <div className="w-36 text-right">Payable Amount</div>
              <div className="w-36 text-right">Paid Amount</div>
            </div>
            {sections.map((sec) => (
              <div key={sec.component} className="flex flex-col">
                <div className="px-2 pt-3 pb-0.5 font-bold text-black">{sec.component}</div>
                {sec.rows.map((r) => (
                  <div
                    key={r.label}
                    className="flex px-4 py-0.5 font-semibold cursor-pointer hover:bg-black/[0.03]"
                    onClick={() =>
                      navigate(
                        `/reports/statutory/payroll/pay-head-details?component=${sec.key}&row=${encodeURIComponent(r.label)}`,
                      )
                    }
                  >
                    <div className="flex-1">{r.label}</div>
                    <div className="w-36 text-right tabular-nums">{fmt(r.payable)}</div>
                    <div className="w-36 text-right tabular-nums">{fmt(r.paid)}</div>
                  </div>
                ))}
              </div>
            ))}
            <div className="flex font-bold px-2 py-1 mt-4 border-t border-gray-200">
              <div className="flex-1">G r a n d&nbsp;&nbsp;T o t a l</div>
              <div className="w-36 text-right tabular-nums">{fmt(grandTotal)}</div>
              <div className="w-36 text-right" />
            </div>
          </>
        )}
      </div>
    </TallyReportLayout>
  );
}

// Payroll Statutory Pay Head Details — the pay heads behind one summary row
// ("Pay Head Type: <row>"), cols Gross / Payable / Paid.
export function PayrollStatutoryPayHeadDetails() {
  const { selectedCompany, activeFY } = useCompany();
  const [params] = useSearchParams();
  const component = params.get('component') || '';
  const rowLabel = params.get('row') || '';
  const companyId = selectedCompany?.company_id;

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const res = await window.api.payrollStatutory.getPayHeadDetails({
        company_id: companyId,
        component: component || undefined,
        row_label: rowLabel || undefined,
      });
      if (res.success) setRows(res.payload.rows ?? []);
      setLoading(false);
    })();
  }, [companyId, component, rowLabel]);

  const grand = rows.reduce(
    (s, r) => ({ gross: s.gross + r.gross, payable: s.payable + r.payable, paid: s.paid + r.paid }),
    { gross: 0, payable: 0, paid: 0 },
  );

  return (
    <TallyReportLayout
      title="Payroll Statutory Pay Head Details"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        <div className="px-2 py-1 border-b border-gray-200">
          <span className="text-black">Pay Head Type:&nbsp;</span>
          <span className="font-bold">{rowLabel || 'All'}</span>
        </div>
        {loading && <EmptyState message="Loading…" className="italic" />}
        {!loading && (
          <>
            <div className="flex font-bold px-2 py-1 border-b border-gray-200">
              <div className="flex-1">P a r t i c u l a r s</div>
              <div className="w-32 text-right">Gross Amount</div>
              <div className="w-32 text-right">Payable Amount</div>
              <div className="w-32 text-right">Paid Amount</div>
            </div>
            {rows.length === 0 && (
              <div className="px-4 py-3 italic text-black text-center">
                No pay heads found for this statutory category.
              </div>
            )}
            {rows.map((r) => (
              <div key={r.pay_head_id} className="flex px-2 py-0.5 hover:bg-black/[0.03]">
                <div className="flex-1 font-semibold">{r.name}</div>
                <div className="w-32 text-right tabular-nums">{fmt(r.gross)}</div>
                <div className="w-32 text-right tabular-nums">{fmt(r.payable)}</div>
                <div className="w-32 text-right tabular-nums">{fmt(r.paid)}</div>
              </div>
            ))}
            <div className="flex font-bold px-2 py-1 mt-3 border-t border-gray-200">
              <div className="flex-1">G r a n d&nbsp;&nbsp;T o t a l</div>
              <div className="w-32 text-right tabular-nums">{fmt(grand.gross)}</div>
              <div className="w-32 text-right tabular-nums">{fmt(grand.payable)}</div>
              <div className="w-32 text-right tabular-nums">{fmt(grand.paid)}</div>
            </div>
          </>
        )}
      </div>
    </TallyReportLayout>
  );
}
