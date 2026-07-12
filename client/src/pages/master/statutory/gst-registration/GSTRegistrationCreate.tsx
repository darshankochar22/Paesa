import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { PageTitleBar, RightActionPanel, NotificationBanner } from '@/components/ui';
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
  const [activeField, setActiveField] = useState<string>('registration_status');
  const [showAccept, setShowAccept] = useState(false);

  const handleSave = async (bypassGstinCheck: boolean = false) => {
    setShowGstinWarning(false);
    const result = await handleSubmit(bypassGstinCheck);
    if (result === 'WARNING_INVALID_GSTIN') {
      setShowGstinWarning(true);
    }
  };

  useEffect(() => {
    if (registrations.length > 0) {
      setShowPrompt(true);
    }
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

    if (showAccept) {
      const handler = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key === 'y' || e.key === 'Enter') {
          e.preventDefault();
          setShowAccept(false);
          handleSave(false);
        } else if (key === 'n' || e.key === 'Escape') {
          e.preventDefault();
          setShowAccept(false);
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }

    if (showGstinWarning) {
      const handler = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key === 'y' || key === 'enter') {
          e.preventDefault();
          handleSave(true);
        } else if (key === 'n' || key === 'escape') {
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
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAccept(true);
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAccept(true);
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        navigate('/master/alter/gst-registration');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, navigate, showPrompt, showGstinWarning, showAccept]);

  const actions = [
    { key: 'Alt+A', label: 'Accept', onClick: () => setShowAccept(true) },
    {
      key: 'Alt+C',
      label: 'Alter Mode',
      onClick: () => navigate('/master/alter/gst-registration'),
    },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  return (
    <div
      className="flex flex-col h-full relative overflow-hidden bg-white select-none"
      data-enter-nav
    >
      <PageTitleBar title="Create GST Registration" subtitle={selectedCompany?.name} />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0 font-mono">
        <GSTRegistrationFormFields
          form={form}
          setField={setField}
          activeField={activeField}
          setActiveField={setActiveField}
          onSubmitPrompt={() => setShowAccept(true)}
        />
        <RightActionPanel actions={actions} />
      </div>

      <div className="px-3 py-3 border-t border-zinc-200 flex justify-end bg-zinc-50 shrink-0">
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/master/create')}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium font-sans"
          >
            Quit
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium font-sans"
          >
            {loading ? 'Creating...' : 'Accept'}
          </button>
        </div>
      </div>

      {/* Tally-style Alter/Create Alert Prompt Modal */}
      {showPrompt && (
        <div
          className="absolute inset-0 bg-zinc-900/40 z-50 flex items-center justify-center backdrop-blur-[1px] font-sans"
          data-enter-nav-ignore
        >
          <div className="bg-white border border-zinc-300 w-[500px] rounded shadow-2xl p-6 flex flex-col items-center text-center animate-fade-in">
            <h3 className="font-bold text-zinc-900 text-sm mb-2">
              GST Registration already exists for the Company.
            </h3>
            <p className="text-xs text-zinc-600 mb-6 leading-relaxed">
              Do you want to alter the existing GST Registration or create a new GST Registration?
            </p>
            <div className="flex items-center gap-4 w-full justify-center">
              <button
                onClick={() => setShowPrompt(false)}
                className="text-xs w-36 py-2 border-2 border-amber-400 hover:bg-amber-50/50 text-zinc-800 rounded font-bold shadow-sm transition-all focus:outline-none"
              >
                <span className="text-amber-600 font-extrabold mr-1">C:</span> Create New
              </button>
              <button
                onClick={() => navigate('/master/alter/gst-registration')}
                className="text-xs w-36 py-2 border-2 border-sky-400 hover:bg-sky-50/50 text-zinc-800 rounded font-bold shadow-sm transition-all focus:outline-none"
              >
                <span className="text-sky-600 font-extrabold mr-1">A:</span> Alter Existing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tally-style Invalid GSTIN Soft Warning Modal */}
      {showGstinWarning && (
        <div
          className="absolute inset-0 bg-zinc-900/40 z-50 flex items-center justify-center backdrop-blur-[1px] font-mono"
          data-enter-nav-ignore
        >
          <div className="bg-white border border-zinc-300 w-[420px] rounded shadow-2xl p-6 flex flex-col items-center text-center animate-fade-in select-none">
            <h3 className="font-bold text-zinc-900 text-xs mb-6 leading-relaxed">
              Verify the GSTIN/UIN.
              <br />
              Do you want to accept anyway?
            </h3>
            <div className="flex items-center gap-6 w-full justify-center">
              <button
                onClick={() => handleSave(true)}
                className="text-xs px-6 py-1 border border-zinc-300 hover:bg-zinc-50 text-zinc-800 font-bold focus:outline-none min-w-[80px]"
              >
                <span className="text-zinc-500 font-extrabold mr-1">Y:</span>Yes
              </button>
              <button
                onClick={() => setShowGstinWarning(false)}
                className="text-xs px-6 py-1 border border-zinc-300 hover:bg-zinc-50 text-zinc-800 font-bold focus:outline-none min-w-[80px]"
              >
                <span className="text-zinc-500 font-extrabold mr-1">N:</span>No
              </button>
            </div>
          </div>
        </div>
      )}

      {showAccept && (
        <div
          className="absolute bottom-16 right-72 bg-white border-2 border-[#4c90e2] w-[165px] rounded shadow-2xl p-3 flex flex-col items-center z-[10000] font-mono animate-fade-in"
          data-enter-nav-ignore
        >
          <h4 className="font-bold text-zinc-900 text-[11px] mb-3">Accept?</h4>
          <div className="flex items-center gap-3 w-full justify-center">
            <button
              onClick={() => {
                setShowAccept(false);
                handleSave(false);
              }}
              disabled={loading}
              className="text-[11px] px-3 py-0.5 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none min-w-[55px] text-center disabled:opacity-50 transition-colors cursor-pointer"
            >
              Yes
            </button>
            <button
              onClick={() => setShowAccept(false)}
              className="text-[11px] px-3 py-0.5 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none min-w-[55px] text-center transition-colors cursor-pointer"
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
