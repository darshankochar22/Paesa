import { useState, useEffect, type ReactNode } from 'react';
import { useCompany } from '@/context/CompanyContext';

// Shared document primitives for the payroll statutory report sheets (Professional
// Tax / NPS / Gratuity / Income Tax). These are low-level building blocks only — each
// report composes its OWN distinct layout and table from them.

export const CELL = 'border border-gray-200 px-2 py-1 align-top';
export const HEADCELL = 'border border-gray-200 px-2 py-1 text-center font-bold align-top';

export const fmtAmt = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

export const fyRange = (activeFY?: { start_date?: string; end_date?: string } | null) =>
  activeFY?.start_date && activeFY?.end_date
    ? `${activeFY.start_date} to ${activeFY.end_date}`
    : '';

// One row of the "label : value" establishment/deductor header used across the sheets.
export function HeaderRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex">
      <div className="w-80">{label}</div>
      <div className="w-4">:</div>
      <div className="font-bold whitespace-pre-line">{value || ''}</div>
    </div>
  );
}

// A "label ........ value" row used by the statement-style sheets (NPS Summary,
// Form 27A control totals).
export function StatementLine({
  label,
  value,
  bold,
}: {
  label: string;
  value: ReactNode;
  bold?: boolean;
}) {
  return (
    <div className={`flex border-b border-gray-200 py-1.5 ${bold ? 'font-bold' : ''}`}>
      <div className="flex-1">{label}</div>
      <div className="w-56 text-right tabular-nums">{value}</div>
    </div>
  );
}

export function SignatureFooter({ note }: { note?: string }) {
  const today = new Date().toLocaleDateString('en-IN');
  return (
    <div className="flex justify-between mt-10 text-[11px]">
      <div>
        Date :&nbsp;<span className="font-bold">{today}</span>
      </div>
      <div className="text-center w-80">{note || 'Signature of the Employer & Stamp'}</div>
    </div>
  );
}

// Generic fetch hook for the payroll statutory reports: resolves company + active FY
// and calls the supplied window.api method with { company_id, from, to }.
export function usePayrollReport(fetcher: (params: any) => Promise<any>) {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const res = await fetcher({
        company_id: companyId,
        from: activeFY?.start_date,
        to: activeFY?.end_date,
      });
      if (res?.success) setPayload(res.payload);
      setLoading(false);
    })();
  }, [companyId, activeFY?.start_date, activeFY?.end_date]);

  return { payload, loading, selectedCompany, activeFY };
}
