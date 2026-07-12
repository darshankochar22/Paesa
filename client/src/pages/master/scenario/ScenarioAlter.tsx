import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { MasterSelectionPanel, NotificationBanner, type TableColumn } from '@/components/ui';
import ScenarioForm from './ScenarioForm';
import type { VoucherTypeType, ScenarioType } from '@/types/api';

export default function ScenarioAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [voucherTypes, setVoucherTypes] = useState<VoucherTypeType[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioType[]>([]);
  const [selected, setSelected] = useState<ScenarioType | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    const [vt, s] = await Promise.all([
      window.api.voucherType.getAll(companyId),
      window.api.scenario.getAll(companyId),
    ]);
    if (vt.success) setVoucherTypes(vt.voucherTypes ?? []);
    if (s.success) setScenarios(s.scenarios ?? []);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = async (s: ScenarioType) => {
    const res = await window.api.scenario.getById(s.scenario_id!);
    if (res.success) setSelected(res.scenario);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete scenario "${selected.name}"?`)) return;
    const res = await window.api.scenario.delete(selected.scenario_id!);
    if (res.success) {
      setSuccess(`Scenario "${selected.name}" deleted.`);
      setSelected(null);
      load();
    } else {
      window.alert(res.error || 'Failed to delete scenario.');
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
        span: 'col-span-7',
        render: (r: ScenarioType) => (
          <span className="font-bold text-zinc-900 text-xs">{r.name}</span>
        ),
      },
      {
        key: 'actuals',
        label: 'Include actuals',
        span: 'col-span-5',
        render: (r: ScenarioType) => (
          <span className="text-zinc-500 font-semibold">{r.include_actuals ? 'Yes' : 'No'}</span>
        ),
      },
    ];

    return (
      <div className="flex-1 flex flex-col h-full">
        {success && (
          <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
        )}
        <MasterSelectionPanel<ScenarioType>
          title="Alter Scenario"
          subtitle="Select Scenario to Alter"
          searchPlaceholder="Search scenarios by name…"
          items={scenarios}
          filterFn={(s, q) => s.name.toLowerCase().includes(q.toLowerCase())}
          columns={columns}
          onSelect={handleSelect}
          onCancel={() => navigate('/master/alter')}
          onCreate={() => navigate('/master/create/scenario')}
          createLabel="Create Scenario"
          rowKey={(s) => s.scenario_id!}
          emptyMessage="No scenarios found."
        />
      </div>
    );
  }

  return (
    <ScenarioForm
      mode="alter"
      companyId={companyId}
      voucherTypes={voucherTypes}
      scenarios={scenarios}
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
