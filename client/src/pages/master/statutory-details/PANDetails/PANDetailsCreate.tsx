import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { PageTitleBar, FormRow, RightActionPanel, NotificationBanner } from '@/components/ui';
import { usePANDetails } from './hooks/usePANDetails';
import { useFieldWalker } from '@/hooks/useFieldWalker';

const activeClass =
  'bg-[#ffea5d] border-[#e6c300] text-zinc-950 px-2 py-0.5 outline-none border w-64 font-mono font-bold text-xs';
const inactiveClass =
  'border-transparent bg-transparent text-zinc-900 px-2 py-0.5 outline-none border w-64 font-mono font-bold text-xs';
const getInputCls = (isActive: boolean) => `${isActive ? activeClass : inactiveClass}`;

const FIELDS = ['pan', 'cin'];

export default function PANDetailsCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const { form, setField, loading, error, setError, success, setSuccess, saveDetails } =
    usePANDetails({
      companyId,
      onSaveSuccess: () => {
        setTimeout(() => navigate('/master/create'), 1000);
      },
    });

  const [activeField, setActiveField] = useState('pan');
  const [showAccept, setShowAccept] = useState(false);

  const panRef = useRef<HTMLInputElement>(null);
  const cinRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (showAccept) {
        const key = e.key.toLowerCase();
        if (key === 'y' || e.key === 'Enter') {
          e.preventDefault();
          setShowAccept(false);
          saveDetails();
        } else if (key === 'n' || e.key === 'Escape') {
          e.preventDefault();
          setShowAccept(false);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/master/create');
        return;
      }

      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAccept(true);
      }
    },
    [showAccept, saveDetails, navigate],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useFieldWalker({
    fields: FIELDS,
    active: activeField,
    setActive: setActiveField,
    refs: { pan: panRef, cin: cinRef },
    onLast: () => setShowAccept(true),
    enabled: !showAccept,
  });

  const actions = [
    { key: 'Alt+A', label: 'Accept', onClick: () => setShowAccept(true) },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  return (
    <div
      className="flex-grow flex flex-col h-full bg-white select-none text-zinc-950 relative"
      data-enter-nav
    >
      <PageTitleBar title="PAN/CIN Details" subtitle={selectedCompany?.name} />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-grow flex min-h-0 relative">
        <div className="flex-grow overflow-y-auto p-6 bg-zinc-50 font-mono text-zinc-800 text-[11px]">
          <div className="max-w-2xl mx-auto bg-white border border-zinc-200 rounded shadow-sm p-6 space-y-4 mt-10 relative">
            <div className="text-center font-bold text-xs border-b border-zinc-200 pb-3 mb-4 tracking-wide text-zinc-900 uppercase">
              PAN/CIN Details
            </div>

            <div className="space-y-2">
              <FormRow label="PAN/Income tax no." labelWidth="w-[300px]">
                <input
                  ref={panRef}
                  className={getInputCls(activeField === 'pan')}
                  value={form.pan}
                  onChange={(e) => setField('pan', e.target.value.toUpperCase())}
                  onFocus={() => setActiveField('pan')}
                  placeholder="e.g. ABCDE1234F"
                  maxLength={10}
                />
              </FormRow>

              <FormRow label="Corporate Identity No. (CIN)" labelWidth="w-[300px]">
                <input
                  ref={cinRef}
                  className={getInputCls(activeField === 'cin')}
                  value={form.cin}
                  onChange={(e) => setField('cin', e.target.value.toUpperCase())}
                  onFocus={() => setActiveField('cin')}
                  placeholder="e.g. U12345KA2026PTC123456"
                  maxLength={21}
                />
              </FormRow>
            </div>
          </div>
        </div>

        <RightActionPanel actions={actions} />
      </div>

      {showAccept && (
        <div
          className="absolute bottom-16 right-72 bg-white border-2 border-[#4c90e2] w-[165px] rounded shadow-2xl p-3 flex flex-col items-center z-[10000] font-mono animate-fade-in text-zinc-950"
          data-enter-nav-ignore
        >
          <h4 className="font-bold text-[11px] mb-3">Accept?</h4>
          <div className="flex items-center gap-3 w-full justify-center">
            <button
              onClick={() => {
                setShowAccept(false);
                saveDetails();
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

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50 shrink-0 font-sans">
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/master/create')}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium"
          >
            Quit
          </button>
          <button
            onClick={() => setShowAccept(true)}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
