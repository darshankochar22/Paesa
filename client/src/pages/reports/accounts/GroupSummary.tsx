import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';

interface ChildGroup {
  group_id: number;
  group_name: string;
  dr: number;
  cr: number;
}

interface LedgerRow {
  ledger_id: number;
  ledger_name: string;
  dr: number;
  cr: number;
}

interface GroupSummaryResponse {
  success: boolean;
  group_name: string;
  childGroups: ChildGroup[];
  ledgers: LedgerRow[];
  totalDr: number;
  totalCr: number;
  error?: string;
}

const fmt = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function GroupSummaryLayout() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const { selectedCompany, activeFY } = useCompany();

  const [data, setData] = React.useState<GroupSummaryResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [focusedKey, setFocusedKey] = React.useState<string | null>(null);
  const focusedRef = React.useRef<{ group?: ChildGroup; ledger?: LedgerRow } | null>(null);

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
      .groupSummaryDrilldown(selectedCompany.company_id, activeFY.fy_id, Number(groupId))
      .then((res: GroupSummaryResponse) => {
        if (res.success) setData(res);
        else setError(res.error || 'Failed to load group summary');
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupId, selectedCompany?.company_id, activeFY?.fy_id]);

  const openChildGroup = React.useCallback(
    (g: ChildGroup) => navigate(`/reports/accounts/group-summary/${g.group_id}`),
    [navigate],
  );
  const openLedger = React.useCallback(
    (l: LedgerRow) => {
      if (l.ledger_id < 0) return; // virtual row (e.g. Opening Stock) — not drillable
      navigate(`/reports/accounts/ledger-summary/${l.ledger_id}`);
    },
    [navigate],
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!focusedRef.current) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedRef.current.group) openChildGroup(focusedRef.current.group);
        else if (focusedRef.current.ledger) openLedger(focusedRef.current.ledger);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openChildGroup, openLedger, navigate]);

  if (loading) {
    return <div className="p-4 text-xs font-mono text-black">Loading...</div>;
  }
  if (error) {
    return <div className="p-4 text-xs font-mono text-black">{error}</div>;
  }
  if (!data) return null;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white font-mono">
      {/* Header bar, matches TallyPrime "Group Summary" title strip */}
      <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between select-none">
        <button onClick={() => navigate(-1)} className="text-[11px] hover:underline">
          ← Back
        </button>
        <span className="text-[12px] font-bold">Group Summary</span>
        <span className="text-[11px]">{selectedCompany?.name ?? ''}</span>
      </div>

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
          <div className="flex justify-end gap-6 mt-1 text-[10px] font-bold text-black border-t border-gray-200 pt-1">
            <span>Debit</span>
            <span>Credit</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse font-mono text-[11px]">
          <tbody>
            {data.childGroups.length === 0 && data.ledgers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-black italic">
                  No entries.
                </td>
              </tr>
            ) : (
              <>
                {data.childGroups.map((g) => {
                  const key = `g-${g.group_id}`;
                  const isFocused = focusedKey === key;
                  return (
                    <tr
                      key={key}
                      className={`border-b border-gray-200 cursor-pointer select-none ${
                        isFocused
                          ? 'bg-black/[0.06] text-black font-bold'
                          : 'hover:bg-black/[0.03] text-black font-semibold'
                      }`}
                      onClick={() => {
                        setFocusedKey(key);
                        focusedRef.current = { group: g };
                      }}
                      onDoubleClick={() => openChildGroup(g)}
                    >
                      <td className="px-3 py-1.5 text-left">{g.group_name}</td>
                      <td className="px-3 py-1.5 text-right w-32">{g.dr ? fmt(g.dr) : ''}</td>
                      <td className="px-3 py-1.5 text-right w-32">{g.cr ? fmt(g.cr) : ''}</td>
                    </tr>
                  );
                })}

                {data.ledgers.map((l) => {
                  const key = `l-${l.ledger_id}`;
                  const isFocused = focusedKey === key;
                  return (
                    <tr
                      key={key}
                      className={`border-b border-gray-200 cursor-pointer select-none ${
                        isFocused
                          ? 'bg-black/[0.06] text-black font-bold'
                          : 'hover:bg-black/[0.03] text-black font-semibold'
                      }`}
                      onClick={() => {
                        setFocusedKey(key);
                        focusedRef.current = { ledger: l };
                      }}
                      onDoubleClick={() => openLedger(l)}
                    >
                      <td className="px-3 py-1.5 text-left">{l.ledger_name}</td>
                      <td className="px-3 py-1.5 text-right w-32">{l.dr ? fmt(l.dr) : ''}</td>
                      <td className="px-3 py-1.5 text-right w-32">{l.cr ? fmt(l.cr) : ''}</td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-double border-gray-200 bg-white px-3 py-1.5 flex justify-between font-mono text-[11px] font-bold text-black select-none">
        <span>Grand Total</span>
        <div className="flex gap-6">
          <span className="w-32 text-right">{fmt(data.totalDr)}</span>
          <span className="w-32 text-right">{fmt(data.totalCr)}</span>
        </div>
      </div>
    </div>
  );
}
