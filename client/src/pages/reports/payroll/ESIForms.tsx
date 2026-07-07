import { useState, useEffect } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { EmptyState } from '@/components/blocks/EmptyState';

// ESI (Employee State Insurance) statutory documents, rendered as white-sheet forms
// like the PF forms. #218 Form 3 = Return of Declaration Forms.

const CELL = 'border border-black px-2 py-1 align-top';
const HEADCELL = 'border border-black px-2 py-1 text-center font-bold align-top';

function useESIData(kind: 'form3') {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const params = { company_id: companyId, from: activeFY?.start_date, to: activeFY?.end_date };
      const res = kind === 'form3' ? await window.api.esi.getForm3(params) : null;
      if (res?.success) setPayload(res.payload);
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
