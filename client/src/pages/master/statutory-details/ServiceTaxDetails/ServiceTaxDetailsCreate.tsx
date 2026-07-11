import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { PageTitleBar, RightActionPanel, MasterFormFooter } from '@/components/ui';
import { useServiceTaxDetails } from './useServiceTaxDetails';
import { ServiceTaxDetailsForm } from './ServiceTaxDetailsForm';

export default function ServiceTaxDetailsCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const { form, setField, loading, error, setError, success, setSuccess, save } =
    useServiceTaxDetails({ companyId });

  const quit = useCallback(() => navigate('/master/create'), [navigate]);

  const handleSubmit = useCallback(async () => {
    await save();
  }, [save]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        quit();
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, quit]);

  const actions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Esc', label: 'Quit', onClick: quit },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none" data-enter-nav>
      <PageTitleBar title="Service Tax Details" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>• {error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 font-bold"
          >
            &times;
          </button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
          <span>• {success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="text-green-500 hover:text-green-700 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <ServiceTaxDetailsForm form={form} setField={setField} firstFieldAutoFocus />
        <RightActionPanel actions={actions} />
      </div>

      <MasterFormFooter onCancel={quit} onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
