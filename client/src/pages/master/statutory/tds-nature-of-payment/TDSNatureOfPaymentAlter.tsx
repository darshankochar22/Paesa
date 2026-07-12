import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import {
  PageTitleBar,
  RightActionPanel,
  NotificationBanner,
  MasterFormFooter,
} from '@/components/ui';
import { useTDSNatureOfPaymentForm } from './hooks/useTDSNatureOfPaymentForm';
import TDSNatureOfPaymentFormFields from './components/TDSNatureOfPaymentFormFields';
import TDSNatureOfPaymentSelectionPanel from './components/TDSNatureOfPaymentSelectionPanel';

export default function TDSNatureOfPaymentAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const {
    form,
    setForm,
    loading,
    error,
    setError,
    success,
    setSuccess,
    tdsList,
    selectedTds,
    setField,
    handleSubmit,
    handleDelete,
    handleSelectTds,
    handleBack,
  } = useTDSNatureOfPaymentForm({ mode: 'alter' });

  const isPredefined = !!selectedTds?.is_predefined;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedTds) handleBack();
        else navigate('/master/alter');
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (selectedTds && !isPredefined) handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedTds && !isPredefined) handleDelete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, handleDelete, navigate, selectedTds, handleBack, isPredefined]);

  if (!selectedTds) {
    return (
      <TDSNatureOfPaymentSelectionPanel
        tdsList={tdsList}
        onSelect={handleSelectTds}
        onCancel={() => navigate('/master/alter')}
        onCreate={() => navigate('/master/create/tds-nature-of-payment')}
      />
    );
  }

  const alterActions = [
    ...(isPredefined ? [] : [{ key: 'Alt+A', label: 'Accept', onClick: handleSubmit }]),
    ...(isPredefined ? [] : [{ key: 'Alt+D', label: 'Delete', onClick: handleDelete }]),
    { key: 'Esc', label: 'Back', onClick: handleBack },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none relative" data-enter-nav>
      <PageTitleBar
        title={`TDS Nature of Payment Alteration: ${selectedTds.name}`}
        subtitle={selectedCompany?.name}
      />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}
      {isPredefined && (
        <div className="px-3 py-1.5 border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-xs shrink-0 select-none">
          ℹ️ Predefined TDS Nature of Payment cannot be modified or deleted.
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <TDSNatureOfPaymentFormFields
          form={form}
          setForm={setForm}
          setField={setField}
          isPredefined={isPredefined}
        />
        <RightActionPanel actions={alterActions} />
      </div>

      <MasterFormFooter
        onCancel={handleBack}
        onSubmit={handleSubmit}
        onDelete={isPredefined ? undefined : handleDelete}
        submitLabel="Accept"
        cancelLabel="Back"
        loading={loading}
        disabled={isPredefined}
      />
    </div>
  );
}
