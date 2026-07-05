import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { EmptyState } from '@/components/blocks/EmptyState';

interface TaxonomyItem {
  key: string | null;
  label: string;
  count: number;
}
interface TaxonomyGroup {
  title: string;
  items: TaxonomyItem[];
}
interface TaxonomySection {
  section: string;
  groups: TaxonomyGroup[];
}

// Form 27Q → "Uncertain Transactions" — the fixed Master/Transaction exception tree.
// Exceptions the classifier detects carry a count and drill to the resolution screen.
export function Form27QUncertain() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [taxonomy, setTaxonomy] = useState<TaxonomySection[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !fyId) return;
    (async () => {
      setLoading(true);
      const res = await window.api.tds.getForm27QDrill({
        company_id: companyId,
        fy_id: fyId,
        view: 'uncertain',
      });
      if (res.success) setTaxonomy(res.payload.taxonomy ?? []);
      setLoading(false);
    })();
  }, [companyId, fyId]);

  return (
    <TallyReportLayout
      title="Form 27Q - Uncertain Transactions"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading…" className="italic" />}
        {!loading && (
          <>
            <div className="flex font-bold px-2 py-1 border-b border-gray-300">
              <div className="flex-1">P a r t i c u l a r s</div>
              <div className="w-32 text-right">No. of Vouchers</div>
            </div>
            {taxonomy.map((sec) => (
              <div key={sec.section} className="flex flex-col">
                <div className="px-2 pt-3 pb-0.5 font-bold text-black">{sec.section}</div>
                {sec.groups.map((g) => (
                  <div key={g.title} className="flex flex-col">
                    <div className="px-4 py-0.5 font-bold">{g.title}</div>
                    {g.items.map((it) => {
                      const clickable = !!it.key && it.count > 0;
                      return (
                        <div
                          key={it.label}
                          className={`flex px-6 py-0.5 ${
                            clickable
                              ? 'cursor-pointer hover:bg-[#ffcc00] font-semibold'
                              : 'text-gray-600'
                          }`}
                          onClick={() =>
                            clickable &&
                            navigate(
                              `/reports/statutory/tds/form-27q/uncertain/resolution?exception=${it.key}`,
                            )
                          }
                        >
                          <div className="flex-1">{it.label}</div>
                          <div className="w-32 text-right">{it.count || ''}</div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </TallyReportLayout>
  );
}

const EXCEPTION_TITLES: Record<string, string> = {
  tds_applicability: 'Unable to determine TDS applicability for ledgers or stock items',
  deductee_type: 'Unable to determine the deductee type for party',
  pan: 'PAN not available for party',
};

// Form 27Q → Uncertain Resolution — shows the offending masters for one exception:
// party-level exceptions render a ledger table (deductee type / PAN column), the
// TDS-applicability exception renders the List of Groups with its expense ledgers.
export function Form27QUncertainResolution() {
  const { selectedCompany, activeFY } = useCompany();
  const [params] = useSearchParams();
  const exception = params.get('exception') || '';
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !fyId || !exception) return;
    (async () => {
      setLoading(true);
      const res = await window.api.tds.getForm27QDrill({
        company_id: companyId,
        fy_id: fyId,
        view: 'resolution',
        exception,
      });
      if (res.success) setPayload(res.payload);
      setLoading(false);
    })();
  }, [companyId, fyId, exception]);

  return (
    <TallyReportLayout
      title="Form 27Q - Uncertain Resolution"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        <div className="px-2 py-1 font-bold border-b border-gray-300">
          {EXCEPTION_TITLES[exception] || exception}
        </div>
        {loading && <EmptyState message="Loading…" className="italic" />}

        {!loading && payload?.mode === 'groups' && (
          <>
            <div className="px-2 py-1 font-bold tracking-widest">
              L i s t&nbsp;&nbsp;o f&nbsp;&nbsp;G r o u p s
            </div>
            {payload.groups.length === 0 && (
              <div className="px-4 py-2 italic text-gray-500">No pending masters.</div>
            )}
            {payload.groups.map((g: any) => (
              <div key={g.group_name} className="flex flex-col">
                <div className="px-2 py-0.5 font-bold bg-[#ffcc00]">{g.group_name}</div>
                {g.ledgers.map((l: any) => (
                  <div key={l.ledger_id} className="px-6 py-0.5 italic">
                    {l.ledger_name}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {!loading && payload?.mode === 'ledgers' && (
          <table className="text-xs border-collapse w-full mt-1">
            <thead>
              <tr className="border-b border-gray-300 font-bold text-black">
                <th className="px-2 py-1 text-left w-16">Sl. No</th>
                <th className="px-2 py-1 text-left">Name of Ledger</th>
                <th className="px-2 py-1 text-left w-64">
                  {exception === 'pan' ? 'PAN' : 'Deductee Type'}
                </th>
              </tr>
            </thead>
            <tbody>
              {payload.ledgers.map((l: any, i: number) => (
                <tr key={l.ledger_id} className="hover:bg-[#ffcc00]">
                  <td className="px-2 py-0.5">{i + 1}</td>
                  <td className="px-2 py-0.5 font-semibold">{l.ledger_name}</td>
                  <td className="px-2 py-0.5">
                    {exception === 'pan' ? l.pan || '♦ Not Available' : `♦ ${l.deductee_type}`}
                  </td>
                </tr>
              ))}
              {payload.ledgers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-2 italic text-gray-500">
                    No pending masters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </TallyReportLayout>
  );
}

export default Form27QUncertain;
