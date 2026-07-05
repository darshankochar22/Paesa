import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { EmptyState } from '@/components/blocks/EmptyState';

const fmt = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

// Form 27EQ → "Not Relevant in this Return" — voucher-type breakdown; row drills to the
// filtered voucher register (?type=), a register row opens the voucher (27Q pattern).
export function Form27EQNotRelevant() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [rows, setRows] = useState<{ voucher_type: string; count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !fyId) return;
    (async () => {
      setLoading(true);
      const res = await window.api.tcs.getForm27EQDrill({
        company_id: companyId,
        fy_id: fyId,
        view: 'not_relevant',
      });
      if (res.success) {
        setRows(res.payload.breakdown ?? []);
        setTotal(res.payload.total ?? 0);
      }
      setLoading(false);
    })();
  }, [companyId, fyId]);

  return (
    <TallyReportLayout
      title="Form 27EQ - Not Relevant in this Return"
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
            {rows.map((r) => (
              <div
                key={r.voucher_type}
                className="flex px-2 py-0.5 font-semibold cursor-pointer hover:bg-[#ffcc00]"
                onClick={() =>
                  navigate(
                    `/reports/statutory/tcs/form-27eq/register?type=${encodeURIComponent(r.voucher_type)}&bucket=not_relevant`,
                  )
                }
              >
                <div className="flex-1">{r.voucher_type}</div>
                <div className="w-32 text-right">{r.count}</div>
              </div>
            ))}
            <div className="flex font-bold px-2 py-1 mt-2 border-t border-gray-400">
              <div className="flex-1">Total</div>
              <div className="w-32 text-right">{total || ''}</div>
            </div>
          </>
        )}
      </div>
    </TallyReportLayout>
  );
}

// Form 27EQ → Voucher Register — vouchers of one type inside one bucket.
export function Form27EQVoucherRegister() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const voucherType = params.get('type') || '';
  const bucket = params.get('bucket') || 'not_relevant';
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !fyId) return;
    (async () => {
      setLoading(true);
      const res = await window.api.tcs.getForm27EQDrill({
        company_id: companyId,
        fy_id: fyId,
        view: 'register',
        bucket,
        voucher_type: voucherType || undefined,
      });
      if (res.success) setRows(res.payload.vouchers ?? []);
      setLoading(false);
    })();
  }, [companyId, fyId, voucherType, bucket]);

  return (
    <TallyReportLayout
      title="Form 27EQ - Voucher Register"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        <div className="px-2 py-1 border-b border-gray-300">
          <span className="text-gray-600">Vouchers of&nbsp;&nbsp;:&nbsp;</span>
          <span className="font-bold">
            {voucherType || 'All'} ({bucket === 'not_relevant' ? 'Not Relevant' : 'Uncertain'})
          </span>
        </div>
        {loading && <EmptyState message="Loading…" className="italic" />}
        {!loading && (
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr className="border-b border-gray-300 font-bold text-black">
                <th className="px-2 py-1 text-left w-20">Date</th>
                <th className="px-2 py-1 text-left">Particulars</th>
                <th className="px-2 py-1 text-right w-28">Vch Type</th>
                <th className="px-2 py-1 text-right w-20">Vch No.</th>
                <th className="px-2 py-1 text-right w-28">Debit Amount</th>
                <th className="px-2 py-1 text-right w-28">Credit Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.voucher_id}
                  className="cursor-pointer hover:bg-[#ffcc00]"
                  onClick={() => navigate(`/transactions/voucher/${r.voucher_id}`)}
                >
                  <td className="px-2 py-0.5">{r.date}</td>
                  <td className="px-2 py-0.5 font-semibold">{r.particulars}</td>
                  <td className="px-2 py-0.5 text-right font-semibold">{r.voucher_type}</td>
                  <td className="px-2 py-0.5 text-right">{r.voucher_number}</td>
                  <td className="px-2 py-0.5 text-right tabular-nums" />
                  <td className="px-2 py-0.5 text-right tabular-nums">{fmt(r.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-400 font-bold">
                <td className="px-2 py-1" colSpan={4}>
                  Total
                </td>
                <td className="px-2 py-1 text-right" />
                <td className="px-2 py-1 text-right tabular-nums">
                  {fmt(rows.reduce((s, r) => s + (r.amount || 0), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </TallyReportLayout>
  );
}

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

// Form 27EQ → "Uncertain Transactions" — the fixed exception tree (TCS wording).
export function Form27EQUncertain() {
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
      const res = await window.api.tcs.getForm27EQDrill({
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
      title="Form 27EQ - Uncertain Transactions"
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
                              `/reports/statutory/tcs/form-27eq/uncertain/resolution?exception=${it.key}`,
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
  tcs_applicability: 'Unable to determine TCS applicability for ledgers or stock items',
  collectee_type: 'Unable to determine the collectee type for party',
  pan: 'PAN not available for party',
};

// Form 27EQ → Uncertain Resolution — offending masters for one exception.
export function Form27EQUncertainResolution() {
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
      const res = await window.api.tcs.getForm27EQDrill({
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
      title="Form 27EQ - Uncertain Resolution"
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
                  {exception === 'pan' ? 'PAN' : 'Collectee Type'}
                </th>
              </tr>
            </thead>
            <tbody>
              {payload.ledgers.map((l: any, i: number) => (
                <tr key={l.ledger_id} className="hover:bg-[#ffcc00]">
                  <td className="px-2 py-0.5">{i + 1}</td>
                  <td className="px-2 py-0.5 font-semibold">{l.ledger_name}</td>
                  <td className="px-2 py-0.5">
                    {exception === 'pan' ? l.pan || '♦ Not Available' : `♦ ${l.collectee_type}`}
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

export default Form27EQNotRelevant;
