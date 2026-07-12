import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import {
  PageTitleBar,
  RightActionPanel,
  NotificationBanner,
  MasterFormFooter,
} from '@/components/ui';
import { useGSTClassificationForm } from './hooks/useGSTClassificationForm';
import GSTClassificationFormFields from './components/GSTClassificationFormFields';
import GSTClassificationSelectionPanel from './components/GSTClassificationSelectionPanel';

export default function GSTClassificationAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const {
    form,
    loading,
    error,
    setError,
    success,
    setSuccess,
    classifications,
    selectedClass,
    setField,
    addSlabRow,
    updateSlabRow,
    removeSlabRow,
    handleSubmit,
    handleDelete,
    handleSelectClass,
    handleBack,
  } = useGSTClassificationForm({ mode: 'alter' });

  const isPredefined = !!selectedClass?.is_predefined;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedClass) handleBack();
        else navigate('/master/alter');
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (!isPredefined) handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, handleDelete, navigate, selectedClass, handleBack, isPredefined]);

  if (!selectedClass) {
    return (
      <GSTClassificationSelectionPanel
        classifications={classifications}
        onSelect={handleSelectClass}
        onCancel={() => navigate('/master/alter')}
        onCreate={() => navigate('/master/create/gst-classification')}
      />
    );
  }

  const alterActions = [
    ...(isPredefined ? [] : [{ key: 'Alt+A', label: 'Accept', onClick: handleSubmit }]),
    { key: 'Alt+D', label: 'Delete', onClick: handleDelete },
    { key: 'Esc', label: 'Back', onClick: handleBack },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none relative" data-enter-nav>
      <PageTitleBar
        title={`GST Classification Alteration: ${selectedClass.name}`}
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
          ℹ️ Predefined GST classifications cannot be modified, but you can delete them.
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <GSTClassificationFormFields
          form={form}
          setField={setField}
          addSlabRow={addSlabRow}
          updateSlabRow={updateSlabRow}
          removeSlabRow={removeSlabRow}
          isPredefined={isPredefined}
        />
        <RightActionPanel actions={alterActions} />
      </div>

      <MasterFormFooter
        onCancel={handleBack}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        submitLabel="Accept"
        loading={loading}
        disabled={isPredefined}
      />
    </div>
  );
}
