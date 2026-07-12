import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { MasterSelectionPanel, NotificationBanner, type TableColumn } from '@/components/ui';
import ExciseDutyClassificationForm from './ExciseDutyClassificationForm';
import type { ExciseDutyClassificationType } from '@/types/api';

export default function ExciseDutyClassificationAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [classifications, setClassifications] = useState<ExciseDutyClassificationType[]>([]);
  const [selected, setSelected] = useState<ExciseDutyClassificationType | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    const res = await window.api.exciseDutyClassification.getAll(companyId);
    if (res.success) setClassifications(res.classifications ?? []);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = async (c: ExciseDutyClassificationType) => {
    const res = await window.api.exciseDutyClassification.getById(c.excise_duty_classification_id!);
    if (res.success) setSelected(res.classification);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete excise duty classification "${selected.name}"?`)) return;
    const res = await window.api.exciseDutyClassification.delete(
      selected.excise_duty_classification_id!,
    );
    if (res.success) {
      setSuccess(`Excise Duty Classification "${selected.name}" deleted.`);
      setSelected(null);
      load();
    } else {
      window.alert(res.error || 'Failed to delete excise duty classification.');
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
        render: (r: ExciseDutyClassificationType) => (
          <span className="font-bold text-zinc-900 text-xs">{r.name}</span>
        ),
      },
      {
        key: 'duty_code',
        label: 'Duty code',
        span: 'col-span-4',
        render: (r: ExciseDutyClassificationType) => (
          <span className="text-zinc-500 font-semibold">{r.duty_code || '—'}</span>
        ),
      },
      {
        key: 'calculation_methods',
        label: 'Calculation method',
        span: 'col-span-3',
        render: (r: ExciseDutyClassificationType) => (
          <span className="text-zinc-500 font-semibold">
            {r.calculation_methods?.join(', ') || '—'}
          </span>
        ),
      },
    ];

    return (
      <div className="flex-1 flex flex-col h-full">
        {success && (
          <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
        )}
        <MasterSelectionPanel<ExciseDutyClassificationType>
          title="Alter Excise Duty Classification"
          subtitle="Select Excise Duty Classification to Alter"
          searchPlaceholder="Search classifications by name…"
          items={classifications}
          filterFn={(c, q) =>
            c.name.toLowerCase().includes(q.toLowerCase()) ||
            (c.duty_code ?? '').toLowerCase().includes(q.toLowerCase())
          }
          columns={columns}
          onSelect={handleSelect}
          onCancel={() => navigate('/master/alter')}
          onCreate={() => navigate('/master/create/excise-duty-classification')}
          createLabel="Create Excise Duty Classification"
          rowKey={(c) => c.excise_duty_classification_id!}
          emptyMessage="No excise duty classifications found."
        />
      </div>
    );
  }

  return (
    <ExciseDutyClassificationForm
      mode="alter"
      companyId={companyId}
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
