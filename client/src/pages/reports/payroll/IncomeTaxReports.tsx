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

// Income Tax (TDS on Salary, section 192) statutory reports — Payroll Reports →
// Income Tax (#228-#233). Salary is projected across the year from the active
// salary-structure basis; TDS is the tax actually deducted through the IT pay head.

// Deductor block reused by the return forms (E-24Q / Form 27A / Form 24Q).
function Deductor({ est }: { est: any }) {
  return (
    <div className="flex flex-col gap-1 mb-4 text-[11px]">
      <HeaderRow label="Name of the Deductor" value={est?.name} />
      <HeaderRow label="Address" value={est?.address} />
      <HeaderRow label="TAN" value={est?.it_tan} />
      <HeaderRow label="PAN" value={est?.it_pan} />
      <HeaderRow label="Person Responsible" value={est?.responsible_name} />
    </div>
  );
}

// #228 Computation — per-employee income-tax computation statement.
export default function IncomeTaxComputation() {
  const { payload, loading, selectedCompany, activeFY } = usePayrollReport((p) =>
    window.api.incomeTax.getComputation(p),
  );
  const rows: any[] = payload?.rows ?? [];
  const totals = payload?.totals ?? {};

  return (
    <TallyReportLayout
      title="Computation"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{fyRange(activeFY)}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message="Preparing Income Tax Computation…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[1000px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-1">INCOME TAX COMPUTATION</div>
            <div className="text-center mb-4">
              for the financial year <span className="font-bold">{fyRange(activeFY)}</span>
            </div>

            <div className="flex flex-col gap-1 mb-4 text-[11px]">
              <HeaderRow label="Name of the Deductor" value={payload?.establishment?.name} />
              <HeaderRow label="TAN" value={payload?.establishment?.it_tan} />
            </div>

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={HEADCELL}>Sl No.</th>
                  <th className={HEADCELL}>Name of Employee</th>
                  <th className={HEADCELL}>PAN</th>
                  <th className={HEADCELL}>Tax Regime</th>
                  <th className={HEADCELL}>Gross Salary</th>
                  <th className={HEADCELL}>Professional Tax</th>
                  <th className={HEADCELL}>Taxable Income</th>
                  <th className={HEADCELL}>Tax Deducted (TDS)</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <td key={i} className={`${CELL} h-24`} />
                    ))}
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i}>
                      <td className={CELL}>{r.sl}</td>
                      <td className={`${CELL} uppercase`}>{r.name}</td>
                      <td className={CELL}>{r.pan}</td>
                      <td className={CELL}>{r.regime}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.gross)}</td>
                      <td className={`${CELL} text-right tabular-nums`}>
                        {fmtAmt(r.professional_tax)}
                      </td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.taxable)}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.tds)}</td>
                    </tr>
                  ))
                )}
                {rows.length > 0 && (
                  <tr>
                    <td className={`${CELL} font-bold`} colSpan={4}>
                      Total
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.gross)}
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.professional_tax)}
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.taxable)}
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.tds)}
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

// #229 Salary Projection — active structure projected across the financial year.
export function SalaryProjection() {
  const { payload, loading, selectedCompany, activeFY } = usePayrollReport((p) =>
    window.api.incomeTax.getSalaryProjection(p),
  );
  const rows: any[] = payload?.rows ?? [];
  const totals = payload?.totals ?? {};

  return (
    <TallyReportLayout
      title="Salary Projection"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{fyRange(activeFY)}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message="Preparing Salary Projection…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[1040px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-1">SALARY PROJECTION</div>
            <div className="text-center mb-4">
              for the financial year <span className="font-bold">{fyRange(activeFY)}</span>
            </div>

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={HEADCELL} rowSpan={2}>
                    Sl No.
                  </th>
                  <th className={HEADCELL} rowSpan={2}>
                    Name of Employee
                  </th>
                  <th className={HEADCELL} rowSpan={2}>
                    Designation
                  </th>
                  <th className={HEADCELL} colSpan={3}>
                    Monthly
                  </th>
                  <th className={HEADCELL} colSpan={3}>
                    Annual (Projected)
                  </th>
                </tr>
                <tr>
                  <th className={HEADCELL}>Earnings</th>
                  <th className={HEADCELL}>Deductions</th>
                  <th className={HEADCELL}>Net</th>
                  <th className={HEADCELL}>Earnings</th>
                  <th className={HEADCELL}>Deductions</th>
                  <th className={HEADCELL}>Net</th>
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
                      <td className={`${CELL} uppercase`}>{r.name}</td>
                      <td className={CELL}>{r.designation}</td>
                      <td className={`${CELL} text-right tabular-nums`}>
                        {fmtAmt(r.monthly_earnings)}
                      </td>
                      <td className={`${CELL} text-right tabular-nums`}>
                        {fmtAmt(r.monthly_deductions)}
                      </td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.monthly_net)}</td>
                      <td className={`${CELL} text-right tabular-nums`}>
                        {fmtAmt(r.annual_earnings)}
                      </td>
                      <td className={`${CELL} text-right tabular-nums`}>
                        {fmtAmt(r.annual_deductions)}
                      </td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.annual_net)}</td>
                    </tr>
                  ))
                )}
                {rows.length > 0 && (
                  <tr>
                    <td className={`${CELL} font-bold`} colSpan={3}>
                      Total
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.monthly_earnings)}
                    </td>
                    <td className={CELL} />
                    <td className={CELL} />
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.annual_earnings)}
                    </td>
                    <td className={CELL} />
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.annual_net)}
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

