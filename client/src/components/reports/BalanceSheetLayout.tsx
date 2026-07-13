import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import TwoColumnReport from '@/components/ui/TwoColumnReport';
import { fmtAbs } from '@/lib/format';

interface GroupRow {
  group_id: number;
  group_name: string;
  nature?: string;
  balance: number;
  ledgers: { ledger_id: number; ledger_name: string; balance: number }[];
  childGroups: GroupRow[];
  isPnL?: boolean;
  isDifference?: boolean;
  pnlBreakup?: { openingBalance: number; currentPeriod: number };
}

interface BSData {
  assets: GroupRow[];
  liabilities: GroupRow[];
  totalAssets: number;
  totalLiabilities: number;
  netProfit?: number;
}

export function BalanceSheetLayout() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();

  const [data, setData] = React.useState<BSData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [focusedId, setFocusedId] = React.useState<string | null>(null);
  const focusedGroupRef = React.useRef<GroupRow | null>(null);

  React.useEffect(() => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    (window as any).api.report
      .balanceSheet(selectedCompany.company_id, activeFY.fy_id)
      .then((res: any) => {
        if (res?.success) setData(res);
        else setError(res?.error || 'Failed to load.');
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedCompany?.company_id, activeFY?.fy_id]);

  const openGroup = React.useCallback(
    (group: GroupRow) => {
      // The synthetic "Profit & Loss A/c" row has no real group_id (-1); drill it
      // into the P&L report instead of an empty group-summary page.
      if (group.isPnL) {
        navigate('/reports/accounts/profit-loss');
        return;
      }
      // The "Difference in opening balances" line is a balancing figure, not a group.
      if (group.isDifference) return;
      navigate(`/reports/accounts/group-summary/${group.group_id}`);
    },
    [navigate],
  );

  const handleFocus = React.useCallback((key: string, group: GroupRow) => {
    setFocusedId(key);
    focusedGroupRef.current = group;
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!focusedGroupRef.current) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        openGroup(focusedGroupRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openGroup]);

  // A Balance Sheet is a snapshot as at the closing date (period end), not the start.
  const periodLabel = activeFY ? `as at ${activeFY.end_date ?? activeFY.start_date}` : '';

  const renderRow = React.useCallback(
    (group: GroupRow, side: 'left' | 'right') => {
      const key = `${side === 'left' ? 'L' : 'A'}-g-${group.group_id}`;
      const isFocused = focusedId === key;
      return (
        <>
          <div
            onClick={() => handleFocus(key, group)}
            onDoubleClick={() => openGroup(group)}
            className={`flex justify-between items-center px-3 py-1.5 border-b border-gray-200 cursor-pointer select-none transition-colors ${
              isFocused
                ? 'bg-black/[0.06] text-black font-bold'
                : group.isDifference
                  ? 'hover:bg-black/[0.03] text-black italic font-normal'
                  : 'hover:bg-black/[0.03] text-black font-semibold'
            }`}
          >
            <span className="text-left">
              {group.group_name}
              {group.isPnL && (
                <span className="ml-2 text-[9px] text-black italic font-normal">
                  (Net {(group.balance ?? 0) >= 0 ? 'Profit' : 'Loss'})
                </span>
              )}
            </span>
            <span className="text-right whitespace-nowrap font-mono">₹{fmtAbs(group.balance)}</span>
          </div>

          {group.isPnL && group.pnlBreakup && (
            <>
              <div className="flex justify-between px-3 py-1 pl-8 text-black italic select-none text-[10px]">
                <span>Opening Balance</span>
                <span className="font-mono">
                  {group.pnlBreakup.openingBalance !== 0
                    ? `₹${fmtAbs(group.pnlBreakup.openingBalance)}`
                    : ''}
                </span>
              </div>
              <div className="flex justify-between px-3 py-1 pl-8 text-black italic select-none text-[10px]">
                <span>Current Period</span>
                <span className="font-mono">₹{fmtAbs(group.pnlBreakup.currentPeriod)}</span>
              </div>
            </>
          )}
        </>
      );
    },
    [focusedId, handleFocus, openGroup],
  );

  if (loading) return <Centered>Loading Balance Sheet...</Centered>;
  if (error) return <Centered>{error}</Centered>;
  if (!data) return <Centered>No data available.</Centered>;

  return (
    <TwoColumnReport<GroupRow>
      periodLabel={periodLabel}
      centerLabel={selectedCompany?.name}
      left={{ title: 'Liabilities', rows: data.liabilities, total: data.totalLiabilities }}
      right={{ title: 'Assets', rows: data.assets, total: data.totalAssets }}
      renderRow={renderRow}
      rowKey={(g) => g.group_id}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center text-black font-mono text-xs px-8 text-center">
      {children}
    </div>
  );
}
