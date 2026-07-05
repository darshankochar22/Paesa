import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { Button } from '@/components/shadcn/button';
import { EmptyState } from '@/components/blocks/EmptyState';

interface Amounts {
  taxable: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  tax: number;
}
interface PartyRow {
  party_name: string;
  place_of_supply: string;
  registration_name: string;
  opening: Amounts;
}

const ZERO: Amounts = { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, tax: 0 };
const fmt = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

const SUB = ['Taxable\nAmount', 'IGST', 'CGST', 'SGST/\nUTGST', 'Cess', 'Tax\nAmount'];

function AmountCells({ a }: { a: Amounts }) {
  return (
    <>
      <td className="px-2 py-0.5 text-right tabular-nums w-24">{fmt(a.taxable)}</td>
      <td className="px-2 py-0.5 text-right tabular-nums w-20">{fmt(a.igst)}</td>
      <td className="px-2 py-0.5 text-right tabular-nums w-20">{fmt(a.cgst)}</td>
      <td className="px-2 py-0.5 text-right tabular-nums w-20">{fmt(a.sgst)}</td>
      <td className="px-2 py-0.5 text-right tabular-nums w-16">{fmt(a.cess)}</td>
      <td className="px-2 py-0.5 text-right tabular-nums w-24 border-r border-gray-200">
        {fmt(a.tax)}
      </td>
    </>
  );
}

export default function GstAdvancesReport({ type }: { type: 'Receipt' | 'Payment' }) {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [parties, setParties] = useState<PartyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!companyId || !fyId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await window.api.gst.getGstAdvancesReport({
          company_id: companyId,
          fy_id: fyId,
          type,
        });
        if (res.success) setParties((res.parties as PartyRow[]) || []);
        else {
          setError(res.error || 'Failed to load the advances report.');
          setParties([]);
        }
      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred.');
        setParties([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, fyId, type]);

  const sum = (pick: (p: PartyRow) => Amounts) =>
    parties.reduce(
      (acc, p) => {
        const a = pick(p);
        return {
          taxable: acc.taxable + a.taxable,
          igst: acc.igst + a.igst,
          cgst: acc.cgst + a.cgst,
          sgst: acc.sgst + a.sgst,
          cess: acc.cess + a.cess,
          tax: acc.tax + a.tax,
        };
      },
      { ...ZERO },
    );

  const HEAD = 'px-2 py-1 text-center font-bold text-black text-xs border-b border-gray-300';
  const SECTION = type === 'Receipt' ? 'Total Advance Received' : 'Total Advance Paid';

  return (
    <TallyReportLayout
      title={type === 'Receipt' ? 'Advance Receipts' : 'Advance Paid'}
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <div className="flex gap-4">
          <span className="w-36">GST Registration</span>
          <span className="font-bold">: All Registrations</span>
        </div>
      }
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
      footerControls={
        <Button
          onClick={() =>
            navigate(
              type === 'Receipt'
                ? '/master/statutory/gst/advance-paid'
                : '/master/statutory/gst/advance-receipts',
            )
          }
          variant="ghost"
          size="xs"
          className="h-auto p-0 ml-4 font-bold text-black hover:underline hover:bg-transparent"
        >
          {type === 'Receipt' ? 'F5: Advance Paid' : 'F5: Advance Received'}
        </Button>
      }
    >
      <div className="w-full font-sans text-xs pb-4 overflow-x-auto">
        {loading && <EmptyState message="Loading advances…" className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && !error && (
          <table className="text-xs min-w-[1400px] border-collapse">
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="px-2 py-1 text-left align-bottom font-bold text-black text-xs border-b border-r border-gray-300 w-48"
                >
                  P a r t i c u l a r s
                </th>
                <th colSpan={6} className={HEAD + ' border-r'}>
                  Opening Balance of Unadjusted Advance
                </th>
                <th colSpan={6} className={HEAD + ' border-r'}>
                  {SECTION}
                </th>
                <th colSpan={6} className={HEAD}>
                  Total Advance Adjusted
                </th>
              </tr>
              <tr>
                {[0, 1, 2].map((g) =>
                  SUB.map((s, i) => (
                    <th
                      key={`${g}-${i}`}
                      className="px-2 py-1 text-right align-bottom font-bold text-black text-[10px] border-b border-gray-300 whitespace-pre-line"
                    >
                      {s}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {parties.length === 0 ? (
                <tr>
                  <td colSpan={19} className="p-0">
                    <EmptyState
                      message={`No outstanding advance ${type === 'Receipt' ? 'receipts' : 'paid'} found.`}
                    />
                  </td>
                </tr>
              ) : (
                parties.map((p, idx) => (
                  <tr key={idx} className="hover:bg-[#e6f2ff]">
                    <td className="px-2 py-0.5 border-r border-gray-200">{p.party_name}</td>
                    <AmountCells a={p.opening} />
                    <AmountCells a={ZERO} />
                    <AmountCells a={ZERO} />
                  </tr>
                ))
              )}
            </tbody>
            {parties.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-400 font-bold">
                  <td className="px-2 py-1 border-r border-gray-200">Total</td>
                  <AmountCells a={sum((p) => p.opening)} />
                  <AmountCells a={ZERO} />
                  <AmountCells a={ZERO} />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </TallyReportLayout>
  );
}
