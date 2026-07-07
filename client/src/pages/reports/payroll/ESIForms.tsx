import { useState, useEffect } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { EmptyState } from '@/components/blocks/EmptyState';

// ESI (Employee State Insurance) statutory documents, rendered as white-sheet forms
// like the PF forms. #218 Form 3 = Return of Declaration Forms.

const CELL = 'border border-black px-2 py-1 align-top';
const HEADCELL = 'border border-black px-2 py-1 text-center font-bold align-top';

const fmtAmt = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

const monthLabel = (activeFY?: { end_date?: string } | null) => {
  const d = activeFY?.end_date ? new Date(activeFY.end_date) : new Date(2000, 0, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

type ESIKind = 'form3' | 'monthly' | 'ereturn' | 'form5' | 'form6';

function useESIData(kind: ESIKind) {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const params = { company_id: companyId, from: activeFY?.start_date, to: activeFY?.end_date };
      const api = window.api.esi;
      const fetchers: Record<ESIKind, (p: any) => Promise<any>> = {
        form3: api.getForm3,
        monthly: api.getMonthlyStatement,
        ereturn: api.getEReturn,
        form5: api.getForm5,
        form6: api.getForm6,
      };
      const res = await fetchers[kind](params);
      if (res?.success) setPayload(res.payload);
      setLoading(false);
    })();
  }, [companyId, activeFY?.start_date, activeFY?.end_date, kind]);

  return { payload, loading, selectedCompany, activeFY };
}

const fyRange = (activeFY?: { start_date?: string; end_date?: string } | null) =>
  activeFY?.start_date && activeFY?.end_date
    ? `${activeFY.start_date} to ${activeFY.end_date}`
    : '';

function Establishment({ est }: { est: any }) {
  return (
    <div className="flex flex-col gap-1 mb-4 text-[11px]">
      <div className="flex">
        <div className="w-80">Name and Address of the Factory / Establishment</div>
        <div className="w-4">:</div>
        <div className="font-bold whitespace-pre-line">
          {est?.name}
          {est?.address ? `\n${est.address}` : ''}
        </div>
      </div>
      <div className="flex">
        <div className="w-80">Employer's Code No.</div>
        <div className="w-4">:</div>
        <div className="font-bold">{est?.esi_code || ''}</div>
      </div>
      <div className="flex">
        <div className="w-80">Branch Office</div>
        <div className="w-4">:</div>
        <div className="font-bold">{est?.branch_office || ''}</div>
      </div>
    </div>
  );
}

function SignatureFooter() {
  const today = new Date().toLocaleDateString('en-IN');
  return (
    <div className="flex justify-between mt-10 text-[11px]">
      <div>
        Date :&nbsp;<span className="font-bold">{today}</span>
      </div>
      <div className="text-center w-80">
        Signature of the Employer or Principal / Immediate Employer &amp; Stamp of the Factory /
        Establishment
      </div>
    </div>
  );
}

// #218 ESI Form 3 — Return of Declaration Forms.
export default function ESIForm3() {
  const { payload, loading, selectedCompany, activeFY } = useESIData('form3');
  const rows: any[] = payload?.employees ?? [];

  return (
    <TallyReportLayout
      title="Form 3"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message="Preparing Form 3…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[940px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-3">FORM 3</div>
            <div className="text-center font-bold mb-1">
              THE EMPLOYEES' STATE INSURANCE ACT, 1948
            </div>
            <div className="text-center font-bold mb-4">
              Return of Declaration Forms [Regulation 14]
            </div>

            <Establishment est={payload?.establishment} />

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={HEADCELL}>Sl No.</th>
                  <th className={HEADCELL}>Insurance Number</th>
                  <th className={HEADCELL}>Name of the Insured Person</th>
                  <th className={HEADCELL}>Father's / Husband's Name</th>
                  <th className={HEADCELL}>Date of Appointment</th>
                  <th className={HEADCELL}>Dispensary</th>
                  <th className={HEADCELL}>Remarks</th>
                </tr>
                <tr>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <th key={n} className={HEADCELL}>
                      {n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <td key={i} className={`${CELL} h-96`} />
                    ))}
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i}>
                      <td className={CELL}>{r.sl}</td>
                      <td className={CELL}>{r.insurance_number}</td>
                      <td className={`${CELL} uppercase`}>{r.name}</td>
                      <td className={CELL}>{r.father_or_husband}</td>
                      <td className={CELL}>{r.date_of_appointment}</td>
                      <td className={CELL}>{r.dispensary}</td>
                      <td className={CELL}>{r.remarks}</td>
                    </tr>
                  ))
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

// #220 ESI E-Return — the ESIC monthly-contribution (MC) bulk-upload data. Rendered as
// a plain grid matching the portal upload template rather than a signed white sheet.
export function ESIEReturn() {
  const { payload, loading, selectedCompany, activeFY } = useESIData('ereturn');
  const rows: any[] = payload?.rows ?? [];
  const totals = payload?.totals ?? {};

  return (
    <TallyReportLayout
      title="E-Return"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{fyRange(activeFY)}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message="Preparing E-Return…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[940px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-1">
              EMPLOYEE STATE INSURANCE — MONTHLY CONTRIBUTION (E-RETURN)
            </div>
            <div className="text-center mb-4">
              for the month of <span className="font-bold">{monthLabel(activeFY)}</span>
            </div>

            <Establishment est={payload?.establishment} />

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={HEADCELL}>IP Number</th>
                  <th className={HEADCELL}>IP Name</th>
                  <th className={HEADCELL}>No. of Days</th>
                  <th className={HEADCELL}>Total Monthly Wages</th>
                  <th className={HEADCELL}>Last Working Day</th>
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
                      <td className={CELL}>{r.ip_number}</td>
                      <td className={`${CELL} uppercase`}>{r.ip_name}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{r.days}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.wages)}</td>
                      <td className={CELL}>{r.last_working_day}</td>
                    </tr>
                  ))
                )}
                {rows.length > 0 && (
                  <tr>
                    <td className={`${CELL} font-bold`} />
                    <td className={`${CELL} font-bold`}>Total</td>
                    <td className={`${CELL} font-bold`} />
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.wages)}
                    </td>
                    <td className={`${CELL} font-bold`} />
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

