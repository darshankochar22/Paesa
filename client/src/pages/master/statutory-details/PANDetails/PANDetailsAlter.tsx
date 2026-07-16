import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import {
  PageTitleBar,
  FormRow,
  RightActionPanel,
  NotificationBanner,
  MasterFormFooter,
  inputCls,
} from '@/components/ui';
import { usePANDetails } from './hooks/usePANDetails';
import { useFieldWalker } from '@/hooks/useFieldWalker';

const FIELDS = ['pan', 'cin'];

export default function PANDetailsAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const { form, setField, loading, error, setError, success, setSuccess, saveDetails } =
    usePANDetails({
      companyId,
      onSaveSuccess: () => {
        setTimeout(() => navigate('/master/alter'), 1000);
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
        navigate('/master/alter');
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
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/alter') },
  ];

  return (
    <div
      className="flex-1 flex flex-col h-full bg-white select-none text-zinc-950 relative"
      data-enter-nav
    >
      <PageTitleBar title="PAN/CIN Details (Alteration)" subtitle={selectedCompany?.name} />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 overflow-y-auto bg-white p-6">
          <div className="max-w-2xl space-y-1">
            <div className="font-bold text-[10px] border-b border-zinc-200 pb-1 mb-3 tracking-wider text-zinc-900 uppercase">
              PAN/CIN Details
            </div>

            <FormRow
              label="PAN/Income tax no."
              labelWidth="w-72"
              className="flex items-center min-h-[26px]"
            >
              <input
                ref={panRef}
                className={inputCls}
                value={form.pan}
                onChange={(e) => setField('pan', e.target.value.toUpperCase())}
                onFocus={() => setActiveField('pan')}
                placeholder="e.g. ABCDE1234F"
                maxLength={10}
              />
            </FormRow>

            <FormRow
              label="Corporate Identity No. (CIN)"
              labelWidth="w-72"
              className="flex items-center min-h-[26px]"
            >
              <input
                ref={cinRef}
                className={inputCls}
                value={form.cin}
                onChange={(e) => setField('cin', e.target.value.toUpperCase())}
                onFocus={() => setActiveField('cin')}
                placeholder="e.g. U12345KA2026PTC123456"
                maxLength={21}
              />
            </FormRow>
          </div>
        </div>

        <RightActionPanel actions={actions} />
      </div>

      {showAccept && (
        <div
          className="absolute bottom-16 right-72 bg-white border-2 border-black w-[165px] rounded shadow-2xl p-3 flex flex-col items-center z-[10000] animate-fade-in text-zinc-950"
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
              className="text-[11px] px-3 py-0.5 border border-black hover:bg-black/[0.03] text-black font-bold focus:outline-none min-w-[55px] text-center disabled:opacity-50 transition-colors cursor-pointer"
            >
              Yes
            </button>
            <button
              onClick={() => setShowAccept(false)}
              className="text-[11px] px-3 py-0.5 border border-black hover:bg-black/[0.03] text-black font-bold focus:outline-none min-w-[55px] text-center transition-colors cursor-pointer"
            >
              No
            </button>
          </div>
        </div>
      )}

      <MasterFormFooter
        onCancel={() => navigate('/master/alter')}
        onSubmit={() => setShowAccept(true)}
        cancelLabel="Quit"
        submitLabel="Accept"
        loading={loading}
      />
    </div>
  );
}
