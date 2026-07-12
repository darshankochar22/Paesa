import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { MasterSelectionPanel, NotificationBanner, type TableColumn } from '@/components/ui';
import BudgetForm from './BudgetForm';
import type { GroupType, LedgerType, CostCentreType, BudgetType } from '@/types/api';

export default function BudgetAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [groups, setGroups] = useState<GroupType[]>([]);
  const [ledgers, setLedgers] = useState<LedgerType[]>([]);
  const [costCentres, setCostCentres] = useState<CostCentreType[]>([]);
  const [budgets, setBudgets] = useState<BudgetType[]>([]);
  const [selected, setSelected] = useState<BudgetType | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    const [g, l, cc, b] = await Promise.all([
      window.api.group.getAll(companyId),
      window.api.ledger.getAll(companyId),
      window.api.costCentre.getAll(companyId),
      window.api.budget.getAll(companyId),
    ]);
    if (g.success) setGroups(g.groups ?? []);
    if (l.success) setLedgers(l.ledgers ?? []);
    if (cc.success) setCostCentres(cc.costCentres ?? []);
    if (b.success) setBudgets(b.budgets ?? []);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = async (b: BudgetType) => {
    const res = await window.api.budget.getById(b.budget_id!);
    if (res.success) setSelected(res.budget);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete budget "${selected.name}"?`)) return;
    const res = await window.api.budget.delete(selected.budget_id!);
    if (res.success) {
      setSuccess(`Budget "${selected.name}" deleted.`);
      setSelected(null);
      load();
    } else {
      window.alert(res.error || 'Failed to delete budget.');
    }
  };

  if (!companyId) {
    return <div className="p-6 text-sm text-zinc-500">No company selected.</div>;
  }

  if (!selected) {
    const columns: TableColumn[] = [
      {
        key: 'name',
        label: 'Name',
        span: 'col-span-5',
        render: (r: BudgetType) => (
          <span className="font-bold text-zinc-900 text-xs">{r.name}</span>
        ),
      },
      {
        key: 'under',
        label: 'Under',
        span: 'col-span-4',
        render: (r: BudgetType) => {
          const parent = budgets.find((p) => p.budget_id === r.parent_id);
          return (
            <span className="text-zinc-500 font-semibold">{parent ? parent.name : 'Primary'}</span>
          );
        },
      },
      {
        key: 'period',
        label: 'Period',
        span: 'col-span-3',
        render: (r: BudgetType) => (
          <span className="text-zinc-500 font-semibold">
            {r.period_from || r.period_to ? `${r.period_from || '…'} – ${r.period_to || '…'}` : '—'}
          </span>
        ),
      },
    ];

    return (
      <div className="flex-1 flex flex-col h-full">
        {success && (
          <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
        )}
        <MasterSelectionPanel<BudgetType>
          title="Alter Budget"
          subtitle="Select Budget to Alter"
          searchPlaceholder="Search budgets by name…"
          items={budgets}
          filterFn={(b, s) => b.name.toLowerCase().includes(s.toLowerCase())}
          columns={columns}
          onSelect={handleSelect}
          onCancel={() => navigate('/master/alter')}
          onCreate={() => navigate('/master/create/budget')}
          createLabel="Create Budget"
          rowKey={(b) => b.budget_id!}
          emptyMessage="No budgets found."
        />
      </div>
    );
  }

  return (
    <BudgetForm
      mode="alter"
      companyId={companyId}
      groups={groups}
      ledgers={ledgers}
      costCentres={costCentres}
      budgets={budgets}
      initial={selected}
      onSaved={(msg) => {
        setSuccess(msg);
        setSelected(null);
        load();
      }}
      onCancel={() => navigate('/master/alter')}
      onBack={() => setSelected(null)}
      onDelete={handleDelete}
    />
  );
}
