import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { NotificationBanner } from '@/components/ui';
import ExciseDutyClassificationForm from './ExciseDutyClassificationForm';

export default function ExciseDutyClassificationCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [success, setSuccess] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  if (!companyId) {
    return <div className="p-6 text-sm text-zinc-500">No company selected.</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}
      <ExciseDutyClassificationForm
        key={formKey}
        mode="create"
        companyId={companyId}
        onSaved={(msg) => {
          setSuccess(msg);
          setFormKey((k) => k + 1); // reset the form for the next entry
        }}
        onCancel={() => navigate('/master/create')}
        onBack={() => navigate('/master/create')}
      />
    </div>
  );
}
