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

export default function GSTClassificationCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const {
    form,
    loading,
    error,
    setError,
    success,
    setSuccess,
    setField,
    addSlabRow,
    updateSlabRow,
    removeSlabRow,
    handleSubmit,
  } = useGSTClassificationForm({ mode: 'create' });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/master/create');
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        navigate('/master/alter/gst-classification');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, navigate]);

  const actions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    {
      key: 'Alt+C',
      label: 'Alter Mode',
      onClick: () => navigate('/master/alter/gst-classification'),
    },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none relative" data-enter-nav>
      <PageTitleBar title="GST Classification Creation" subtitle={selectedCompany?.name} />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <GSTClassificationFormFields
          form={form}
          setField={setField}
          addSlabRow={addSlabRow}
          updateSlabRow={updateSlabRow}
          removeSlabRow={removeSlabRow}
        />
        <RightActionPanel actions={actions} />
      </div>

      <MasterFormFooter
        onCancel={() => navigate('/master/create')}
        onSubmit={handleSubmit}
        submitLabel="Accept"
        loading={loading}
      />
    </div>
  );
}
