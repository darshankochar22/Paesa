import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import CostCentreFlatList from '@/components/CostCentreFlatList';
import { focusFieldAfter } from '@/hooks/useEnterNavigation';
import type { CostCentreType } from '@/types/api';

function Row({
  label,
  required,
  children,
  onClick,
  rowRef,
  enterClick,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  rowRef?: React.Ref<HTMLDivElement>;
  enterClick?: boolean;
}) {
  return (
    <div
      ref={rowRef}
      {...(enterClick ? { tabIndex: 0, 'data-enter-click': true } : {})}
      className={`flex items-start min-h-[36px] border-b border-zinc-100 last:border-0 ${onClick ? 'cursor-pointer hover:bg-zinc-50' : ''}${enterClick ? ' focus:bg-zinc-100 outline-none' : ''}`}
      onClick={onClick}
    >
      <span className="w-64 text-[12px] text-zinc-600 shrink-0 py-1.5 pl-3 select-none">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-400 mr-2 py-1.5 select-none">:</span>
      <div className="flex-1 py-1">{children}</div>
    </div>
  );
}

const inputCls =
  'w-full bg-transparent text-[12px] font-bold text-zinc-950 font-mono outline-none py-1 px-1 rounded-sm placeholder:text-zinc-300 border-b border-transparent focus:border-zinc-300 transition-colors';

interface FormState extends Partial<CostCentreType> {}

const INITIAL_FORM: FormState = {
  name: '',
  alias: '',
  parent_id: undefined,
};

type SidePanel = 'parent' | null;