// #221 ESI Form 5 — Return of Contributions (half-yearly).
export function ESIForm5() {
  const { payload, loading, selectedCompany, activeFY } = useESIData('form5');
  const rows: any[] = payload?.rows ?? [];
  const totals = payload?.totals ?? {};

  return (
    <TallyReportLayout
      title="Form 5"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{fyRange(activeFY)}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message="Preparing Form 5…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[940px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-3">FORM 5</div>
            <div className="text-center font-bold mb-1">
              THE EMPLOYEES' STATE INSURANCE ACT, 1948
            </div>
            <div className="text-center font-bold mb-4">
              Return of Contributions [Regulation 26]
            </div>

            <Establishment est={payload?.establishment} />
            <div className="mb-4 text-[11px]">
              Contribution Period :&nbsp;<span className="font-bold">{fyRange(activeFY)}</span>
            </div>

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={HEADCELL}>Sl No.</th>
                  <th className={HEADCELL}>Insurance Number</th>
                  <th className={HEADCELL}>Name of the Insured Person</th>
                  <th className={HEADCELL}>No. of Days for which Wages Paid</th>
                  <th className={HEADCELL}>Total Amount of Wages</th>
                  <th className={HEADCELL}>Employee's Contribution</th>
                  <th className={HEADCELL}>Remarks</th>
                </tr>
                <tr>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <th key={n} className={HEADCELL}>
                      {n}
                    </th>
                  ))}
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
                      <td className={CELL}>{r.esi_number}</td>
                      <td className={`${CELL} uppercase`}>{r.name}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{r.days}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.wages)}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.ee)}</td>
                      <td className={CELL} />
                    </tr>
                  ))
                )}
                {rows.length > 0 && (
                  <tr>
                    <td className={`${CELL} font-bold`} />
                    <td className={`${CELL} font-bold`} />
                    <td className={`${CELL} font-bold`}>Total</td>
                    <td className={`${CELL} font-bold`} />
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.wages)}
                    </td>
                    <td className={`${CELL} font-bold text-right tabular-nums`}>
                      {fmtAmt(totals.ee)}
                    </td>
                    <td className={`${CELL} font-bold`} />
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

// #222 ESI Form 6 — Register of Employees [Regulation 32].
export function ESIForm6() {
  const { payload, loading, selectedCompany, activeFY } = useESIData('form6');
  const rows: any[] = payload?.rows ?? [];
  const totals = payload?.totals ?? {};

  return (
    <TallyReportLayout
      title="Form 6"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{fyRange(activeFY)}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message="Preparing Form 6…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[1040px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-3">FORM 6</div>
            <div className="text-center font-bold mb-1">
              THE EMPLOYEES' STATE INSURANCE ACT, 1948
            </div>
            <div className="text-center font-bold mb-4">Register of Employees [Regulation 32]</div>

            <Establishment est={payload?.establishment} />
            <div className="mb-4 text-[11px]">
              Contribution Period :&nbsp;<span className="font-bold">{fyRange(activeFY)}</span>
            </div>

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={HEADCELL}>Sl No.</th>
                  <th className={HEADCELL}>Insurance Number</th>
                  <th className={HEADCELL}>Name of the Insured Person</th>
                  <th className={HEADCELL}>Father's / Husband's Name</th>
                  <th className={HEADCELL}>Date of Appointment</th>
                  <th className={HEADCELL}>Wages</th>
                  <th className={HEADCELL}>Employee's Contribution</th>
                  <th className={HEADCELL}>Employer's Contribution</th>
                  <th className={HEADCELL}>Total</th>
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
                      <td className={CELL}>{r.esi_number}</td>
                      <td className={`${CELL} uppercase`}>{r.name}</td>
                      <td className={CELL}>{r.father_or_husband}</td>
                      <td className={CELL}>{r.date_of_appointment}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.wages)}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.ee)}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.er)}</td>
                      <td className={`${CELL} text-right tabular-nums`}>{fmtAmt(r.total)}</td>
                    </tr>
                  ))
                )}
                {rows.length > 0 && (
                  <tr>
                    <td className={`${CELL} font-bold`} colSpan={5}>
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

// #219 ESI Monthly Statement — employee-wise ESI contribution register for the month.
export function ESIMonthlyStatement() {
  const { payload, loading, selectedCompany, activeFY } = useESIData('monthly');
  const rows: any[] = payload?.rows ?? [];
  const totals = payload?.totals ?? {};

  return (
    <TallyReportLayout
      title="Monthly Statement"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message="Preparing Monthly Statement…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[940px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-1">
              EMPLOYEE STATE INSURANCE — MONTHLY STATEMENT
            </div>
            <div className="text-center mb-4">
              for the month of <span className="font-bold">{monthLabel(activeFY)}</span>
            </div>

            <Establishment est={payload?.establishment} />

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={HEADCELL}>Sl No.</th>
                  <th className={HEADCELL}>ESI Number</th>
                  <th className={HEADCELL}>Name of Employee</th>
                  <th className={HEADCELL}>ESI Wages</th>
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
                      <td className={CELL}>{r.esi_number}</td>
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
                    <td className={`${CELL} font-bold`} />
                    <td className={`${CELL} font-bold`} />
                    <td className={`${CELL} font-bold`}>Total</td>
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
