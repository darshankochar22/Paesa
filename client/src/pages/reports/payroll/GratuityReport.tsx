import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { EmptyState } from '@/components/blocks/EmptyState';
import {
  CELL,
  HEADCELL,
  fmtAmt,
  fyRange,
  HeaderRow,
  SignatureFooter,
  usePayrollReport,
} from './payrollDoc';

// #227 Gratuity — Payment of Gratuity Act, 1972 liability per employee. Payable =
// (last-drawn gratuity wages / 26) * 15 * completed years, for employees with 5+
// years of continuous service. Eligibility is shown as text (no colour, per theme).
export default function GratuityReport() {
  const { payload, loading, selectedCompany, activeFY } = usePayrollReport((p) =>
    window.api.payrollStatutory.getGratuity(p),
  );
  const rows: any[] = payload?.rows ?? [];
  const totals = payload?.totals ?? {};

  return (
    <TallyReportLayout
      title="Gratuity"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{fyRange(activeFY)}</div>}
    >
      <div className="w-full flex justify-center bg-black/[0.06] py-6 font-sans">
        {loading && <EmptyState message="Preparing Gratuity statement…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[1000px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-1">GRATUITY LIABILITY STATEMENT</div>
            <div className="text-center mb-1 text-[10px]">The Payment of Gratuity Act, 1972</div>
            <div className="text-center mb-4">
              as on <span className="font-bold">{activeFY?.end_date || ''}</span>
            </div>

            <div className="flex flex-col gap-1 mb-4 text-[11px]">
              <HeaderRow
                label="Name and Address of the Establishment"
                value={payload?.establishment?.name}
              />
              <HeaderRow label="Address" value={payload?.establishment?.address} />
            </div>

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={HEADCELL}>Sl No.</th>
                  <th className={HEADCELL}>Name of Employee</th>
                  <th className={HEADCELL}>Designation</th>
                  <th className={HEADCELL}>Date of Joining</th>
                  <th className={HEADCELL}>Years of Service</th>
                  <th className={HEADCELL}>Completed Years</th>
                  <th className={HEADCELL}>Gratuity Wages</th>
                  <th className={HEADCELL}>Eligible</th>
                  <th className={HEADCELL}>Gratuity Payable</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <td key={i} className={`${CELL} h-24`} />
                    ))}
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i}>
                      <td className={CELL}>{r.sl}</td>
                      <td className={`${CELL} uppercase`}>{r.employee}</td>
                      <td className={CELL}>{r.designation}</td>
                      <td className={CELL}>{r.date_of_joining}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{r.years}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{r.completed_years}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.wages)}</td>
                      <td className={`${CELL} text-center`}>{r.eligible ? 'Yes' : 'No'}</td>
                      <td
                        className={`${CELL} text-right tabular-nums ${r.payable ? 'font-bold' : ''}`}
                      >
                        {fmtAmt(r.payable)}
                      </td>
                    </tr>
                  ))
                )}
                {rows.length > 0 && (
                  <tr>
                    <td className={`${CELL} font-bold`} colSpan={6}>
                      Total
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.wages)}
                    </td>
                    <td className={CELL} />
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.payable)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <SignatureFooter />
          </div>
        )}
      </div>
    </TallyReportLayout>
  );
}