export default function CostCentreCreate() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;

  const [costCentres, setCostCentres] = useState<CostCentreType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState<SidePanel>(null);
  const [showAcceptPrompt, setShowAcceptPrompt] = useState(false);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const aliasInputRef = useRef<HTMLInputElement>(null);
  const underRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showAcceptPrompt) {
          setShowAcceptPrompt(false);
        } else if (showPanel) {
          setShowPanel(null);
        } else {
          navigate('/master/create');
        }
      }
      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (showAcceptPrompt) {
          handleConfirmSubmit();
        } else {
          setShowAcceptPrompt(true);
        }
      }
      if (showAcceptPrompt) {
        const k = e.key.toLowerCase();
        if (k === 'y' || e.key === 'Enter') {
          e.preventDefault();
          handleConfirmSubmit();
        } else if (k === 'n') {
          e.preventDefault();
          setShowAcceptPrompt(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPanel, showAcceptPrompt, navigate]);

  const fetchData = async () => {
    if (!companyId) return;
    const ccRes = await window.api.costCentre.getAll(companyId);
    if (ccRes.success && ccRes.costCentres) setCostCentres(ccRes.costCentres);
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const parentCC = form.parent_id ? costCentres.find((cc) => cc.cc_id === form.parent_id) : null;

  const setField = (key: keyof CostCentreType) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name?.trim()) return 'Name is required.';
    if (!companyId) return 'No company selected.';
    return null;
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.currentTarget === nameInputRef.current) aliasInputRef.current?.focus();
      else if (e.currentTarget === aliasInputRef.current) setShowPanel('parent');
    }
  };

  const handleConfirmSubmit = async () => {
    setShowAcceptPrompt(false);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        company_id: companyId!,
        name: form.name!.trim(),
        alias: form.alias?.trim() || undefined,
        parent_id: form.parent_id ? Number(form.parent_id) : undefined,
      };
      const res = await window.api.costCentre.create(payload);
      if (res.success) {
        setSuccess(`Cost Centre "${form.name}" created.`);
        setForm(INITIAL_FORM);
        fetchData();
        nameInputRef.current?.focus();
      } else {
        setError(res.error || 'Failed to create cost centre.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex-1 flex h-full bg-zinc-50 select-none text-zinc-950 font-mono text-[12px]"
      data-enter-nav
    >
      <div className="flex-1 flex flex-col min-h-0 relative p-6">
        <div className="flex items-center gap-4 mb-6 shrink-0">
          <Link to="/master/create" className="text-xs text-zinc-500 hover:text-zinc-800 font-sans">
            &larr; Back to Masters
          </Link>
          <span className="font-bold text-zinc-700 font-sans text-sm">Create Cost Centre</span>
        </div>

        {error && (
          <div className="mb-4 p-2 border border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center shrink-0 font-sans">
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
          <div className="mb-4 p-2 border border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center shrink-0 font-sans">
            <span>• {success}</span>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-500 hover:text-green-700 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-[600px] bg-white border border-zinc-300 shadow-md flex flex-col relative overflow-hidden">
            <div className="bg-zinc-100 px-3 py-1.5 border-b border-zinc-200 text-center font-bold text-xs uppercase tracking-wider text-zinc-700">
              Cost Centre Creation
            </div>

            <div className="p-4 flex flex-col gap-1">
              <Row label="Name" required>
                <input
                  ref={nameInputRef}
                  autoFocus
                  className={inputCls}
                  value={form.name || ''}
                  onChange={setField('name')}
                  onKeyDown={handleFormKeyDown}
                />
              </Row>
              <Row label="(alias)">
                <input
                  ref={aliasInputRef}
                  className={inputCls}
                  value={form.alias || ''}
                  onChange={setField('alias')}
                  onKeyDown={handleFormKeyDown}
                />
              </Row>
              <Row
                label="Under"
                onClick={() => setShowPanel('parent')}
                rowRef={underRowRef}
                enterClick
              >
                <span className="text-[12px] font-bold text-zinc-950 font-mono py-1 px-1 block cursor-pointer">
                  {parentCC ? parentCC.name : 'Primary'}
                </span>
              </Row>
            </div>

            {showAcceptPrompt && (
              <div className="absolute bottom-4 right-4 bg-white border-2 border-zinc-800 p-4 shadow-lg z-50 flex flex-col items-center min-w-[150px] font-sans">
                <div className="text-xs font-bold text-zinc-800 mb-3">Accept?</div>
                <div className="flex gap-4">
                  <button
                    onClick={handleConfirmSubmit}
                    className="px-4 py-1 bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 rounded shadow"
                  >
                    Yes (Y)
                  </button>
                  <button
                    onClick={() => setShowAcceptPrompt(false)}
                    className="px-4 py-1 border border-zinc-300 text-zinc-600 text-xs font-bold hover:bg-zinc-50 rounded"
                  >
                    No (N)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-zinc-200 pt-3 flex justify-end bg-zinc-50 shrink-0 font-sans pr-2">
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/master/create')}
              className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium"
            >
              Quit
            </button>
            <button
              data-enter-accept
              onClick={() => setShowAcceptPrompt(true)}
              disabled={loading}
              className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
            >
              {loading ? 'Saving...' : 'Accept'}
            </button>
          </div>
        </div>
      </div>

      {/* Parent cost centre panel */}
      {showPanel === 'parent' && (
        <div
          className="w-80 border-l border-zinc-200 flex flex-col shrink-0 bg-white animate-slide-in"
          data-enter-nav-ignore
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50 select-none shrink-0 font-sans">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Under Cost Centre
            </span>
            <button
              onClick={() => setShowPanel(null)}
              className="text-sm font-bold text-zinc-400 hover:text-zinc-800"
            >
              &times;
            </button>
          </div>
          <div
            className={`flex items-center min-h-[28px] px-3 py-1 cursor-pointer text-[12px] select-none border-b ${!form.parent_id ? 'bg-zinc-100 font-bold text-black' : 'text-zinc-700 hover:bg-zinc-50'}`}
            onClick={() => {
              setForm((f) => ({ ...f, parent_id: undefined }));
              setShowPanel(null);
              focusFieldAfter(underRowRef.current);
            }}
          >
            <span className="truncate">Primary</span>
          </div>
          <div className="flex-1 min-h-0">
            <CostCentreFlatList
              costCentres={costCentres}
              selectedId={form.parent_id as number}
              onSelect={(cc) => {
                setForm((f) => ({ ...f, parent_id: cc.cc_id }));
                setShowPanel(null);
                focusFieldAfter(underRowRef.current);
              }}
              showHeader={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