// #230 Challan Reconciliation — month-wise TDS-on-salary liability vs. challans deposited.
export function ITChallanReconciliation() {
  const { payload, loading, selectedCompany, activeFY } = usePayrollReport((p) =>
    window.api.incomeTax.getChallanReconciliation(p),
  );
  const rows: any[] = payload?.rows ?? [];
  const totals = payload?.totals ?? {};

  return (
    <TallyReportLayout
      title="Challan Reconciliation"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{fyRange(activeFY)}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message="Preparing Challan Reconciliation…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[1000px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-1">
              INCOME TAX (TDS ON SALARY) — CHALLAN RECONCILIATION
            </div>
            <div className="text-center mb-4">
              for the financial year <span className="font-bold">{fyRange(activeFY)}</span>
            </div>

            <div className="flex flex-col gap-1 mb-4 text-[11px]">
              <HeaderRow label="Name of the Deductor" value={payload?.establishment?.name} />
              <HeaderRow label="TAN" value={payload?.establishment?.it_tan} />
            </div>

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={HEADCELL}>Sl No.</th>
                  <th className={HEADCELL}>Month</th>
                  <th className={HEADCELL}>TDS Liability</th>
                  <th className={HEADCELL}>BSR Code</th>
                  <th className={HEADCELL}>Challan No.</th>
                  <th className={HEADCELL}>Challan Date</th>
                  <th className={HEADCELL}>Deposited</th>
                  <th className={HEADCELL}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <td key={i} className={`${CELL} h-24`} />
                    ))}
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i}>
                      <td className={CELL}>{r.sl}</td>
                      <td className={CELL}>{r.month}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.liability)}</td>
                      <td className={CELL}>{r.bsr_code}</td>
                      <td className={CELL}>{r.challan_no}</td>
                      <td className={CELL}>{r.challan_date}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.deposited)}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.balance)}</td>
                    </tr>
                  ))
                )}
                {rows.length > 0 && (
                  <tr>
                    <td className={`${CELL} font-bold`} colSpan={2}>
                      Total
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.liability)}
                    </td>
                    <td className={CELL} />
                    <td className={CELL} />
                    <td className={CELL} />
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.deposited)}
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.balance)}
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

// #231 E-24Q — electronic quarterly salary-TDS return (Annexure II deductee grid).
export function E24Q() {
  const { payload, loading, selectedCompany, activeFY } = usePayrollReport((p) =>
    window.api.incomeTax.getE24Q(p),
  );
  const rows: any[] = payload?.rows ?? [];
  const totals = payload?.totals ?? {};

  return (
    <TallyReportLayout
      title="E-24Q"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{fyRange(activeFY)}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message="Preparing E-24Q return…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[940px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-1">
              FORM 24Q — ELECTRONIC RETURN (E-24Q)
            </div>
            <div className="text-center mb-4">
              for the financial year <span className="font-bold">{fyRange(activeFY)}</span>
            </div>

            <Deductor est={payload?.establishment} />

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={HEADCELL}>Sl No.</th>
                  <th className={HEADCELL}>PAN of Employee</th>
                  <th className={HEADCELL}>Name of Employee</th>
                  <th className={HEADCELL}>Amount Paid / Credited</th>
                  <th className={HEADCELL}>Tax Deducted</th>
                  <th className={HEADCELL}>Tax Deposited</th>
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
                      <td className={CELL}>{r.pan}</td>
                      <td className={`${CELL} uppercase`}>{r.name}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.amount_paid)}</td>
                      <td className={`${CELL} text-right tabular-nums`}>
                        {fmtAmt(r.tax_deducted)}
                      </td>
                      <td className={`${CELL} text-right tabular-nums`}>
                        {fmtAmt(r.tax_deposited)}
                      </td>
                    </tr>
                  ))
                )}
                {rows.length > 0 && (
                  <tr>
                    <td className={`${CELL} font-bold`} colSpan={3}>
                      Total
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.amount_paid)}
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.tax_deducted)}
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.tax_deposited)}
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

