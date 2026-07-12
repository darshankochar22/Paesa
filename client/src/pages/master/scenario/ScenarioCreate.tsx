import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { NotificationBanner } from '@/components/ui';
import ScenarioForm from './ScenarioForm';
import type { VoucherTypeType, ScenarioType } from '@/types/api';

export default function ScenarioCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [voucherTypes, setVoucherTypes] = useState<VoucherTypeType[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioType[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

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

  if (!companyId) {
    return <div className="p-6 text-sm text-zinc-500">No company selected.</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}
      <ScenarioForm
        key={formKey}
        mode="create"
        companyId={companyId}
        voucherTypes={voucherTypes}
        scenarios={scenarios}
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
