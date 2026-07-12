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

// #223 Professional Tax — employee-wise PT deducted (a state-levied section-16
// deduction). Sorted by state so each state's slab group reads together.
export default function ProfessionalTaxReport() {
  const { payload, loading, selectedCompany, activeFY } = usePayrollReport((p) =>
    window.api.payrollStatutory.getProfessionalTax(p),
  );
  const rows: any[] = payload?.rows ?? [];
  const totals = payload?.totals ?? {};

  return (
    <TallyReportLayout
      title="Professional Tax"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{fyRange(activeFY)}</div>}
    >
      <div className="w-full flex justify-center bg-black/[0.06] py-6 font-sans">
        {loading && (
          <EmptyState message="Preparing Professional Tax statement…" className="italic" />
        )}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[940px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-1">PROFESSIONAL TAX STATEMENT</div>
            <div className="text-center mb-4">
              for the period <span className="font-bold">{fyRange(activeFY)}</span>
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
                  <th className={HEADCELL}>State</th>
                  <th className={HEADCELL}>Designation</th>
                  <th className={HEADCELL}>Earnings</th>
                  <th className={HEADCELL}>Professional Tax</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <td key={i} className={`${CELL} h-24`} />
                    ))}
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i}>
                      <td className={CELL}>{r.sl}</td>
                      <td className={`${CELL} uppercase`}>{r.employee}</td>
                      <td className={CELL}>{r.state}</td>
                      <td className={CELL}>{r.designation}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.earnings)}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.pt)}</td>
                    </tr>
                  ))
                )}
                {rows.length > 0 && (
                  <tr>
                    <td className={`${CELL} font-bold`} colSpan={4}>
                      Total
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.earnings)}
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.pt)}
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
