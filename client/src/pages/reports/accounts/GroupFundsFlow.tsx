import * as React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';

interface FlowRow {
  group_id?: number;
  ledger_id?: number;
  group_name?: string;
  ledger_name?: string;
  type: 'group' | 'ledger' | 'stock';
  opening: number;
  txnDebit: number;
  txnCredit: number;
  closing: number;
}

interface GroupFundsFlowResponse {
  success: boolean;
  group_name: string;
  childGroups: FlowRow[];
  ledgers: FlowRow[];
  totalOpening: number;
  totalDebit: number;
  totalCredit: number;
  totalClosing: number;
  error?: string;
}

const fmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Signed balance → "12,345.00 Dr" / "12,345.00 Cr". Dr positive, Cr negative.
const balanceLabel = (n: number) => {
  if (!n) return '';
  return `${fmt(n)} ${n >= 0 ? 'Dr' : 'Cr'}`;
};

const rowName = (r: FlowRow) => r.group_name ?? r.ledger_name ?? '';
const rowKey = (r: FlowRow) => (r.type === 'group' ? `g-${r.group_id}` : `l-${r.ledger_id}`);

export default function GroupFundsFlow() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const [searchParams] = useSearchParams();
  const { selectedCompany, activeFY } = useCompany();

  // Top level of the drill (reached straight from Funds Flow) is titled
  // "Group Funds Flow"; sub-group recursion is titled "Group Summary" — Tally.
  const isRoot = searchParams.get('root') === '1';
  const title = isRoot ? 'Group Funds Flow' : 'Group Summary';

  const [data, setData] = React.useState<GroupFundsFlowResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [focusedKey, setFocusedKey] = React.useState<string | null>(null);
  const focusedRef = React.useRef<FlowRow | null>(null);

  React.useEffect(() => {
    if (!groupId || !selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setFocusedKey(null);
    focusedRef.current = null;
    (window as any).api.report
      .groupFundsFlowDrilldown(selectedCompany.company_id, activeFY.fy_id, Number(groupId))
      .then((res: GroupFundsFlowResponse) => {
        if (res.success) setData(res);
        else setError(res.error || 'Failed to load group funds flow');
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupId, selectedCompany?.company_id, activeFY?.fy_id]);

  // Drill: child group → recurse (Group Summary); ledger → Ledger Monthly
  // Summary; Closing Stock → Stock Group Summary (inventory).
  const openRow = React.useCallback(
    (r: FlowRow) => {
      if (r.type === 'group' && r.group_id != null) {
        navigate(`/reports/accounts/group-funds-flow/${r.group_id}`);
      } else if (r.type === 'stock') {
        navigate('/reports/inventory/stock-summary-drill');
      } else if (r.type === 'ledger' && r.ledger_id != null && r.ledger_id > 0) {
        navigate(`/reports/accounts/ledger-summary/${r.ledger_id}`);
      }
    },
    [navigate],
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate(-1);
        return;
      }
      if (e.key === 'Enter' && focusedRef.current) {
        e.preventDefault();
        openRow(focusedRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openRow, navigate]);

  if (loading) {
    return <div className="p-4 text-xs font-mono text-black">Loading...</div>;
  }
  if (error) {
    return <div className="p-4 text-xs font-mono text-black">{error}</div>;
  }
  if (!data) return null;

  const rows: FlowRow[] = [...data.childGroups, ...data.ledgers];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white font-mono">
      {/* Title strip */}
      <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between select-none">
        <button onClick={() => navigate(-1)} className="text-[11px] hover:underline">
          ← Back
        </button>
        <span className="text-[12px] font-bold">{title}</span>
        <span className="text-[11px]">{selectedCompany?.name ?? ''}</span>
      </div>

      {/* Report caption */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex justify-between items-start">
        <span className="text-[11px] font-bold uppercase tracking-wide text-black">
          Particulars
        </span>
        <div className="text-right">
          <div className="text-[11px] italic text-black">{data.group_name}</div>
          <div className="text-[11px] font-bold text-black">{selectedCompany?.name}</div>
          <div className="text-[10px] text-black">
            {activeFY ? `For ${activeFY.start_date}` : ''}
          </div>
        </div>
      </div>

      {/* Single table so header, rows and total share one column grid.
          Columns: Particulars | Opening Balance | Transactions (Debit/Credit) | Closing Balance */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse font-mono text-[11px] text-black">
          <colgroup>
            <col />
            <col className="w-32" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-32" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-white text-[10px]">
            <tr className="border-b border-gray-200">
              <th className="px-3 pt-1 text-left align-bottom"></th>
              <th className="px-3 pt-1 text-right align-bottom border-l border-gray-200">
                Opening Balance
              </th>
              <th colSpan={2} className="px-3 py-1 text-center border-l border-b border-gray-200">
                Transactions
              </th>
              <th className="px-3 pt-1 text-right align-bottom border-l border-gray-200">
                Closing Balance
              </th>
            </tr>
            <tr className="border-b border-gray-200">
              <th></th>
              <th className="border-l border-gray-200"></th>
              <th className="px-3 pb-1 text-right border-l border-gray-200">Debit</th>
              <th className="px-3 pb-1 text-right border-l border-gray-200">Credit</th>
              <th className="border-l border-gray-200"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-black italic">
                  No entries.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const key = rowKey(r);
                const isFocused = focusedKey === key;
                const drillable =
                  r.type === 'group' ||
                  r.type === 'stock' ||
                  (r.type === 'ledger' && (r.ledger_id ?? 0) > 0);
                return (
                  <tr
                    key={key}
                    className={`border-b border-gray-200 select-none ${
                      drillable ? 'cursor-pointer' : ''
                    } ${
                      isFocused
                        ? 'bg-black/[0.06] text-black font-bold'
                        : 'hover:bg-black/[0.03] text-black font-semibold'
                    }`}
                    onClick={() => {
                      setFocusedKey(key);
                      focusedRef.current = r;
                    }}
                    onDoubleClick={() => openRow(r)}
                  >
                    <td className="px-3 py-1.5 text-left">{rowName(r)}</td>
                    <td className="px-3 py-1.5 text-right border-l border-gray-200">
                      {balanceLabel(r.opening)}
                    </td>
                    <td className="px-3 py-1.5 text-right border-l border-gray-200">
                      {r.txnDebit ? fmt(r.txnDebit) : ''}
                    </td>
                    <td className="px-3 py-1.5 text-right border-l border-gray-200">
                      {r.txnCredit ? fmt(r.txnCredit) : ''}
                    </td>
                    <td className="px-3 py-1.5 text-right border-l border-gray-200">
                      {balanceLabel(r.closing)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="sticky bottom-0 bg-white">
            <tr className="border-t-2 border-double border-gray-200 font-bold text-black select-none">
              <td className="px-3 py-1.5 text-left uppercase tracking-wide">Grand Total</td>
              <td className="px-3 py-1.5 text-right border-l border-gray-200">
                {balanceLabel(data.totalOpening)}
              </td>
              <td className="px-3 py-1.5 text-right border-l border-gray-200">
                {data.totalDebit ? fmt(data.totalDebit) : ''}
              </td>
              <td className="px-3 py-1.5 text-right border-l border-gray-200">
                {data.totalCredit ? fmt(data.totalCredit) : ''}
              </td>
              <td className="px-3 py-1.5 text-right border-l border-gray-200">
                {balanceLabel(data.totalClosing)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
