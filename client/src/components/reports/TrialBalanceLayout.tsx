import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import DataTable, { type TableColumn } from '@/components/ui/DataTable';
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
}

interface TBRow {
  id: number | string;
  name: string;
  dr: number;
  cr: number;
  isDiff?: boolean;
  isTotal?: boolean;
}

const COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Particulars', span: 'col-span-6', align: 'left' },
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
  const [diffDr, setDiffDr] = React.useState<number>(0);
  const [diffCr, setDiffCr] = React.useState<number>(0);

  React.useEffect(() => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    Promise.all([
      (window as any).api.report.trialBalance(selectedCompany.company_id, activeFY.fy_id),
      (window as any).api.ledger.getAll(selectedCompany.company_id),
    ])
      .then(([tbRes, ledgerRes]: [any, any]) => {
        if (tbRes?.success) setData(tbRes);
        else {
          setError(tbRes?.error || 'Failed to load trial balance.');
          return;
        }

        if (ledgerRes?.success && ledgerRes.ledgers) {
          let sumOpeningDebit = 0;
          let sumOpeningCredit = 0;
          ledgerRes.ledgers.forEach((l: any) => {
            const amt = l.opening_balance || 0;
            if (l.opening_balance_type === 'Dr') sumOpeningDebit += amt;
            else if (l.opening_balance_type === 'Cr') sumOpeningCredit += amt;
            else if (amt > 0) sumOpeningDebit += amt;
            else sumOpeningCredit += Math.abs(amt);
          });
          if (sumOpeningDebit !== sumOpeningCredit) {
            const diff = Math.abs(sumOpeningDebit - sumOpeningCredit);
            if (sumOpeningDebit > sumOpeningCredit) setDiffCr(diff);
            else setDiffDr(diff);
          } else {
            setDiffDr(0);
            setDiffCr(0);
          }
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedCompany?.company_id, activeFY?.fy_id]);

  const openGroup = React.useCallback(
    (groupId: number) => navigate(`/reports/accounts/group-summary/${groupId}`),
    [navigate],
  );

  const rows = React.useMemo<TBRow[]>(() => {
    if (!data) return [];
    const list: TBRow[] = data.groups.map((g) => ({
      id: g.group_id,
      name: g.group_name,
      dr: g.dr,
      cr: g.cr,
    }));
    if (diffDr > 0 || diffCr > 0) {
      list.push({
        id: 'diff',
        name: 'Difference in opening balances',
        dr: diffDr,
        cr: diffCr,
        isDiff: true,
      });
    }
    list.push({
      id: '__total',
      name: 'Grand Total',
      dr: (data.grandTotalDr || 0) + diffDr,
      cr: (data.grandTotalCr || 0) + diffCr,
      isTotal: true,
    });
    return list;
  }, [data, diffDr, diffCr]);

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
      rowClassName={(r: TBRow) => (r.isDiff ? 'text-black italic' : '')}
      onRowActivate={(r: TBRow) => {
        if (!r.isDiff && !r.isTotal) openGroup(r.id as number);
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
