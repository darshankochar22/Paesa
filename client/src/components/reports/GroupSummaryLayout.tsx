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

const fmt = (val: number) =>
  val === 0
    ? ''
    : new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);

const fmtTotal = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

export default function GroupSummaryLayout() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const { selectedCompany, activeFY } = useCompany();

  const [data, setData] = React.useState<GroupSummaryResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Keyboard navigation focus index
  const [focusedIndex, setFocusedIndex] = React.useState<number>(0);

  // Flat list of items for arrow key navigation
  const flatItems = React.useMemo(() => {
    if (!data) return [];
    const list: Array<
      | { type: 'group'; id: number; name: string; dr: number; cr: number }
      | { type: 'ledger'; id: number; name: string; dr: number; cr: number }
    > = [];
    data.childGroups.forEach((cg) => {
      list.push({ type: 'group', id: cg.group_id, name: cg.group_name, dr: cg.dr, cr: cg.cr });
    });
    data.ledgers.forEach((l) => {
      list.push({ type: 'ledger', id: l.ledger_id, name: l.ledger_name, dr: l.dr, cr: l.cr });
    });
    return list;
  }, [data]);

  React.useEffect(() => {
    if (!groupId || !selectedCompany?.company_id || !activeFY?.fy_id) return;
    setLoading(true);
    setError(null);

    const callApi = (window as any).api?.report?.groupSummaryDrilldown;
    if (!callApi) {
      // Mock data fallback matching Moly Jain screenshots!
      setTimeout(() => {
        const id = Number(groupId);
        let mockRes: GroupSummaryResponse;
        if (id === 1 || id === -1) {
          // Reserves & Surplus
          mockRes = {
            success: true,
            group_name: 'Reserves & Surplus',
            childGroups: [],
            ledgers: [{ ledger_id: 1, ledger_name: 'General Reserve', dr: 0, cr: 10000 }],
            totalDr: 0,
            totalCr: 10000,
          };
        } else if (id === 2 || id === 101) {
          // Capital Account
          mockRes = {
            success: true,
            group_name: 'Capital Account',
            childGroups: [{ group_id: 1, group_name: 'Reserves & Surplus', dr: 0, cr: 10000 }],
            ledgers: [{ ledger_id: 2, ledger_name: "Owner's Capital Account", dr: 0, cr: 500000 }],
            totalDr: 0,
            totalCr: 510000,
          };
        } else {
          mockRes = {
            success: true,
            group_name: `Group Summary (ID: ${groupId})`,
            childGroups: [],
            ledgers: [
              { ledger_id: id * 10, ledger_name: 'Mock Ledger A', dr: 0, cr: 25000 },
              { ledger_id: id * 10 + 1, ledger_name: 'Mock Ledger B', dr: 5000, cr: 0 },
            ],
            totalDr: 5000,
            totalCr: 25000,
          };
        }
        setData(mockRes);
        setFocusedIndex(0);
        setLoading(false);
      }, 100);
      return;
    }

    callApi(selectedCompany.company_id, activeFY.fy_id, Number(groupId))
      .then((res: GroupSummaryResponse) => {
        if (res.success) {
          setData(res);
          setFocusedIndex(0);
        } else {
          setError(res.error || 'Failed to load group summary');
        }
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupId, selectedCompany?.company_id, activeFY?.fy_id]);

  const handleDrilldown = React.useCallback(
    (item: (typeof flatItems)[0]) => {
      if (item.type === 'group') {
        navigate(`/reports/accounts/group-summary/${item.id}`);
      } else {
        navigate(`/reports/accounts/ledger-summary/${item.id}`);
      }
    },
    [navigate],
  );

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside form inputs
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(flatItems.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeItem = flatItems[focusedIndex];
        if (activeItem) {
          handleDrilldown(activeItem);
        }
      } else if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flatItems, focusedIndex, handleDrilldown, navigate]);

  const periodLabel = activeFY ? `For ${activeFY.start_date}` : '';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        Loading Group Summary...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs px-8 text-center">
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        No data available.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black select-none">
            <tr>
              <th className="px-4 py-2 text-left font-bold" rowSpan={3}>
                Particulars
              </th>
              <th className="px-4 py-0.5 text-center font-bold border-b border-gray-200">
                {data.group_name} / {selectedCompany?.name || 'No Company'}
              </th>
            </tr>
            <tr>
              <th className="px-4 py-0.5 text-center font-normal italic text-black">
                {periodLabel}
              </th>
            </tr>
            <tr>
              <th className="px-4 py-0.5 text-center font-bold border-t border-gray-200">
                <div className="border-b border-gray-200 pb-0.5 mb-0.5">Closing Balance</div>
                <div className="flex w-full">
                  <span className="w-32 text-right pr-4 border-r border-gray-200">Debit</span>
                  <span className="w-32 text-right pr-4">Credit</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {flatItems.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-black italic">
                  No records found under this group.
                </td>
              </tr>
            ) : (
              flatItems.map((item, idx) => {
                const isFocused = idx === focusedIndex;
                return (
                  <tr
                    key={`${item.type}-${item.id}`}
                    className={`border-b border-gray-200 cursor-pointer select-none transition-colors ${
                      isFocused
                        ? 'bg-black/[0.06] text-black font-bold'
                        : item.type === 'group'
                          ? 'hover:bg-black/[0.03] text-black font-semibold'
                          : 'hover:bg-black/[0.03] text-black'
                    }`}
                    onClick={() => setFocusedIndex(idx)}
                    onDoubleClick={() => handleDrilldown(item)}
                  >
                    <td className="px-4 py-1.5 text-left">
                      {item.type === 'group' ? (
                        <span className="mr-1.5 text-black text-[9px]">▶</span>
                      ) : (
                        <span className="mr-3 text-black">–</span>
                      )}
                      {item.name}
                    </td>
                    <td className="text-right">
                      <div className="flex w-full justify-end font-mono">
                        <span className="w-32 text-right pr-4 border-r border-gray-200">
                          {item.dr !== 0 ? fmt(item.dr) : ''}
                        </span>
                        <span className="w-32 text-right pr-4">
                          {item.cr !== 0 ? fmt(item.cr) : ''}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grand Total Bar */}
      <div className="border-t-2 border-double border-gray-200 bg-white px-4 py-1.5 flex justify-between font-mono text-[11px] font-bold text-black select-none">
        <span className="flex-1">Grand Total</span>
        <div className="flex justify-end pr-4">
          <span className="w-32 text-right pr-4 border-r border-gray-200">
            {data.totalDr !== 0 ? fmtTotal(data.totalDr) : ''}
          </span>
          <span className="w-32 text-right pr-4">
            {data.totalCr !== 0 ? fmtTotal(data.totalCr) : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
