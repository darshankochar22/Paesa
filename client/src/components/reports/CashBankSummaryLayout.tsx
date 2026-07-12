import * as React from 'react';
import { useNavigate } from 'react-router-dom';
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

interface FlattenedRow {
  id: string; // e.g., group-12, ledger-5
  name: string;
  type: 'parent-group' | 'child-group' | 'ledger';
  rawId: number;
  dr: number;
  cr: number;
  parentGroupId?: number;
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

export default function CashBankSummaryLayout() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  const [rows, setRows] = React.useState<FlattenedRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = React.useState<number>(0);
  const [tob, setTob] = React.useState<{
    totalDr: number;
    totalCr: number;
    netBalance: number;
    balanceType: string;
  } | null>(null);

  const fetchSummary = React.useCallback(async () => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Get all groups to find the targets
      const groupsRes = await (window as any).api.group.getAll(selectedCompany.company_id);
      if (!groupsRes.success || !groupsRes.groups) {
        throw new Error(groupsRes.error || 'Failed to load groups');
      }

      const allGroups = groupsRes.groups;

      // Exactly three sections: Cash-in-Hand, Bank Accounts, and a single
      // overdraft section that merges Bank OD A/c + Bank OCC A/c (treated as the
      // same per Tally's Cash/Bank Book).
      const findGroup = (names: string[]) =>
        allGroups.find((g: any) => names.includes(g.name.toLowerCase().trim()));
      const findGroups = (names: string[]) =>
        allGroups.filter((g: any) => names.includes(g.name.toLowerCase().trim()));

      const cashInHandGroup = findGroup(['cash-in-hand', 'cash in hand']);
      const bankAccountsGroup = findGroup(['bank accounts', 'bank account']);
      const overdraftGroups = findGroups([
        'bank od a/c',
        'bank od accounts',
        'bank od account',
        'bank occ a/c',
        'bank occ accounts',
        'bank occ account',
      ]);

      const sections: { label: string; groups: any[] }[] = [
        {
          label: cashInHandGroup?.name || 'Cash-in-Hand',
          groups: cashInHandGroup ? [cashInHandGroup] : [],
        },
        {
          label: bankAccountsGroup?.name || 'Bank Accounts',
          groups: bankAccountsGroup ? [bankAccountsGroup] : [],
        },
        { label: 'Bank OD A/c', groups: overdraftGroups },
      ];

      const flatList: FlattenedRow[] = [];

      for (const section of sections) {
        if (section.groups.length === 0) continue;

        // Aggregate across every group in the section (the OD section spans both
        // Bank OD A/c and Bank OCC A/c). Totals are gross (sum of child balances),
        // matching Tally.
        let totalDr = 0;
        let totalCr = 0;
        const childRows: FlattenedRow[] = [];
        const ledgerRows: FlattenedRow[] = [];

        for (const g of section.groups) {
          const gRes: GroupSummaryResponse = await (window as any).api.report.groupSummaryDrilldown(
            selectedCompany.company_id,
            activeFY.fy_id,
            g.group_id,
          );
          if (!gRes.success) continue;

          gRes.childGroups.forEach((cg) => {
            totalDr += cg.dr;
            totalCr += cg.cr;
            childRows.push({
              id: `group-${cg.group_id}`,
              name: cg.group_name,
              type: 'child-group',
              rawId: cg.group_id,
              dr: cg.dr,
              cr: cg.cr,
            });
          });
          gRes.ledgers.forEach((l) => {
            totalDr += l.dr;
            totalCr += l.cr;
            ledgerRows.push({
              id: `ledger-${l.ledger_id}`,
              name: l.ledger_name,
              type: 'ledger',
              rawId: l.ledger_id,
              dr: l.dr,
              cr: l.cr,
            });
          });
        }

        // Only display the section if it has transactions/balances
        if (totalDr === 0 && totalCr === 0) continue;

        const parentGroup = section.groups[0];
        flatList.push({
          id: `group-${parentGroup.group_id}`,
          name: section.label,
          type: 'parent-group',
          rawId: parentGroup.group_id,
          dr: totalDr,
          cr: totalCr,
        });
        childRows.forEach((r) => flatList.push({ ...r, parentGroupId: parentGroup.group_id }));
        ledgerRows.forEach((r) => flatList.push({ ...r, parentGroupId: parentGroup.group_id }));
      }

      setRows(flatList);
      setFocusedIndex(0);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.company_id, activeFY?.fy_id]);

  React.useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Company-wide Total Opening Balance (same source as the Ledger master screen).
  React.useEffect(() => {
    if (!selectedCompany?.company_id) return;
    (window as any).api.ledger
      .getTotalOpeningBalance(selectedCompany.company_id)
      .then((res: any) => {
        if (res?.success) {
          setTob({
            totalDr: res.totalDr,
            totalCr: res.totalCr,
            netBalance: res.netBalance,
            balanceType: res.balanceType,
          });
        }
      });
  }, [selectedCompany?.company_id]);

  const handleDrilldown = React.useCallback(
    (row: FlattenedRow) => {
      if (row.type === 'parent-group' || row.type === 'child-group') {
        navigate(`/reports/accounts/group-summary/${row.rawId}`);
      } else {
        navigate(`/reports/accounts/ledger-summary/${row.rawId}`);
      }
    },
    [navigate],
  );

  React.useEffect(() => {
    if (rows.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in form inputs
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(rows.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeRow = rows[focusedIndex];
        if (activeRow) {
          handleDrilldown(activeRow);
        }
      } else if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rows, focusedIndex, handleDrilldown, navigate]);

  // Calculate grand totals for Cash/Bank summary
  const grandTotalDr = React.useMemo(() => {
    return rows.filter((r) => r.type === 'parent-group').reduce((sum, r) => sum + r.dr, 0);
  }, [rows]);

  const grandTotalCr = React.useMemo(() => {
    return rows.filter((r) => r.type === 'parent-group').reduce((sum, r) => sum + r.cr, 0);
  }, [rows]);

  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const periodLabel = activeFY
    ? `${formatDateLabel(activeFY.start_date)} to ${formatDateLabel(activeFY.end_date)}`
    : '';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white font-mono text-xs text-black">
        Loading Cash/Bank Summary...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white font-mono text-xs text-black px-8 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      {/* Total Opening Balance — company-wide, like the Ledger master screen */}
      <div className="flex justify-end px-4 pt-2 pb-1 shrink-0">
        <div className="w-52 border border-gray-200 text-[11px]">
          <div className="text-center font-bold border-b border-gray-200 py-0.5">
            Total Opening Balance
          </div>
          <div className="px-2 py-1">
            <div className="text-right tabular-nums font-semibold">
              {tob ? `${fmtTotal(tob.totalDr)} Dr` : '0.00 Dr'}
            </div>
            <div className="text-right tabular-nums font-semibold">
              {tob ? `${fmtTotal(tob.totalCr)} Cr` : '0.00 Cr'}
            </div>
            <div className="text-[10px] italic text-black border-t border-gray-200 mt-0.5 pt-0.5">
              Difference
            </div>
            <div className="text-right tabular-nums font-bold">
              {tob ? `${fmtTotal(tob.netBalance)} ${tob.balanceType}` : '—'}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black select-none">
            <tr>
              <th className="px-4 py-2 text-left font-bold" rowSpan={3}>
                Particulars
              </th>
              <th className="px-4 py-0.5 text-center font-bold border-b border-gray-200">
                {selectedCompany?.name ?? ''}
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-black italic">
                  No cash or bank accounts found with transactions.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const isFocused = idx === focusedIndex;
                const isParent = row.type === 'parent-group';
                const isChildGroup = row.type === 'child-group';

                return (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-200 cursor-pointer select-none transition-colors ${
                      isFocused
                        ? 'bg-black/[0.06] text-black font-bold'
                        : isParent
                          ? 'hover:bg-black/[0.03] text-black font-bold text-xs'
                          : isChildGroup
                            ? 'hover:bg-black/[0.03] text-black font-semibold'
                            : 'hover:bg-black/[0.03] text-black'
                    }`}
                    onClick={() => setFocusedIndex(idx)}
                    onDoubleClick={() => handleDrilldown(row)}
                  >
                    <td
                      className={`px-4 py-1.5 text-left ${isChildGroup ? 'pl-8' : !isParent ? 'pl-10' : ''}`}
                    >
                      {row.name}
                    </td>
                    <td className="text-right">
                      <div className="flex w-full justify-end font-mono">
                        <span className="w-32 text-right pr-4 border-r border-gray-200">
                          {row.dr !== 0 ? fmt(row.dr) : ''}
                        </span>
                        <span className="w-32 text-right pr-4">
                          {row.cr !== 0 ? fmt(row.cr) : ''}
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
            {grandTotalDr !== 0 ? fmtTotal(grandTotalDr) : ''}
          </span>
          <span className="w-32 text-right pr-4">
            {grandTotalCr !== 0 ? fmtTotal(grandTotalCr) : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
