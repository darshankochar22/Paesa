import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { MasterSelectionPanel, NotificationBanner, type TableColumn } from '@/components/ui';
import MerchantProfileForm from './MerchantProfileForm';
import type { MerchantProfileType } from '@/types/entities/MerchantProfile';

export default function MerchantProfileAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [profiles, setProfiles] = useState<MerchantProfileType[]>([]);
  const [selected, setSelected] = useState<MerchantProfileType | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    const res = await window.api.merchantProfile.getAll(companyId);
    if (res.success) setProfiles(res.profiles ?? []);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = async (p: MerchantProfileType) => {
    const res = await window.api.merchantProfile.getById(p.merchant_profile_id!);
    if (res.success) setSelected(res.profile);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete merchant profile "${selected.name}"?`)) return;
    const res = await window.api.merchantProfile.delete(selected.merchant_profile_id!);
    if (res.success) {
      setSuccess(`Merchant Profile "${selected.name}" deleted.`);
      setSelected(null);
      load();
    } else {
      window.alert(res.error || 'Failed to delete merchant profile.');
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
        render: (r: MerchantProfileType) => (
          <span className="font-bold text-zinc-900 text-xs">{r.name}</span>
        ),
      },
      {
        key: 'payment_method',
        label: 'Payment Method',
        span: 'col-span-5',
        render: (r: MerchantProfileType) => (
          <span className="text-zinc-500 font-semibold">{r.payment_method || '—'}</span>
        ),
      },
    ];

    return (
      <div className="flex-1 flex flex-col h-full">
        {success && (
          <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
        )}
        <MasterSelectionPanel<MerchantProfileType>
          title="Alter Merchant Profile"
          subtitle="Select Merchant Profile to Alter"
          searchPlaceholder="Search merchant profiles by name…"
          items={profiles}
          filterFn={(p, q) => p.name.toLowerCase().includes(q.toLowerCase())}
          columns={columns}
          onSelect={handleSelect}
          onCancel={() => navigate('/master/alter')}
          onCreate={() => navigate('/master/create/merchant-profile')}
          createLabel="Create Merchant Profile"
          rowKey={(p) => p.merchant_profile_id!}
          emptyMessage="No merchant profiles found."
        />
      </div>
    );
  }

  return (
    <MerchantProfileForm
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
