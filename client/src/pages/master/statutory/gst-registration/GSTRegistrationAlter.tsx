import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { PageTitleBar, RightActionPanel, NotificationBanner } from '@/components/ui';
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
        if (selectedReg) {
          handleBack();
        } else {
          navigate('/master/alter');
        }
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAccept(true);
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAccept(true);
      }
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, handleDelete, navigate, selectedReg, handleBack, showGstinWarning, showAccept]);

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
    { key: 'Alt+A', label: 'Accept', onClick: () => setShowAccept(true) },
    { key: 'Alt+D', label: 'Delete', onClick: handleDelete },
    { key: 'Esc', label: 'Back', onClick: handleBack },
  ];

  return (
    <div
      className="flex flex-col h-full relative overflow-hidden bg-white select-none font-mono"
      data-enter-nav
    >
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
        <GSTRegistrationFormFields
          form={form}
          setField={setField}
          activeField={activeField}
          setActiveField={setActiveField}
          onSubmitPrompt={() => setShowAccept(true)}
        />
        <RightActionPanel actions={alterActions} />
      </div>

      <div className="px-3 py-3 border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50 shrink-0">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-4 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors font-medium font-sans shadow-sm"
        >
          Delete
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium font-sans"
          >
            Back
          </button>
          <button
            onClick={() => setShowAccept(true)}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium font-sans"
          >
            {loading ? 'Saving...' : 'Accept'}
          </button>
        </div>
      </div>

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
