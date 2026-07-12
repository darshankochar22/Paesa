import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { NotificationBanner } from '@/components/ui';
import BudgetForm from './BudgetForm';
import type { GroupType, LedgerType, CostCentreType, BudgetType } from '@/types/api';

export default function BudgetCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [groups, setGroups] = useState<GroupType[]>([]);
  const [ledgers, setLedgers] = useState<LedgerType[]>([]);
  const [costCentres, setCostCentres] = useState<CostCentreType[]>([]);
  const [budgets, setBudgets] = useState<BudgetType[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

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

  if (!companyId) {
    return <div className="p-6 text-sm text-zinc-500">No company selected.</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}
      <BudgetForm
        key={formKey}
        mode="create"
        companyId={companyId}
        groups={groups}
        ledgers={ledgers}
        costCentres={costCentres}
        budgets={budgets}
        onSaved={(msg) => {
          setSuccess(msg);
          load();
          setFormKey((k) => k + 1); // reset the form for the next entry
        }}
        onCancel={() => navigate('/master/create')}
        onBack={() => navigate('/master/create')}
      />
    </div>
  );
}
