import { useState, useEffect, useCallback } from 'react';
import {
  PageTitleBar,
  RightActionPanel,
  MasterFormFooter,
  FormRow,
  NotificationBanner,
} from '@/components/ui';
import { PAYMENT_METHODS, type MerchantProfileType } from '@/types/entities/MerchantProfile';

const inputCls =
  'w-72 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';
const LABEL_W = 'w-72';

interface Props {
  mode: 'create' | 'alter';
  companyId: number;
  initial?: MerchantProfileType | null;
  onSaved: (msg: string) => void;
  onCancel: () => void;
  onBack?: () => void;
  onDelete?: () => void;
}

export default function MerchantProfileForm({
  mode,
  companyId,
  initial,
  onSaved,
  onCancel,
  onBack,
  onDelete,
}: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [paymentMethod, setPaymentMethod] = useState<string>(initial?.payment_method ?? 'UPI');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initial?.name ?? '');
    setPaymentMethod(initial?.payment_method ?? 'UPI');
  }, [initial]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = { name: name.trim(), payment_method: paymentMethod, company_id: companyId };
      const res =
        mode === 'create'
          ? await window.api.merchantProfile.create(payload)
          : await window.api.merchantProfile.update({
              ...payload,
              merchant_profile_id: initial?.merchant_profile_id,
            });
      if (!res.success) throw new Error(res.error || 'Save failed');
      onSaved(`Merchant Profile "${name.trim()}" ${mode === 'create' ? 'created' : 'updated'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save merchant profile.');
    } finally {
      setLoading(false);
    }
  }, [name, paymentMethod, companyId, mode, initial, onSaved]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        (onBack ?? onCancel)();
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSubmit();
      }
      if (mode === 'alter' && e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        onDelete?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, onBack, onCancel, onDelete, mode]);

  const actions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    ...(mode === 'alter' && onDelete ? [{ key: 'Alt+D', label: 'Delete', onClick: onDelete }] : []),
    { key: 'Esc', label: mode === 'alter' ? 'Back' : 'Quit', onClick: onBack ?? onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none" data-enter-nav>
      <PageTitleBar
        title={mode === 'create' ? 'Merchant Profile Creation' : 'Merchant Profile Alteration'}
      />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
          <div className="p-6 max-w-[680px]">
            <div className="text-center text-sm font-bold text-zinc-800 mb-4">
              Merchant Profile Details
            </div>

            <FormRow
              label="Name"
              labelWidth={LABEL_W}
              required
              className="flex items-center min-h-[26px]"
            >
              <input
                autoFocus
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormRow>

            <FormRow
              label="Payment Method (Payment Gateway/UPI)"
              labelWidth={LABEL_W}
              className="flex items-center min-h-[26px]"
            >
              <select
                className={inputCls}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </FormRow>
          </div>
          <div className="flex-1" />
        </div>
        <RightActionPanel actions={actions} />
      </div>

      <MasterFormFooter onCancel={onBack ?? onCancel} onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
