import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { PageTitleBar, RightActionPanel } from '@/components/ui';
import { useTDSNatureOfPaymentForm } from './hooks/useTDSNatureOfPaymentForm';
import TDSNatureOfPaymentFormFields from './components/TDSNatureOfPaymentFormFields';

export default function TDSNatureOfPaymentCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [showAccept, setShowAccept] = useState(false);

  const { form, setForm, loading, error, setError, success, setSuccess, setField, handleSubmit } =
    useTDSNatureOfPaymentForm({ mode: 'create' });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showAccept) {
        const k = e.key.toLowerCase();
        if (k === 'y' || e.key === 'Enter') {
          e.preventDefault();
          setShowAccept(false);
          handleSubmit();
        } else if (k === 'n' || e.key === 'Escape') {
          e.preventDefault();
          setShowAccept(false);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/master/create');
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAccept(true);
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        navigate('/master/alter/tds-nature-of-payment');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, navigate, showAccept]);

  const actions = [
    { key: 'Alt+A', label: 'Accept', onClick: () => setShowAccept(true) },
    {
      key: 'Alt+C',
      label: 'Alter Mode',
      onClick: () => navigate('/master/alter/tds-nature-of-payment'),
    },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  return (
    <div
      className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-white select-none font-mono"
      data-enter-nav
    >
      <PageTitleBar title="TDS Nature of Payment Creation" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center shrink-0 z-50">
          <span>• {error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-xs font-bold font-sans"
          >
            &times;
          </button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center shrink-0 z-50">
          <span>• {success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="text-green-500 hover:text-green-700 text-xs font-bold font-sans"
          >
            &times;
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0 relative">
        {/* Mock Gateway background */}
        <div className="absolute inset-0 flex p-8 opacity-20 select-none pointer-events-none text-zinc-500">
          <div className="w-80 border-r border-zinc-300 pr-6 space-y-4">
            <div className="text-sm font-bold border-b border-zinc-300 pb-1">Gateway</div>
            <div className="space-y-1 text-xs">
              <div>Masters</div>
              <div className="pl-4">Create</div>
              <div className="pl-4">Alter</div>
              <div className="pl-4">Chart of Accounts</div>
              <div className="mt-2">Transactions</div>
              <div className="pl-4">Vouchers</div>
              <div className="pl-4">Day Book</div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex min-h-0 relative z-10 items-start justify-start">
          <TDSNatureOfPaymentFormFields
            form={form}
            setForm={setForm}
            setField={setField}
            onSubmitPrompt={() => setShowAccept(true)}
            mode="create"
          />
        </div>

        <RightActionPanel actions={actions} className="h-full z-20" />
      </div>

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
                handleSubmit();
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

      {/* Footer bar */}
      <div className="px-3 py-1 bg-zinc-900 text-white text-[10px] font-sans flex justify-center select-none shrink-0 z-30 font-mono">
        <div className="flex gap-4">
          <span>Alt+A: Accept</span>
          <span>Alt+C: Alter Mode</span>
          <span>Esc: Quit</span>
        </div>
      </div>
    </div>
  );
}