// #232 Form 27A — control/summary sheet accompanying the e-TDS return.
export function Form27A() {
  const { payload, loading, selectedCompany, activeFY } = usePayrollReport((p) =>
    window.api.incomeTax.getForm27A(p),
  );
  const c = payload?.control ?? {};
  const est = payload?.establishment ?? {};

  return (
    <TallyReportLayout
      title="Form 27A"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{fyRange(activeFY)}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message="Preparing Form 27A…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[760px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-1">FORM 27A</div>
            <div className="text-center font-bold mb-1">
              Form for furnishing information with the statement of TDS
            </div>
            <div className="text-center mb-6">
              for the financial year <span className="font-bold">{fyRange(activeFY)}</span>
            </div>

            <Deductor est={est} />

            <div className="mt-4 border-t border-black">
              <StatementLine label="Number of Deductee Records" value={c.deductee_records ?? 0} />
              <StatementLine
                label="Total Amount Paid / Credited"
                value={fmtAmt(c.total_amount_paid)}
              />
              <StatementLine label="Total Tax Deducted" value={fmtAmt(c.total_tax_deducted)} />
              <StatementLine
                label="Total Tax Deposited"
                value={fmtAmt(c.total_tax_deposited)}
                bold
              />
            </div>

            <SignatureFooter note="Signature of the Person Responsible for deducting tax at source" />
          </div>
        )}
      </div>
    </TallyReportLayout>
  );
}

// #233 Form 24Q — statutory quarterly statement of TDS from salaries (Annexure I).
export function Form24Q() {
  const { payload, loading, selectedCompany, activeFY } = usePayrollReport((p) =>
    window.api.incomeTax.getForm24Q(p),
  );
  const rows: any[] = payload?.rows ?? [];
  const totals = payload?.totals ?? {};

  return (
    <TallyReportLayout
      title="Form 24Q"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{fyRange(activeFY)}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message="Preparing Form 24Q…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[940px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-1">FORM 24Q</div>
            <div className="text-center font-bold mb-1">
              Quarterly Statement of Deduction of Tax under section 192
            </div>
            <div className="text-center mb-4">
              {payload?.quarter ? <span className="font-bold">{payload.quarter} — </span> : null}
              <span className="font-bold">{fyRange(activeFY)}</span>
            </div>

            <Deductor est={payload?.establishment} />

            <div className="font-bold mb-1 text-[11px]">
              Annexure I — Deductee-wise break-up of TDS
            </div>
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={HEADCELL}>Sl No.</th>
                  <th className={HEADCELL}>PAN of Employee</th>
                  <th className={HEADCELL}>Name of Employee</th>
                  <th className={HEADCELL}>Amount Paid / Credited</th>
                  <th className={HEADCELL}>Tax Deducted</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <td key={i} className={`${CELL} h-24`} />
                    ))}
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i}>
                      <td className={CELL}>{r.sl}</td>
                      <td className={CELL}>{r.pan}</td>
                      <td className={`${CELL} uppercase`}>{r.name}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.amount_paid)}</td>
                      <td className={`${CELL} text-right tabular-nums`}>
                        {fmtAmt(r.tax_deducted)}
                      </td>
                    </tr>
                  ))
                )}
                {rows.length > 0 && (
                  <tr>
                    <td className={`${CELL} font-bold`} colSpan={3}>
                      Total
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.amount_paid)}
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.tax_deducted)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <SignatureFooter note="Signature of the Person Responsible for deducting tax at source" />
          </div>
        )}
      </div>
    </TallyReportLayout>
  );
}
