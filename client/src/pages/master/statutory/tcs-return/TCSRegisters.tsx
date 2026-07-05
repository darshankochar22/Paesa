import { useState, useEffect } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { EmptyState } from '@/components/blocks/EmptyState';

const fmt = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

const TH = 'px-2 py-1 text-left font-bold text-black';
const THR = 'px-2 py-1 text-right font-bold text-black';

// #205 — TCS Return Transaction Book: register of saved TCS returns (empty until a
// return-saving engine exists; Tally column contract kept).
export function TCSReturnTransactionBook() {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [rows, setRows] = useState<any[]>([]);
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !fyId) return;
    (async () => {
      setLoading(true);
      const res = await window.api.tcs.getReturnTransactionBook({
        company_id: companyId,
        fy_id: fyId,
      });
      if (res.success) {
        setRows(res.payload.returns ?? []);
        setPeriod(res.payload.period_label ?? '');
      }
      setLoading(false);
    })();
  }, [companyId, fyId]);

  return (
    <TallyReportLayout
      title="TCS Return Transaction Book"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{period}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading…" className="italic" />}
        {!loading && (
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr className="border-b border-gray-300">
                <th className={TH}>Date</th>
                <th className={TH}>From Date</th>
                <th className={TH}>To Date</th>
                <th className={TH}>Tax Type</th>
                <th className={TH}>Is Modified</th>
                <th className={THR}>Form Type</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-gray-400 italic">
                    No saved TCS returns for this Financial Year.
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

// #205 — TCS Outstandings: TCS collected but not paid to the government, grouped by
// Nature of Goods (default) or Party; Company / Non Company split from the buyer's
// collectee type.
export function TCSOutstandings() {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [by, setBy] = useState<'nature' | 'party'>('nature');
  const [rows, setRows] = useState<any[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !fyId) return;
    (async () => {
      setLoading(true);
      const res = await window.api.tcs.getOutstandings({
        company_id: companyId,
        fy_id: fyId,
        by,
      });
      if (res.success) {
        setRows(res.payload.rows ?? []);
        setGrandTotal(res.payload.grand_total ?? 0);
        setPeriod(res.payload.period_label ?? '');
      }
      setLoading(false);
    })();
  }, [companyId, fyId, by]);

  return (
    <TallyReportLayout
      title="TCS Outstandings"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{period}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        <div className="flex items-center px-2 py-1 border-b border-gray-300">
          <div className="flex-1">
            <span className="text-gray-600">Details of&nbsp;&nbsp;:&nbsp;</span>
            <span className="font-bold">{by === 'nature' ? 'Nature of Goods' : 'Party'}</span>
          </div>
          <button
            className="border border-gray-400 px-2 py-0.5 text-[11px] font-semibold hover:bg-[#ffcc00]"
            onClick={() => setBy(by === 'nature' ? 'party' : 'nature')}
          >
            F5: {by === 'nature' ? 'Party-wise' : 'Nature of Goods-wise'}
          </button>
        </div>
        {loading && <EmptyState message="Loading…" className="italic" />}
        {!loading && (
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr className="border-b border-gray-300">
                <th className={TH}>{by === 'nature' ? 'Nature of Goods' : 'Party'}</th>
                <th className={THR}>Company</th>
                <th className={THR}>Non Company</th>
                <th className={THR}>Total Pending</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-gray-400 italic">
                    No pending TCS for this Financial Year.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.label} className="border-b border-gray-100 hover:bg-[#e6f2ff]">
                    <td className="px-2 py-0.5 font-semibold">{r.label}</td>
                    <td className="px-2 py-0.5 text-right tabular-nums">{fmt(r.company)}</td>
                    <td className="px-2 py-0.5 text-right tabular-nums">{fmt(r.non_company)}</td>
                    <td className="px-2 py-0.5 text-right tabular-nums font-semibold">
                      {fmt(r.total_pending)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-400 font-bold">
                <td className="px-2 py-1">G r a n d&nbsp;&nbsp;T o t a l</td>
                <td />
                <td />
                <td className="px-2 py-1 text-right tabular-nums">{fmt(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </TallyReportLayout>
  );
}

// #205 — Ledgers Without PAN: buyer (collectee) ledgers with no PAN on record.
export function TCSLedgersWithoutPAN() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const res = await window.api.tcs.getLedgersWithoutPan({ company_id: companyId });
      if (res.success) setRows(res.payload.ledgers ?? []);
      setLoading(false);
    })();
  }, [companyId]);

  return (
    <TallyReportLayout
      title="Ledgers Without PAN"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div />}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        <div className="px-2 py-1 font-bold border-b border-gray-300">Ledgers Without PAN</div>
        {loading && <EmptyState message="Loading…" className="italic" />}
        {!loading && (
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr className="border-b border-gray-300">
                <th className={TH}>Buyer Ledger Name</th>
                <th className={TH}>Collectee Type</th>
                <th className={TH}>Contact Person</th>
                <th className={TH}>Contact No.</th>
                <th className={THR}>PAN/IT No.</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-400 italic">
                    All collectee ledgers have a PAN on record.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.ledger_id} className="border-b border-gray-100 hover:bg-[#e6f2ff]">
                    <td className="px-2 py-0.5 font-semibold">{r.name}</td>
                    <td className="px-2 py-0.5">{r.collectee_type}</td>
                    <td className="px-2 py-0.5">{r.contact_person}</td>
                    <td className="px-2 py-0.5">{r.contact_no}</td>
                    <td className="px-2 py-0.5 text-right text-gray-400 italic">Not Available</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </TallyReportLayout>
  );
}

