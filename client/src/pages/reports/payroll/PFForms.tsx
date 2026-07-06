import { useState, useEffect } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { EmptyState } from '@/components/blocks/EmptyState';

// PF Form 5 (#207) & Form 10 (#208) — EPF statutory print documents rendered as a
// white sheet (Tally's print preview look). Rows come from the employee master:
// Form 5 = joiners of the fund in the period, Form 10 = leavers.

const CELL = 'border border-black px-2 py-1 align-top';
const HEADCELL = 'border border-black px-2 py-1 text-center font-bold align-top';

const monthLabel = (activeFY?: { end_date?: string } | null) => {
  const d = activeFY?.end_date ? new Date(activeFY.end_date) : new Date(2000, 0, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

function useFormData(kind: 'form5' | 'form10') {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const params = {
        company_id: companyId,
        from: activeFY?.start_date,
        to: activeFY?.end_date,
      };
      const res =
        kind === 'form5'
          ? await window.api.payrollStatutory.getPFForm5(params)
          : await window.api.payrollStatutory.getPFForm10(params);
      if (res.success) setPayload(res.payload);
      setLoading(false);
    })();
  }, [companyId, activeFY?.start_date, activeFY?.end_date, kind]);

  return { payload, loading, selectedCompany, activeFY };
}

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
        <div className="w-80">Code No. of the Factory / Establishment</div>
        <div className="w-4">:</div>
        <div className="font-bold">{est?.pf_code || ''}</div>
      </div>
    </div>
  );
}

function SignatureFooter({ note }: { note?: string }) {
  const today = new Date().toLocaleDateString('en-IN');
  return (
    <>
      <div className="flex justify-between mt-10 text-[11px]">
        <div>
          Date :&nbsp;<span className="font-bold">{today}</span>
        </div>
        <div className="text-center w-80">
          Signature of the employer or other authorised Officer of the Factory/Establishment & Stamp
          of the Factory /Establishment
        </div>
      </div>
      {note && <div className="mt-6 text-[10px] whitespace-pre-line">{note}</div>}
    </>
  );
}

export default function PFForm5() {
  const { payload, loading, selectedCompany, activeFY } = useFormData('form5');
  const rows: any[] = payload?.employees ?? [];

  return (
    <TallyReportLayout
      title="Form 5"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message="Preparing Form 5…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[900px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-3">FORM 5</div>
            <div className="text-center font-bold mb-1">
              THE EMPLOYEES' PROVIDENT FUNDS SCHEME, 1952
            </div>
            <div className="text-center font-bold mb-4">
              [Paragraph 36(2)(a) & THE EMPLOYEES PENSION SCHEME, 1995 Paragraph 20(2)]
            </div>
            <p className="mb-4">
              Return of Employees' qualifying for membership of the Employees' Provident Fund,
              Employees' Pension Fund & Employees' Deposit Linked Insurance Fund for the first time
              during the month of <b>{monthLabel(activeFY)}</b> (To be sent to the Commisioner with
              Form2 (EPF & EPS))
            </p>
            <Establishment est={payload?.establishment} />

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={HEADCELL}>Sl No.</th>
                  <th className={HEADCELL}>Account No.</th>
                  <th className={HEADCELL}>Name of Employee (in block letters)</th>
                  <th className={HEADCELL}>
                    Father's Name or Husband's Name (in case of married women)
                  </th>
                  <th className={HEADCELL}>Date of Birth</th>
                  <th className={HEADCELL}>Sex</th>
                  <th className={HEADCELL}>Date of Joining the Fund</th>
                  <th className={HEADCELL}>
                    Total period of previous service as on the date of joining the Fund (Enclose
                    Scheme Certificate if applicable)
                  </th>
                  <th className={HEADCELL}>Rem- arks</th>
                </tr>
                <tr>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <th key={n} className={HEADCELL}>
                      {n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <td key={i} className={`${CELL} h-96`} />
                    ))}
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i}>
                      <td className={CELL}>{i + 1}</td>
                      <td className={CELL}>{r.account_no}</td>
                      <td className={`${CELL} uppercase`}>{r.name}</td>
                      <td className={CELL}>{r.father_or_husband}</td>
                      <td className={CELL}>{r.date_of_birth}</td>
                      <td className={CELL}>{r.sex}</td>
                      <td className={CELL}>{r.date_of_joining_fund}</td>
                      <td className={CELL}>{r.previous_service}</td>
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

const FORM10_NOTE = `Please state whether the member is (a)retiring according to para(69), (i) (a) or (b) of the scheme (b) leaving India for permanent settlement abroad (c) retrenchment (d) Pt. & total disablement due to employment injury (e) discharged (f) resigning from or leaving service (g) taking up employment elsewhere (The name and address of the Employers should be stated) (h) death; (i) attained the age of 58 years.

Certified that the member mentioned at serial No.______________ Shri____________was paid/not paid retrenchment compensation of Rs____________under the Industrial Dispute Act, 1947.`;

export function PFForm10() {
  const { payload, loading, selectedCompany, activeFY } = useFormData('form10');
  const rows: any[] = payload?.employees ?? [];

  return (
    <TallyReportLayout
      title="Form 10"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message="Preparing Form 10…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[900px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-3">FORM 10</div>
            <div className="text-center font-bold mb-1">
              THE EMPLOYEES' PROVIDENT FUNDS SCHEME, 1952
            </div>
            <div className="text-center font-bold mb-4">
              [Paragraph 36(2) (a) & (b) EMPLOYEES' PENSION SCHEME, 1995 (Paragraph 20(2))]
            </div>
            <div className="flex mb-4">
              <div className="w-80">Return of the members leaving service during the month of</div>
              <div className="w-4">:</div>
              <div className="font-bold">{monthLabel(activeFY)}</div>
            </div>
            <Establishment est={payload?.establishment} />

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={HEADCELL}>Sl No.</th>
                  <th className={HEADCELL}>Account No.</th>
                  <th className={HEADCELL}>Name of the Member (in block letters)</th>
                  <th className={HEADCELL}>
                    Father's Name or husband's Name (in case of married women)
                  </th>
                  <th className={HEADCELL}>Date of leaving service</th>
                  <th className={HEADCELL}>Reason for leaving service</th>
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
                      <td className={CELL}>{i + 1}</td>
                      <td className={CELL}>{r.account_no}</td>
                      <td className={`${CELL} uppercase`}>{r.name}</td>
                      <td className={CELL}>{r.father_or_husband}</td>
                      <td className={CELL}>{r.date_of_leaving}</td>
                      <td className={CELL}>{r.reason}</td>
                      <td className={CELL}>{r.remarks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <SignatureFooter note={FORM10_NOTE} />
          </div>
        )}
      </div>
    </TallyReportLayout>
  );
}
