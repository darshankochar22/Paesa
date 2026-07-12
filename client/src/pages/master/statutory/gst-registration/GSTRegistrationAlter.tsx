import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import {
  PageTitleBar,
  RightActionPanel,
  NotificationBanner,
  MasterFormFooter,
} from '@/components/ui';
import { useGSTRegistrationForm } from './hooks/useGSTRegistrationForm';
import GSTRegistrationFormFields from './components/GSTRegistrationFormFields';
import GSTRegistrationSelectionPanel from './components/GSTRegistrationSelectionPanel';

export default function GSTRegistrationAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const {
    form,
    loading,
    error,
    setError,
    success,
    setSuccess,
    registrations,
    selectedReg,
    setField,
    handleSubmit,
    handleDelete,
    handleSelectReg,
    handleBack,
  } = useGSTRegistrationForm({ mode: 'alter' });

  const [showGstinWarning, setShowGstinWarning] = useState(false);

  const handleSave = async (bypassGstinCheck: boolean = false) => {
    setShowGstinWarning(false);
    const result = await handleSubmit(bypassGstinCheck);
    if (result === 'WARNING_INVALID_GSTIN') {
      setShowGstinWarning(true);
    }
  };

  useEffect(() => {
    if (showGstinWarning) {
      const handler = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key === 'y' || e.key === 'Enter') {
          e.preventDefault();
          handleSave(true);
        } else if (key === 'n' || e.key === 'Escape') {
          e.preventDefault();
          setShowGstinWarning(false);
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedReg) handleBack();
        else navigate('/master/alter');
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSave(false);
      }
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, handleDelete, navigate, selectedReg, handleBack, showGstinWarning]);

  if (!selectedReg) {
    return (
      <GSTRegistrationSelectionPanel
        registrations={registrations}
        onSelect={handleSelectReg}
        onCancel={() => navigate('/master/alter')}
        onCreate={() => navigate('/master/create/gst-registration')}
      />
    );
  }

  const alterActions = [
    { key: 'Alt+A', label: 'Accept', onClick: () => handleSave(false) },
    { key: 'Alt+D', label: 'Delete', onClick: handleDelete },
    { key: 'Esc', label: 'Back', onClick: handleBack },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none relative" data-enter-nav>
      <PageTitleBar
        title={`GST Registration Alteration: ${selectedReg.gstin}`}
        subtitle={selectedCompany?.name}
      />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <GSTRegistrationFormFields form={form} setField={setField} />
        <RightActionPanel actions={alterActions} />
      </div>

      <MasterFormFooter
        onCancel={handleBack}
        onSubmit={() => handleSave(false)}
        onDelete={handleDelete}
        submitLabel="Accept"
        loading={loading}
      />

      {/* Invalid GSTIN soft warning */}
      {showGstinWarning && (
        <div
          className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center"
          data-enter-nav-ignore
        >
          <div className="bg-white border border-black w-[420px] p-6 flex flex-col items-center text-center select-none">
            <h3 className="font-bold text-black text-xs mb-6 leading-relaxed">
              Verify the GSTIN/UIN.
              <br />
              Do you want to accept anyway?
            </h3>
            <div className="flex items-center gap-6 w-full justify-center">
              <button
                onClick={() => handleSave(true)}
                className="text-xs px-6 py-1 border border-black hover:bg-black hover:text-white text-black font-bold min-w-[80px] transition-colors"
              >
                <span className="mr-1">Y:</span>Yes
              </button>
              <button
                onClick={() => setShowGstinWarning(false)}
                className="text-xs px-6 py-1 border border-black hover:bg-black hover:text-white text-black font-bold min-w-[80px] transition-colors"
              >
                <span className="mr-1">N:</span>No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
