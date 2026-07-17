import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import DataTable, { type TableColumn } from '@/components/ui/DataTable';
import { useShortcuts } from '@/lib/shortcuts';
import { fmt } from '@/lib/format';

interface TBGroup {
  group_id: number;
  group_name: string;
  nature?: string;
  dr: number;
  cr: number;
}

interface TBData {
  groups: TBGroup[];
  grandTotalDr: number;
  grandTotalCr: number;
  diff?: { dr: number; cr: number };
}

// One primary group's direct children (from groupSummaryDrilldown), used to
// render the Alt+F1 "Detailed" inline expansion.
interface GroupDetail {
  childGroups: { group_id: number; group_name: string; dr: number; cr: number }[];
  ledgers: { ledger_id: number; ledger_name: string; dr: number; cr: number }[];
}

type TBKind = 'group' | 'child-group' | 'ledger' | 'diff' | 'total';

interface TBRow {
  id: number | string;
  name: string;
  dr: number;
  cr: number;
  kind: TBKind;
  groupId?: number;
  ledgerId?: number;
}

const COLUMNS: TableColumn[] = [
  {
    key: 'name',
    label: 'Particulars',
    span: 'col-span-6',
    align: 'left',
    render: (r: TBRow) => (
      <span
        className={
          r.kind === 'ledger' || r.kind === 'child-group'
            ? 'pl-4 italic'
            : r.kind === 'group'
              ? 'font-bold'
              : ''
        }
      >
        {r.name}
      </span>
    ),
  },
  {
    key: 'dr',
    label: 'Debit',
    span: 'col-span-3',
    align: 'right',
    render: (r: TBRow) => fmt(r.dr),
  },
  {
    key: 'cr',
    label: 'Credit',
    span: 'col-span-3',
    align: 'right',
    render: (r: TBRow) => fmt(r.cr),
  },
];

export function TrialBalanceLayout() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  const [data, setData] = React.useState<TBData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Alt+F1 "Detailed" mode: expand every primary group to its direct children
  // (sub-groups + ledgers) inline, matching TallyPrime's detailed Trial Balance.
  const [detailed, setDetailed] = React.useState(false);
  const [detailMap, setDetailMap] = React.useState<Record<number, GroupDetail>>({});

  useShortcuts([{ keys: 'Alt+F1', handler: () => setDetailed((d) => !d) }]);

  // "Difference in opening balances" is the balancing figure computed by the
  // backend (it accounts for opening stock too), not re-derived on the client.
  const diffDr = data?.diff?.dr ?? 0;
  const diffCr = data?.diff?.cr ?? 0;

  React.useEffect(() => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setDetailMap({}); // stale detail belongs to the previous company/FY

    (window as any).api.report
      .trialBalance(selectedCompany.company_id, activeFY.fy_id)
      .then((tbRes: any) => {
        if (tbRes?.success) setData(tbRes);
        else setError(tbRes?.error || 'Failed to load trial balance.');
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedCompany?.company_id, activeFY?.fy_id]);

  // Lazily fetch each primary group's direct children the first time Detailed
  // is turned on. Reuses the existing group-summary drilldown handler.
  React.useEffect(() => {
    if (!detailed || !data || !selectedCompany?.company_id || !activeFY?.fy_id) return;
    if (Object.keys(detailMap).length > 0) return; // already loaded for this FY
    let cancelled = false;
    Promise.all(
      data.groups.map((g) =>
        (window as any).api.report
          .groupSummaryDrilldown(selectedCompany.company_id, activeFY.fy_id, g.group_id)
          .then((res: any) => ({ id: g.group_id, res }))
          .catch(() => ({ id: g.group_id, res: null })),
      ),
    ).then((results: { id: number; res: any }[]) => {
      if (cancelled) return;
      const map: Record<number, GroupDetail> = {};
      for (const { id, res } of results) {
        if (res?.success)
          map[id] = { childGroups: res.childGroups || [], ledgers: res.ledgers || [] };
      }
      setDetailMap(map);
    });
    return () => {
      cancelled = true;
    };
  }, [detailed, data, selectedCompany?.company_id, activeFY?.fy_id, detailMap]);

  const openGroup = React.useCallback(
    (groupId: number) => navigate(`/reports/accounts/group-summary/${groupId}`),
    [navigate],
  );

  const rows = React.useMemo<TBRow[]>(() => {
    if (!data) return [];
    const list: TBRow[] = [];
    for (const g of data.groups) {
      list.push({
        id: `g-${g.group_id}`,
        name: g.group_name,
        dr: g.dr,
        cr: g.cr,
        kind: 'group',
        groupId: g.group_id,
      });
      if (detailed) {
        const d = detailMap[g.group_id];
        d?.childGroups.forEach((cg) =>
          list.push({
            id: `cg-${cg.group_id}`,
            name: cg.group_name,
            dr: cg.dr,
            cr: cg.cr,
            kind: 'child-group',
            groupId: cg.group_id,
          }),
        );
        d?.ledgers.forEach((l) =>
          list.push({
            id: `l-${l.ledger_id}`,
            name: l.ledger_name,
            dr: l.dr,
            cr: l.cr,
            kind: 'ledger',
            ledgerId: l.ledger_id,
          }),
        );
      }
    }
    if (diffDr > 0 || diffCr > 0) {
      list.push({
        id: 'diff',
        name: 'Difference in opening balances',
        dr: diffDr,
        cr: diffCr,
        kind: 'diff',
      });
    }
    list.push({
      id: '__total',
      name: 'Grand Total',
      dr: (data.grandTotalDr || 0) + diffDr,
      cr: (data.grandTotalCr || 0) + diffCr,
      kind: 'total',
    });
    return list;
  }, [data, detailed, detailMap, diffDr, diffCr]);

  if (loading) return <Centered>Loading Trial Balance...</Centered>;
  if (error) return <Centered>{error}</Centered>;
  if (!data) return <Centered>No data available.</Centered>;

  return (
    <DataTable
      variant="report"
      columns={COLUMNS}
      rows={rows}
      rowKey={(r: TBRow) => r.id}
      emptyMessage="No groups found."
      getRowVariant={(r: TBRow) =>
        r.kind === 'total' ? 'total' : r.kind === 'group' && detailed ? 'header' : 'default'
      }
      rowClassName={(r: TBRow) => (r.kind === 'diff' ? 'text-black italic' : '')}
      onRowActivate={(r: TBRow) => {
        if (r.kind === 'group' || r.kind === 'child-group') openGroup(r.groupId as number);
        else if (r.kind === 'ledger') navigate(`/reports/accounts/ledger-summary/${r.ledgerId}`);
      }}
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
