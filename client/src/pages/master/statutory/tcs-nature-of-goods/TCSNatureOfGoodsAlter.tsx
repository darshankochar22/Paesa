import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import {
  PageTitleBar,
  RightActionPanel,
  NotificationBanner,
  MasterFormFooter,
} from '@/components/ui';
import { useTCSNatureOfGoodsForm } from './hooks/useTCSNatureOfGoodsForm';
import TCSNatureOfGoodsFormFields from './components/TCSNatureOfGoodsFormFields';
import TCSNatureOfGoodsSelectionPanel from './components/TCSNatureOfGoodsSelectionPanel';

export default function TCSNatureOfGoodsAlter() {
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
    tcsList,
    selectedTcs,
    setField,
    handleSubmit,
    handleDelete,
    handleSelectTcs,
    handleBack,
  } = useTCSNatureOfGoodsForm({ mode: 'alter' });

  const isPredefined = !!selectedTcs?.is_predefined;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedTcs) handleBack();
        else navigate('/master/alter');
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (selectedTcs && !isPredefined) handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedTcs && !isPredefined) handleDelete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, handleDelete, navigate, selectedTcs, handleBack, isPredefined]);

  if (!selectedTcs) {
    return (
      <TCSNatureOfGoodsSelectionPanel
        tcsList={tcsList}
        onSelect={handleSelectTcs}
        onCancel={() => navigate('/master/alter')}
        onCreate={() => navigate('/master/create/tcs-nature-of-goods')}
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
        title={`TCS Nature of Goods Alteration: ${selectedTcs.name}`}
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
          ℹ️ Predefined TCS Nature of Goods cannot be modified or deleted.
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <TCSNatureOfGoodsFormFields
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
