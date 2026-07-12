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

export default function GSTRegistrationCreate() {
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
    handleSubmit,
    registrations,
  } = useGSTRegistrationForm({ mode: 'create' });

  const [showPrompt, setShowPrompt] = useState(false);
  const [showGstinWarning, setShowGstinWarning] = useState(false);

  const handleSave = async (bypassGstinCheck: boolean = false) => {
    setShowGstinWarning(false);
    const result = await handleSubmit(bypassGstinCheck);
    if (result === 'WARNING_INVALID_GSTIN') {
      setShowGstinWarning(true);
    }
  };

  useEffect(() => {
    if (registrations.length > 0) setShowPrompt(true);
  }, [registrations]);

  useEffect(() => {
    if (showPrompt) {
      const handler = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key === 'c') {
          e.preventDefault();
          setShowPrompt(false);
        } else if (key === 'a') {
          e.preventDefault();
          navigate('/master/alter/gst-registration');
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }

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
        navigate('/master/create');
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSave(false);
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        navigate('/master/alter/gst-registration');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, navigate, showPrompt, showGstinWarning]);

  const actions = [
    { key: 'Alt+A', label: 'Accept', onClick: () => handleSave(false) },
    {
      key: 'Alt+C',
      label: 'Alter Mode',
      onClick: () => navigate('/master/alter/gst-registration'),
    },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none relative" data-enter-nav>
      <PageTitleBar title="GST Registration Creation" subtitle={selectedCompany?.name} />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <GSTRegistrationFormFields form={form} setField={setField} />
        <RightActionPanel actions={actions} />
      </div>

      <MasterFormFooter
        onCancel={() => navigate('/master/create')}
        onSubmit={() => handleSave(false)}
        submitLabel="Accept"
        loading={loading}
      />

      {/* GST Registration already exists → Create new or Alter existing */}
      {showPrompt && (
        <div
          className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center"
          data-enter-nav-ignore
        >
          <div className="bg-white border border-black w-[460px] p-6 flex flex-col items-center text-center">
            <h3 className="font-bold text-black text-sm mb-2">
              GST Registration already exists for the Company.
            </h3>
            <p className="text-xs text-zinc-600 mb-6 leading-relaxed">
              Do you want to alter the existing GST Registration or create a new one?
            </p>
            <div className="flex items-center gap-4 w-full justify-center">
              <button
                onClick={() => setShowPrompt(false)}
                className="text-xs w-36 py-2 border border-black bg-white text-black hover:bg-black hover:text-white font-bold transition-colors"
              >
                <span className="mr-1">C:</span> Create New
              </button>
              <button
                onClick={() => navigate('/master/alter/gst-registration')}
                className="text-xs w-36 py-2 border border-black bg-black text-white hover:bg-white hover:text-black font-bold transition-colors"
              >
                <span className="mr-1">A:</span> Alter Existing
              </button>
            </div>
          </div>
        </div>
      )}

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