// #205 — TDS Challan details of Buyer: TCS collection entries with no challan reference
// yet ("Entries Without Challan Details"); challan number/date fill in once reconciled.
export function TCSChallanDetailsOfBuyer() {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [rows, setRows] = useState<any[]>([]);
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !fyId) return;
    (async () => {
      setLoading(true);
      const res = await window.api.tcs.getChallanDetailsOfBuyer({
        company_id: companyId,
        fy_id: fyId,
      });
      if (res.success) {
        setRows(res.payload.entries ?? []);
        setPeriod(res.payload.period_label ?? '');
      }
      setLoading(false);
    })();
  }, [companyId, fyId]);

  return (
    <TallyReportLayout
      title="TDS Challan details of Buyer"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{period}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        <div className="px-2 py-1 font-bold border-b border-gray-300">
          Entries Without Challan Details
        </div>
        <div className="px-2 py-0.5 flex gap-8 border-b border-gray-200">
          <div>
            <span className="text-gray-600">Buyer Name&nbsp;&nbsp;:&nbsp;</span>
            <span className="font-bold">♦ All Items</span>
          </div>
          <div>
            <span className="text-gray-600">Nature of Goods&nbsp;&nbsp;:&nbsp;</span>
            <span className="font-bold">♦ All Items</span>
          </div>
        </div>
        {loading && <EmptyState message="Loading…" className="italic" />}
        {!loading && (
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr className="border-b border-gray-300">
                <th className={TH}>Date</th>
                <th className={TH}>Buyer Name</th>
                <th className={TH}>Nature of Goods</th>
                <th className={THR}>Amount</th>
                <th className={THR}>Challan Number</th>
                <th className={THR}>Challan Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-gray-400 italic">
                    No TCS collection entries pending challan details.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.voucher_id} className="border-b border-gray-100 hover:bg-[#e6f2ff]">
                    <td className="px-2 py-0.5">{r.date}</td>
                    <td className="px-2 py-0.5 font-semibold">{r.buyer_name}</td>
                    <td className="px-2 py-0.5">{r.nature_of_goods}</td>
                    <td className="px-2 py-0.5 text-right tabular-nums">{fmt(r.amount)}</td>
                    <td className="px-2 py-0.5 text-right" />
                    <td className="px-2 py-0.5 text-right" />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </TallyReportLayout>
  );
}

export default TCSReturnTransactionBook;
