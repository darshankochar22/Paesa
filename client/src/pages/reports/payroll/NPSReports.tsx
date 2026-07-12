import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { EmptyState } from '@/components/blocks/EmptyState';
import {
  CELL,
  HEADCELL,
  fmtAmt,
  fyRange,
  HeaderRow,
  StatementLine,
  SignatureFooter,
  usePayrollReport,
} from './payrollDoc';

// National Pension Scheme (NPS) statutory reports — Payroll Reports → NPS (#224-#226).

function NPSEstablishment({ est }: { est: any }) {
  return (
    <div className="flex flex-col gap-1 mb-4 text-[11px]">
      <HeaderRow label="Name and Address of the Establishment" value={est?.name} />
      <HeaderRow label="Corporate Registration No." value={est?.nps_corporate_number} />
      <HeaderRow label="Corporate Branch Office No." value={est?.nps_branch_number} />
    </div>
  );
}

// #224 Subscriber Contribution Details — PRAN-wise employee & employer NPS contribution.
export default function NPSContributionDetails() {
  const { payload, loading, selectedCompany, activeFY } = usePayrollReport((p) =>
    window.api.nps.getContributionDetails(p),
  );
  const rows: any[] = payload?.rows ?? [];
  const totals = payload?.totals ?? {};

  return (
    <TallyReportLayout
      title="Subscriber Contribution Details"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{fyRange(activeFY)}</div>}
    >
      <div className="w-full flex justify-center bg-black/[0.06] py-6 font-sans">
        {loading && (
          <EmptyState message="Preparing Subscriber Contribution Details…" className="italic" />
        )}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[940px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-1">
              NATIONAL PENSION SCHEME — SUBSCRIBER CONTRIBUTION DETAILS
            </div>
            <div className="text-center mb-4">
              for the period <span className="font-bold">{fyRange(activeFY)}</span>
            </div>

            <NPSEstablishment est={payload?.establishment} />

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={HEADCELL}>Sl No.</th>
                  <th className={HEADCELL}>PRAN</th>
                  <th className={HEADCELL}>Name of Subscriber</th>
                  <th className={HEADCELL}>Wages</th>
                  <th className={HEADCELL}>Employee's Contribution</th>
                  <th className={HEADCELL}>Employer's Contribution</th>
                  <th className={HEADCELL}>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <td key={i} className={`${CELL} h-24`} />
                    ))}
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i}>
                      <td className={CELL}>{r.sl}</td>
                      <td className={CELL}>{r.pran}</td>
                      <td className={`${CELL} uppercase`}>{r.name}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.wages)}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.ee)}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.er)}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.total)}</td>
                    </tr>
                  ))
                )}
                {rows.length > 0 && (
                  <tr>
                    <td className={`${CELL} font-bold`} colSpan={3}>
                      Total
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.wages)}
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.ee)}
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.er)}
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.total)}
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

// #225 NPS Summary — headline totals for the scheme (a statement, not a register).
export function NPSSummary() {
  const { payload, loading, selectedCompany, activeFY } = usePayrollReport((p) =>
    window.api.nps.getSummary(p),
  );
  const s = payload?.summary ?? {};

  return (
    <TallyReportLayout
      title="NPS Summary"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{fyRange(activeFY)}</div>}
    >
      <div className="w-full flex justify-center bg-black/[0.06] py-6 font-sans">
        {loading && <EmptyState message="Preparing NPS Summary…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[720px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-1">
              NATIONAL PENSION SCHEME — SUMMARY
            </div>
            <div className="text-center mb-6">
              for the period <span className="font-bold">{fyRange(activeFY)}</span>
            </div>

            <NPSEstablishment est={payload?.establishment} />

            <div className="mt-4 border-t border-gray-200">
              <StatementLine label="Number of Subscribers" value={s.subscribers ?? 0} />
              <StatementLine label="Subscribers with PRAN" value={s.with_pran ?? 0} />
              <StatementLine label="Subscribers without PRAN" value={s.without_pran ?? 0} />
              <StatementLine
                label="Employee's Contribution"
                value={fmtAmt(s.employee_contribution)}
              />
              <StatementLine
                label="Employer's Contribution"
                value={fmtAmt(s.employer_contribution)}
              />
              <StatementLine label="Total Contribution" value={fmtAmt(s.total_contribution)} bold />
            </div>

            <SignatureFooter />
          </div>
        )}
      </div>
    </TallyReportLayout>
  );
}

// #226 PRAN Not Available — exception list of NPS contributors with no PRAN on record.
export function NPSPranNotAvailable() {
  const { payload, loading, selectedCompany, activeFY } = usePayrollReport((p) =>
    window.api.nps.getPranNotAvailable(p),
  );
  const rows: any[] = payload?.rows ?? [];

  return (
    <TallyReportLayout
      title="PRAN Not Available"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{fyRange(activeFY)}</div>}
    >
      <div className="w-full flex justify-center bg-black/[0.06] py-6 font-sans">
        {loading && <EmptyState message="Preparing PRAN Not Available…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[860px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-1">
              NATIONAL PENSION SCHEME — PRAN NOT AVAILABLE
            </div>
            <div className="text-center mb-4">
              Subscribers contributing to NPS with no PRAN on record
            </div>

            <NPSEstablishment est={payload?.establishment} />

            {rows.length === 0 ? (
              <EmptyState
                message="All NPS subscribers have a PRAN on record."
                className="italic py-10"
              />
            ) : (
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr>
                    <th className={HEADCELL}>Sl No.</th>
                    <th className={HEADCELL}>Name of Subscriber</th>
                    <th className={HEADCELL}>Department</th>
                    <th className={HEADCELL}>Designation</th>
                    <th className={HEADCELL}>Employee's Contribution</th>
                    <th className={HEADCELL}>Employer's Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td className={CELL}>{r.sl}</td>
                      <td className={`${CELL} uppercase`}>{r.name}</td>
                      <td className={CELL}>{r.department}</td>
                      <td className={CELL}>{r.designation}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.ee)}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.er)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <SignatureFooter />
          </div>
        )}
      </div>
    </TallyReportLayout>
  );
}
