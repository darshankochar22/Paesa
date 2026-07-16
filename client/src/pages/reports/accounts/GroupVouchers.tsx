import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';

interface VoucherRow {
  voucher_id: number;
  date: string;
  particulars: string;
  voucher_type: string;
  voucher_number: string | number;
  debit: number;
  credit: number;
}

interface GroupVouchersResponse {
  success: boolean;
  group_name: string;
  rows: VoucherRow[];
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  error?: string;
}

const fmt = (n: number) =>
  Math.abs(Number(n) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const amt = (n: number) => (Number(n) ? fmt(n) : '');
const balance = (n: number) => (n ? `${fmt(n)} ${n >= 0 ? 'Dr' : 'Cr'}` : '');
const fmtDate = (s?: string) => {
  if (!s) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : s;
};

/**
 * Group Vouchers (issue #93) — Account Books → Group Vouchers → Select Group.
 * Every voucher touching a ledger in the chosen group (recursively), shown as a
 * register: Date | Particulars | Vch Type | Vch No. | Debit | Credit, with the
 * group's Opening / Current Total / Closing balance footer. Row → the voucher.
 */
export default function GroupVouchers() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const { selectedCompany, activeFY } = useCompany();

  const [data, setData] = React.useState<GroupVouchersResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [index, setIndex] = React.useState(0);

  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dmy = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : iso;
  };
  const periodLabel = activeFY ? `${dmy(activeFY.start_date)} to ${dmy(activeFY.end_date)}` : '';

  React.useEffect(() => {
    if (!groupId || !selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setIndex(0);
    (window as any).api.report
      .run('group_vouchers', {
        company_id: selectedCompany.company_id,
        fy_id: activeFY.fy_id,
        group_id: Number(groupId),
      })
      .then((res: GroupVouchersResponse) => {
        if (res.success) setData(res);
        else setError(res.error || 'Failed to load group vouchers');
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [groupId, selectedCompany?.company_id, activeFY?.fy_id]);

  const rows = data?.rows ?? [];
  const openRow = React.useCallback(
    (r?: VoucherRow) => {
      if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`);
    },
    [navigate],
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIndex((p) => Math.min(rows.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIndex((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        openRow(rows[index]);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows, index, openRow, navigate]);

  if (loading) return <div className="p-4 text-xs font-mono text-black">Loading...</div>;
  if (error) return <div className="p-4 text-xs font-mono text-black">{error}</div>;
  if (!data) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
      <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-[11px] hover:underline">
          ← Back
        </button>
        <span className="text-[12px] font-bold">Group Vouchers</span>
        <span className="text-[11px]">{selectedCompany?.name ?? ''}</span>
      </div>

      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-gray-200 font-mono">
        <span>
          Group: <span className="font-bold">{data.group_name}</span>
        </span>
        <span>{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black">
            <tr>
              <th className="px-3 py-1 text-left font-bold w-24">Date</th>
              <th className="px-3 py-1 text-left font-bold border-l border-gray-200">
                Particulars
              </th>
              <th className="px-3 py-1 text-left font-bold w-28 border-l border-gray-200">
                Vch Type
              </th>
              <th className="px-3 py-1 text-right font-bold w-20 border-l border-gray-200">
                Vch No.
              </th>
              <th className="px-3 py-1 text-right font-bold w-32 border-l border-gray-200">
                Debit
              </th>
              <th className="px-3 py-1 text-right font-bold w-32 border-l border-gray-200">
                Credit
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-black italic">
                  No vouchers for this group.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => {
                const focused = i === index;
                return (
                  <tr
                    key={`${r.voucher_id}-${i}`}
                    onClick={() => setIndex(i)}
                    onDoubleClick={() => openRow(r)}
                    className={`border-b border-gray-200 cursor-pointer ${focused ? 'bg-black/[0.06] font-bold' : 'hover:bg-black/[0.03]'}`}
                  >
                    <td className="px-3 py-1 whitespace-nowrap">{fmtDate(r.date)}</td>
                    <td className="px-3 py-1 border-l border-gray-200">{r.particulars}</td>
                    <td className="px-3 py-1 border-l border-gray-200">{r.voucher_type}</td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {r.voucher_number || ''}
                    </td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {amt(r.debit)}
                    </td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {amt(r.credit)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Opening / Current Total / Closing balance footer */}
      <div className="border-t-2 border-black bg-white font-mono text-[11px] text-black shrink-0">
        <div className="flex px-3 py-1">
          <span className="flex-1 text-right pr-3">Opening Balance :</span>
          <span className="w-32 text-right">{balance(data.opening_balance)}</span>
        </div>
        <div className="flex px-3 py-1 font-bold border-t border-gray-200">
          <span className="flex-1 text-right pr-3">Current Total :</span>
          <span className="w-32 text-right border-l border-gray-200">{amt(data.total_debit)}</span>
          <span className="w-32 text-right border-l border-gray-200">{amt(data.total_credit)}</span>
        </div>
        <div className="flex px-3 py-1 font-bold border-t border-gray-200">
          <span className="flex-1 text-right pr-3">Closing Balance :</span>
          <span className="w-32 text-right">{balance(data.closing_balance)}</span>
        </div>
      </div>
    </div>
  );
}
